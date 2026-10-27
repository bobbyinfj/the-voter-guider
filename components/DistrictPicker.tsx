"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { NO_RACE, type DistrictOption, type DistrictSelection } from "@/lib/districts";
import type { DistrictMaps } from "@/lib/maps";
import DistrictMap from "./DistrictMap";

interface Props {
  options: DistrictOption[];
  selection: DistrictSelection;
  lookupUrl?: string | null;
  // Save somewhere other than the URL (e.g. on a guide)
  onChange?: (type: string, code: string) => void;
  // Maps of the districts offered, from official boundary files
  maps?: DistrictMaps | null;
}

export default function DistrictPicker({ options, selection, lookupUrl, onChange, maps }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (options.length === 0) return null;

  const setDistrict = (type: string, code: string) => {
    if (onChange) return onChange(type, code);
    const params = new URLSearchParams(searchParams.toString());
    if (code) params.set(type, code);
    else params.delete(type);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const chosenCount = options.filter((o) => selection[o.type]).length;
  const shown = maps ? options.flatMap((o) => maps.maps.filter((m) => m.districtType === o.type).map((m) => ({ option: o, map: m }))) : [];
  const sources = shown.length && maps ? [...shown.map((s) => s.map.source), ...maps.base.sources] : [];

  return (
    <div className="border-[1.5px] border-ballot-ink bg-ballot-paper p-4 font-sans">
      <h3 className="font-semibold text-gray-800 text-sm">Your districts</h3>
      <p className="text-xs text-gray-500 mt-1 mb-3">
        {chosenCount === options.length
          ? "Showing only the races on your ballot."
          : options.some((o) => o.type === "city") && !selection.city
            ? "This ballot covers more than one city. Pick yours to see just your races."
            : "Pick your districts to hide races you won't see. Until then, every district's race is shown."}
      </p>
      <div className="space-y-3">
        {options.map((option) => (
          <label key={option.type} className="block">
            <span className="text-xs font-medium text-gray-600">{option.label}</span>
            <select
              value={selection[option.type] ?? ""}
              onChange={(e) => setDistrict(option.type, e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-blue-500 focus:outline-none"
            >
              <option value="">{option.type === "city" ? "Every city" : "All districts"}</option>
              {option.codes.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
              {/* Matches no district code, so it hides every race of this type */}
              {option.type !== "city" && <option value={NO_RACE}>My district isn&apos;t listed</option>}
            </select>
          </label>
        ))}
      </div>
      {maps && shown.length > 0 && (
        <details className="mt-3">
          <summary className="cursor-pointer text-sm font-semibold text-blue-700 hover:underline">
            See the district maps
          </summary>
          <p className="mt-1 text-xs text-gray-600">
            Tap your area to pick its district. Bold numbers have a race on this ballot; gray ones don&apos;t this
            year. The dashed line is {maps.base.city.name}&apos;s city limits. Boundaries are simplified for display, so
            near a line, check the official lookup below.
          </p>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            {shown.map(({ option, map }) => (
              <DistrictMap
                key={option.type}
                base={maps.base}
                map={map}
                label={option.label}
                selected={selection[option.type]}
                onPick={(code) => setDistrict(option.type, code)}
              />
            ))}
          </div>
          <p className="mt-2 text-[0.6875rem] text-gray-500">
            Map data:{" "}
            {sources
              .filter((s, i) => sources.findIndex((t) => t.url === s.url) === i)
              .map((s, i) => (
                <span key={s.url}>
                  {i > 0 && " · "}
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    {s.title}
                  </a>
                </span>
              ))}{" "}
            ({sources[0]?.publisher}, retrieved {sources[0]?.retrieved}).
          </p>
        </details>
      )}
      {lookupUrl && (
        <a
          href={lookupUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-600 hover:underline mt-3 inline-block"
        >
          Not sure? Look up your districts ↗
        </a>
      )}
    </div>
  );
}
