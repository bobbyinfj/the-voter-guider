// District picker helpers. An Office/Ballot with a districtType+districtCode only
// appears for voters who live in that district; one without is on every ballot.

export const DISTRICT_TYPES = {
  congressional: "U.S. House district",
  "state-senate": "State Senate district",
  "state-house": "State House / Assembly district",
  legislative: "Legislative district",
  "county-council": "County council district",
  "city-council": "City council district",
} as const;

export type DistrictType = keyof typeof DISTRICT_TYPES;

export type DistrictSelection = Partial<Record<DistrictType, string>>;

export function isDistrictType(value: string): value is DistrictType {
  return Object.prototype.hasOwnProperty.call(DISTRICT_TYPES, value);
}

const CODE_PATTERN = /^[A-Za-z0-9-]{1,12}$/;

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
}

// Races for a district the voter hasn't picked yet stay visible (labeled), so the
// page is still a complete ballot preview before any choice is made.
export function matchesSelection(item: DistrictScoped, selection: DistrictSelection): boolean {
  if (!item.districtType || !item.districtCode) return true;
  if (!isDistrictType(item.districtType)) return true;
  const chosen = selection[item.districtType];
  return chosen === undefined || chosen === item.districtCode;
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
    if (!item.districtType || !item.districtCode || !isDistrictType(item.districtType)) continue;
    const codes = byType.get(item.districtType) ?? new Map<string, string>();
    if (!codes.has(item.districtCode)) {
      codes.set(item.districtCode, item.district ?? `District ${item.districtCode}`);
    }
    byType.set(item.districtType, codes);
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
