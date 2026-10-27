'use client'

import { NO_RACE } from '@/lib/districts'
import type { DistrictMap as Map, DistrictMaps } from '@/lib/maps'

// One district type's map: the districts around the city, the city limits dashed, and major
// roads and water for orientation. Picking a district on the map sets it in the picker; one with
// no race on this ballot sets "My district isn't listed".
export default function DistrictMap({
  base,
  map,
  label,
  selected,
  onPick,
}: {
  base: DistrictMaps['base']
  map: Map
  label: string
  selected: string | undefined
  onPick: (code: string) => void
}) {
  const fill = (code: string, onBallot: boolean) =>
    selected === code ? 'fill-amber-300' : onBallot ? 'fill-white hover:fill-amber-100' : 'fill-gray-200 hover:fill-gray-300'
  return (
    <figure className="space-y-1">
      <figcaption className="text-xs font-medium text-gray-600">{label}</figcaption>
      <svg
        viewBox={`0 0 ${base.width} ${base.height}`}
        className="w-full rounded border border-gray-300 bg-gray-50"
        role="group"
        aria-label={`Map of ${label.toLowerCase()} around ${base.city.name}`}
      >
        {map.districts.map((d) => (
          <path
            key={d.code}
            d={d.d}
            fillRule="evenodd"
            className={`${fill(d.code, d.onBallot)} cursor-pointer stroke-gray-500 transition-colors`}
            strokeWidth={1.2}
            role="button"
            tabIndex={0}
            aria-label={`${d.name}${d.onBallot ? '' : ': no race on this ballot'}`}
            aria-pressed={selected === d.code}
            onClick={() => onPick(d.onBallot ? d.code : NO_RACE)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onPick(d.onBallot ? d.code : NO_RACE)
              }
            }}
          >
            <title>{`${d.name}${d.onBallot ? '' : ' (no race on this ballot)'}`}</title>
          </path>
        ))}
        {base.water && <path d={base.water} className="pointer-events-none fill-sky-200/80" />}
        {base.roads && <path d={base.roads} className="pointer-events-none fill-none stroke-gray-400" strokeWidth={1.5} />}
        <path d={base.city.d} className="pointer-events-none fill-none stroke-gray-900" strokeWidth={3} strokeDasharray="10 6" />
        {map.districts.map((d) => (
          <text
            key={d.code}
            x={d.label[0]}
            y={d.label[1]}
            textAnchor="middle"
            dominantBaseline="central"
            className={`pointer-events-none font-sans ${d.onBallot ? 'fill-gray-900 font-bold' : 'fill-gray-500'}`}
            fontSize={34}
            stroke="white"
            strokeWidth={6}
            paintOrder="stroke"
          >
            {d.code}
          </text>
        ))}
      </svg>
    </figure>
  )
}
