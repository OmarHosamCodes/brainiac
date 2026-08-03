import { describe, expect, test } from "bun:test";

import { buildSandboxSrcDoc, findSandboxViolation } from "./agent-ui-react-sandbox-view";

describe("agent-ui-react-sandbox-view", () => {
  test("blocks forbidden network and module APIs", () => {
    expect(findSandboxViolation("import x from 'y'")).toBe("import");
    expect(findSandboxViolation("fetch('/api')")).toBe("fetch");
    expect(findSandboxViolation("<div />")).toBe("JSX");
    expect(findSandboxViolation("render(h('Stack', {}, 'ok'))")).toBeNull();
  });

  test("srcdoc embeds CSP and opaque sandbox contract", () => {
    const src = buildSandboxSrcDoc("render(h('Text', {}, 'hi'))", { n: 1 });
    expect(src).toContain("Content-Security-Policy");
    expect(src).toContain("connect-src 'none'");
    expect(src).toContain("unsafe-eval");
    expect(src).toContain('"n":1');
  });
});
