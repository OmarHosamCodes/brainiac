import { describe, expect, test } from "bun:test";

import {
  extractMapPinsFromToolOutput,
  extractMapPinsFromToolParts,
} from "./workspace-agent-map-pins";

describe("workspace-agent-map-pins", () => {
  test("returns empty when the tool result has no coordinates", () => {
    expect(extractMapPinsFromToolOutput({ nodes: [] })).toEqual([]);
    expect(extractMapPinsFromToolParts([{ output: { ok: true } }])).toEqual([]);
  });

  test("reads lat/lng objects and projects them onto the map", () => {
    const pins = extractMapPinsFromToolOutput({
      locations: [
        { name: "Cairo", lat: 30.0444, lng: 31.2357, address: "Egypt" },
        { name: "Alexandria", latitude: 31.2001, longitude: 29.9187 },
      ],
    });
    expect(pins).toHaveLength(2);
    expect(pins[0]?.label).toBe("Cairo");
    expect(pins[0]?.detail).toBe("Egypt");
    expect(pins[0]?.x).toBeGreaterThan(0);
    expect(pins[0]?.y).toBeGreaterThan(0);
  });

  test("reads GeoJSON [lng, lat] coordinates", () => {
    const pins = extractMapPinsFromToolOutput({
      label: "Office",
      coordinates: [31.2357, 30.0444],
    });
    expect(pins).toHaveLength(1);
    expect(pins[0]?.label).toBe("Office");
  });
});
