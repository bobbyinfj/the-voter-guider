# Precinct-Based Voting Guide Migration

## Overview

The voting guide system has been updated to support **precinct-based guides** - the smallest voting unit. This ensures that guides are created at the most granular level available.

## Schema Changes

### New Model: `Precinct`
- Stores precinct information (name, number, geographic data)
- Linked to jurisdictions
- Contains address ranges and ZIP codes for matching
- Includes center coordinates for map display

### Updated Model: `Guide`
- Added optional `precinctId` field
- Guides can now be tied to a specific precinct
- Falls back to jurisdiction if precinct not available
- Metadata field can store address information

## Migration Steps

1. **Run Prisma migration:**
   ```bash
   npx prisma migrate dev --name add_precinct_support
   ```

2. **Generate Prisma client:**
   ```bash
   npx prisma generate
   ```

3. **Update existing guides (optional):**
   - Existing guides will continue to work with jurisdiction-level data
   - New guides should prefer precinct-level data when available

## Features Added

### 1. Precinct Map Component (`PrecinctMap.tsx`)
- Address search functionality using OpenStreetMap Nominatim
- Visual precinct list with hover states
- Interactive map display (ready for GeoJSON boundaries)
- Precinct selection integration

### 2. Address Geocoding API (`/api/geocode`)
- Uses OpenStreetMap Nominatim (free, no API key required)
- Converts addresses to lat/lng coordinates
- Finds closest precinct to address

### 3. Precinct API (`/api/precincts`)
- Fetches all precincts for a jurisdiction
- Includes geographic and metadata information
- Sorted by number and name

### 4. Enhanced Map UI
- Gradient fills for states
- Better hover effects
- Improved legend with scrollable list
- Enhanced visual feedback

### 5. Moleses Integration
- `moleses-1.png` and `moleses-2.png` integrated throughout UI
- Favicon generated from moleses-1.png
- Header and hero sections feature moleses images

## Usage

### Creating a Precinct-Based Guide

1. Select a jurisdiction
2. Click "Find Your Precinct" button
3. Enter your mailing address
4. System will geocode and find your precinct
5. Select the precinct (or choose from list)
6. Create guide - it will be tied to the specific precinct

### Benefits of Precinct-Based Guides

- **Most Accurate**: Precincts are the smallest voting unit
- **Precise Ballots**: Some ballot items vary by precinct
- **Better Matching**: Address-based lookup ensures correct precinct
- **Future-Proof**: Ready for precinct-specific ballot variations

## Data Sources for Precincts

Precinct data can be imported from:
- Official election websites (shapefiles)
- Census Bureau TIGER/Line files
- State/county election departments
- Precinct boundary databases

## Next Steps

1. Import precinct data for target jurisdictions
2. Add GeoJSON boundaries for interactive map display
3. Connect to real ballot data sources (Ballotpedia, official sites)
4. Implement address-to-precinct matching algorithm


