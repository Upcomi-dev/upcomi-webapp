import { ImageResponse } from "next/og";

export const alt = "Upcomi — événements vélo";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        alignItems: "center",
        background: "linear-gradient(135deg, #f5efe6 0%, #f8d8c8 55%, #c9c6f4 100%)",
        color: "#2c1e14",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        justifyContent: "center",
        padding: "80px",
        textAlign: "center",
        width: "100%",
      }}
    >
      <div style={{ color: "#eb5f3b", display: "flex", fontSize: 38, fontWeight: 700 }}>
        UPCOMI
      </div>
      <div style={{ display: "flex", fontSize: 72, fontWeight: 700, lineHeight: 1.05, marginTop: 28 }}>
        Trouve ta prochaine aventure à vélo
      </div>
      <div style={{ display: "flex", fontSize: 30, marginTop: 30, opacity: 0.72 }}>
        Courses · Brevets · Ultras · Social rides
      </div>
    </div>,
    size
  );
}
