/** Extract map pins from tool results when they carry geographic coordinates. */

export type WorkspaceAgentMapPin = {
  id: string;
  label: string;
  detail: string;
  x: number;
  y: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readCoord(record: Record<string, unknown>, keys: readonly string[]): number | null {
  for (const key of keys) {
    const value = asNumber(record[key]);
    if (value !== null) return value;
  }
  return null;
}

function pinFromRecord(
  record: Record<string, unknown>,
): { lat: number; lng: number; label: string; detail: string } | null {
  const label =
    typeof record.label === "string"
      ? record.label
      : typeof record.name === "string"
        ? record.name
        : typeof record.title === "string"
          ? record.title
          : "Pin";
  const detail =
    typeof record.detail === "string"
      ? record.detail
      : typeof record.address === "string"
        ? record.address
        : "";

  const lat = readCoord(record, ["lat", "latitude"]);
  const lng = readCoord(record, ["lng", "lon", "longitude"]);
  if (lat !== null && lng !== null) {
    return { lat, lng, label, detail };
  }

  const coordinates = record.coordinates;
  if (Array.isArray(coordinates) && coordinates.length >= 2) {
    const first = asNumber(coordinates[0]);
    const second = asNumber(coordinates[1]);
    if (first !== null && second !== null) {
      return { lng: first, lat: second, label, detail };
    }
  }

  return null;
}

function collectRecords(output: unknown): Record<string, unknown>[] {
  if (Array.isArray(output)) {
    return output.filter(isRecord);
  }
  if (!isRecord(output)) return [];

  for (const key of ["pins", "locations", "places", "results"] as const) {
    const value = output[key];
    if (Array.isArray(value)) return value.filter(isRecord);
  }

  return [output];
}

function projectPins(
  geo: Array<{ lat: number; lng: number; label: string; detail: string }>,
): WorkspaceAgentMapPin[] {
  const lats = geo.map((pin) => pin.lat);
  const lngs = geo.map((pin) => pin.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const latSpan = maxLat - minLat || 1;
  const lngSpan = maxLng - minLng || 1;

  return geo.map((pin, index) => ({
    id: `pin-${index}`,
    label: pin.label,
    detail: pin.detail,
    x: ((pin.lng - minLng) / lngSpan) * 80 + 10,
    y: (1 - (pin.lat - minLat) / latSpan) * 80 + 10,
  }));
}

export function extractMapPinsFromToolOutput(output: unknown): WorkspaceAgentMapPin[] {
  const geo = collectRecords(output).flatMap((record) => {
    const pin = pinFromRecord(record);
    return pin ? [pin] : [];
  });
  if (geo.length === 0) return [];
  return projectPins(geo);
}

export function extractMapPinsFromToolParts(
  toolParts: ReadonlyArray<{ output?: unknown }>,
): WorkspaceAgentMapPin[] {
  for (const part of toolParts) {
    const pins = extractMapPinsFromToolOutput(part.output);
    if (pins.length > 0) return pins;
  }
  return [];
}
