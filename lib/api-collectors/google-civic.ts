/**
 * Google Civic Information API Collector
 * https://developers.google.com/civic-information
 * Free tier: 25,000 queries/day
 */

export interface GoogleCivicContest {
  type: string
  office?: string
  referendumTitle?: string
  referendumSubtitle?: string
  referendumText?: string
  title?: string
  description?: string
  candidates?: Array<{
    name: string
    party?: string
    email?: string
    phone?: string
    candidateUrl?: string
    photoUrl?: string
  }>
  district?: {
    name: string
    scope?: string
    id?: string
  }
}

export interface GoogleCivicElection {
  id: string
  name: string
  electionDay: string
  ocdDivisionId: string
}

export interface GoogleCivicResponse {
  election: GoogleCivicElection
  contests?: GoogleCivicContest[]
  pollingLocations?: Array<{
    address: {
      line1: string
      city: string
      state: string
      zip: string
    }
    notes?: string
    pollingHours?: string
  }>
  earlyVoteSites?: Array<{
    address: {
      line1: string
      city: string
      state: string
      zip: string
    }
    pollingHours?: string
  }>
  dropOffLocations?: Array<{
    address: {
      line1: string
      city: string
      state: string
      zip: string
    }
  }>
}

export interface BallotItem {
  number?: string
  title: string
  description: string
  type: 'proposition' | 'measure' | 'candidate' | 'referendum' | 'office'
  options: string[]
  metadata?: Record<string, any>
}

/**
 * Fetch voter information from Google Civic Information API
 */
export async function fetchGoogleCivicData(
  address: string,
  apiKey: string,
  electionId?: string
): Promise<GoogleCivicResponse | null> {
  try {
    // Use electionId 2000 for current elections, or specific ID
    const electionParam = electionId || '2000'
    const url = `https://www.googleapis.com/civicinfo/v2/voterinfo?address=${encodeURIComponent(address)}&electionId=${electionParam}&key=${apiKey}`
    
    const response = await fetch(url)
    
    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Google Civic API allows 25,000 queries/day.')
      }
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`Google Civic API error: ${response.status} - ${errorData.error?.message || response.statusText}`)
    }

    const data: GoogleCivicResponse = await response.json()
    return data
  } catch (error) {
    console.error('Error fetching from Google Civic API:', error)
    return null
  }
}

/**
 * Convert Google Civic contests to BallotItem format
 */
export function convertGoogleCivicToBallotItems(contests: GoogleCivicContest[]): BallotItem[] {
  const ballotItems: BallotItem[] = []

  for (const contest of contests) {
    if (contest.type === 'Referendum') {
      ballotItems.push({
        title: contest.referendumTitle || contest.title || 'Referendum',
        description: contest.referendumSubtitle || contest.referendumText || contest.description || '',
        type: 'referendum',
        options: ['YES', 'NO'],
        metadata: {
          source: 'Google Civic Information API',
          type: contest.type,
        },
      })
    } else if (contest.type === 'General' || contest.type === 'Primary' || contest.office) {
      // Candidate race
      const candidates = contest.candidates?.map((c) => c.name) || []
      ballotItems.push({
        number: contest.office,
        title: contest.office || contest.title || 'Office',
        description: contest.description || '',
        type: 'candidate',
        options: [...candidates, 'Write-in'],
        metadata: {
          source: 'Google Civic Information API',
          type: contest.type,
          district: contest.district?.name,
          candidates: contest.candidates?.map((c) => ({
            name: c.name,
            party: c.party,
            email: c.email,
            phone: c.phone,
            url: c.candidateUrl,
            photo: c.photoUrl,
          })),
        },
      })
    } else if (contest.type === 'BallotMeasure' || contest.type === 'Proposition') {
      ballotItems.push({
        number: contest.title?.match(/^(Proposition|Measure|Issue)\s+([A-Z0-9]+)/i)?.[2],
        title: contest.referendumTitle || contest.title || 'Ballot Measure',
        description: contest.referendumText || contest.referendumSubtitle || contest.description || '',
        type: 'measure',
        options: ['YES', 'NO'],
        metadata: {
          source: 'Google Civic Information API',
          type: contest.type,
        },
      })
    }
  }

  return ballotItems
}

/**
 * Get election information from Google Civic API
 */
export async function getElections(apiKey: string): Promise<GoogleCivicElection[]> {
  try {
    const url = `https://www.googleapis.com/civicinfo/v2/elections?key=${apiKey}`
    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error(`Google Civic API error: ${response.statusText}`)
    }

    const data = await response.json()
    return data.elections || []
  } catch (error) {
    console.error('Error fetching elections from Google Civic API:', error)
    return []
  }
}

