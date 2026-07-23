import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const assets = path.join(root, 'public', 'assets');
const encoded = path.join(assets, 'encoded');
await mkdir(assets, { recursive: true });

async function decodeSingle(encodedName, outputName) {
  const source = path.join(encoded, encodedName);
  const output = path.join(assets, outputName);
  if (existsSync(output)) return;
  if (!existsSync(source)) throw new Error(`Missing encoded asset: ${encodedName}`);
  const base64 = await readFile(source, 'utf8');
  await writeFile(output, Buffer.from(base64.replace(/\s+/g, ''), 'base64'));
}

async function decodeParts(prefix, outputName) {
  const output = path.join(assets, outputName);
  if (existsSync(output)) return;
  if (!existsSync(encoded)) throw new Error(`Missing encoded asset directory: ${encoded}`);
  const parts = (await readdir(encoded)).filter((name) => name.startsWith(prefix)).sort();
  if (!parts.length) throw new Error(`Missing encoded chunks: ${prefix}*`);
  const chunks = await Promise.all(parts.map((name) => readFile(path.join(encoded, name), 'utf8')));
  await writeFile(output, Buffer.from(chunks.join('').replace(/\s+/g, ''), 'base64'));
}

await Promise.all([
  decodeSingle('asgard-mark.png.b64', 'asgard-mark.png'),
  decodeParts('stormbreaker.glb.b64.part', 'stormbreaker.glb'),
]);

for (const file of ['asgard-mark.png', 'stormbreaker.glb']) {
  const target = path.join(assets, file);
  if (!existsSync(target)) throw new Error(`Asset reconstruction failed: ${file}`);
}

console.log('Asgard sigil and Stormbreaker are ready.');
