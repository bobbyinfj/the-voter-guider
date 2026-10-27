// District maps for the district picker, built by data/research/map-builders/districts.py from
// official boundary files and seeded to Election.metadata.maps. Paths are already projected
// into the map's own SVG units (0..width × 0..height).

export interface MapSource {
  publisher: string
  title: string
  url: string
  retrieved: string
}

export interface MapDistrict {
  code: string // the bundle's districtCode
  name: string // as the publisher names it
  onBallot: boolean // has a race on this ballot
  d: string
  label: [number, number]
}

export interface DistrictMap {
  districtType: string
  source: MapSource
  districts: MapDistrict[]
}

export interface DistrictMaps {
  base: {
    width: number
    height: number
    city: { name: string; d: string }
    water: string
    roads: string
    sources: MapSource[]
  }
  maps: DistrictMap[]
}

export function districtMapsOf(metadata: unknown): DistrictMaps | null {
  const m = metadata && typeof metadata === 'object' ? (metadata as { maps?: unknown }).maps : null
  if (!m || typeof m !== 'object') return null
  const maps = m as Partial<DistrictMaps>
  if (!maps.base || typeof maps.base.width !== 'number' || !Array.isArray(maps.maps)) return null
  return maps as DistrictMaps
}
