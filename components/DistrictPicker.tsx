"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { NO_RACE, type DistrictOption, type DistrictSelection } from "@/lib/districts";

interface Props {
  options: DistrictOption[];
  selection: DistrictSelection;
  lookupUrl?: string | null;
  // Save somewhere other than the URL (e.g. on a guide)
  onChange?: (type: string, code: string) => void;
}

export default function DistrictPicker({ options, selection, lookupUrl, onChange }: Props) {
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
