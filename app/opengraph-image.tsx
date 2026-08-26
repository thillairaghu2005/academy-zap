import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const alt = "Zapsters — Learn. Build. Climb.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

async function loadLogo(): Promise<string | null> {
  try {
    const file = path.join(process.cwd(), "src", "assets", "images", "zapsters-logo.png");
    const buffer = await readFile(file);
    return `data:image/png;base64,${buffer.toString("base64")}`;
  } catch {
    return null;
  }
}

export default async function OpengraphImage() {
  const logo = await loadLogo();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "space-between",
          background: "#ffffff",
          padding: "72px 80px",
        }}
      >
        <div style={{ display: "flex", height: 120, alignItems: "center" }}>
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt="" width={180} height={120} style={{ objectFit: "contain" }} />
          ) : (
            <div style={{ display: "flex", fontSize: 64, fontWeight: 700, color: "#171717" }}>Zapsters</div>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              display: "flex",
              fontSize: 88,
              fontWeight: 700,
              letterSpacing: "-0.04em",
              color: "#171717",
              lineHeight: 1,
            }}
          >
            Learn. Build. Climb.
          </div>
          <div style={{ display: "flex", fontSize: 34, color: "#5b5b5b", lineHeight: 1.3 }}>
            Courses, a code judge, and virtual labs — with progress you can verify.
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ width: 56, height: 8, background: "#B4233C", borderRadius: 4 }} />
          <div style={{ display: "flex", fontSize: 26, fontWeight: 600, letterSpacing: "0.14em", color: "#B4233C" }}>
            ZAPSTERS
          </div>
        </div>
      </div>
    ),
    size,
  );
}
