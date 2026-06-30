import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { readFile } from "node:fs/promises";

const preferredPort = Number(process.env.PORT || 4173);
const root = process.cwd();

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webmanifest": "application/manifest+json; charset=utf-8"
};

function buildServer(port) {
  return createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://localhost:${port}`);
    const requested = url.pathname === "/" ? "/index.html" : url.pathname;
    const safePath = normalize(decodeURIComponent(requested)).replace(/^(\.\.[/\\])+/, "");
    const filePath = join(root, safePath);
    const content = await readFile(filePath);
    res.writeHead(200, { "Content-Type": types[extname(filePath)] || "application/octet-stream" });
    res.end(content);
  } catch {
    const content = await readFile(join(root, "index.html"));
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(content);
  }
  });
}

function listen(port) {
  const server = buildServer(port);
  server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      listen(port + 1);
      return;
    }
    throw error;
  });
  server.listen(port, () => {
    console.log(`Livia e Camila - Copa 2026: http://localhost:${port}`);
  });
}

listen(preferredPort);
