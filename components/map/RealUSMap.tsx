'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { MapPin } from 'lucide-react'
import MapController from './MapController'

// Dynamically import Leaflet components to avoid SSR issues
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false })
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false })
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false })

// Import Leaflet CSS
import 'leaflet/dist/leaflet.css'

interface Jurisdiction {
  id: string
  name: string
  state: string
  fipsCode?: string
}

interface RealUSMapProps {
  selectedJurisdiction?: string
  onJurisdictionSelect?: (jurisdictionId: string) => void
  jurisdictions?: Jurisdiction[]
}

// State center coordinates for highlighting
const stateCenters: Record<string, [number, number]> = {
  'California': [36.7783, -119.4179],
  'Washington': [47.7511, -120.7401],
  'Colorado': [39.5501, -105.7821],
}


export default function RealUSMap({ 
  selectedJurisdiction, 
  onJurisdictionSelect,
  jurisdictions = [] 
}: RealUSMapProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Fix Leaflet marker icons for Next.js
    if (typeof window !== 'undefined') {
      import('leaflet').then((L) => {
        delete (L.Icon.Default.prototype as any)._getIconUrl
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        })
      })
    }
  }, [])

  // Get jurisdiction markers
  const markers = jurisdictions
    .filter(j => ['California', 'Washington', 'Colorado'].includes(j.state))
    .map(j => {
      const center = stateCenters[j.state]
      if (!center) return null
      return {
        id: j.id,
        name: j.name,
        state: j.state,
        position: center as [number, number],
      }
    })
    .filter(Boolean) as Array<{ id: string; name: string; state: string; position: [number, number] }>

  if (!mounted) {
    return (
      <div className="w-full h-96 bg-gray-100 rounded-lg flex items-center justify-center border-2 border-gray-300">
        <div className="text-gray-500">Loading map...</div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="bg-white rounded-lg shadow-xl p-6 border border-gray-200">
        <h3 className="text-xl font-semibold mb-4 text-gray-800">Select Your Jurisdiction</h3>
        
        <div className="relative w-full h-96 rounded-lg overflow-hidden border-2 border-gray-300 shadow-inner">
          <MapContainer
            center={[39.8283, -98.5795]}
            zoom={4}
            style={{ height: '100%', width: '100%' }}
            className="z-0"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {/* Jurisdiction Markers */}
            {markers.map((marker) => (
              <Marker
                key={marker.id}
                position={marker.position}
                eventHandlers={{
                  click: () => {
                    if (onJurisdictionSelect) {
                      onJurisdictionSelect(marker.id)
                    }
                  },
                }}
              >
                <Popup>
                  <div className="text-center">
                    <div className="font-semibold">{marker.name}</div>
                    <div className="text-sm text-gray-600">{marker.state}</div>
                    <button
                      onClick={() => onJurisdictionSelect?.(marker.id)}
                      className="mt-2 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                    >
                      Select
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}

            <MapController selectedJurisdiction={selectedJurisdiction} jurisdictions={jurisdictions} />
          </MapContainer>
        </div>

        {/* Jurisdiction List */}
        <div className="mt-4">
          <h4 className="text-sm font-semibold text-gray-800 mb-3">Available Jurisdictions:</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {jurisdictions
              .filter(j => ['California', 'Washington', 'Colorado'].includes(j.state))
              .map((jurisdiction) => (
                <button
                  key={jurisdiction.id}
                  onClick={() => onJurisdictionSelect?.(jurisdiction.id)}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${
                    selectedJurisdiction === jurisdiction.id
                      ? 'border-blue-600 bg-blue-50 text-blue-900 font-semibold shadow-md'
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

