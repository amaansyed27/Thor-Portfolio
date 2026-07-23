import { cp, mkdir, readFile, readdir, rm, unlink, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const dist = path.join(root, "dist");
const publicDir = path.join(root, "public");
const assetsDir = path.join(dist, "assets");
const encodedDir = path.join(assetsDir, "encoded");

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
await cp(path.join(root, "index.html"), path.join(dist, "index.html"));
await cp(path.join(root, "src"), path.join(dist, "src"), { recursive: true });
await cp(publicDir, dist, { recursive: true });
await mkdir(assetsDir, { recursive: true });

async function decodeSingle(encodedName, outputName) {
  const encodedPath = path.join(encodedDir, encodedName);
  const outputPath = path.join(assetsDir, outputName);
  if (existsSync(outputPath) || !existsSync(encodedPath)) return;
  const base64 = await readFile(encodedPath, "utf8");
  await writeFile(outputPath, Buffer.from(base64, "base64"));
}

async function decodeParts(prefix, outputName) {
  const outputPath = path.join(assetsDir, outputName);
  if (existsSync(outputPath) || !existsSync(encodedDir)) return;
  const names = (await readdir(encodedDir)).filter((name) => name.startsWith(prefix)).sort();
  if (!names.length) return;
  const chunks = await Promise.all(names.map((name) => readFile(path.join(encodedDir, name), "utf8")));
  await writeFile(outputPath, Buffer.from(chunks.join(""), "base64"));
}

await decodeSingle("asgard-mark.png.b64", "asgard-mark.png");
await decodeParts("stormbreaker.glb.b64.part", "stormbreaker.glb");

if (existsSync(encodedDir)) await rm(encodedDir, { recursive: true, force: true });

for (const required of ["index.html", "assets/asgard-mark.png", "assets/stormbreaker.glb"]) {
  if (!existsSync(path.join(dist, required))) throw new Error(`Missing build output: ${required}`);
}

const stats = await Promise.all(
  ["index.html", "assets/asgard-mark.png", "assets/stormbreaker.glb"].map(async (file) => ({
    file,
    bytes: (await readFile(path.join(dist, file))).byteLength,
  })),
);
console.log(`Thor portfolio forged successfully: ${stats.map(({ file, bytes }) => `${file} (${bytes} bytes)`).join(", ")}`);
