// The browser platform. `pdfkit` resolves to PDFKit's own browser build here
// because bundlers honour the package's export conditions, the same way they
// pick Spyde's `index.browser.js`. Two differences from Node: the standard
// fonts are separate modules that must be registered, and there are no file
// paths.
import * as pdfkit from "pdfkit";
import Courier from "pdfkit/standard-fonts/Courier";
import CourierBold from "pdfkit/standard-fonts/CourierBold";
import CourierBoldOblique from "pdfkit/standard-fonts/CourierBoldOblique";
import CourierOblique from "pdfkit/standard-fonts/CourierOblique";
import Helvetica from "pdfkit/standard-fonts/Helvetica";
import HelveticaBold from "pdfkit/standard-fonts/HelveticaBold";
import HelveticaBoldOblique from "pdfkit/standard-fonts/HelveticaBoldOblique";
import HelveticaOblique from "pdfkit/standard-fonts/HelveticaOblique";
import Symbol from "pdfkit/standard-fonts/Symbol";
import TimesBold from "pdfkit/standard-fonts/TimesBold";
import TimesBoldItalic from "pdfkit/standard-fonts/TimesBoldItalic";
import TimesItalic from "pdfkit/standard-fonts/TimesItalic";
import TimesRoman from "pdfkit/standard-fonts/TimesRoman";
import ZapfDingbats from "pdfkit/standard-fonts/ZapfDingbats";
import type { Platform } from "../backend/platform.js";

// The browser build exports registerStdFonts beside the class; the Node type
// definitions do not know it, hence the cast. All fourteen together are 52 KB.
const mod = pdfkit as unknown as { default: typeof import("pdfkit"); registerStdFonts(...fonts: object[]): void };
mod.registerStdFonts(
  Courier, CourierBold, CourierBoldOblique, CourierOblique,
  Helvetica, HelveticaBold, HelveticaBoldOblique, HelveticaOblique,
  Symbol, TimesBold, TimesBoldItalic, TimesItalic, TimesRoman, ZapfDingbats,
);

export const browserPlatform: Platform = {
  PDFDocument: mod.default,
  readFile: (path) => {
    throw new Error(
      `Cannot read "${path}": there are no file paths in a browser. ` +
      `Fetch the font or image and pass its bytes (a Uint8Array) instead.`,
    );
  },
};
