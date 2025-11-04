'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, MapPin, Loader2 } from 'lucide-react'
import Image from 'next/image'

interface Precinct {
  id: string
  name: string
  number?: string
  centerLat?: number
  centerLng?: number
  jurisdiction: {
    name: string
    state: string
  }
}

interface PrecinctMapProps {
  jurisdictionId: string
  onPrecinctSelect?: (precinctId: string) => void
  selectedPrecinctId?: string
}

export default function PrecinctMap({ 
  jurisdictionId, 
  onPrecinctSelect,
  selectedPrecinctId 
}: PrecinctMapProps) {
  const [precincts, setPrecincts] = useState<Precinct[]>([])
  const [loading, setLoading] = useState(true)
  const [searchAddress, setSearchAddress] = useState('')
  const [searching, setSearching] = useState(false)
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null)
  const [hoveredPrecinct, setHoveredPrecinct] = useState<string | null>(null)
  const mapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchPrecincts()
  }, [jurisdictionId])

  const fetchPrecincts = async () => {
    try {
      const response = await fetch(`/api/precincts?jurisdictionId=${jurisdictionId}`)
      const data = await response.json()
      if (response.ok && Array.isArray(data)) {
        setPrecincts(data)
        // Set map center to first precinct or jurisdiction center
        if (data.length > 0 && data[0].centerLat && data[0].centerLng) {
          setMapCenter({ lat: data[0].centerLat, lng: data[0].centerLng })
        }
      }
    } catch (error) {
      console.error('Error fetching precincts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddressSearch = async () => {
    if (!searchAddress.trim()) return

    setSearching(true)
    try {
      // Use a geocoding service (here we'll use a simple approach)
      // In production, use Google Maps Geocoding API, Mapbox, or similar
      const response = await fetch(`/api/geocode?address=${encodeURIComponent(searchAddress)}`)
      const data = await response.json()
      
      if (response.ok && data.lat && data.lng) {
        setMapCenter({ lat: data.lat, lng: data.lng })
        
        // Find closest precinct
        const closestPrecinct = findClosestPrecinct(data.lat, data.lng)
        if (closestPrecinct && onPrecinctSelect) {
          onPrecinctSelect(closestPrecinct.id)
        }
      } else {
        alert('Could not find that address. Please try a more specific address with city and state.')
      }
    } catch (error) {
      console.error('Error geocoding address:', error)
      alert('Error searching address. Please try again.')
    } finally {
      setSearching(false)
    }
  }

  const findClosestPrecinct = (lat: number, lng: number): Precinct | null => {
    if (precincts.length === 0) return null

    let closest: Precinct | null = null
    let minDistance = Infinity

    precincts.forEach(precinct => {
      if (precinct.centerLat && precinct.centerLng) {
        const distance = Math.sqrt(
          Math.pow(precinct.centerLat - lat, 2) + 
          Math.pow(precinct.centerLng - lng, 2)
        )
        if (distance < minDistance) {
          minDistance = distance
          closest = precinct
        }
      }
    })

    return closest
  }

  const handlePrecinctClick = (precinctId: string) => {
    if (onPrecinctSelect) {
      onPrecinctSelect(precinctId)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="w-full space-y-4">
      {/* Moleses Image Header */}
      <div className="flex items-center justify-center gap-6 mb-6">
        <Image
          src="/moleses-2.png"
          alt="Moleses"
          width={150}
          height={150}
          className="object-contain"
          priority
        />
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800">Find Your Precinct</h2>
          <p className="text-sm text-gray-600">Enter your address to find your voting precinct</p>
        </div>
      </div>

      {/* Address Search */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchAddress}
              onChange={(e) => setSearchAddress(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddressSearch()}
              placeholder="Enter your mailing address (e.g., 123 Main St, City, State ZIP)"
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={handleAddressSearch}
            disabled={searching || !searchAddress.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {searching ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <MapPin className="w-4 h-4" />
                Find Precinct
              </>
            )}
          </button>
        </div>
      </div>

      {/* Map Display */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div 
          ref={mapRef}
          className="relative w-full h-96 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg border-2 border-gray-200 overflow-hidden"
        >
          {mapCenter ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <MapPin className="w-12 h-12 text-blue-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600">
                  Map centered at {mapCenter.lat.toFixed(4)}, {mapCenter.lng.toFixed(4)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Interactive map with precinct boundaries coming soon
                </p>
              </div>
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-gray-500">Enter an address to view the map</p>
            </div>
          )}
        </div>

        {/* Precinct List */}
        {precincts.length > 0 && (
          <div className="mt-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">
              Precincts in this jurisdiction ({precincts.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
              {precincts.map((precinct) => (
                <button
                  key={precinct.id}
                  onClick={() => handlePrecinctClick(precinct.id)}
                  onMouseEnter={() => setHoveredPrecinct(precinct.id)}
                  onMouseLeave={() => setHoveredPrecinct(null)}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    selectedPrecinctId === precinct.id
                      ? 'border-blue-600 bg-blue-50 shadow-md'
                      : hoveredPrecinct === precinct.id
                      ? 'border-blue-300 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                  }`}
                >
                  <div className="font-semibold text-gray-800">{precinct.name}</div>
                  {precinct.number && (
                    <div className="text-sm text-gray-600 mt-1">Precinct {precinct.number}</div>
                  )}
                  <div className="text-xs text-gray-500 mt-2">
                    {precinct.jurisdiction.name}, {precinct.jurisdiction.state}
                  </div>
                  {selectedPrecinctId === precinct.id && (
                    <div className="mt-2 text-xs text-blue-600 font-medium">✓ Selected</div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {precincts.length === 0 && !loading && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800 font-medium">No precincts found for this jurisdiction.</p>
            <p className="text-sm text-yellow-700 mt-1">
              Precinct data needs to be seeded. Run <code className="bg-yellow-100 px-1 rounded">npm run seed</code> to populate precinct data.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

