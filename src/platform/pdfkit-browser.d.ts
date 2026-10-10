// PDFKit's browser build ships its standard fonts as separate modules. The
// Node type definitions do not describe them.
declare module "pdfkit/standard-fonts/*" {
  const font: object;
  export default font;
}
