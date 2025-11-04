/**
 * Democracy Works Elections API Collector
 * https://www.democracy.works/
 * Nationwide coverage for federal, state, and local races
 * Provides election-specific data, voting guidance, dates, deadlines
 */

export interface DemocracyWorksElection {
  id: string
  name: string
  date: string
  type: string
  state: string
  jurisdiction?: string
  description?: string
  officialUrl?: string
  deadlines?: {
    registration?: string
    absenteeRequest?: string
    earlyVoting?: string
    electionDay?: string
  }
}

export interface DemocracyWorksBallot {
  electionId: string
  contests: Array<{
    id: string
    type: string
    title: string
    description?: string
    candidates?: Array<{
      name: string
      party?: string
      bio?: string
    }>
    options?: string[]
  }>
}

/**
 * Fetch election data from Democracy Works API
 * Note: This is a placeholder - actual API endpoints would need to be confirmed
 */
export async function fetchDemocracyWorksElections(
  state?: string,
  jurisdiction?: string,
  apiKey?: string
): Promise<DemocracyWorksElection[]> {
  try {
    // TODO: Replace with actual Democracy Works API endpoint
    // This would typically require registration and API key
    const baseUrl = 'https://api.democracy.works/v1/elections'
    const params = new URLSearchParams()
    
    if (state) params.append('state', state)
    if (jurisdiction) params.append('jurisdiction', jurisdiction)
    if (apiKey) params.append('api_key', apiKey)
    
    const url = `${baseUrl}?${params.toString()}`
    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error(`Democracy Works API error: ${response.statusText}`)
    }

    const data = await response.json()
    return data.elections || []
  } catch (error) {
    console.error('Error fetching from Democracy Works API:', error)
    // Return empty array on error - API may not be publicly available
    return []
  }
}

/**
 * Fetch ballot data for a specific election
 */
export async function fetchDemocracyWorksBallot(
  electionId: string,
  apiKey?: string
): Promise<DemocracyWorksBallot | null> {
  try {
    // TODO: Replace with actual Democracy Works API endpoint
    const baseUrl = `https://api.democracy.works/v1/elections/${electionId}/ballot`
    const params = new URLSearchParams()
    
    if (apiKey) params.append('api_key', apiKey)
    
    const url = `${baseUrl}?${params.toString()}`
    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error(`Democracy Works API error: ${response.statusText}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error fetching ballot from Democracy Works API:', error)
    return null
  }
}



