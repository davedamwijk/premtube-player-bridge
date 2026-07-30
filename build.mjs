import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";

const distDirectory = new URL("./dist/", import.meta.url);
const serverDirectory = new URL("./dist/server/", import.meta.url);
const metadataDirectory = new URL("./dist/.openai/", import.meta.url);

await rm(distDirectory, {
  recursive: true,
  force: true
});
await Promise.all([
  mkdir(serverDirectory, { recursive: true }),
  mkdir(metadataDirectory, { recursive: true })
]);
await cp(
  new URL("./index.html", import.meta.url),
  new URL("./dist/index.html", import.meta.url)
);
await cp(
  new URL("./.openai/hosting.json", import.meta.url),
  new URL("./dist/.openai/hosting.json", import.meta.url)
);

const html = await readFile(new URL("./index.html", import.meta.url), "utf8");
const workerSource = `const html = ${JSON.stringify(html)};

export default {
  async fetch(request) {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method Not Allowed", {
        status: 405,
        headers: { Allow: "GET, HEAD" }
      });
    }

    return new Response(request.method === "HEAD" ? null : html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=300",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "X-Content-Type-Options": "nosniff",
        "X-Robots-Tag": "noindex, nofollow"
      }
    });
  }
};
`;

await writeFile(new URL("./dist/server/index.js", import.meta.url), workerSource);
