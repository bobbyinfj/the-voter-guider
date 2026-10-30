'use client'

import { useEffect, useRef, useState } from 'react'
import { ExternalLink } from 'lucide-react'
import { bracketStart, hasJoint, rateAt, taxOn, type Filer, type MeasureTaxRates } from '@/lib/taxRates'

// "Learn more" under a tax measure: the marginal tax rate at each income if it passes and if it
// fails (step lines, hover for the rates at any income), a box to see the difference at your
// income, and the LAO's table as a table. Series colors: categorical slots 1 and 2 (validated pair).
const YES = '#2a78d6'
const NO = '#eb6834'
const H = 240
const PAD = { left: 40, right: 104, top: 12, bottom: 32 }

const money = (n: number) => (n >= 1e6 ? `$${(n / 1e6).toFixed(n % 1e6 ? 1 : 0)}M` : `$${Math.round(n / 1000)}k`)
const dollars = (n: number) => `$${Math.round(n).toLocaleString()}`

export default function TaxRates({ rates, measureLabel }: { rates: MeasureTaxRates; measureLabel: string }) {
  const [filer, setFiler] = useState<Filer>('single')
  const [hover, setHover] = useState<number | null>(null)
  const [income, setIncome] = useState('')
  // Drawn at the box's real width, so the labels stay readable on a phone
  const box = useRef<HTMLDivElement>(null)
  const [W, setW] = useState(600)
  useEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, Math.round(e.contentRect.width))))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const B = rates.brackets
  const joint = hasJoint(rates)
  const at0 = (i: number) => bracketStart(B[i], filer)
  const top = at0(B.length - 1)
  // Room past the top bracket, on a round number so the ticks land on quarters of it
  const step = top > 1_000_000 ? 500_000 : 250_000
  const xMax = Math.ceil((top * 1.3) / step) * step
  const yMax = Math.ceil(Math.max(...B.map((b) => Math.max(b.yes, b.no))) / 2) * 2 + 1
  const x = (v: number) => PAD.left + (v / xMax) * (W - PAD.left - PAD.right)
  const y = (r: number) => PAD.top + (1 - r / yMax) * (H - PAD.top - PAD.bottom)
  const path = (s: 'yes' | 'no') =>
    B.map((b, i) => {
      const end = i + 1 < B.length ? at0(i + 1) : xMax
      return `${i ? 'L' : 'M'}${x(at0(i))},${y(b[s])} L${x(end)},${y(b[s])}`
    }).join(' ')
  const xTicks = Array.from({ length: xMax / step + 1 }, (_, i) => i * step).filter((_, i, a) => a.length <= 6 || i % 2 === 0)
  const yTicks = Array.from({ length: Math.floor(yMax / 2) + 1 }, (_, i) => i * 2)
  const typed = Number(income.replace(/[^0-9.]/g, ''))
  const at = hover ?? (typed > 0 ? Math.min(typed, xMax) : null)
  const diff = typed > 0 ? taxOn(B, filer, typed, 'yes') - taxOn(B, filer, typed, 'no') : null
  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const v = (((e.clientX - r.left) / r.width) * W - PAD.left) / (W - PAD.left - PAD.right)
    setHover(v >= 0 && v <= 1 ? Math.round((v * xMax) / 1000) * 1000 : null)
  }

  return (
    <section className="rounded-lg border border-gray-200 bg-white text-sm">
      <h4 className="px-2 py-1.5 text-xs font-semibold text-sky-950">Tax rates with and without {measureLabel}</h4>
      <div className="space-y-3 px-2 pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {joint ? (
          <div role="radiogroup" aria-label="Filing as" className="inline-flex overflow-hidden rounded-full border border-gray-300 text-xs">
            {(['single', 'joint'] as const).map((f) => (
              <button
                key={f}
                type="button"
                role="radio"
                aria-checked={filer === f}
                onClick={() => setFiler(f)}
                className={`px-2.5 py-0.5 ${filer === f ? 'bg-gray-900 font-semibold text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
              >
                {f === 'single' ? 'Single' : 'Married, filing jointly'}
              </button>
            ))}
          </div>
          ) : (
            <span className="text-xs text-gray-600">Same brackets for every filer</span>
          )}
          <p className="flex items-center gap-3 text-xs text-gray-700" aria-hidden>
            <span className="flex items-center gap-1">
              <svg width="18" height="6"><line x1="0" y1="3" x2="18" y2="3" stroke={YES} strokeWidth="2" /></svg>
              {rates.labels.yes}
            </span>
            <span className="flex items-center gap-1">
              <svg width="18" height="6"><line x1="0" y1="3" x2="18" y2="3" stroke={NO} strokeWidth="2" strokeDasharray="4 3" /></svg>
              {rates.labels.no}
            </span>
          </p>
        </div>

        <figure ref={box} className="min-w-0">
          <figcaption className="mb-1 text-xs font-semibold text-gray-900">
            Tax rate on each extra dollar of taxable income ({rates.tax})
          </figcaption>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            width={W}
            height={H}
            className="block max-w-full touch-none select-none"
            role="img"
            aria-label={`Step chart of the marginal tax rate by income, ${rates.labels.yes} and ${rates.labels.no}. The table below has the same numbers.`}
            onPointerMove={onMove}
            onPointerLeave={() => setHover(null)}
          >
            {yTicks.map((t) => (
              <g key={t}>
                <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="#e5e7eb" strokeWidth="1" />
                <text x={PAD.left - 6} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#4b5563">
                  {t}%
                </text>
              </g>
            ))}
            {xTicks.map((t) => (
              <text key={t} x={x(t)} y={H - PAD.bottom + 16} textAnchor="middle" fontSize="11" fill="#4b5563">
                {money(t)}
              </text>
            ))}
            <text x={(PAD.left + W - PAD.right) / 2} y={H - 2} textAnchor="middle" fontSize="11" fill="#4b5563">
              Taxable income
            </text>
            <path d={path('yes')} fill="none" stroke={YES} strokeWidth="2" strokeLinejoin="round" />
            <path d={path('no')} fill="none" stroke={NO} strokeWidth="2" strokeDasharray="5 4" strokeLinejoin="round" />
            {/* Direct labels at the right end, in ink, beside each line */}
            <text x={W - PAD.right + 6} y={y(B[B.length - 1].yes) + 4} fontSize="11" fill="#111827">
              {B[B.length - 1].yes}% if approved
            </text>
            <text x={W - PAD.right + 6} y={y(B[B.length - 1].no) + 4} fontSize="11" fill="#111827">
              {B[B.length - 1].no}% if rejected
            </text>
            {at !== null && (
              <g>
                <line x1={x(at)} x2={x(at)} y1={PAD.top} y2={H - PAD.bottom} stroke="#6b7280" strokeWidth="1" />
                <circle cx={x(at)} cy={y(rateAt(B, filer, at, 'yes'))} r="4" fill={YES} stroke="#fff" strokeWidth="2" />
                <circle cx={x(at)} cy={y(rateAt(B, filer, at, 'no'))} r="4" fill={NO} stroke="#fff" strokeWidth="2" />
              </g>
            )}
          </svg>
          <p className="min-h-[1.25rem] text-xs text-gray-800" aria-live="polite">
            {at !== null &&
              `At ${dollars(at)}: ${rateAt(B, filer, at, 'yes')}% if approved, ${rateAt(B, filer, at, 'no')}% if rejected, on each extra dollar.`}
          </p>
        </figure>

        <label className="block text-xs">
          <span className="font-semibold">Your taxable income</span>{' '}
          <input
            inputMode="numeric"
            value={income}
            onChange={(e) => setIncome(e.target.value)}
            placeholder="e.g. 500000"
            className="ml-1 w-32 rounded border border-gray-300 px-1.5 py-0.5"
          />
          {diff !== null && (
            <span className="mt-1 block text-gray-800">
              {Math.abs(diff) < 1
                ? 'No difference at this income.'
                : `${rates.labels.yes}: about ${dollars(Math.abs(diff))} a year ${diff > 0 ? 'more' : 'less'} than ${rates.labels.no.toLowerCase()}.`}
              <span className="block text-gray-600">
                Our math from the official brackets. Ignores deductions, credits and inflation adjustments.
              </span>
            </span>
          )}
        </label>

        <div className="text-xs">
          <table className="mt-1 w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-gray-300">
                <th className="py-1 pr-2 font-semibold">{joint ? (filer === 'single' ? 'Single filer: income from' : 'Joint filers: income from') : 'Taxable income from'}</th>
                <th className="py-1 pr-2 font-semibold">{rates.labels.now}</th>
                <th className="py-1 pr-2 font-semibold">{rates.labels.yes}</th>
                <th className="py-1 font-semibold">{rates.labels.no}</th>
              </tr>
            </thead>
            <tbody>
              {B.map((b) => (
                <tr key={bracketStart(b, filer)} className={`border-b border-gray-100 ${b.yes !== b.no ? 'font-semibold' : ''}`}>
                  <td className="py-0.5 pr-2">{money(bracketStart(b, filer))}</td>
                  <td className="py-0.5 pr-2">{b.now}%</td>
                  <td className="py-0.5 pr-2">{b.yes}%</td>
                  <td className="py-0.5">{b.no}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <ul className="ml-4 list-disc space-y-0.5 text-xs text-gray-800">
          {rates.quotes.map((q) => (
            <li key={q}>“{q}”</li>
          ))}
        </ul>
        <p className="text-xs text-sky-800">
          Rates and quotes from{' '}
          <a href={rates.source.url} target="_blank" rel="noopener noreferrer" className="underline">
            {rates.source.name}
            <ExternalLink className="ml-0.5 inline h-3 w-3 align-[-1px]" />
          </a>{' '}
          (retrieved {rates.source.retrieved}).
        </p>
      </div>
    </section>
  )
}
