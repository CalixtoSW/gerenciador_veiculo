import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const distDir = path.join(root, "dist");
const backendDir = path.join(root, "..", "backend");

const srcIndex = path.join(distDir, "index.html");
const srcAssets = path.join(distDir, "assets");

const dstTemplate = path.join(backendDir, "templates", "react.generated.html");
const dstStaticAssets = path.join(backendDir, "static", "assets");

await mkdir(path.dirname(dstTemplate), { recursive: true });
await mkdir(dstStaticAssets, { recursive: true });

const indexHtml = await readFile(srcIndex, "utf8");
await writeFile(dstTemplate, indexHtml, "utf8");

await cp(srcAssets, dstStaticAssets, { recursive: true, force: true });

console.log("Copied React build to Django:");
console.log(`- ${srcIndex} -> ${dstTemplate}`);
console.log(`- ${srcAssets} -> ${dstStaticAssets}`);
