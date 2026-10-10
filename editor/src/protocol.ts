// Messages between the page and the worker. Every request carries an id;
// the page ignores replies whose id is no longer the latest.
import type { Finding } from "@grandbusta/spyde";

export type Request =
  | { id: number; type: "run"; code: string; data: unknown }
  | { id: number; type: "pdf"; code: string; data: unknown };

export type Response =
  | { id: number; type: "run"; findings: Finding[]; html: string; pageCount: number; ms: number }
  | { id: number; type: "pdf"; bytes: Uint8Array; ms: number }
  | { id: number; type: "error"; message: string };
