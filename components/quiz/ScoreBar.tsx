"use client";

interface Props {
  normalized: number; // 0..1
  topScore?: boolean;
  hasData?: boolean; // false = no stated positions on the questions answered
  label?: string;
}

export default function ScoreBar({ normalized, topScore, label, hasData = true }: Props) {
  if (!hasData) {
    return <p className="text-xs text-gray-400 italic">No stated positions on the questions you answered</p>;
  }
  const pct = Math.round(normalized * 100);
  const barColor = topScore ? "bg-blue-600" : "bg-gray-400";

  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`text-sm font-semibold w-10 text-right ${topScore ? "text-blue-700" : "text-gray-500"}`}>
        {pct}%
      </span>
      {label && <span className="text-xs text-gray-500 whitespace-nowrap">{label}</span>}
    </div>
  );
}
