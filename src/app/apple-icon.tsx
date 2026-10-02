import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og";

// Home-screen icon: the favicon's circles on an opaque tile, since iOS fills
// transparent areas with black.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Rendered at build time, from the project root.
const svg = readFileSync(join(process.cwd(), "src/app/icon.svg"));
const src = `data:image/svg+xml;base64,${svg.toString("base64")}`;

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#ffffff" }}>
        <img src={src} width={136} height={136} alt="" />
      </div>
    ),
    size,
  );
}
