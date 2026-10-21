"use client";

import type { ContributionItem } from "@/lib/quiz/types";
import StanceBadge from "./StanceBadge";

interface Props {
  breakdown: ContributionItem[];
  maxPossible: number;
}

export default function BreakdownTable({ breakdown, maxPossible }: Props) {
  if (breakdown.length === 0) {
    return <p className="text-sm text-gray-500 italic">No questions answered yet.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-50 text-gray-600 text-left">
            <th className="px-3 py-2 font-medium border-b">Question</th>
            <th className="px-3 py-2 font-medium border-b">Issue</th>
            <th className="px-3 py-2 font-medium border-b text-center">Their stance</th>
            <th className="px-3 py-2 font-medium border-b text-center">Your stance</th>
            <th className="px-3 py-2 font-medium border-b text-center">Weight</th>
            <th className="px-3 py-2 font-medium border-b text-center">Importance</th>
            <th className="px-3 py-2 font-medium border-b text-right">Points</th>
          </tr>
        </thead>
        <tbody>
          {breakdown.map((item, i) => (
            <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="px-3 py-2 max-w-xs text-gray-700 text-xs">{item.questionPrompt}</td>
              <td className="px-3 py-2 text-gray-600 text-xs">{item.issueName}</td>
              <td className="px-3 py-2 text-center">
                <StanceBadge position={item.candidateStance} label={false} />
              </td>
              <td className="px-3 py-2 text-center">
                <StanceBadge position={item.userStance} label={false} />
              </td>
              <td className="px-3 py-2 text-center text-xs text-gray-500">×{item.qWeight.toFixed(1)}</td>
              <td className="px-3 py-2 text-center text-xs text-gray-500">
                {["—", "low", "med", "high"][item.importance] ?? item.importance}
              </td>
              <td className="px-3 py-2 text-right font-mono font-medium text-xs">
                <span className={item.contribution > 0 ? "text-blue-700" : "text-gray-400"}>
                  +{item.contribution.toFixed(1)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-gray-50">
            <td colSpan={6} className="px-3 py-2 text-right text-xs text-gray-500 font-medium">
              Total / Max
            </td>
            <td className="px-3 py-2 text-right font-mono font-bold text-xs text-blue-700">
              {breakdown.reduce((s, b) => s + b.contribution, 0).toFixed(1)} / {maxPossible.toFixed(1)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
