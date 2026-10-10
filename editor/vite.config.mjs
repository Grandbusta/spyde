import { resolve } from "node:path";

export default {
  base: "/spyde/editor/",
  resolve: {
    // Use the library straight from the repository's build output.
    alias: { "@grandbusta/spyde": resolve(import.meta.dirname, "../dist/index.browser.js") },
  },
  build: { target: "es2022" },
  server: { fs: { allow: [resolve(import.meta.dirname, "..")] } },
};
