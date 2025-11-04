/**
 * BallotReady API Collector
 * https://www.ballotready.org/
 * Provides detailed ballot, candidate, election, turnout, and officeholder data
 * GraphQL API and data exports available
 */

export interface BallotReadyElection {
  id: string
  name: string
  date: string
  type: string
  state: string
  jurisdiction?: string
  contests?: BallotReadyContest[]
}

export interface BallotReadyContest {
  id: string
  type: string
  title: string
  description?: string
  office?: string
  district?: string
  candidates?: Array<{
    id: string
    name: string
    party?: string
    bio?: string
    website?: string
    photo?: string
  }>
  measures?: Array<{
    id: string
    title: string
    description: string
    options: string[]
  }>
}

/**
 * Fetch elections from BallotReady API (GraphQL)
 * Note: Requires API key and may use GraphQL endpoint
 */
export async function fetchBallotReadyElections(
  state?: string,
  jurisdiction?: string,
  apiKey?: string
): Promise<BallotReadyElection[]> {
  try {
    // TODO: Replace with actual BallotReady API endpoint
    // BallotReady typically uses GraphQL, so this would be a POST request
    const endpoint = 'https://api.ballotready.org/graphql'
    
    const query = `
      query GetElections($state: String, $jurisdiction: String) {
        elections(state: $state, jurisdiction: $jurisdiction) {
          id
          name
          date
          type
          state
          jurisdiction
          contests {
            id
            type
            title
            description
            office
            district
            candidates {
              id
              name
              party
              bio
            }
          }
        }
      }
    `
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey && { 'Authorization': `Bearer ${apiKey}` }),
      },
      body: JSON.stringify({
        query,
        variables: { state, jurisdiction },
      }),
    })
    
    if (!response.ok) {
      throw new Error(`BallotReady API error: ${response.statusText}`)
    }

    const data = await response.json()
    return data.data?.elections || []
  } catch (error) {
    console.error('Error fetching from BallotReady API:', error)
    return []
  }
}


