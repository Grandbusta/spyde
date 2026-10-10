/**
 * The two things that differ between Node and a browser. Everything else in
 * the library is plain TypeScript that runs anywhere.
 */
export interface Platform {
  /** The PDFKit document class: the Node build, or the standalone browser bundle. */
  readonly PDFDocument: typeof import("pdfkit");
  /**
   * Read a file given by path, for fonts and images passed as strings. In a
   * browser there are no paths; the browser platform throws a clear error.
   */
  readFile(path: string): Uint8Array;
}
