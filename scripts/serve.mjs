import { createServer } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import path from "node:path";

const root = path.resolve(process.argv[2] || ".");
const port = Number(process.env.PORT || 4173);
const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".glb": "model/gltf-binary",
};

createServer((request, response) => {
  const urlPath = decodeURIComponent(new URL(request.url, `http://${request.headers.host}`).pathname);
  let filePath = path.join(root, urlPath === "/" ? "index.html" : urlPath);
  if (!filePath.startsWith(root)) {
    response.writeHead(403).end("Forbidden");
    return;
  }
  if (!existsSync(filePath) || statSync(filePath).isDirectory()) filePath = path.join(root, "index.html");
  response.writeHead(200, {
    "Content-Type": mime[path.extname(filePath)] || "application/octet-stream",
    "Cache-Control": filePath.endsWith(".html") ? "no-cache" : "public, max-age=3600",
  });
  createReadStream(filePath).pipe(response);
}).listen(port, "127.0.0.1", () => {
  console.log(`Asgard open at http://127.0.0.1:${port}`);
});
