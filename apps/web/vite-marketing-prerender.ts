import type { Plugin } from "vite";

const MARKETING_SHELL = `<div id="marketing-prerender-shell" class="marketing-prerender-shell" style="position:fixed;inset:0;z-index:9999;overflow:auto;min-height:100vh;background:light-dark(#f2f7f4,#09090b);color:light-dark(#18181b,#fafafa);color-scheme:light dark;font-family:'IBM Plex Sans',system-ui,sans-serif">
  <div style="max-width:72rem;margin:0 auto;padding:5rem 1.5rem 4rem">
    <p style="font-size:0.875rem;font-weight:600;letter-spacing:-0.01em;margin:0 0 2.5rem">Orch</p>
    <h1 style="max-width:36rem;font-size:clamp(2.25rem,5vw,3.75rem);font-weight:600;line-height:1.05;letter-spacing:-0.03em;margin:0">
      Map your thinking. Run your agency.
    </h1>
    <p style="max-width:28rem;margin-top:1.5rem;font-size:1.125rem;line-height:1.625;color:light-dark(#52525b,#71717a)">
      Canvas for ideas, Agency for execution.
    </p>
  </div>
</div>`;

export function marketingPrerenderShell(): Plugin {
  return {
    name: "marketing-prerender-shell",
    apply: "build",
    transformIndexHtml(html) {
      const withShell = html.replace(
        '<div id="root"></div>',
        `${MARKETING_SHELL}\n    <div id="root"></div>`,
      );
      return withShell.replace(
        "</head>",
        `    <link rel="preload" href="/fonts/ibm-plex-sans-latin-600.woff2" as="font" type="font/woff2" crossorigin />
  </head>`,
      );
    },
  };
}
