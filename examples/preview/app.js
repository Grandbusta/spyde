// Example app code. This is the part a real frontend owns; Spyde's output
// (the fragment the server returns) contains no script at all.
//
// The invoice is plain state. The server owns all layout: this page posts
// the state and shows what comes back. Two mechanisms make it feel live:
//   1. on every keystroke, patch the matching [data-field] text in place;
//   2. after 150 ms of quiet, fetch a fresh layout (wrapping, rows, pages).
const state = JSON.parse(document.getElementById("preview").dataset.sample);
const form = document.getElementById("form");
const preview = document.getElementById("preview");
const status = document.getElementById("status");

const get = (path) => path.split(".").reduce((o, k) => o?.[k], state);
const set = (path, value) => { const ks = path.split("."); let o = state; for (const k of ks.slice(0, -1)) o = o[k]; o[ks.at(-1)] = value; };

// 1. Instant patch. Fields whose length cannot change the layout.
form.addEventListener("input", (e) => {
  const name = e.target.name;
  if (!name) return;
  set(name, e.target.value);
  for (const el of preview.querySelectorAll(`[data-field="${name}"]`)) {
    const lines = String(e.target.value).split("\n");
    el.replaceChildren(...lines.map((l) => Object.assign(document.createElement("div"), { textContent: l || " " })));
  }
  schedule();
});

// 2. Re-layout on a pause.
let timer;
function schedule() { clearTimeout(timer); timer = setTimeout(refresh, 150); }
async function refresh() {
  status.textContent = "updating…";
  const res = await fetch("/preview", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(state) });
  preview.innerHTML = await res.text();
  status.textContent = `${preview.querySelectorAll(".spyde-page").length} page(s)`;
}

// Items are a list: edits go through the full refresh only.
function renderItems() {
  const box = document.getElementById("items");
  box.replaceChildren(...state.items.map((it, i) => {
    const row = document.createElement("div"); row.className = "item";
    row.innerHTML = `<input value="${esc(it.item)}" placeholder="Item"><input type="number" value="${it.qty}" min="0"><input type="number" value="${it.price}" step="0.01"><button type="button" title="Remove">×</button>`;
    const [item, qty, price, remove] = row.children;
    item.oninput = () => { it.item = item.value; schedule(); };
    qty.oninput = () => { it.qty = Number(qty.value); schedule(); };
    price.oninput = () => { it.price = Number(price.value); schedule(); };
    remove.onclick = () => { state.items.splice(i, 1); renderItems(); schedule(); };
    return row;
  }));
}
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
document.getElementById("add").onclick = () => { state.items.push({ item: "", qty: 1, price: 0 }); renderItems(); schedule(); };

// Download posts the same state to the PDF route.
document.getElementById("download").onclick = async () => {
  const res = await fetch("/invoice.pdf", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(state) });
  const url = URL.createObjectURL(await res.blob());
  Object.assign(document.createElement("a"), { href: url, download: `invoice-${state.number}.pdf` }).click();
  URL.revokeObjectURL(url);
};

// Fill the form from the sample. The first preview is already in the page,
// rendered by the server; fetches start with the first edit.
for (const el of form.querySelectorAll("[name]")) el.value = get(el.name) ?? "";
renderItems();
status.textContent = `${preview.querySelectorAll(".spyde-page").length} page(s)`;
