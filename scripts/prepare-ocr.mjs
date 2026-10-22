import { cp, mkdir, copyFile } from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const target = path.resolve("public/ocr");
await mkdir(target, { recursive: true });
await copyFile(
  require.resolve("tesseract.js/dist/worker.min.js"),
  path.join(target, "worker.min.js"),
);
await cp(
  path.dirname(require.resolve("tesseract.js-core/package.json")),
  path.join(target, "core"),
  { recursive: true },
);
await copyFile(
  path.join(
    path.dirname(require.resolve("@tesseract.js-data/eng/package.json")),
    "4.0.0_best_int/eng.traineddata.gz",
  ),
  path.join(target, "eng.traineddata.gz"),
);
console.log("Self-hosted OCR worker, WASM and English language data prepared.");
await mkdir("public/pdf", { recursive: true });
await copyFile(
  require.resolve("pdfjs-dist/legacy/build/pdf.worker.min.mjs"),
  "public/pdf/pdf.worker.min.mjs",
);
console.log("Self-hosted PDF text worker prepared.");
