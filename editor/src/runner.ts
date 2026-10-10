// The page's handle on the worker. Sends requests, matches replies by id,
// and if the worker does not answer in time, kills it and starts a fresh
// one so a looping template can never freeze the page.
import type { Request, Response } from "./protocol.js";

type RunResult = Extract<Response, { type: "run" }>;
type Pending = { resolve: (r: Response) => void; reject: (e: Error) => void; timer: number };

export class Runner {
  private worker!: Worker;
  private pending = new Map<number, Pending>();
  private nextId = 1;

  constructor(private readonly timeoutMs = 5000) {
    this.start();
  }

  /** Run the template and get findings plus the HTML fragment. */
  run(code: string, data: unknown): Promise<RunResult> {
    return this.send({ type: "run", code, data }) as Promise<RunResult>;
  }

  /** Run the template and get the PDF bytes. */
  async pdf(code: string, data: unknown): Promise<Uint8Array> {
    const r = await this.send({ type: "pdf", code, data });
    return (r as Extract<Response, { type: "pdf" }>).bytes;
  }

  private send(body: Omit<Request, "id">): Promise<Response> {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timer = window.setTimeout(() => {
        this.pending.delete(id);
        this.restart(new Error(`The template did not finish within ${this.timeoutMs / 1000} s and was stopped.`));
        reject(new Error(`Stopped after ${this.timeoutMs / 1000} s. Is there an infinite loop?`));
      }, this.timeoutMs);
      this.pending.set(id, { resolve, reject, timer });
      this.worker.postMessage({ id, ...body } as Request);
    });
  }

  private start() {
    this.worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
    this.worker.onmessage = (event: MessageEvent<Response>) => {
      const p = this.pending.get(event.data.id);
      if (!p) return;                      // a reply to a superseded request
      this.pending.delete(event.data.id);
      window.clearTimeout(p.timer);
      if (event.data.type === "error") p.reject(new Error(event.data.message));
      else p.resolve(event.data);
    };
    this.worker.onerror = (e) => this.restart(new Error(e.message));
  }

  private restart(reason: Error) {
    this.worker.terminate();
    for (const p of this.pending.values()) { window.clearTimeout(p.timer); p.reject(reason); }
    this.pending.clear();
    this.start();
  }
}
