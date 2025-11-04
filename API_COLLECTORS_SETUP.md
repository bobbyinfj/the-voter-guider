# API Collectors Setup Guide

## Overview

The voter guide system now includes comprehensive API collectors for fetching real ballot data from multiple public APIs. The system has been cleaned up to be **precinct-level only** (no redundant county/city jurisdictions).

## Changes Made

### 1. Cleaned Up Jurisdiction Redundancy ✅
- Removed county and city-level jurisdictions
- All jurisdictions are now **precinct-level only**
- Seed script automatically cleans up redundant entries
- Updated API routes to filter by `type: 'precinct'`

### 2. Created API Collectors ✅

#### Google Civic Information API (`lib/api-collectors/google-civic.ts`)
- Free tier: 25,000 queries/day
- Provides: Polling locations, ballot content, candidate info
- Most reliable and recommended

#### Democracy Works Elections API (`lib/api-collectors/democracy-works.ts`)
- Nationwide coverage
- Provides: Election dates, deadlines, voting guidance
- Requires registration

#### BallotReady API (`lib/api-collectors/ballotready.ts`)
- Detailed ballot and candidate data
- GraphQL API
- Requires registration

#### Unified Fetcher (`lib/api-collectors/unified-fetcher.ts`)
- Tries multiple APIs in order
- Returns best available data
- Fallback handling

### 3. Updated Seed Data ✅
- **Monterey Park**: 5 precincts created
- **Fort Collins**: 8 precincts created
- **Larimer County**: 5 precincts created
- All with approximate geographic coordinates and ZIP codes
- Elections and ballot items linked to precinct-level jurisdictions

### 4. Created API Endpoint ✅
- `/api/ballot-data/collect` - Fetches and stores ballot data
- Accepts jurisdiction ID, address, and optional election ID
- Automatically creates/updates elections and ballots

## Setup Instructions

### 1. Run Database Migration

The schema has been updated with a unique constraint on precinct numbers:

```bash
npx prisma migrate dev --name add_precinct_unique_constraint
npx prisma generate
```

### 2. Seed Precinct Data

```bash
npm run seed
```

This will:
- Clean up redundant county/city jurisdictions
- Create precinct-level jurisdictions for:
  - Monterey Park (5 precincts)
  - Fort Collins (8 precincts)
  - Larimer County (5 precincts)
- Create elections and ballot items

### 3. Set Up API Keys

Add to `.env.local`:

```bash
# Google Civic Information API (recommended - free)
GOOGLE_CIVIC_API_KEY=your_api_key_here

# Optional - Democracy Works
DEMOCRACY_WORKS_API_KEY=your_api_key_here

# Optional - BallotReady
BALLOTREADY_API_KEY=your_api_key_here
```

### 4. Get Google Civic API Key (Free)

1. Go to https://console.cloud.google.com/
2. Create a new project
3. Enable "Civic Information API"
4. Create credentials (API Key)
5. Copy to `.env.local`

## Usage

### Fetch Ballot Data via API

```bash
POST /api/ballot-data/collect
Content-Type: application/json

{
  "jurisdictionId": "jurisdiction-id",
  "address": "123 Main St, Fort Collins, CO 80521",
  "electionId": "optional-election-id"
}
```

### Programmatic Usage

```typescript
import { fetchUnifiedBallotData } from '@/lib/api-collectors/unified-fetcher'

const electionInfo = await fetchUnifiedBallotData(
  'Fort Collins',
  'Colorado',
  {
    googleCivicApiKey: process.env.GOOGLE_CIVIC_API_KEY,
    address: '123 Main St, Fort Collins, CO 80521',
  }
)
```

## Precinct Data Structure

Each precinct includes:
- **Name**: e.g., "Monterey Park Precinct 1"
- **Number**: Precinct identifier
- **Center Coordinates**: Lat/Lng for map display
- **ZIP Codes**: Array of ZIP codes in the precinct
- **Registered Voters**: Approximate count

## Target Areas

### Monterey Park, California
- 5 precincts created
- ZIP: 91754
- Coordinates: Approximate center of Monterey Park

### Fort Collins, Colorado
- 8 precincts created
- ZIPs: 80521, 80524, 80525
- Coordinates: Approximate centers throughout Fort Collins

### Larimer County, Colorado
- 5 precincts created (unincorporated areas)
- ZIPs: 80525, 80526
- Coordinates: Approximate centers throughout Larimer County

## Next Steps

1. **Run the migration** to add the unique constraint
2. **Seed the database** with precinct data
3. **Get a Google Civic API key** (free, recommended)
4. **Test the collector** using the API endpoint
5. **Add more precincts** as needed from official sources

## Notes

- Precinct boundaries can be added later as GeoJSON in the `boundaries` field
- Address ranges can be added to the `addressRange` field for better matching
- The system now focuses on the smallest voting unit (precincts) for accuracy
- All guides are created at the precinct level when available


