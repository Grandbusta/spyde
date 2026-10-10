// Turn template source into a document tree. Plain JavaScript so it can be
// checked under Node as well as run in the worker.
//
// The template is JavaScript (the page transpiles TypeScript first). It may
// define `template`, a function of data, or `doc`, a finished tree, and
// optionally `options`, the render options (page size, default style). Its
// import of "@grandbusta/spyde" is stripped: the worker supplies every
// export as a variable in scope, so `column`, `text`, `table` and the rest
// just work.

const IMPORT_LINE = /^\s*import\s[^;]*?from\s*["']@grandbusta\/spyde["'];?\s*$/gm;
const EXPORT_DEFAULT = /^\s*export\s+default\s+/m;
const EXPORT_KEYWORD = /^\s*export\s+(const|let|function|async function)\s/gm;
// `export { a as default, options }`: the list form some compilers emit.
const EXPORT_LIST = /^\s*export\s*\{([^}]*)\};?\s*$/gm;

function exportList(_, names) {
  return names
    .split(",")
    .map((n) => n.trim().split(/\s+as\s+/))
    .filter(([local, alias]) => alias && alias !== local)
    .map(([local, alias]) => `const ${alias === "default" ? "template" : alias} = ${local};`)
    .join("\n");
}

/**
 * @param {string} code    template source, JavaScript
 * @param {unknown} data   sample data passed to `template(data)`
 * @param {Record<string, unknown>} spyde  the library's exports
 * @returns {{ tree: unknown, options: unknown }} whatever the template produced; the caller checks `tree` is a node
 */
export function evaluateTemplate(code, data, spyde) {
  const body = code
    .replace(IMPORT_LINE, "")
    .replace(EXPORT_DEFAULT, "const template = ")
    .replace(EXPORT_KEYWORD, "$1 ")
    .replace(EXPORT_LIST, exportList);
  const names = Object.keys(spyde);
  const fn = new Function(
    ...names,
    "data",
    `"use strict";\n${body}\n;return { tree: typeof template === "function" ? template(data) : (typeof doc !== "undefined" ? doc : undefined), options: typeof options !== "undefined" ? options : undefined };`,
  );
  return fn(...names.map((n) => spyde[n]), data);
}

/** True if `value` looks like a Spyde node: it can lay itself out and paint. */
export function isNode(value) {
  return value !== null && typeof value === "object" && typeof value.layout === "function" && typeof value.paint === "function";
}
