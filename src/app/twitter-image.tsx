import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "Loupe — Ship fast. Catch drift.";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #faf9fb 0%, #f3f1f5 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Logo text */}
        <div
          style={{
            fontSize: 120,
            fontWeight: 600,
            color: "#111118",
            letterSpacing: "-0.02em",
            marginBottom: 24,
          }}
        >
          Loupe
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 42,
            color: "#64617a",
            textAlign: "center",
            maxWidth: 800,
            letterSpacing: "-0.01em",
          }}
        >
          Ship fast. Catch drift.
        </div>

        {/* Subtle accent bar */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 8,
            background: "linear-gradient(90deg, #5b2e91 0%, #7c4dab 100%)",
          }}
        />
      </div>
    ),
    {
      ...size,
    }
  );
}
