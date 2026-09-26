import { chromium } from "playwright-core";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";

const downloads = "C:/Users/Usuario/Downloads";
const outDir = "C:/Users/Usuario/OneDrive/Desktop/lautasite/public/photos";
mkdirSync(outDir, { recursive: true });

// [archivo origen, nombre final]
const JOBS = [
  ["c3576521959822fb573ebca4f0c4291f.jpg", "plaza-de-mayo"],
  ["087a45fca4743adae4503cc59cb8b5ed.jpg", "monumento-avion-malvinas"],
  ["ac1dab70eba21c72c597d78962bf4343.jpg", "marcha-funeral"],
  ["4d6da6f0d3f448c51672f43b0a1a8888.jpg", "marcha-messi"],
];

const FULL_EDGE = 2400;
const SM_EDGE = 720;
const QUALITY = 0.86;

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH });
const page = await browser.newPage();

const results = [];

for (const [file, name] of JOBS) {
  const bytes = readFileSync(join(downloads, file));
  const base64 = bytes.toString("base64");

  const out = await page.evaluate(
    async ({ base64, fullEdge, smEdge, quality }) => {
      const bin = atob(base64);
      const buffer = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i += 1) buffer[i] = bin.charCodeAt(i);
      const blob = new Blob([buffer], { type: "image/jpeg" });
      const bitmap = await createImageBitmap(blob);

      const draw = (edge) => {
        const scale = Math.min(1, edge / Math.max(bitmap.width, bitmap.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(bitmap.width * scale);
        canvas.height = Math.round(bitmap.height * scale);
        const ctx = canvas.getContext("2d");
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL("image/jpeg", quality);
      };

      const out = { width: bitmap.width, height: bitmap.height, full: draw(fullEdge), sm: draw(smEdge) };
      bitmap.close();
      return out;
    },
    { base64, fullEdge: FULL_EDGE, smEdge: SM_EDGE, quality: QUALITY },
  );

  const write = (dataUrl, filename) => {
    const buf = Buffer.from(dataUrl.split(",")[1], "base64");
    writeFileSync(join(outDir, filename), buf);
    return buf.length;
  };

  const fullBytes = write(out.full, `${name}.jpg`);
  const smBytes = write(out.sm, `${name}-sm.jpg`);
  results.push({ file, name, width: out.width, height: out.height, fullBytes, smBytes });
  console.log(
    `${basename(file)} -> ${name}.jpg ${out.width}x${out.height} full=${(fullBytes / 1024).toFixed(0)}KB sm=${(smBytes / 1024).toFixed(0)}KB`,
  );
}

writeFileSync(
  "C:/Users/Usuario/AppData/Local/Temp/opencode/photo-dims.json",
  JSON.stringify(results, null, 2),
);

await browser.close();
console.log("ok");
