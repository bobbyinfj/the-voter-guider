'use client'

import { useState, useEffect } from 'react'
import { MapPin, Share2, Download, CheckCircle2 } from 'lucide-react'

interface USMapProps {
  selectedJurisdiction?: string
  onJurisdictionSelect?: (jurisdictionId: string) => void
  jurisdictions?: Array<{
    id: string
    name: string
    state: string
    fipsCode?: string
  }>
}

export default function USMap({ selectedJurisdiction, onJurisdictionSelect, jurisdictions = [] }: USMapProps) {
  const [hoveredState, setHoveredState] = useState<string | null>(null)

  // Key jurisdictions we're tracking
  const keyJurisdictions = [
    { state: 'CA', name: 'Los Angeles County', id: 'ca-la' },
    { state: 'WA', name: 'King County', id: 'wa-king' },
    { state: 'CO', name: 'Larimer County', id: 'co-larimer' },
  ]

  const handleStateClick = (stateCode: string) => {
    const jurisdiction = keyJurisdictions.find(j => j.state === stateCode)
    if (jurisdiction && onJurisdictionSelect) {
      onJurisdictionSelect(jurisdiction.id)
    }
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-xl font-semibold mb-4 text-gray-800">Select Your Jurisdiction</h3>
        
        {/* Simplified US Map */}
        <div className="relative w-full aspect-[16/10] bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg overflow-hidden border-2 border-gray-200">
          <svg
            viewBox="0 0 1000 600"
            className="w-full h-full"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* US Outline */}
            <path
              d="M 100 100 L 150 95 L 250 90 L 350 88 L 450 85 L 550 82 L 650 80 L 750 82 L 850 88 L 900 95 L 930 110 L 940 140 L 945 180 L 940 220 L 930 260 L 915 300 L 895 340 L 870 375 L 840 405 L 805 430 L 765 450 L 720 465 L 670 475 L 615 480 L 560 482 L 505 480 L 450 475 L 400 465 L 355 450 L 315 430 L 280 405 L 250 375 L 225 340 L 205 300 L 190 260 L 180 220 L 175 180 L 180 140 L 190 110 L 210 100 Z M 100 100 L 80 120 L 65 160 L 55 210 L 50 260 L 48 310 L 50 360 L 55 410 L 65 455 L 80 495 L 100 530 L 125 560 L 155 585 L 190 600 L 230 605 L 270 608 L 310 605 L 350 600 L 385 585 L 415 560 L 440 530 L 460 495 L 475 455 L 485 410 L 490 360 L 492 310 L 490 260 L 485 210 L 475 160 L 460 120 L 440 100 Z"
              fill="#e8f4f8"
              stroke="#1a5490"
              strokeWidth="2.5"
            />
            
            {/* California */}
            <path
              d="M 100 180 L 95 220 L 90 260 L 92 300 L 98 340 L 110 375 L 130 405 L 155 430 L 185 450 L 220 465 L 260 475 L 300 480 L 340 478 L 375 470 L 405 455 L 430 435 L 450 410 L 465 380 L 470 340 L 465 300 L 455 260 L 440 220 L 420 180 L 395 150 L 365 130 L 330 120 L 290 115 L 250 118 L 210 125 L 175 140 L 145 160 L 120 180 Z"
              fill={selectedJurisdiction === 'ca-la' ? '#4285f4' : hoveredState === 'CA' ? '#5a9df4' : '#cbd5e1'}
              stroke="#1a5490"
              strokeWidth="2"
              className="cursor-pointer transition-all hover:opacity-80"
              onClick={() => handleStateClick('CA')}
              onMouseEnter={() => setHoveredState('CA')}
              onMouseLeave={() => setHoveredState(null)}
            />
            <text
              x="280"
              y="300"
              fontSize="18"
              fontWeight="bold"
              fill={selectedJurisdiction === 'ca-la' ? 'white' : '#1a5490'}
              className="pointer-events-none"
            >
              CA
            </text>

            {/* Washington */}
            <path
              d="M 100 100 L 95 80 L 105 65 L 125 55 L 150 50 L 175 48 L 200 50 L 220 55 L 235 65 L 245 80 L 248 100 L 245 120 L 235 135 L 220 145 L 200 150 L 175 152 L 150 150 L 125 145 L 105 135 L 100 120 Z"
              fill={selectedJurisdiction === 'wa-king' ? '#2a9d8f' : hoveredState === 'WA' ? '#3bb5a8' : '#cbd5e1'}
              stroke="#1a5490"
              strokeWidth="2"
              className="cursor-pointer transition-all hover:opacity-80"
              onClick={() => handleStateClick('WA')}
              onMouseEnter={() => setHoveredState('WA')}
              onMouseLeave={() => setHoveredState(null)}
            />
            <text
              x="175"
              y="100"
              fontSize="14"
              fontWeight="bold"
              fill={selectedJurisdiction === 'wa-king' ? 'white' : '#1a5490'}
              className="pointer-events-none"
            >
              WA
            </text>

            {/* Colorado */}
            <path
              d="M 480 240 L 510 235 L 535 240 L 550 255 L 555 275 L 550 295 L 535 310 L 510 315 L 485 310 L 470 295 L 465 275 L 470 255 Z"
              fill={selectedJurisdiction === 'co-larimer' ? '#e63946' : hoveredState === 'CO' ? '#f55c6a' : '#cbd5e1'}
              stroke="#1a5490"
              strokeWidth="2"
              className="cursor-pointer transition-all hover:opacity-80"
              onClick={() => handleStateClick('CO')}
              onMouseEnter={() => setHoveredState('CO')}
              onMouseLeave={() => setHoveredState(null)}
            />
            <text
              x="510"
              y="275"
              fontSize="14"
              fontWeight="bold"
              fill={selectedJurisdiction === 'co-larimer' ? 'white' : '#1a5490'}
              className="pointer-events-none"
            >
              CO
            </text>
          </svg>

          {/* Legend */}
          <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-md">
            <div className="text-xs font-semibold text-gray-700 mb-2">Available Jurisdictions:</div>
            <div className="space-y-1">
              {keyJurisdictions.map((jurisdiction) => (
                <div
                  key={jurisdiction.id}
                  className={`text-xs cursor-pointer px-2 py-1 rounded ${
                    selectedJurisdiction === jurisdiction.id
                      ? 'bg-blue-100 text-blue-800 font-semibold'
                      : 'hover:bg-gray-100'
                  }`}
                  onClick={() => onJurisdictionSelect?.(jurisdiction.id)}
                >
                  {jurisdiction.name}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

