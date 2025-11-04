/**
 * Unified Ballot Data Fetcher
 * Tries multiple APIs in order of preference and returns the best available data
 */

import { fetchGoogleCivicData, convertGoogleCivicToBallotItems } from './google-civic'
import { fetchDemocracyWorksElections, fetchDemocracyWorksBallot } from './democracy-works'
import { fetchBallotReadyElections } from './ballotready'

export interface BallotItem {
  number?: string
  title: string
  description: string
  type: 'proposition' | 'measure' | 'candidate' | 'referendum' | 'office'
  options: string[]
  metadata?: Record<string, any>
}

export interface ElectionInfo {
  title: string
  description?: string
  electionDate: Date
  type: string
  officialUrl?: string
  pollingLocations?: Array<{
    address: string
    hours?: string
  }>
  earlyVoteSites?: Array<{
    address: string
    hours?: string
  }>
  deadlines?: {
    registration?: string
    absenteeRequest?: string
    earlyVoting?: string
    electionDay?: string
  }
  ballots: BallotItem[]
}

export interface FetcherOptions {
  googleCivicApiKey?: string
  democracyWorksApiKey?: string
  ballotReadyApiKey?: string
  address?: string
  electionId?: string
}

/**
 * Format address for API calls
 */
export function formatAddressForAPI(
  street: string,
  city: string,
  state: string,
  zip?: string
): string {
  if (zip) {
    return `${street}, ${city}, ${state} ${zip}`
  }
  return `${street}, ${city}, ${state}`
}

/**
 * Main function to fetch ballot data from multiple sources
 * Tries sources in order: Google Civic → Democracy Works → BallotReady → Fallback
 */
export async function fetchUnifiedBallotData(
  jurisdiction: string,
  state: string,
  options: FetcherOptions = {}
): Promise<ElectionInfo | null> {
  const results: { source: string; data: ElectionInfo | null }[] = []

  // 1. Try Google Civic Information API (most reliable, free tier)
  if (options.address && options.googleCivicApiKey) {
    try {
      console.log(`Attempting Google Civic API for ${jurisdiction}, ${state}`)
      const civicData = await fetchGoogleCivicData(
        options.address,
        options.googleCivicApiKey,
        options.electionId
      )
      
      if (civicData && civicData.contests && civicData.contests.length > 0) {
        const ballotItems = convertGoogleCivicToBallotItems(civicData.contests)
        const electionInfo: ElectionInfo = {
          title: civicData.election.name,
          electionDate: new Date(civicData.election.electionDay),
          type: 'general',
          ballots: ballotItems,
          pollingLocations: civicData.pollingLocations?.map((loc) => ({
            address: `${loc.address.line1}, ${loc.address.city}, ${loc.address.state} ${loc.address.zip}`,
            hours: loc.pollingHours,
          })),
          earlyVoteSites: civicData.earlyVoteSites?.map((site) => ({
            address: `${site.address.line1}, ${site.address.city}, ${site.address.state} ${site.address.zip}`,
            hours: site.pollingHours,
          })),
        }
        results.push({ source: 'Google Civic Information API', data: electionInfo })
        return electionInfo
      }
    } catch (error) {
      console.warn('Google Civic API failed:', error)
    }
  }

  // 2. Try Democracy Works API
  if (options.democracyWorksApiKey) {
    try {
      console.log(`Attempting Democracy Works API for ${jurisdiction}, ${state}`)
      const elections = await fetchDemocracyWorksElections(state, jurisdiction, options.democracyWorksApiKey)
      
      if (elections.length > 0) {
        // Get the most recent/upcoming election
        const election = elections[0]
        const ballot = await fetchDemocracyWorksBallot(election.id, options.democracyWorksApiKey)
        
        if (ballot) {
          const ballotItems: BallotItem[] = ballot.contests.map((contest) => {
            if (contest.type === 'candidate' || contest.type === 'office') {
              return {
                title: contest.title,
                description: contest.description || '',
                type: 'candidate',
                options: contest.candidates?.map((c) => c.name) || ['Write-in'],
                metadata: {
                  source: 'Democracy Works API',
                  office: contest.title,
                },
              }
            } else {
              return {
                title: contest.title,
                description: contest.description || '',
                type: 'measure',
                options: contest.options || ['YES', 'NO'],
                metadata: {
                  source: 'Democracy Works API',
                },
              }
            }
          })

          const electionInfo: ElectionInfo = {
            title: election.name,
            description: election.description,
            electionDate: new Date(election.date),
            type: election.type,
            officialUrl: election.officialUrl,
            deadlines: election.deadlines,
            ballots: ballotItems,
          }
          results.push({ source: 'Democracy Works API', data: electionInfo })
          return electionInfo
        }
      }
    } catch (error) {
      console.warn('Democracy Works API failed:', error)
    }
  }

  // 3. Try BallotReady API
  if (options.ballotReadyApiKey) {
    try {
      console.log(`Attempting BallotReady API for ${jurisdiction}, ${state}`)
      const elections = await fetchBallotReadyElections(state, jurisdiction, options.ballotReadyApiKey)
      
      if (elections.length > 0) {
        const election = elections[0]
        const ballotItems: BallotItem[] = []
        
        election.contests?.forEach((contest) => {
          if (contest.candidates && contest.candidates.length > 0) {
            ballotItems.push({
              title: contest.title,
              description: contest.description || '',
              type: 'candidate',
              options: contest.candidates.map((c) => c.name),
              metadata: {
                source: 'BallotReady API',
                office: contest.office,
                district: contest.district,
              },
            })
          } else if (contest.measures) {
            contest.measures.forEach((measure) => {
              ballotItems.push({
                title: measure.title,
                description: measure.description,
                type: 'measure',
                options: measure.options,
                metadata: {
                  source: 'BallotReady API',
                },
              })
            })
          }
        })

        const electionInfo: ElectionInfo = {
          title: election.name,
          electionDate: new Date(election.date),
          type: election.type,
          ballots: ballotItems,
        }
        results.push({ source: 'BallotReady API', data: electionInfo })
        return electionInfo
      }
    } catch (error) {
      console.warn('BallotReady API failed:', error)
    }
  }

  // If no API returned data, return null
  console.warn(`No ballot data found from any API for ${jurisdiction}, ${state}`)
  return null
}


