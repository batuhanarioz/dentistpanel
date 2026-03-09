"use client";

import React, { useEffect, useRef } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import { useClinic } from "../context/ClinicContext";

interface GuidedTourProps {
    runOnMount?: boolean;
}

export const GuidedTour: React.FC<GuidedTourProps> = ({ runOnMount = false }) => {
    const { userEmail } = useClinic();
    const isDemoUser = userEmail === "izmirdis@gmail.com";
    const driverObj = useRef<ReturnType<typeof driver> | null>(null);

    useEffect(() => {
        // Driver.js instance creation with premium styling
        driverObj.current = driver({
            showProgress: true,
            animate: true,
            allowClose: true,
            overlayColor: "rgba(15, 23, 42, 0.8)", // Slate-900 with opacity
            stagePadding: 8,
            stageRadius: 16,
            nextBtnText: "İleri →",
            prevBtnText: "← Geri",
            doneBtnText: "Hadi Başlayalım! 🚀",
            popoverClass: "premium-tour-popover",
            steps: [
                {
                    popover: {
                        title: "<span style='color: #0d9488; font-size: 1.25rem; font-weight: 800;'>Hoş Geldiniz! 🧪</span>",
                        description: `
                            <div style='color: #475569; line-height: 1.6; margin-top: 8px;'>
                                Klinik Yönetim Paneli demo turuna hoş geldiniz. Sistemimizin işlevlerini hızlıca öğrenelim.
                                <br/><br/>
                                <div style='background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border: 1px solid #bbf7d0; padding: 14px; border-radius: 14px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);'>
                                    <p style='font-size: 13px; font-weight: 700; color: #166534; margin-bottom: 6px; display: flex; items-center: center; gap: 4px;'>📍 İzmir Kliniklerine Özel</p>
                                    <p style='font-size: 11px; color: #15803d; line-height: 1.5;'>
                                        İzmir’deki klinikler için panel kurulumu ve eğitim hizmetini yerinde sağlıyoruz. 
                                        <b>Talep ederseniz kliniğinizi ziyaret ederek sistemi sizin için kurabiliriz.</b>
                                    </p>
                                </div>
                            </div>
                        `,
                        side: "bottom",
                        align: "center"
                    }
                },
                {
                    element: "#tour-dashboard",
                    popover: {
                        title: "<span style='color: #0d9488; font-weight: 700;'>Genel Bakış</span>",
                        description: "Dashboard üzerinden bugünkü randevularınızı ve özet raporlarınızı anlık olarak takip edebilirsiniz. Kontrol Listesi kısmında her role özel olarak değişken görevler atayabilirsiniz. Örneğin diş hekimi için 'Tedavi Notlarını Giriniz' ya da sekreter için 'Ödeme Bilgisi Girilmemiş Hastalar Mevcut!' gibi.",
                        side: "right",
                        align: "start"
                    }
                },
                {
                    element: "#tour-patients",
                    popover: {
                        title: "<span style='color: #0d9488; font-weight: 700;'>Hasta Kayıtları</span>",
                        description: "Kliniğinize kayıtlı tüm hastaların randevu geçmişini, notlarını ve bilgilerini buradan görebilirsiniz. İsterseniz kendi hasta listenizi tek tuşla sisteme aktarabilirsiniz. İsterseniz de hasta listenizi tek tuşla indirebilirsiniz.",
                        side: "right",
                        align: "start"
                    }
                },
                {
                    element: "#tour-appointment-management",
                    popover: {
                        title: "<span style='color: #0d9488; font-weight: 700;'>Randevu Yönetimi</span>",
                        description: "Hekim bazlı çalışma saatlerini ve randevuları takvim üzerinden kolayca yönetebilirsiniz.",
                        side: "right",
                        align: "start"
                    }
                },
                {
                    element: "#tour-subscription",
                    popover: {
                        title: "<span style='color: #0d9488; font-weight: 700;'>Abonelik</span>",
                        description: "Kliniğinize ait abonelik bilgilerini, kredi kullanımınızı ve faturalandırma detaylarını bu ekrandan görüntüleyebilirsiniz.",
                        side: "right",
                        align: "start"
                    }
                },
                {
                    element: "#tour-payment-management",
                    popover: {
                        title: "<span style='color: #0d9488; font-weight: 700;'>Ödeme Yönetimi</span>",
                        description: "Alınan ödemeleri, bekleyen borçları ve ödeme detaylarını bu ekrandan takip edebilir, her bir randevu için ödeme planı oluşturabilirsiniz.",
                        side: "right",
                        align: "start"
                    }
                },
                {
                    element: "#tour-reports",
                    popover: {
                        title: "<span style='color: #0d9488; font-weight: 700;'>Raporlar</span>",
                        description: "Kliniğinize ait büyüme verilerini ve performans metriklerini ve daha bir çok veriyi raporlar bölümünden analiz edebilir ve kliniğinizin büyümesine katkı sağlayabilirsiniz.",
                        side: "right",
                        align: "start"
                    }
                },
                {
                    popover: {
                        title: "<span style='color: #0d9488; font-size: 1.2rem; font-weight: 800;'>Tebrikler! 🚀</span>",
                        description: `
                            <div style='color: #475569; line-height: 1.6; margin-top: 8px;'>
                                Temel işlevlerimizi başarıyla keşfettiniz. Artık dilediğiniz bölümü inceleyebilirsiniz!
                                <br/><br/>
                                <div style='background: #f0fdf4; border: 1px solid #bbf7d0; padding: 14px; border-radius: 14px; margin-bottom: 12px;'>
                                    <p style='font-size: 13px; font-weight: 700; color: #166534; margin-bottom: 4px;'>İzmir Kliniklerine Özel</p>
                                    <p style='font-size: 11px; color: #15803d; margin-bottom: 8px;'>İzmir’deki klinikler için panel kurulumu ve eğitim hizmetini yerinde sağlıyoruz. Ekibimiz kliniğinizi ziyaret ederek sistemi sizin için kurar ve kullanıma hazır teslim eder.</p>
                                    <p style='font-size: 15px; font-weight: 800; color: #166534; text-align: center;'>📞 0544 441 21 80</p>
                                </div>
                                <div style='display: grid; grid-template-columns: 1fr 1fr; gap: 8px;'>
                                    <a href='tel:+905444412180' style='display: block; background: #0d9488; color: white; text-align: center; padding: 10px; border-radius: 10px; font-weight: bold; text-decoration: none; font-size: 13px;'>Hemen Ara</a>
                                    <a href='https://wa.me/905444412180' target='_blank' style='display: block; background: #25D366; color: white; text-align: center; padding: 10px; border-radius: 10px; font-weight: bold; text-decoration: none; font-size: 13px;'>WhatsApp</a>
                                </div>
                            </div>
                        `,
                        side: "bottom",
                        align: "center"
                    }
                }
            ],
            onDestroyed: () => {
                localStorage.setItem("hasSeenDemoTour", "true");
            }
        });

        if (runOnMount && isDemoUser) {
            const hasSeenTour = localStorage.getItem("hasSeenDemoTour");
            if (!hasSeenTour) {
                driverObj.current.drive();
            }
        }

        const startTour = () => {
            if (driverObj.current) {
                driverObj.current.drive();
            }
        };

        window.addEventListener("start-demo-tour", startTour);
        return () => window.removeEventListener("start-demo-tour", startTour);
    }, [runOnMount, isDemoUser]);

    return (
        <style dangerouslySetInnerHTML={{
            __html: `
            .premium-tour-popover {
                background: #ffffff !important;
                border-radius: 20px !important;
                padding: 24px !important;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25) !important;
                border: 1px solid rgba(13, 148, 136, 0.2) !important;
                max-width: 350px !important;
            }
            .driver-popover-title {
                font-family: inherit !important;
                margin-bottom: 12px !important;
            }
            .driver-popover-description {
                font-family: inherit !important;
                font-size: 14px !important;
                color: #475569 !important;
            }
            .driver-popover-progress-text {
                color: #94a3b8 !important;
                font-size: 12px !important;
                font-weight: 600 !important;
            }
            .driver-popover-navigation-btns {
                margin-top: 20px !important;
                gap: 8px !important;
                display: flex !important;
                justify-content: flex-end !important;
            }
            .driver-popover-next-btn {
                background: linear-gradient(135deg, #0d9488 0%, #10b981 100%) !important;
                color: white !important;
                text-shadow: none !important;
                border: none !important;
                border-radius: 10px !important;
                padding: 8px 16px !important;
                font-weight: 700 !important;
                font-size: 13px !important;
                transition: all 0.2s !important;
                box-shadow: 0 4px 12px rgba(13, 148, 136, 0.3) !important;
            }
            .driver-popover-next-btn:hover {
                transform: translateY(-1px) !important;
                box-shadow: 0 6px 15px rgba(13, 148, 136, 0.4) !important;
            }
            .driver-popover-prev-btn {
                background: #f1f5f9 !important;
                color: #475569 !important;
                text-shadow: none !important;
                border: 1px solid #e2e8f0 !important;
                border-radius: 10px !important;
                padding: 8px 16px !important;
                font-weight: 600 !important;
                font-size: 13px !important;
                transition: all 0.2s !important;
            }
            .driver-popover-prev-btn:hover {
                background: #e2e8f0 !important;
                color: #1e293b !important;
            }
            .driver-popover-close-btn {
                color: #94a3b8 !important;
                transition: color 0.2s !important;
            }
            .driver-popover-close-btn:hover {
                color: #ef4444 !important;
            }
            .driver-popover-arrow {
                border-color: #ffffff !important;
            }
        `}} />
    );
};

export const restartTour = () => {
    window.dispatchEvent(new CustomEvent("start-demo-tour"));
};
