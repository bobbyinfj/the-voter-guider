// Official explanation of a ballot measure (verbatim from the state or county voter
// guide), shown on the election page and in guides.
export interface MeasureOfficial {
  yesMeans?: string | null;
  noMeans?: string | null;
  fiscalImpact?: string | null;
  placedBy?: string | null;
  passes?: string | null;
  sourceUrl?: string | null;
}

export function measureOfficial(metadata: unknown): MeasureOfficial {
  if (!metadata || typeof metadata !== "object") return {};
  const m = metadata as Record<string, unknown>;
  const s = (k: string) => (typeof m[k] === "string" ? (m[k] as string) : null);
  return {
    yesMeans: s("yesMeans"),
    noMeans: s("noMeans"),
    fiscalImpact: s("fiscalImpact"),
    placedBy: s("placedBy"),
    passes: s("passes"),
    sourceUrl: s("sourceUrl"),
  };
}

export default function MeasureExplainer({ official }: { official: MeasureOfficial }) {
  const { yesMeans, noMeans, fiscalImpact, placedBy, passes, sourceUrl } = official;
  if (!yesMeans && !noMeans && !fiscalImpact && !sourceUrl) return null;
  return (
    <div className="mt-3 space-y-2 text-sm">
      {(placedBy || passes) && (
        <p className="text-xs text-gray-500">{[placedBy, passes].filter(Boolean).join(" · ")}</p>
      )}
      {(yesMeans || noMeans) && (
        <div className="grid gap-2 sm:grid-cols-2">
          {yesMeans && (
            <div className="rounded-lg bg-green-50 border border-green-100 p-3">
              <p className="text-xs font-semibold text-green-800 mb-1">A YES vote means</p>
              <p className="text-gray-700">{yesMeans}</p>
            </div>
          )}
          {noMeans && (
            <div className="rounded-lg bg-red-50 border border-red-100 p-3">
              <p className="text-xs font-semibold text-red-800 mb-1">A NO vote means</p>
              <p className="text-gray-700">{noMeans}</p>
            </div>
          )}
        </div>
      )}
      {fiscalImpact && (
        <p className="text-xs text-gray-600">
          <span className="font-semibold">Fiscal impact:</span> {fiscalImpact}
        </p>
      )}
      {sourceUrl && (
        <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
          Official voter guide ↗
        </a>
      )}
    </div>
  );
}
