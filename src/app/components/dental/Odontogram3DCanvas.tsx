"use client";

import { useEffect, useRef, useCallback } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { ToothStatus, TeethData } from "@/types/database";

// ─── Renk haritası ────────────────────────────────────────────────────────────

interface StatusProps {
    color: number; emissive: number; metalness: number; roughness: number;
    clearcoat: number; clearcoatRoughness: number;
}

const STATUS_COLORS: Record<ToothStatus, StatusProps> = {
    healthy:           { color: 0xf8f4ed, emissive: 0x000000, metalness: 0.02, roughness: 0.15, clearcoat: 1.0, clearcoatRoughness: 0.04 },
    cavity:            { color: 0xc0392b, emissive: 0x2a0000, metalness: 0.0,  roughness: 0.85, clearcoat: 0.1, clearcoatRoughness: 0.8  },
    filling:           { color: 0x5b9bd5, emissive: 0x000d22, metalness: 0.15, roughness: 0.35, clearcoat: 0.7, clearcoatRoughness: 0.15 },
    crown:             { color: 0xe8b84b, emissive: 0x180c00, metalness: 0.55, roughness: 0.22, clearcoat: 0.9, clearcoatRoughness: 0.08 },
    missing:           { color: 0x2d3f52, emissive: 0x000000, metalness: 0.0,  roughness: 1.0,  clearcoat: 0.0, clearcoatRoughness: 1.0  },
    implant:           { color: 0x9b87d4, emissive: 0x08002a, metalness: 0.75, roughness: 0.18, clearcoat: 0.9, clearcoatRoughness: 0.06 },
    root_canal:        { color: 0xe07b30, emissive: 0x150300, metalness: 0.0,  roughness: 0.55, clearcoat: 0.3, clearcoatRoughness: 0.4  },
    bridge:            { color: 0x20bcd4, emissive: 0x00131a, metalness: 0.35, roughness: 0.28, clearcoat: 0.8, clearcoatRoughness: 0.10 },
    extraction_needed: { color: 0xe05252, emissive: 0x380000, metalness: 0.0,  roughness: 0.65, clearcoat: 0.1, clearcoatRoughness: 0.7  },
};

// ─── Anatomik diş profilleri (LatheGeometry) ──────────────────────────────────
// Her profil Vector2(radius, y) — y=0 merkez, yukarı +, aşağı -

function buildToothGeometry(position: number): THREE.BufferGeometry {
    if (position <= 2) {
        // Kesici: ince bıçak silueti
        const pts = [
            new THREE.Vector2(0.16, -0.52),
            new THREE.Vector2(0.20, -0.40),
            new THREE.Vector2(0.27, -0.16),
            new THREE.Vector2(0.29,  0.10),
            new THREE.Vector2(0.27,  0.32),
            new THREE.Vector2(0.22,  0.45),
            new THREE.Vector2(0.12,  0.52),
        ];
        const geo = new THREE.LatheGeometry(pts, 20);
        geo.scale(1, 1, 0.50); // bıçak şekli için Z'yi düzleştir
        return geo;
    }
    if (position === 3) {
        // Kanin: uzun, sivri koni
        const pts = [
            new THREE.Vector2(0.16, -0.56),
            new THREE.Vector2(0.21, -0.42),
            new THREE.Vector2(0.27, -0.16),
            new THREE.Vector2(0.28,  0.14),
            new THREE.Vector2(0.24,  0.44),
            new THREE.Vector2(0.16,  0.66),
            new THREE.Vector2(0.05,  0.80),
        ];
        const geo = new THREE.LatheGeometry(pts, 20);
        geo.scale(1, 1, 0.72); // kanin hafif oval
        return geo;
    }
    if (position <= 5) {
        // Küçük azı (premolar): orta geniş, hafif konveks
        const pts = [
            new THREE.Vector2(0.20, -0.49),
            new THREE.Vector2(0.25, -0.36),
            new THREE.Vector2(0.33, -0.10),
            new THREE.Vector2(0.34,  0.14),
            new THREE.Vector2(0.32,  0.36),
            new THREE.Vector2(0.28,  0.49),
        ];
        return new THREE.LatheGeometry(pts, 20);
    }
    if (position <= 7) {
        // Büyük azı (molar): geniş, yassı kare kuron
        const pts = [
            new THREE.Vector2(0.26, -0.50),
            new THREE.Vector2(0.33, -0.36),
            new THREE.Vector2(0.44, -0.10),
            new THREE.Vector2(0.46,  0.14),
            new THREE.Vector2(0.44,  0.36),
            new THREE.Vector2(0.39,  0.50),
        ];
        return new THREE.LatheGeometry(pts, 24);
    }
    // Yirmilik (wisdom): molar'a benzer ama biraz küçük
    const pts = [
        new THREE.Vector2(0.22, -0.48),
        new THREE.Vector2(0.28, -0.34),
        new THREE.Vector2(0.38, -0.08),
        new THREE.Vector2(0.39,  0.14),
        new THREE.Vector2(0.37,  0.36),
        new THREE.Vector2(0.33,  0.48),
    ];
    return new THREE.LatheGeometry(pts, 20);
}

// ─── Deterministik pseudo-random (FDI seed) ───────────────────────────────────
// FDI numarasından 0-1 arası tutarlı değer üretir — render'lar arası stabil
function fdiRand(fdi: number, salt = 0): number {
    const x = Math.sin(fdi * 127.1 + salt * 311.7) * 43758.5453;
    return x - Math.floor(x);
}

// ─── FDI → ark konumu ─────────────────────────────────────────────────────────
// Üst ark (kadran 1 & 2): y=+1.15
// Alt ark (kadran 3 & 4): y=-1.15
// Her arkta 16 diş, parabolik eğri boyunca

const ARCH_A = 3.2;  // genişlik yarıçapı
const ARCH_B = 2.0;  // derinlik yarıçapı

function archPosition(index: number, total: number, upper: boolean): THREE.Vector3 {
    // index: 0 (en sol) → total-1 (en sağ), 16 diş için
    const t = (index / (total - 1)) * Math.PI; // 0 → π sol-sağ tarama
    const x = ARCH_A * Math.cos(t);
    const z = ARCH_B * Math.sin(t) * (upper ? 1 : -1) * 0.85;
    const y = upper ? 0.55 : -0.55;
    return new THREE.Vector3(x, y, z);
}

// FDI numarasından ark index'i çıkar
// Üst ark: sol→sağ sırası: 28,27,26,25,24,23,22,21,11,12,13,14,15,16,17,18
// Alt ark: sol→sağ sırası: 38,37,36,35,34,33,32,31,41,42,43,44,45,46,47,48
const UPPER_ORDER = [28,27,26,25,24,23,22,21,11,12,13,14,15,16,17,18];
const LOWER_ORDER = [38,37,36,35,34,33,32,31,41,42,43,44,45,46,47,48];

// ─── Props ────────────────────────────────────────────────────────────────────

export interface ZoomActions { zoomIn: () => void; zoomOut: () => void; }

interface Props {
    teethData: TeethData;
    selectedTooth: string | null;
    onToothClick: (toothNo: string) => void;
    onReady?: (actions: ZoomActions) => void;
}

// ─── Bileşen ──────────────────────────────────────────────────────────────────

export default function Odontogram3DCanvas({ teethData, selectedTooth, onToothClick, onReady }: Props) {
    const mountRef = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<{
        renderer: THREE.WebGLRenderer;
        scene: THREE.Scene;
        camera: THREE.PerspectiveCamera;
        controls: OrbitControls;
        toothMeshes: Map<string, THREE.Mesh>;
        animId: number;
        raycaster: THREE.Raycaster;
        pointer: THREE.Vector2;
        hoveredTooth: string | null;
    } | null>(null);

    // ── Sahne kur ──────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!mountRef.current) return;
        const container = mountRef.current;
        const w = container.clientWidth;
        const h = container.clientHeight;

        // Renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        renderer.setSize(w, h);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.4;
        container.appendChild(renderer.domElement);

        // Scene
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x08101e);
        scene.fog = new THREE.FogExp2(0x08101e, 0.045);

        // Camera
        const camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 100);
        camera.position.set(0, 5.5, 13);
        camera.lookAt(0, 0, 0);

        // Controls
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.07;
        controls.minDistance = 7;
        controls.maxDistance = 20;
        controls.maxPolarAngle = Math.PI * 0.7;
        controls.target.set(0, 0, 0);

        // ── Environment map (PMREM — inline, harici import yok) ──────────────
        // RoomEnvironment yerine DataTexture tabanlı gradyan environment
        // three/examples/jsm chunk init sorunu olmaz
        {
            const W = 256, H = 128;
            const px = new Uint8Array(4 * W * H);
            for (let y = 0; y < H; y++) {
                for (let x = 0; x < W; x++) {
                    const t = y / (H - 1);
                    // Üst yarı: soğuk mavi-beyaz → alt yarı: koyu lacivert
                    const r = t < 0.5 ? Math.round(220 + (1 - t * 2) * 35) : Math.round(220 - (t - 0.5) * 2 * 190);
                    const g = t < 0.5 ? Math.round(230 + (1 - t * 2) * 25) : Math.round(230 - (t - 0.5) * 2 * 200);
                    const b = t < 0.5 ? Math.round(255)                     : Math.round(255 - (t - 0.5) * 2 * 220);
                    const i = (y * W + x) * 4;
                    px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = 255;
                }
            }
            const envTex = new THREE.DataTexture(px, W, H, THREE.RGBAFormat);
            envTex.mapping = THREE.EquirectangularReflectionMapping;
            envTex.needsUpdate = true;
            const pmrem = new THREE.PMREMGenerator(renderer);
            pmrem.compileEquirectangularShader();
            scene.environment = pmrem.fromEquirectangular(envTex).texture;
            scene.environmentIntensity = 0.85;
            envTex.dispose();
            pmrem.dispose();
        }

        // ── Işıklar ──────────────────────────────────────────────────────────
        scene.add(new THREE.AmbientLight(0x9ab8d0, 0.7));

        // Key light — üst sağ ön, clearcoat parlaması için kritik
        const keyLight = new THREE.DirectionalLight(0xfff8ee, 3.0);
        keyLight.position.set(6, 14, 8);
        keyLight.castShadow = true;
        keyLight.shadow.mapSize.set(2048, 2048);
        keyLight.shadow.camera.near = 0.5;
        keyLight.shadow.camera.far = 50;
        keyLight.shadow.bias = -0.001;
        scene.add(keyLight);

        // Fill light — sol alt
        const fillLight = new THREE.DirectionalLight(0xc8e0ff, 0.9);
        fillLight.position.set(-7, 3, -3);
        scene.add(fillLight);

        // Rim light — arkadan kenarlık parlaması
        const rimLight = new THREE.DirectionalLight(0xa0c0ff, 0.7);
        rimLight.position.set(0, -2, -10);
        scene.add(rimLight);

        // Spot — diş yüzeyleri üzerinde lokalize parlaklık
        const spot = new THREE.SpotLight(0xffffff, 2.5, 25, Math.PI / 6, 0.4, 1.5);
        spot.position.set(0, 12, 4);
        spot.target.position.set(0, 0, 0);
        spot.castShadow = false;
        scene.add(spot);
        scene.add(spot.target);

        // ── Zemin — hafif yansımalı platform ─────────────────────────────────
        const groundGeo = new THREE.CircleGeometry(9, 72);
        const groundMat = new THREE.MeshPhysicalMaterial({
            color: 0x0d1a2e,
            roughness: 0.6,
            metalness: 0.25,
            clearcoat: 0.4,
            clearcoatRoughness: 0.3,
        });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -2.4;
        ground.receiveShadow = true;
        scene.add(ground);

        // ── Gum (diş eti) — dişlerin tabanını sarar ───────────────────────────
        // Crown dünya y'si: archPos.y ± 0.52
        // upper crown root ucu: 0.55 - 0.52 = 0.03
        // Gum tüp merkezi kök ucunun hemen altında; geniş radius ile crown tabanını örter
        const gumMat = new THREE.MeshPhysicalMaterial({
            color: 0xd4697a,
            roughness: 0.62,
            metalness: 0.0,
            clearcoat: 0.25,
            clearcoatRoughness: 0.55,
        });

        const buildGum = (upper: boolean) => {
            // Servikal seviye: crown'ın ~%40'ı üstte (kök bölgesi) gum içinde kalır
            // upper: archPos.y=0.55, crown y=0.03..1.07 → gum line ~0.55+0.20=0.75
            // lower: archPos.y=-0.55, crown y=-1.07..-0.03 → gum line ~-0.55-0.20=-0.75
            const cervOffset = upper ? 0.20 : -0.20;
            const pts: THREE.Vector3[] = [];
            for (let i = 0; i < 16; i++) {
                const p = archPosition(i, 16, upper);
                pts.push(new THREE.Vector3(p.x, p.y + cervOffset, p.z));
            }
            const curve = new THREE.CatmullRomCurve3(pts);

            // Ana gum tüpü: radius 0.32 → dişlerin ~%40'lık kök bölgesini örter
            const mainGeo = new THREE.TubeGeometry(curve, 120, 0.32, 12, false);
            const mainTube = new THREE.Mesh(mainGeo, gumMat);
            mainTube.castShadow = true;
            mainTube.receiveShadow = true;
            scene.add(mainTube);

            // Çene kemiği tüpü — kök ucuna doğru biraz daha uzanan, daha ince
            const boneOffset = upper ? 0.44 : -0.44;
            const pts2: THREE.Vector3[] = [];
            for (let i = 0; i < 16; i++) {
                const p = archPosition(i, 16, upper);
                pts2.push(new THREE.Vector3(p.x * 1.01, p.y + boneOffset, p.z * 1.01));
            }
            const curve2 = new THREE.CatmullRomCurve3(pts2);
            const baseGeo = new THREE.TubeGeometry(curve2, 100, 0.24, 10, false);
            const baseTube = new THREE.Mesh(baseGeo, gumMat);
            baseTube.castShadow = true;
            scene.add(baseTube);
        };
        buildGum(true);
        buildGum(false);

        // ── Dişler ────────────────────────────────────────────────────────────
        const toothMeshes = new Map<string, THREE.Mesh>();

        const buildTeeth = (order: number[], upper: boolean) => {
            order.forEach((fdi, idx) => {
                const toothNo = String(fdi);
                // FDI'daki ikinci rakam diş pozisyonu
                const position = fdi % 10;

                const geo = buildToothGeometry(position);
                const status = (teethData[toothNo]?.status ?? "healthy") as ToothStatus;
                const col = STATUS_COLORS[status];

                const mat = new THREE.MeshPhysicalMaterial({
                    color: col.color,
                    emissive: col.emissive,
                    emissiveIntensity: 0.4,
                    metalness: col.metalness,
                    roughness: col.roughness,
                    clearcoat: col.clearcoat,
                    clearcoatRoughness: col.clearcoatRoughness,
                });

                const mesh = new THREE.Mesh(geo, mat);
                mesh.castShadow = true;
                mesh.receiveShadow = true;

                const pos = archPosition(idx, 16, upper);

                // C: Doğal yükseklik varyasyonu — her diş için deterministik offset
                const heightJitter = (fdiRand(fdi, 0) - 0.5) * 0.10; // ±0.05
                const lateralJitter = (fdiRand(fdi, 1) - 0.5) * 0.04; // ±0.02 z
                pos.y += heightJitter;
                pos.z += lateralJitter;
                mesh.position.copy(pos);

                // Dişi ark eğrisine dik döndür
                const tangent = new THREE.Vector3();
                if (idx < 15) {
                    const next = archPosition(idx + 1, 16, upper);
                    tangent.subVectors(next, pos).normalize();
                } else {
                    const prev = archPosition(idx - 1, 16, upper);
                    tangent.subVectors(pos, prev).normalize();
                }
                const up = new THREE.Vector3(0, 1, 0);
                const axis = new THREE.Vector3().crossVectors(up, tangent).normalize();
                const angle = Math.acos(up.dot(tangent));
                // Hafif tilt varyasyonu ile daha organik görünüm
                const tiltFactor = 0.28 + fdiRand(fdi, 2) * 0.08;
                if (axis.length() > 0.001) mesh.rotateOnAxis(axis, angle * tiltFactor);

                mesh.userData.toothNo = toothNo;
                scene.add(mesh);
                toothMeshes.set(toothNo, mesh);
            });
        };

        buildTeeth(UPPER_ORDER, true);
        buildTeeth(LOWER_ORDER, false);

        // ── Raycaster ─────────────────────────────────────────────────────────
        const raycaster = new THREE.Raycaster();
        const pointer = new THREE.Vector2();

        // ── Resize ────────────────────────────────────────────────────────────
        const onResize = () => {
            const nw = container.clientWidth;
            const nh = container.clientHeight;
            camera.aspect = nw / nh;
            camera.updateProjectionMatrix();
            renderer.setSize(nw, nh);
        };
        window.addEventListener("resize", onResize);

        // ── Pointer move (hover) ───────────────────────────────────────────────
        let hoveredTooth: string | null = null;
        const onPointerMove = (e: PointerEvent) => {
            const rect = renderer.domElement.getBoundingClientRect();
            pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
            raycaster.setFromCamera(pointer, camera);
            const meshes = Array.from(toothMeshes.values());
            const hits = raycaster.intersectObjects(meshes, true);
            const hit = hits[0]?.object as THREE.Mesh | undefined;
            const newHover = (hit?.userData?.toothNo ?? hit?.parent?.userData?.toothNo) ?? null;
            if (newHover !== hoveredTooth) {
                hoveredTooth = newHover;
                renderer.domElement.style.cursor = hoveredTooth ? "pointer" : "grab";
            }
        };
        renderer.domElement.addEventListener("pointermove", onPointerMove);

        // ── Click ─────────────────────────────────────────────────────────────
        const onClick = (e: MouseEvent) => {
            const rect = renderer.domElement.getBoundingClientRect();
            pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
            raycaster.setFromCamera(pointer, camera);
            const meshes = Array.from(toothMeshes.values());
            const hits = raycaster.intersectObjects(meshes, true);
            const hit = hits[0]?.object as THREE.Mesh | undefined;
            const toothNo = hit?.userData?.toothNo ?? hit?.parent?.userData?.toothNo;
            if (toothNo) {
                onToothClick(toothNo as string);
            }
        };
        renderer.domElement.addEventListener("click", onClick);

        // ── Animasyon döngüsü ─────────────────────────────────────────────────
        let animId = 0;
        const clock = new THREE.Clock();

        const animate = () => {
            animId = requestAnimationFrame(animate);
            const elapsed = clock.getElapsedTime();

            controls.update();

            // Hafif nefes efekti — kameranın hedef y'si
            controls.target.y = Math.sin(elapsed * 0.4) * 0.04;

            renderer.render(scene, camera);
        };
        animate();

        sceneRef.current = { renderer, scene, camera, controls, toothMeshes, animId, raycaster, pointer, hoveredTooth: null };

        // Zoom aksiyonlarını dışarıya bildir
        if (onReady) {
            onReady({
                zoomIn:  () => { controls.dollyIn(1.25);  controls.update(); },
                zoomOut: () => { controls.dollyOut(1.25); controls.update(); },
            });
        }

        return () => {
            cancelAnimationFrame(animId);
            window.removeEventListener("resize", onResize);
            renderer.domElement.removeEventListener("pointermove", onPointerMove);
            renderer.domElement.removeEventListener("click", onClick);
            renderer.dispose();
            if (container.contains(renderer.domElement)) {
                container.removeChild(renderer.domElement);
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Sadece mount'ta — teethData değişimleri aşağıda ayrıca ele alınıyor

    // ── TeethData değişince malzemeleri güncelle ───────────────────────────────
    useEffect(() => {
        if (!sceneRef.current) return;
        const { toothMeshes } = sceneRef.current;
        toothMeshes.forEach((mesh, toothNo) => {
            const status = (teethData[toothNo]?.status ?? "healthy") as ToothStatus;
            const col = STATUS_COLORS[status];
            const applyToMat = (mat: THREE.MeshPhysicalMaterial) => {
                mat.color.setHex(col.color);
                mat.emissive.setHex(col.emissive);
                mat.metalness = col.metalness;
                mat.roughness = col.roughness;
                mat.clearcoat = col.clearcoat;
                mat.clearcoatRoughness = col.clearcoatRoughness;
                mat.needsUpdate = true;
            };
            applyToMat(mesh.material as THREE.MeshPhysicalMaterial);
        });
    }, [teethData]);

    // ── Seçili diş efekti ─────────────────────────────────────────────────────
    const prevSelectedRef = useRef<string | null>(null);
    useEffect(() => {
        if (!sceneRef.current) return;
        const { toothMeshes } = sceneRef.current;

        // Eski seçimi geri al
        if (prevSelectedRef.current) {
            const prev = toothMeshes.get(prevSelectedRef.current);
            if (prev) {
                prev.scale.set(1, 1, 1);
                (prev.material as THREE.MeshPhysicalMaterial).emissiveIntensity = 0.4;
            }
        }
        // Yeni seçimi uygula
        if (selectedTooth) {
            const mesh = toothMeshes.get(selectedTooth);
            if (mesh) {
                mesh.scale.set(1.12, 1.12, 1.12);
                (mesh.material as THREE.MeshPhysicalMaterial).emissiveIntensity = 2.2;
            }
        }
        prevSelectedRef.current = selectedTooth;
    }, [selectedTooth]);

    // ── onToothClick değişimi ─────────────────────────────────────────────────
    const onToothClickRef = useRef(onToothClick);
    useEffect(() => { onToothClickRef.current = onToothClick; }, [onToothClick]);
    const stableClick = useCallback((no: string) => onToothClickRef.current(no), []);
    void stableClick; // kullanıldığından emin ol

    return (
        <div
            ref={mountRef}
            className="w-full h-full"
            style={{ touchAction: "none" }}
        />
    );
}
