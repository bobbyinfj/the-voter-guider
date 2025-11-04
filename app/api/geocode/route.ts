// API Route: Geocode address to lat/lng
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const address = searchParams.get('address')

    if (!address) {
      return NextResponse.json(
        { error: 'Address required' },
        { status: 400 }
      )
    }

    // Use a free geocoding service
    // Option 1: Nominatim (OpenStreetMap) - free, no API key needed
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
        {
          headers: {
            'User-Agent': 'TheVoTerGuidEr/1.0', // Required by Nominatim
          },
        }
      )

      const data = await response.json()

      if (Array.isArray(data) && data.length > 0) {
        const result = data[0]
        return NextResponse.json({
          lat: parseFloat(result.lat),
          lng: parseFloat(result.lon),
          displayName: result.display_name,
          address: result.address,
        })
      }
    } catch (error) {
      console.error('Nominatim geocoding error:', error)
    }

    // Fallback: Return error
    return NextResponse.json(
      { error: 'Could not geocode address' },
      { status: 404 }
    )
  } catch (error) {
    console.error('Error geocoding:', error)
    return NextResponse.json(
      { error: 'Failed to geocode address' },
      { status: 500 }
    )
  }
}


