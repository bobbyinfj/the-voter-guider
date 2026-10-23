// District picker helpers. An Office/Ballot with a districtType+districtCode only
// appears for voters who live in that district; one without is on every ballot. A ballot item
// can also carry more scopes in metadata.scope (e.g. { city: "montebello" } on a Montebello
// council race): it shows only when every scope the voter has picked matches.

export const DISTRICT_TYPES = {
  // First: an election covering several cities (LA County: Monterey Park and Montebello)
  city: "City",
  congressional: "U.S. House district",
  "state-senate": "State Senate district",
  "state-house": "State House / Assembly district",
  legislative: "Legislative district",
  "county-council": "County council district",
  "city-council": "City council district",
  "school-board": "School board trustee area",
  water: "Water district division",
} as const;

export type DistrictType = keyof typeof DISTRICT_TYPES;

export type DistrictSelection = Partial<Record<DistrictType, string>>;

// Picker value for voters whose district has no race of this type this year
export const NO_RACE = "none";

export function isDistrictType(value: string): value is DistrictType {
  return Object.prototype.hasOwnProperty.call(DISTRICT_TYPES, value);
}

const CODE_PATTERN = /^[A-Za-z0-9-]{1,24}$/;

// Accepts URL search params or an untrusted JSON object (e.g. guide metadata) and
// keeps only known district types with short alphanumeric codes.
export function parseDistrictSelection(
  input: Record<string, unknown> | URLSearchParams | null | undefined,
): DistrictSelection {
  const selection: DistrictSelection = {};
  if (!input) return selection;
  const entries =
    input instanceof URLSearchParams ? Array.from(input.entries()) : Object.entries(input);
  for (const [key, value] of entries) {
    if (isDistrictType(key) && typeof value === "string" && CODE_PATTERN.test(value)) {
      selection[key] = value;
    }
  }
  return selection;
}

interface DistrictScoped {
  districtType: string | null;
  districtCode: string | null;
  // metadata.scope on a Ballot, or scope passed directly
  metadata?: unknown;
  scope?: Record<string, string> | null;
}

// Every district an item is limited to: its districtType/Code plus metadata.scope
export function scopesOf(item: DistrictScoped): [DistrictType, string][] {
  const out: [DistrictType, string][] = [];
  if (item.districtType && item.districtCode && isDistrictType(item.districtType)) out.push([item.districtType, item.districtCode]);
  const meta = item.metadata && typeof item.metadata === "object" ? (item.metadata as { scope?: unknown }).scope : null;
  for (const scope of [item.scope, meta])
    if (scope && typeof scope === "object")
      for (const [type, code] of Object.entries(scope))
        if (isDistrictType(type) && typeof code === "string" && !out.some(([t]) => t === type)) out.push([type, code]);
  return out;
}

// Races for a district the voter hasn't picked yet stay visible (labeled), so the
// page is still a complete ballot preview before any choice is made.
export function matchesSelection(item: DistrictScoped, selection: DistrictSelection): boolean {
  return scopesOf(item).every(([type, code]) => selection[type] === undefined || selection[type] === code);
}

// "monterey-park" → "Monterey Park"
export function cityLabel(code: string): string {
  return code.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

export interface DistrictOption {
  type: DistrictType;
  label: string;
  codes: { code: string; label: string }[];
}

// Builds picker options from the districts actually present on this ballot.
export function districtOptions(
  items: (DistrictScoped & { district?: string | null })[],
): DistrictOption[] {
  const byType = new Map<DistrictType, Map<string, string>>();
  for (const item of items) {
    for (const [type, code] of scopesOf(item)) {
      const codes = byType.get(type) ?? new Map<string, string>();
      if (!codes.has(code)) {
        const own = type === item.districtType;
        codes.set(code, type === "city" ? cityLabel(code) : own && item.district ? item.district : `District ${code}`);
      }
      byType.set(type, codes);
    }
  }
  return (Object.keys(DISTRICT_TYPES) as DistrictType[])
    .filter((type) => byType.has(type))
    .map((type) => ({
      type,
      label: DISTRICT_TYPES[type],
      codes: Array.from(byType.get(type)!.entries())
        .map(([code, label]) => ({ code, label }))
        .sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true })),
    }));
}
