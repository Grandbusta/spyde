// The server side: the same document, rendered with the Node build. Use this
// route when the PDF has to be stored, emailed, or made from data the
// browser should not see.
import { render } from "@grandbusta/spyde";
import { invoiceDocument, type Invoice } from "../../../lib/invoice";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const data = (await req.json()) as Invoice;   // check the shape in a real app
  const pdf = await render(invoiceDocument(data), { info: { title: `Invoice #${data.number}` } });
  return new Response(pdf, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="invoice-${data.number}.pdf"`,
    },
  });
}
