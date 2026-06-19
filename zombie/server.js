const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 8080);

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
};

function resolvePath(requestUrl) {
  const cleanUrl = decodeURIComponent(requestUrl.split("?")[0]);
  const relativePath = cleanUrl === "/" ? "/index.html" : cleanUrl;
  const normalizedPath = path.normalize(relativePath)
    .replace(/^(\.\.[/\\])+/, "")
    .replace(/^[/\\]+/, "");
  const filePath = path.join(ROOT, normalizedPath);

  if (!filePath.startsWith(ROOT)) {
    return null;
  }

  return filePath;
}

function send(response, statusCode, headers, body) {
  response.writeHead(statusCode, headers);
  response.end(body);
}

const server = http.createServer((request, response) => {
  const filePath = resolvePath(request.url || "/");
  if (!filePath) {
    send(response, 403, { "Content-Type": "text/plain; charset=utf-8" }, "Forbidden");
    return;
  }

  fs.stat(filePath, (statError, stats) => {
    if (statError) {
      send(response, 404, { "Content-Type": "text/plain; charset=utf-8" }, "Not found");
      return;
    }

    const finalPath = stats.isDirectory() ? path.join(filePath, "index.html") : filePath;

    fs.readFile(finalPath, (readError, data) => {
      if (readError) {
        send(response, 500, { "Content-Type": "text/plain; charset=utf-8" }, "Failed to read file");
        return;
      }

      const extension = path.extname(finalPath).toLowerCase();
      const contentType = MIME_TYPES[extension] || "application/octet-stream";
      send(
        response,
        200,
        {
          "Cache-Control": "no-store",
          "Content-Type": contentType,
        },
        data,
      );
    });
  });
});

server.listen(PORT, () => {
  console.log(`Zombie sandbox server running at http://localhost:${PORT}`);
});
