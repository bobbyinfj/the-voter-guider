"use client";

interface Props {
  position: number; // -2..+2
  label?: boolean;
}

const labels: Record<number, string> = {
  2: "Strongly agrees",
  1: "Agrees",
  0: "Mixed",
  "-1": "Disagrees",
  "-2": "Strongly disagrees",
};

const colors: Record<number, string> = {
  2: "bg-green-100 text-green-800 border-green-300",
  1: "bg-lime-100 text-lime-800 border-lime-300",
  0: "bg-gray-100 text-gray-600 border-gray-300",
  "-1": "bg-orange-100 text-orange-800 border-orange-300",
  "-2": "bg-red-100 text-red-800 border-red-300",
};

export default function StanceBadge({ position, label = true }: Props) {
  const key = position as keyof typeof colors;
  const colorClass = colors[key] ?? colors[0];
  const text = label ? (labels[key] ?? "Unknown") : ["--", "-", "~", "+", "++"][position + 2];
  return (
    <span className={`inline-block px-2 py-0.5 rounded border text-xs font-medium ${colorClass}`}>
      {text}
    </span>
  );
}
