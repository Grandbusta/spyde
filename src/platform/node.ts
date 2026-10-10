import { readFileSync } from "node:fs";
import PDFDocument from "pdfkit";
import type { Platform } from "../backend/platform.js";

export const nodePlatform: Platform = {
  PDFDocument,
  readFile: (path) => new Uint8Array(readFileSync(path)),
};
