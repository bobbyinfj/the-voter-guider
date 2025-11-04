'use client'

import { useState } from 'react'
import { MapPin } from 'lucide-react'

interface Jurisdiction {
  id: string
  name: string
  state: string
  fipsCode?: string
}

interface SimpleUSMapProps {
  selectedJurisdiction?: string
  onJurisdictionSelect?: (jurisdictionId: string) => void
  jurisdictions?: Jurisdiction[]
}

export default function SimpleUSMap({ 
  selectedJurisdiction, 
  onJurisdictionSelect,
  jurisdictions = [] 
}: SimpleUSMapProps) {
  const [hoveredState, setHoveredState] = useState<string | null>(null)

  const handleStateClick = (stateCode: string) => {
    const stateMap: Record<string, string> = {
      'CA': 'California',
      'WA': 'Washington',
      'CO': 'Colorado',
    }
    const stateName = stateMap[stateCode]
    const jurisdiction = jurisdictions.find(j => j.state === stateName)
    if (jurisdiction && onJurisdictionSelect) {
      onJurisdictionSelect(jurisdiction.id)
    }
  }

  const getStateColor = (stateCode: string) => {
    const stateMap: Record<string, string> = {
      'CA': 'California',
      'WA': 'Washington',
      'CO': 'Colorado',
    }
    const stateName = stateMap[stateCode]
    const isSelected = jurisdictions.some(j => j.id === selectedJurisdiction && j.state === stateName)
    
    if (isSelected) return 'fill-blue-600'
    if (hoveredState === stateCode) return 'fill-blue-400'
    return 'fill-gray-200'
  }

  const getTextColor = (stateCode: string) => {
    const stateMap: Record<string, string> = {
      'CA': 'California',
      'WA': 'Washington',
      'CO': 'Colorado',
    }
    const stateName = stateMap[stateCode]
    const isSelected = jurisdictions.some(j => j.id === selectedJurisdiction && j.state === stateName)
    return isSelected ? 'fill-white' : 'fill-gray-700'
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
        <h3 className="text-xl font-semibold mb-4 text-gray-800">Select Your Jurisdiction</h3>
        
        {/* Simplified Map */}
        <div className="relative w-full aspect-[16/10] bg-blue-50 rounded-lg overflow-hidden border border-gray-300">
          <svg
            viewBox="0 0 1000 600"
            className="w-full h-full"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* California - Simplified */}
            <path
              d="M 100 180 L 95 220 L 90 260 L 92 300 L 98 340 L 110 375 L 130 405 L 155 430 L 185 450 L 220 465 L 260 475 L 300 480 L 340 478 L 375 470 L 405 455 L 430 435 L 450 410 L 465 380 L 470 340 L 465 300 L 455 260 L 440 220 L 420 180 L 395 150 L 365 130 L 330 120 L 290 115 L 250 118 L 210 125 L 175 140 L 145 160 L 120 180 Z"
              className={`${getStateColor('CA')} stroke-white stroke-2 cursor-pointer transition-all hover:opacity-90`}
              onClick={() => handleStateClick('CA')}
              onMouseEnter={() => setHoveredState('CA')}
              onMouseLeave={() => setHoveredState(null)}
            />
            <text
              x="280"
              y="300"
              fontSize="20"
              fontWeight="bold"
              className={`${getTextColor('CA')} pointer-events-none`}
            >
              CA
            </text>

            {/* Washington - Simplified */}
            <path
              d="M 100 100 L 95 80 L 105 65 L 125 55 L 150 50 L 175 48 L 200 50 L 220 55 L 235 65 L 245 80 L 248 100 L 245 120 L 235 135 L 220 145 L 200 150 L 175 152 L 150 150 L 125 145 L 105 135 L 100 120 Z"
              className={`${getStateColor('WA')} stroke-white stroke-2 cursor-pointer transition-all hover:opacity-90`}
              onClick={() => handleStateClick('WA')}
              onMouseEnter={() => setHoveredState('WA')}
              onMouseLeave={() => setHoveredState(null)}
            />
            <text
              x="175"
              y="100"
              fontSize="16"
              fontWeight="bold"
              className={`${getTextColor('WA')} pointer-events-none`}
            >
              WA
            </text>

            {/* Colorado - Simplified */}
            <path
              d="M 480 240 L 510 235 L 535 240 L 550 255 L 555 275 L 550 295 L 535 310 L 510 315 L 485 310 L 470 295 L 465 275 L 470 255 Z"
              className={`${getStateColor('CO')} stroke-white stroke-2 cursor-pointer transition-all hover:opacity-90`}
              onClick={() => handleStateClick('CO')}
              onMouseEnter={() => setHoveredState('CO')}
              onMouseLeave={() => setHoveredState(null)}
            />
            <text
              x="510"
              y="275"
              fontSize="16"
              fontWeight="bold"
              className={`${getTextColor('CO')} pointer-events-none`}
            >
              CO
            </text>
          </svg>
        </div>

        {/* Jurisdiction List */}
        <div className="mt-4">
          <h4 className="text-sm font-semibold text-gray-800 mb-3">Available Jurisdictions:</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {jurisdictions
              .filter(j => ['California', 'Washington', 'Colorado'].includes(j.state))
              .map((jurisdiction) => (
                <button
                  key={jurisdiction.id}
                  onClick={() => onJurisdictionSelect?.(jurisdiction.id)}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${
                    selectedJurisdiction === jurisdiction.id
                      ? 'border-blue-600 bg-blue-50 text-blue-900 font-semibold'
                      : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50 text-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <MapPin className={`w-4 h-4 ${selectedJurisdiction === jurisdiction.id ? 'text-blue-600' : 'text-gray-400'}`} />
                    <div>
                      <div className="font-medium">{jurisdiction.name}</div>
                      <div className="text-sm text-gray-600">{jurisdiction.state}</div>
                    </div>
                  </div>
                </button>
              ))}
          </div>
        </div>
      </div>
    </div>
  )
}

