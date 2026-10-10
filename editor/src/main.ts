// The editor page: template and data on the left, the document on the
// right. Typing schedules a run; the run compiles the template with
// Monaco's TypeScript service, sends the JavaScript and the parsed data to
// the worker, and swaps the returned HTML into the result pane. Problems
// from every stage land in the strip under the editors. The header holds
// the examples, the PDF toggle, download, share and copy.
import type * as Monaco from "monaco-editor";
import type { Finding } from "@grandbusta/spyde";
import { compile, loadMonaco, type Problem } from "./monaco.js";
import { Runner } from "./runner.js";
import { examples, invoice } from "./examples.js";
import { decodeShare, encodeShare } from "./share.js";
import { attachMonaco, currentTheme, toggleTheme } from "./theme.js";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const status = $("status");
const result = $("result");
const problems = $("problems");
const frame = $<HTMLIFrameElement>("pdf");

const runner = new Runner();
const monaco = await loadMonaco();
attachMonaco(monaco);

// A share link carries the whole state; otherwise start with the invoice.
const shared = await decodeShare(location.hash);
const start = shared ?? invoice;
let name = shared ? "shared" : invoice.name.toLowerCase();
const templateModel = monaco.editor.createModel(start.code, "typescript", monaco.Uri.parse("file:///template.ts"));
const dataModel = monaco.editor.createModel(start.data, "json", monaco.Uri.parse("file:///data.json"));
const common: Monaco.editor.IStandaloneEditorConstructionOptions = {
  automaticLayout: true,
  minimap: { enabled: false },
  fontSize: 13,
  tabSize: 2,
  scrollBeyondLastLine: false,
  renderLineHighlight: "none",
  padding: { top: 12 },
};
const templateEditor = monaco.editor.create($("template"), { ...common, model: templateModel });
monaco.editor.create($("data"), { ...common, model: dataModel, lineNumbers: "off", folding: false });

let showPdf = false;
let seq = 0;
let timer = 0;

/** A run some milliseconds after the last keystroke; immediate when asked. */
function schedule(delay = 150) {
  window.clearTimeout(timer);
  timer = window.setTimeout(run, delay);
}

async function run() {
  const id = ++seq;
  status.textContent = "running…";
  const compiled = await compile(monaco, templateModel);
  if (id !== seq) return;

  let data: unknown;
  try {
    data = JSON.parse(dataModel.getValue());
  } catch (err) {
    report(compiled.problems, [], `Data is not valid JSON: ${(err as Error).message}`);
    status.textContent = "waiting for valid data";
    return;
  }
  if (compiled.problems.some((p) => p.fatal)) {
    report(compiled.problems, [], undefined);
    status.textContent = "fix the syntax error to run";
    return;
  }

  try {
    const r = await runner.run(compiled.js, data);
    if (id !== seq) return;
    result.innerHTML = r.html;
    report(compiled.problems, r.findings, undefined);
    status.textContent = `${r.pageCount} ${r.pageCount === 1 ? "page" : "pages"} in ${r.ms.toFixed(0)} ms`;
    if (showPdf) await loadPdf(compiled.js, data);
  } catch (err) {
    if (id !== seq) return;
    report(compiled.problems, [], (err as Error).message);
    status.textContent = "error";
  }
}

async function loadPdf(js: string, data: unknown) {
  const bytes = await runner.pdf(js, data);
  if (frame.src) URL.revokeObjectURL(frame.src);
  frame.src = URL.createObjectURL(new Blob([bytes as BlobPart], { type: "application/pdf" }));
}

/** Fill the strip under the editors. Compile problems first, then the run. */
function report(compileProblems: Problem[], findings: Finding[], runError: string | undefined) {
  problems.replaceChildren();
  const add = (level: string, text: string, where?: string, jump?: () => void) => {
    const li = document.createElement("li");
    li.className = level;
    const tag = document.createElement("b");
    tag.textContent = level;
    li.append(tag, " ");
    if (where) {
      const w = document.createElement("code");
      w.textContent = where;
      li.append(w, " ");
      if (jump) {
        li.classList.add("jump");
        li.onclick = jump;
      }
    }
    li.append(text);
    problems.append(li);
  };
  for (const p of compileProblems) {
    add("error", p.message, `${p.line}:${p.column}`, () => {
      templateEditor.setPosition({ lineNumber: p.line, column: p.column });
      templateEditor.revealLineInCenter(p.line);
      templateEditor.focus();
    });
  }
  if (runError) add("error", runError);
  for (const f of findings) add(f.level, f.message, f.path);
  if (!problems.childElementCount) add("ok", "No problems. validate() found nothing to report.");
}

templateModel.onDidChangeContent(() => schedule());
dataModel.onDidChangeContent(() => schedule());
$("run").onclick = () => schedule(0);

const menu = $<HTMLSelectElement>("example");
for (const e of examples) menu.add(new Option(e.name, e.name));
if (shared) menu.add(new Option("Shared link", "shared", true, true));
menu.onchange = () => {
  const e = examples.find((x) => x.name === menu.value);
  if (!e) return;
  name = e.name.toLowerCase();
  history.replaceState(null, "", location.pathname);
  templateModel.setValue(e.code);
  dataModel.setValue(e.data);
  schedule(0);
};

$("download").onclick = async () => {
  const compiled = await compile(monaco, templateModel);
  let data: unknown;
  try {
    data = JSON.parse(dataModel.getValue());
  } catch {
    return flash("Fix the data first");
  }
  try {
    const bytes = await runner.pdf(compiled.js, data);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([bytes as BlobPart], { type: "application/pdf" }));
    a.download = `${name}.pdf`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
  } catch (err) {
    flash((err as Error).message);
  }
};

$("share").onclick = async () => {
  const hash = await encodeShare({ code: templateModel.getValue(), data: dataModel.getValue() });
  history.replaceState(null, "", location.pathname + hash);
  await copy(location.href, "Link copied");
};

$("copy").onclick = () => copy(templateModel.getValue(), "Template copied");

async function copy(text: string, done: string) {
  try {
    await navigator.clipboard.writeText(text);
    flash(done);
  } catch {
    flash("Could not reach the clipboard");
  }
}

/** A short note in the status slot, then back to the run status. */
let flashTimer = 0;
function flash(note: string) {
  const previous = status.textContent;
  status.textContent = note;
  window.clearTimeout(flashTimer);
  flashTimer = window.setTimeout(() => {
    if (status.textContent === note) status.textContent = previous;
  }, 2000);
}
$("theme").onclick = toggleTheme;
document.addEventListener("themechange", () => {
  $("theme").textContent = currentTheme() === "dark" ? "Light" : "Dark";
});
$("theme").textContent = currentTheme() === "dark" ? "Light" : "Dark";
$("show-html").onclick = () => setMode(false);
$("show-pdf").onclick = () => setMode(true);

function setMode(pdf: boolean) {
  showPdf = pdf;
  frame.hidden = !pdf;
  result.hidden = pdf;
  $("show-html").classList.toggle("active", !pdf);
  $("show-pdf").classList.toggle("active", pdf);
  if (pdf) schedule(0);
}

setMode(false);
schedule(0);
