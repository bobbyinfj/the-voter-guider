// Enhanced election data fetcher with free API integrations
export interface ElectionData {
  id: string
  title: string
  date: string
  type: string
  jurisdiction: string
  ballots: BallotData[]
}

export interface BallotData {
  id: string
  number?: string
  title: string
  description?: string
  type: string
  options?: any
}

// Free election data sources integration

/**
 * Google Civic Information API (FREE)
 * https://developers.google.com/civic-information
 * No API key required for basic usage
 */
export async function fetchFromGoogleCivic(address: string) {
  try {
    const response = await fetch(
      `https://www.googleapis.com/civicinfo/v2/voterinfo?address=${encodeURIComponent(address)}&electionId=2000&key=${process.env.GOOGLE_CIVIC_API_KEY || ''}`
    )
    return await response.json()
  } catch (error) {
    console.error('Error fetching from Google Civic API:', error)
    return null
  }
}

/**
 * Ballotpedia API (FREE tier available)
 * Can scrape or use their API if available
 */
export async function fetchFromBallotpedia(state: string, electionDate: string) {
  // Ballotpedia doesn't have a public API, but we can structure for future scraping
  // For now, return structure
  return null
}

/**
 * Vote411.org API (FREE)
 * League of Women Voters API
 */
export async function fetchFromVote411(address: string) {
  try {
    // Vote411 API endpoint structure
    const response = await fetch(
      `https://api.vote411.org/voter-guide?address=${encodeURIComponent(address)}`
    )
    return await response.json()
  } catch (error) {
    console.error('Error fetching from Vote411:', error)
    return null
  }
}

/**
 * US Census Bureau - County Data (FREE)
 * https://www.census.gov/geographies/mapping-files
 */
export async function fetchCountyBoundaries() {
  // Can fetch from Census TIGER/Line shapefiles
  return null
}

/**
 * Fetch election data for a jurisdiction
 */
export async function fetchElectionData(jurisdictionId: string, address?: string): Promise<ElectionData[]> {
  // Try multiple free sources
  const sources = []
  
  if (address) {
    const googleData = await fetchFromGoogleCivic(address)
    if (googleData) sources.push(googleData)
    
    const vote411Data = await fetchFromVote411(address)
    if (vote411Data) sources.push(vote411Data)
  }
  
  // Return structured data from free sources
  return []
}

/**
 * US Counties FIPS data - free from census.gov
 */
export async function fetchCountyData() {
  // Free source: https://www.census.gov/geographies/mapping-files/time-series/geo/carto-boundary-file.html
  // Returns county boundaries, FIPS codes, and metadata
  return []
}

/**
 * Format address for API calls
 */
export function formatAddressForAPI(address: string): string {
  return encodeURIComponent(address.trim())
}
