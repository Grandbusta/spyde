// Runs templates off the main thread. Loads Spyde once, then answers
// requests: "run" returns findings and the HTML fragment, "pdf" returns
// bytes. A template's exported `options` go to validate and render. A
// template that throws becomes an error reply; one that never
// returns is the page's problem to kill (see runner.ts).
import * as spyde from "@grandbusta/spyde";
import { evaluateTemplate, isNode } from "./evaluate.js";
import type { Request, Response } from "./protocol.js";

const post = (msg: Response, transfer: Transferable[] = []) => (self as unknown as Worker).postMessage(msg, transfer);

function build(code: string, data: unknown) {
  const { tree, options } = evaluateTemplate(code, data, spyde as unknown as Record<string, unknown>);
  if (!isNode(tree)) {
    throw new Error("The template must produce a Spyde node: define `template = (data) => column([...])`, or `doc = column([...])`.");
  }
  return { tree: tree as spyde.Node, options: (options ?? {}) as spyde.RenderOptions };
}

self.onmessage = async (event: MessageEvent<Request>) => {
  const req = event.data;
  const started = performance.now();
  try {
    const { tree, options } = build(req.code, req.data);
    if (req.type === "run") {
      const findings = spyde.validate(tree, { defaultStyle: options.defaultStyle });
      const html = spyde.renderHtml(tree, options);
      const pageCount = (html.match(/class="spyde-page"/g) ?? []).length;
      post({ id: req.id, type: "run", findings, html, pageCount, ms: performance.now() - started });
    } else {
      const bytes = await spyde.render(tree, options);
      post({ id: req.id, type: "pdf", bytes, ms: performance.now() - started }, [bytes.buffer]);
    }
  } catch (err) {
    post({ id: req.id, type: "error", message: err instanceof Error ? err.message : String(err) });
  }
};
