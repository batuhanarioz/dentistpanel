import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "NextGency OS Diş Kliniği Programı";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0f172a",
          padding: "60px",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* Glow blobs */}
        <div
          style={{
            position: "absolute",
            top: -100,
            left: -100,
            width: 500,
            height: 500,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(20,184,166,0.25) 0%, transparent 70%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -100,
            right: -100,
            width: 400,
            height: 400,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(16,185,129,0.2) 0%, transparent 70%)",
          }}
        />

        {/* Pill badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            background: "rgba(20,184,166,0.15)",
            border: "1px solid rgba(20,184,166,0.4)",
            borderRadius: 100,
            padding: "8px 20px",
            marginBottom: 28,
          }}
        >
          <span style={{ color: "#2dd4bf", fontSize: 14, fontWeight: 800, letterSpacing: "0.15em", textTransform: "uppercase" }}>
            Diş Kliniği Yönetim Sistemi
          </span>
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: 80,
            fontWeight: 900,
            color: "#ffffff",
            letterSpacing: "-0.04em",
            lineHeight: 1.05,
            textAlign: "center",
            marginBottom: 20,
          }}
        >
          NextGency OS
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 22,
            color: "#94a3b8",
            fontWeight: 500,
            textAlign: "center",
            letterSpacing: "0.08em",
            marginBottom: 48,
          }}
        >
          Randevu · Hasta · Tedavi · Ödeme · WhatsApp
        </div>

        {/* Divider */}
        <div style={{ width: 60, height: 2, background: "rgba(20,184,166,0.5)", marginBottom: 28 }} />

        {/* URL */}
        <div style={{ fontSize: 18, color: "#2dd4bf", fontWeight: 700, letterSpacing: "0.04em" }}>
          clinic.nextgency360.com
        </div>
      </div>
    ),
    { ...size }
  );
}
