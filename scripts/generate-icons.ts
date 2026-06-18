// Generate PWA icons from the source logo (assets/logo.png).
//
//   bun run icons
//
// Produces src/client/icon-{192,512}.png by high-quality downscaling the logo.
// Requires macOS `sips` (preinstalled). On other platforms, generate the PNGs
// with any image tool at the sizes listed below.

import { existsSync } from "fs";

const SRC = "assets/logo.png";
const OUT_DIR = "src/client";
const SIZES = [192, 512];

if (!existsSync(SRC)) {
  console.error(`Source logo not found at ${SRC} — run from the repo root.`);
  process.exit(1);
}

for (const size of SIZES) {
  const out = `${OUT_DIR}/icon-${size}.png`;
  const proc = Bun.spawnSync([
    "sips", "-s", "format", "png", "-Z", String(size), SRC, "--out", out,
  ]);
  if (proc.exitCode !== 0) {
    console.error(`Failed to generate ${out}:\n${proc.stderr.toString()}`);
    process.exit(1);
  }
  console.log(`Generated ${out} (${size}x${size})`);
}
