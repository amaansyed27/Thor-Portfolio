import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const assets = path.join(root, 'public', 'assets');
const encoded = path.join(assets, 'encoded');
await mkdir(assets, { recursive: true });

async function decodeSingle(encodedName, outputName) {
  const source = path.join(encoded, encodedName);
  const output = path.join(assets, outputName);
  if (!existsSync(source)) throw new Error(`Missing encoded asset: ${encodedName}`);
  const base64 = (await readFile(source, 'utf8')).replace(/\s+/g, '');
  const bytes = Buffer.from(base64, 'base64');
  await writeFile(output, bytes);
  return bytes.byteLength;
}

async function decodeParts(prefix, outputName) {
  const output = path.join(assets, outputName);
  if (!existsSync(encoded)) throw new Error(`Missing encoded asset directory: ${encoded}`);
  const parts = (await readdir(encoded)).filter((name) => name.startsWith(prefix)).sort();
  if (!parts.length) throw new Error(`Missing encoded chunks: ${prefix}*`);
  const chunks = await Promise.all(parts.map((name) => readFile(path.join(encoded, name), 'utf8')));
  const bytes = Buffer.from(chunks.join('').replace(/\s+/g, ''), 'base64');
  await writeFile(output, bytes);
  return bytes.byteLength;
}

const [sigilBytes, glbBytes] = await Promise.all([
  decodeSingle('asgard-mark.png.b64', 'asgard-mark.png'),
  decodeParts('stormbreaker.glb.b64.part', 'stormbreaker.glb'),
]);

const model = await readFile(path.join(assets, 'stormbreaker.glb'));
if (model.subarray(0, 4).toString('ascii') !== 'glTF') throw new Error('Stormbreaker reconstruction produced an invalid GLB header.');
const declaredLength = model.readUInt32LE(8);
if (declaredLength !== model.byteLength) throw new Error(`GLB length mismatch: header=${declaredLength}, file=${model.byteLength}`);
const jsonLength = model.readUInt32LE(12);
const jsonType = model.subarray(16, 20).toString('ascii');
if (jsonType !== 'JSON') throw new Error(`First GLB chunk is ${jsonType}, expected JSON`);
const gltf = JSON.parse(model.subarray(20, 20 + jsonLength).toString('utf8').replace(/\0+$/g, '').trim());
if (!gltf.scenes?.length || !gltf.nodes?.length || !gltf.meshes?.length) throw new Error('Stormbreaker GLB has no renderable scene, nodes or meshes.');
const primitiveCount = gltf.meshes.reduce((total, mesh) => total + (mesh.primitives?.length || 0), 0);
if (!primitiveCount) throw new Error('Stormbreaker GLB contains no mesh primitives.');
if (glbBytes < 100_000) throw new Error(`Stormbreaker GLB is unexpectedly small: ${glbBytes} bytes`);
if (sigilBytes < 5_000) throw new Error(`Asgard sigil is unexpectedly small: ${sigilBytes} bytes`);
console.log(`Stormbreaker scene validated: ${gltf.meshes.length} meshes, ${primitiveCount} primitives, ${gltf.nodes.length} nodes.`);

const info = await Promise.all(['asgard-mark.png', 'stormbreaker.glb'].map(async (file) => {
  const size = (await stat(path.join(assets, file))).size;
  return `${file} ${size} bytes`;
}));
console.log(`Assets verified: ${info.join(' | ')}`);
