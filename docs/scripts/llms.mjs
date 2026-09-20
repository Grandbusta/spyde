// Writes docs/public/llms.txt (an index) and docs/public/llms-full.txt (every page
// in one file) from the Markdown sources, so models and agents can read the
// documentation without a browser. Runs before `vitepress build`.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const site = "https://grandbusta.github.io/spyde";

const pages = [
  ["guide/getting-started", "Getting started"],
  ["guide/pages", "Pages"],
  ["guide/tables", "Tables"],
  ["guide/text-and-images", "Text, fonts, images"],
  ["guide/live-preview", "Live preview"],
  ["guide/examples", "Example"],
  ["guide/how-it-works", "How it works"],
  ["guide/for-llms", "Using Spyde with an AI assistant"],
  ["api", "API"],
  ["performance", "Performance"],
  ["changelog", "Changelog"],
];

function load(path) {
  const raw = readFileSync(join(root, `${path}.md`), "utf8");
  const m = raw.match(/^---\n([\s\S]*?)\n---\n/);
  const description = m ? (m[1].match(/^description:\s*"?(.*?)"?\s*$/m)?.[1] ?? "") : "";
  let body = m ? raw.slice(m[0].length) : raw;
  body = body.replace(/<svg[\s\S]*?<\/svg>/g, "[diagram omitted]");
  body = body.replace(/<div class="tabs">[\s\S]*?<label for="[^"]*">Code<\/label>[\s\S]*?<div class="panel">\n/g, "");
  body = body.replace(/<\/div>\n<div class="panel">[\s\S]*?<\/div>\n<\/div>/g, "");
  body = body.replace(/^<\/?div[^>]*>$\n?/gm, "");
  body = body.replace(/\]\(\/([^)]*)\)/g, `](${site}/$1)`);
  return { description, body: body.trim() };
}

const intro = `# Spyde

> Declarative PDF layout for Node on top of PDFKit. Describe a document as a tree of functions; Spyde lays out the pages, breaks them, and draws them. No browser, one runtime dependency.

Install: \`npm install @grandbusta/spyde\`. Node 20 or newer. TypeScript types included.
Repository: https://github.com/Grandbusta/spyde
`;

const index = intro + "\n## Docs\n\n" +
  pages.map(([p, t]) => `- [${t}](${site}/${p}): ${load(p).description}`).join("\n") +
  `\n\n## Optional\n\n- [Everything in one file](${site}/llms-full.txt)\n`;

const full = intro + "\n" + pages.map(([p, t]) => {
  const { body } = load(p);
  return `\n---\n\n<!-- ${site}/${p} -->\n\n${body}\n`;
}).join("");

mkdirSync(join(root, "public"), { recursive: true });
writeFileSync(join(root, "public", "llms.txt"), index);
writeFileSync(join(root, "public", "llms-full.txt"), full);
console.log(`llms.txt ${index.length} bytes, llms-full.txt ${full.length} bytes`);
