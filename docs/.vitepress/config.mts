import { defineConfig } from "vitepress";

export default defineConfig({
  title: "Spyde",
  description: "Declarative PDF layout for Node. No browser.",
  base: "/spyde/",
  cleanUrls: true,
  lastUpdated: true,
  sitemap: { hostname: "https://grandbusta.github.io/spyde/" },
  head: [["link", { rel: "icon", type: "image/svg+xml", href: "/spyde/favicon.svg" }]],
  themeConfig: {
    nav: [
      { text: "Guide", link: "/guide/getting-started" },
      { text: "API", link: "/api" },
      { text: "Changelog", link: "/changelog" },
      { text: "npm", link: "https://www.npmjs.com/package/@grandbusta/spyde" },
    ],
    sidebar: [
      {
        text: "Guide",
        items: [
          { text: "Getting started", link: "/guide/getting-started" },
          { text: "Pages", link: "/guide/pages" },
          { text: "Tables", link: "/guide/tables" },
          { text: "Text, fonts, images", link: "/guide/text-and-images" },
          { text: "Live preview", link: "/guide/live-preview" },
          { text: "Examples", link: "/guide/examples" },
          { text: "How it works", link: "/guide/how-it-works" },
          { text: "Using Spyde with an AI assistant", link: "/guide/for-llms" },
        ],
      },
      {
        text: "Reference",
        items: [
          { text: "API", link: "/api" },
          { text: "Performance", link: "/performance" },
          { text: "Changelog", link: "/changelog" },
        ],
      },
    ],
    socialLinks: [{ icon: "github", link: "https://github.com/Grandbusta/spyde" }],
    editLink: { pattern: "https://github.com/Grandbusta/spyde/edit/main/docs/:path", text: "Edit this page" },
    search: { provider: "local" },
    footer: { message: "MIT licensed." },
  },
});
