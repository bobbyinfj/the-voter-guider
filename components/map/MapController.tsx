'use client'

import { useEffect } from 'react'
import { useMap } from 'react-leaflet'

interface MapControllerProps {
  selectedJurisdiction?: string
  jurisdictions?: Array<{
    id: string
    name: string
    state: string
  }>
}

// State bounds for zooming
const stateBounds: Record<string, [[number, number], [number, number]]> = {
  'California': [[32.5, -124.5], [42.0, -114.0]],
  'Washington': [[45.5, -124.8], [49.0, -116.9]],
  'Colorado': [[37.0, -109.0], [41.0, -102.0]],
}

export default function MapController({ selectedJurisdiction, jurisdictions }: MapControllerProps) {
  const map = useMap()
  
  useEffect(() => {
    if (selectedJurisdiction && jurisdictions) {
      const jurisdiction = jurisdictions.find(j => j.id === selectedJurisdiction)
      if (jurisdiction && stateBounds[jurisdiction.state]) {
        const bounds = stateBounds[jurisdiction.state]
        map.fitBounds(bounds, { padding: [50, 50] })
      }
    } else {
      // Default to USA view
      map.setView([39.8283, -98.5795], 4)
    }
  }, [selectedJurisdiction, jurisdictions, map])

  return null
}

