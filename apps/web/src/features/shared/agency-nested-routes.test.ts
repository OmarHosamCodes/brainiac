import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";

const routesDir = join(import.meta.dir, "../../routes/_authenticated/_agency-chrome");

describe("agency nested file routes", () => {
  test("list routes are indexes so $id siblings render through the implicit Outlet", () => {
    for (const name of ["clients", "projects", "reports"] as const) {
      expect(existsSync(join(routesDir, `agency.${name}.index.tsx`))).toBe(true);
      expect(existsSync(join(routesDir, `agency.${name}.tsx`))).toBe(false);
    }
  });
});
