# Working on Spyde

Spyde is a declarative PDF layout library on PDFKit, for Node and the browser. This file is for
coding agents working on this repository. If you are *using* Spyde in another
project, the rules you want are in the docs: https://grandbusta.github.io/spyde/guide/for-llms

## Shape of the code

- `src/core/`: geometry, constraints, the `Node` contract, text styles. Pure arithmetic.
- `src/nodes/`: one file per node. `flex.ts` is the engine behind row and column;
  `column.ts` is the only node that splits across pages; `table.ts` is a generator
  over column, row, and fill.
- `src/backend/`: the `Renderer` interface and its implementations. `pdfkit.ts` is the
  only file that imports pdfkit. `recording.ts` records draw calls as data; `html.ts`
  paints that data as HTML.
- `src/factories.ts` is the public API; `src/validate.ts` checks a tree for silent mistakes; `src/index.ts` is the public entry for Node and `src/index.browser.ts` for browsers; they export the same API, bound to a different `Platform` (`src/platform/`).
- `examples/` are runnable documents; `docs/` is the VitePress site (own package.json).

## Rules

- Layout runs once, in `layout()`. `paint()` never measures; it draws what layout stored.
  A node's returned size must satisfy its constraints: call `constrain()` before returning.
- Nothing throws for layout reasons. Overflow clips. Keep it that way.
- Every public function takes content first, settings second. New names must be
  guessable from the word alone; no jargon.
- Only `backend/pdfkit.ts` may import pdfkit. Public byte types are `Uint8Array`.
- Runtime dependency is pdfkit and nothing else. Dev dependencies are typescript, two
  type packages, and esbuild (it bundles `dist/spyde.browser.js`, the one-file browser
  build). Tooling that needs more lives in its own folder with its own package.json
  (`docs/`, `editor/`, later `bench/`).
- Tests: layout logic against `test/fakeRenderer.ts` (deterministic measurer), backends
  against real PDFKit, end-to-end through `src/index.ts`. `npm test` builds first.
- Do not cite planning-document ids in code comments or tests; explain in words.
- Do not commit; the maintainer reviews and commits.

## Commands

```sh
npm run build      # tsc -> dist/, then the browser bundle
npm test           # build, compile tests, and run node --test
npm run editor:dev # the live editor
npm run example    # write examples/*.pdf
npm run preview    # live preview server
npm run docs:dev   # documentation site
```
