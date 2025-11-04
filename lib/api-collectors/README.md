# API Collectors for Voter Guide Data

This directory contains collectors for fetching real ballot data from various public APIs.

## Available Collectors

### 1. Google Civic Information API (`google-civic.ts`)
- **Free tier**: 25,000 queries/day
- **Registration**: https://developers.google.com/civic-information
- **Best for**: Polling locations, ballot content, candidate information
- **Requires**: API key (free)

**Usage:**
```typescript
import { fetchGoogleCivicData, convertGoogleCivicToBallotItems } from './google-civic'

const data = await fetchGoogleCivicData('123 Main St, City, State ZIP', 'YOUR_API_KEY')
if (data?.contests) {
  const ballotItems = convertGoogleCivicToBallotItems(data.contests)
}
```

### 2. Democracy Works Elections API (`democracy-works.ts`)
- **Coverage**: Nationwide for federal, state, and local races
- **Provides**: Election dates, deadlines, voting guidance
- **Registration**: https://www.democracy.works/
- **Note**: API endpoints may require registration and API key

**Usage:**
```typescript
import { fetchDemocracyWorksElections, fetchDemocracyWorksBallot } from './democracy-works'

const elections = await fetchDemocracyWorksElections('Colorado', 'Fort Collins', 'API_KEY')
const ballot = await fetchDemocracyWorksBallot(electionId, 'API_KEY')
```

### 3. BallotReady API (`ballotready.ts`)
- **Provides**: Detailed ballot, candidate, election, turnout data
- **Format**: GraphQL API
- **Registration**: https://www.ballotready.org/
- **Note**: Requires API key

**Usage:**
```typescript
import { fetchBallotReadyElections } from './ballotready'

const elections = await fetchBallotReadyElections('Colorado', 'Fort Collins', 'API_KEY')
```

## Unified Fetcher

The `unified-fetcher.ts` module tries multiple APIs in order and returns the best available data:

1. **Google Civic Information API** (if address and API key provided)
2. **Democracy Works API** (if API key provided)
3. **BallotReady API** (if API key provided)

**Usage:**
```typescript
import { fetchUnifiedBallotData, formatAddressForAPI } from './unified-fetcher'

const address = formatAddressForAPI('123 Main St', 'Fort Collins', 'Colorado', '80521')
const electionInfo = await fetchUnifiedBallotData(
  'Fort Collins',
  'Colorado',
  {
    googleCivicApiKey: process.env.GOOGLE_CIVIC_API_KEY,
    address,
  }
)
```

## Environment Variables

Add these to your `.env.local`:

```bash
# Google Civic Information API (recommended - free tier)
GOOGLE_CIVIC_API_KEY=your_api_key_here

# Democracy Works Elections API (optional)
DEMOCRACY_WORKS_API_KEY=your_api_key_here

# BallotReady API (optional)
BALLOTREADY_API_KEY=your_api_key_here
```

## API Endpoint

Use the `/api/ballot-data/collect` endpoint to automatically fetch and store ballot data:

```bash
POST /api/ballot-data/collect
{
  "jurisdictionId": "jurisdiction-id",
  "address": "123 Main St, Fort Collins, CO 80521",
  "electionId": "optional-election-id"
}
```

## Getting API Keys

### Google Civic Information API
1. Go to https://console.cloud.google.com/
2. Create a new project or select existing
3. Enable "Civic Information API"
4. Create credentials (API Key)
5. Copy the API key to `.env.local`

### Democracy Works
1. Contact Democracy Works for API access
2. See https://www.democracy.works/ for details

### BallotReady
1. Contact BallotReady for API access
2. See https://www.ballotready.org/ for details

## Data Structure

All collectors return data in a standardized format:

```typescript
interface ElectionInfo {
  title: string
  description?: string
  electionDate: Date
  type: string
  officialUrl?: string
  pollingLocations?: Array<{ address: string; hours?: string }>
  earlyVoteSites?: Array<{ address: string; hours?: string }>
  deadlines?: {
    registration?: string
    absenteeRequest?: string
    earlyVoting?: string
    electionDay?: string
  }
  ballots: BallotItem[]
}

interface BallotItem {
  number?: string
  title: string
  description: string
  type: 'proposition' | 'measure' | 'candidate' | 'referendum' | 'office'
  options: string[]
  metadata?: Record<string, any>
}
```

## Notes

- Google Civic Information API is the most reliable and has a generous free tier
- Some APIs may require registration and approval
- Always respect API rate limits
- Cache API responses when possible to reduce API calls
- Use address-based queries when available for more accurate results


