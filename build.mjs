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
  new URL("./.openai/hosting.json", import.meta.url),
  new URL("./dist/.openai/hosting.json", import.meta.url)
);

const [template, apiKeyFile] = await Promise.all([
  readFile(new URL("./index.html", import.meta.url), "utf8"),
  readFile(new URL("./api-key.local.txt", import.meta.url), "utf8")
]);
const apiKey = apiKeyFile.trim();
if (!/^AIza[\w-]{20,}$/.test(apiKey)) {
  throw new Error("api-key.local.txt bevat geen geldige Google API-key");
}
const html = template.replace("__YOUTUBE_API_KEY__", apiKey);
await writeFile(new URL("./dist/index.html", import.meta.url), html);
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
