import { resolve } from "node:path";

export default {
  // Only because this example links the library from the repository two
  // folders up. An app that installs @grandbusta/spyde from npm needs none of this.
  turbopack: { root: resolve(import.meta.dirname, "../..") },
};
