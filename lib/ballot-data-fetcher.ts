// Utility to fetch real ballot data from various sources
// This can be expanded to fetch from Ballotpedia, official election sites, etc.

export interface BallotItem {
  number?: string
  title: string
  description: string
  type: 'proposition' | 'measure' | 'candidate' | 'referendum'
  options: string[]
  metadata?: Record<string, any>
}

export interface ElectionInfo {
  title: string
  description: string
  electionDate: Date
  type: string
  officialUrl?: string
  ballots: BallotItem[]
}

/**
 * Fetch ballot data from Ballotpedia (scraping or API if available)
 * Note: Ballotpedia doesn't have a public API, so this would need web scraping
 * For now, returns structured placeholder data
 */
export async function fetchFromBallotpedia(
  state: string,
  jurisdiction: string,
  electionYear: string = '2025'
): Promise<BallotItem[]> {
  // TODO: Implement Ballotpedia scraping
  // Example URL structure: https://ballotpedia.org/[Jurisdiction]_[State]_[Election_Type]_election,_[Year]
  // Example: https://ballotpedia.org/Monterey_Park_California_municipal_elections,_2025
  
  console.log(`Fetching from Ballotpedia: ${jurisdiction}, ${state}, ${electionYear}`)
  
  // Placeholder - would need to implement actual scraping
  return []
}

/**
 * Fetch ballot data from Google Civic Information API
 * Requires API key: https://developers.google.com/civic-information
 */
export async function fetchFromGoogleCivic(
  address: string,
  apiKey?: string
): Promise<BallotItem[]> {
  if (!apiKey) {
    console.warn('Google Civic API key not provided')
    return []
  }

  try {
    const response = await fetch(
      `https://www.googleapis.com/civicinfo/v2/voterinfo?address=${encodeURIComponent(address)}&electionId=2000&key=${apiKey}`
    )
    
    if (!response.ok) {
      throw new Error(`Google Civic API error: ${response.statusText}`)
    }

    const data = await response.json()
    const ballots: BallotItem[] = []

    // Parse contests from Google Civic API
    if (data.contests) {
      for (const contest of data.contests) {
        if (contest.type === 'Referendum') {
          ballots.push({
            title: contest.referendumTitle || contest.title,
            description: contest.referendumSubtitle || contest.referendumText || '',
            type: 'referendum',
            options: ['YES', 'NO'],
            metadata: {
              source: 'Google Civic API',
            },
          })
        } else if (contest.type === 'General') {
          // Candidate race
          const candidates = contest.candidates?.map((c: any) => c.name) || []
          ballots.push({
            number: contest.office,
            title: contest.office,
            description: contest.description || '',
            type: 'candidate',
            options: [...candidates, 'Write-in'],
            metadata: {
              source: 'Google Civic API',
              district: contest.district?.name,
            },
          })
        }
      }
    }

    return ballots
  } catch (error) {
    console.error('Error fetching from Google Civic API:', error)
    return []
  }
}

/**
 * Fetch ballot data from official election websites
 * This would need to be customized per jurisdiction
 */
export async function fetchFromOfficialSite(
  jurisdiction: string,
  state: string,
  url?: string
): Promise<BallotItem[]> {
  // TODO: Implement jurisdiction-specific scraping
  // Each jurisdiction has different website structures
  
  console.log(`Would fetch from official site: ${jurisdiction}, ${state}`)
  
  // Examples of official sites:
  // - Monterey Park: https://www.montereypark.ca.gov
  // - King County: https://www.kingcounty.gov/elections
  // - Larimer County: https://www.larimer.org/clerk/elections
  
  return []
}

/**
 * Get sample ballot data for testing/development
 * This provides realistic ballot structures for the three target jurisdictions
 */
export function getSampleBallotData(
  jurisdiction: string,
  state: string
): BallotItem[] {
  const jurisdictionLower = jurisdiction.toLowerCase()
  
  // Monterey Park, California
  if (jurisdictionLower.includes('monterey park') && state === 'California') {
    return [
      {
        number: 'City Council District 1',
        title: 'Monterey Park City Council - District 1',
        description: 'Vote for one candidate for City Council Member representing District 1. Term: 4 years.',
        type: 'candidate',
        options: ['Candidate A', 'Candidate B', 'Candidate C', 'Write-in'],
        metadata: {
          term: '4 years',
          district: 'District 1',
        },
      },
      {
        number: 'Measure X',
        title: 'Public Safety and Emergency Services Funding',
        description: 'Shall the City of Monterey Park adopt a 0.5% sales tax increase to fund public safety and emergency services? This tax would generate approximately $2 million annually.',
        type: 'measure',
        options: ['YES', 'NO'],
        metadata: {
          taxRate: '0.5% sales tax',
          purpose: 'Public safety and emergency services',
          estimatedRevenue: '$2 million annually',
        },
      },
    ]
  }

  // King County, Washington
  if (jurisdictionLower.includes('king') && state === 'Washington') {
    return [
      {
        number: 'Proposition 1',
        title: 'Automated Fingerprint Identification System (AFIS) Funding',
        description: 'Seven-year property tax levy beginning in 2026 to fund the Regional Automated Fingerprint Identification System (AFIS). Rate: 2.75 cents per $1,000 assessed value.',
        type: 'proposition',
        options: ['YES', 'NO'],
        metadata: {
          taxRate: '2.75 cents per $1,000 assessed value',
          duration: '2026-2032',
          cost: '$15-20 per year for median home',
        },
      },
      {
        number: 'Proposition 2',
        title: 'Metro Transit Funding',
        description: 'Shall King County increase the sales tax by 0.1% to fund Metro Transit operations and expansion?',
        type: 'proposition',
        options: ['YES', 'NO'],
        metadata: {
          taxRate: '0.1% sales tax',
          purpose: 'Metro Transit operations and expansion',
        },
      },
      {
        number: 'Measure 3',
        title: 'Affordable Housing Levy',
        description: 'Shall King County renew the affordable housing levy at a rate of $0.27 per $1,000 assessed value for 7 years?',
        type: 'measure',
        options: ['YES', 'NO'],
        metadata: {
          taxRate: '$0.27 per $1,000 assessed value',
          duration: '7 years',
          purpose: 'Affordable housing',
        },
      },
    ]
  }

  // Larimer County, Colorado
  if (jurisdictionLower.includes('larimer') && state === 'Colorado') {
    return [
      {
        number: 'Issue 1A',
        title: 'Transportation Funding Measure',
        description: 'Shall Larimer County taxes be increased $15,000,000 annually by the imposition of a 0.15% sales and use tax for transportation infrastructure improvements? Tax exempts groceries, gasoline, diapers, and prescription drugs. Duration: 15 years.',
        type: 'measure',
        options: ['YES', 'NO'],
        metadata: {
          taxRate: '0.15%',
          revenue: '$15 million annually',
          duration: '15 years',
          exemptions: ['groceries', 'gasoline', 'diapers', 'prescription drugs'],
        },
      },
    ]
  }

  // Fort Collins, Colorado
  if (jurisdictionLower.includes('fort collins') && state === 'Colorado') {
    return [
      {
        number: 'Mayor',
        title: 'Fort Collins Mayor',
        description: 'Vote for one candidate for Mayor of Fort Collins. Term: 4 years.',
        type: 'candidate',
        options: ['Candidate A', 'Candidate B', 'Write-in'],
        metadata: {
          term: '4 years',
          office: 'Mayor',
        },
      },
      {
        number: 'City Council District 1',
        title: 'Fort Collins City Council - District 1',
        description: 'Vote for one candidate for City Council Member representing District 1. Term: 4 years.',
        type: 'candidate',
        options: ['Candidate A', 'Candidate B', 'Write-in'],
        metadata: {
          term: '4 years',
          district: 'District 1',
        },
      },
      {
        number: 'Ballot Issue 1',
        title: 'Affordable Housing Fund',
        description: 'Shall the City of Fort Collins be authorized to create and fund an affordable housing program through a 0.25% sales tax increase? Duration: 10 years.',
        type: 'measure',
        options: ['YES', 'NO'],
        metadata: {
          taxRate: '0.25% sales tax',
          purpose: 'Affordable housing',
          duration: '10 years',
        },
      },
      {
        number: 'Ballot Issue 2',
        title: 'Climate Action Plan Funding',
        description: 'Shall the City of Fort Collins be authorized to increase the sales tax by 0.1% to fund climate action initiatives and renewable energy programs?',
        type: 'measure',
        options: ['YES', 'NO'],
        metadata: {
          taxRate: '0.1% sales tax',
          purpose: 'Climate action and renewable energy',
          duration: 'Ongoing',
        },
      },
    ]
  }

  return []
}

/**
 * Main function to fetch ballot data from multiple sources
 * Tries multiple sources and returns the best available data
 */
export async function fetchBallotData(
  jurisdiction: string,
  state: string,
  electionYear: string = '2025',
  options?: {
    googleCivicApiKey?: string
    address?: string
  }
): Promise<BallotItem[]> {
  const results: BallotItem[] = []

  // Try Google Civic API if address and API key provided
  if (options?.address && options?.googleCivicApiKey) {
    const civicData = await fetchFromGoogleCivic(options.address, options.googleCivicApiKey)
    if (civicData.length > 0) {
      return civicData
    }
  }

  // Try official site scraping
  const officialData = await fetchFromOfficialSite(jurisdiction, state)
  if (officialData.length > 0) {
    return officialData
  }

  // Try Ballotpedia
  const ballotpediaData = await fetchFromBallotpedia(state, jurisdiction, electionYear)
  if (ballotpediaData.length > 0) {
    return ballotpediaData
  }

  // Fallback to sample data for development
  const sampleData = getSampleBallotData(jurisdiction, state)
  if (sampleData.length > 0) {
    console.log(`Using sample ballot data for ${jurisdiction}, ${state}`)
    return sampleData
  }

  return []
}

