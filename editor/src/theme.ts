// Light or dark. The page follows the system unless the person chose,
// and the choice is kept in this browser. Monaco is switched to match.
import type * as Monaco from "monaco-editor";

export type Theme = "light" | "dark";
const KEY = "spyde-editor-theme";
const system = window.matchMedia("(prefers-color-scheme: dark)");
let monaco: typeof Monaco | undefined;

function stored(): Theme | undefined {
  try {
    const v = localStorage.getItem(KEY);
    return v === "light" || v === "dark" ? v : undefined;
  } catch {
    return undefined;
  }
}

export function currentTheme(): Theme {
  return stored() ?? (system.matches ? "dark" : "light");
}

function apply() {
  const choice = stored();
  if (choice) document.documentElement.dataset.theme = choice;
  else delete document.documentElement.dataset.theme;
  monaco?.editor.setTheme(currentTheme() === "dark" ? "vs-dark" : "vs");
  document.dispatchEvent(new CustomEvent("themechange", { detail: currentTheme() }));
}

export function toggleTheme() {
  try {
    localStorage.setItem(KEY, currentTheme() === "dark" ? "light" : "dark");
  } catch {
    // Storage blocked: the toggle still works for this page load.
    document.documentElement.dataset.theme = currentTheme() === "dark" ? "light" : "dark";
  }
  apply();
}

/** Call once Monaco exists so its theme follows the page. */
export function attachMonaco(m: typeof Monaco) {
  monaco = m;
  apply();
}

system.addEventListener("change", apply);
apply();
