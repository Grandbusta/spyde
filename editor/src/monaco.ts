// Monaco from a CDN, set up for Spyde: the library's own declaration files
// are handed to its TypeScript service, so completions and type errors in
// the template match the published package. The same service emits the
// JavaScript the worker runs, so there is no separate transpiler.
/// <reference types="vite/client" />
import type * as Monaco from "monaco-editor";

const BASE = "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.52.2/min";
const PKG = "file:///node_modules/@grandbusta/spyde";

// Every .d.ts of the built library, as text, keyed by its path in dist/.
const libs = import.meta.glob("../../dist/**/*.d.ts", { query: "?raw", import: "default", eager: true }) as Record<string, string>;

type Win = Window & {
  require: { config(o: object): void; (deps: string[], cb: () => void): void };
  monaco: typeof Monaco;
  MonacoEnvironment: object;
};

function script(src: string) {
  return new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Could not load ${src}`));
    document.head.appendChild(s);
  });
}

export async function loadMonaco(): Promise<typeof Monaco> {
  const win = window as unknown as Win;
  // Monaco's own workers come from the CDN too; a same-origin blob wrapper
  // is what lets a cross-origin worker script start.
  win.MonacoEnvironment = {
    getWorkerUrl: () =>
      URL.createObjectURL(new Blob([`self.MonacoEnvironment={baseUrl:"${BASE}/"};importScripts("${BASE}/vs/base/worker/workerMain.js");`], { type: "text/javascript" })),
  };
  await script(`${BASE}/vs/loader.min.js`);
  win.require.config({ paths: { vs: `${BASE}/vs` } });
  await new Promise<void>((resolve) => win.require(["vs/editor/editor.main"], resolve));
  configureTypeScript(win.monaco);
  return win.monaco;
}

function configureTypeScript(monaco: typeof Monaco) {
  const ts = monaco.languages.typescript;
  ts.typescriptDefaults.setCompilerOptions({
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.NodeJs,
    strict: true,
    allowNonTsExtensions: true,
    baseUrl: "file:///",
    paths: { "@grandbusta/spyde": [`${PKG}/index.browser.d.ts`] },
  });
  ts.typescriptDefaults.setEagerModelSync(true);
  for (const [path, source] of Object.entries(libs)) {
    ts.typescriptDefaults.addExtraLib(source, `${PKG}/${path.replace(/^.*\/dist\//, "")}`);
  }
  ts.typescriptDefaults.addExtraLib(`{ "name": "@grandbusta/spyde", "types": "index.browser.d.ts" }`, `${PKG}/package.json`);
  // The library's internals mention PDFKit's types; the template never sees them.
  ts.typescriptDefaults.addExtraLib(`declare module "pdfkit" { const PDFDocument: any; export default PDFDocument; }`, "file:///node_modules/@types/pdfkit/index.d.ts");
}

export interface Problem {
  message: string;
  line: number;
  column: number;
  fatal: boolean;
}

export interface Compiled {
  js: string;
  problems: Problem[];
}

/** JavaScript for the template model, plus every diagnostic on it. */
export async function compile(monaco: typeof Monaco, model: Monaco.editor.ITextModel): Promise<Compiled> {
  const ts = monaco.languages.typescript;
  const client = await (await ts.getTypeScriptWorker())(model.uri);
  const uri = model.uri.toString();
  const [syntactic, semantic, out] = await Promise.all([
    client.getSyntacticDiagnostics(uri),
    client.getSemanticDiagnostics(uri),
    client.getEmitOutput(uri),
  ]);
  const toProblem = (fatal: boolean) => (d: Monaco.languages.typescript.Diagnostic): Problem => {
    const pos = model.getPositionAt(d.start ?? 0);
    return { message: flatten(d.messageText), line: pos.lineNumber, column: pos.column, fatal };
  };
  return {
    js: out.outputFiles[0]?.text ?? "",
    problems: [...syntactic.map(toProblem(true)), ...semantic.filter((d) => d.category === 1).map(toProblem(false))],
  };
}

function flatten(m: string | Monaco.languages.typescript.DiagnosticMessageChain): string {
  return typeof m === "string" ? m : m.messageText;
}
