export default defineNuxtPlugin({
  name: "dir-auto",
  setup() {
    if (import.meta.server) return;

    const selector =
      'input:not([type="password"]):not([type="date"]):not([type="time"]):not([type="number"]):not([type="file"]):not([type="checkbox"]):not([type="radio"]):not([type="color"]), textarea, [contenteditable], [role="textbox"]';

    document.querySelectorAll(selector).forEach((el) => {
      el.setAttribute("dir", "auto");
    });

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === 1) {
            const el = node as Element;
            if (el.matches(selector)) {
              el.setAttribute("dir", "auto");
            }
            el.querySelectorAll(selector).forEach((child) => {
              child.setAttribute("dir", "auto");
            });
          }
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  },
});
