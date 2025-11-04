# Data Collection Scripts

This folder contains scripts for populating and maintaining real ballot data in the database.

## Scripts

### `populate-real-ballot-data.ts`

Fetches real ballot data from Google Civic Information API and stores it in the database, replacing any sample data.

**Usage:**
```bash
npm run data:populate-ballots
```

**Requirements:**
- `GOOGLE_CIVIC_API_KEY` must be set in `.env.local`
- Database must be seeded first (`npm run seed`)

**What it does:**
1. Fetches real ballot data for all configured jurisdictions (Monterey Park, Fort Collins, Seattle)
2. Creates/updates elections with real data
3. Deletes all sample ballot items
4. Stores real ballot items with `isSample: false` metadata

**After running:**
- All sample data warnings will disappear
- Users will see real ballot items
- No manual "Fetch Real Ballot Data" button clicks needed

## Setup

1. **Get Google Civic API Key:**
   - Go to https://console.cloud.google.com/
   - Enable "Civic Information API"
   - Create API Key
   - Add to `.env.local`: `GOOGLE_CIVIC_API_KEY=your_key_here`

2. **Run seed (if not done):**
   ```bash
   npm run seed
   ```

3. **Populate real data:**
   ```bash
   npm run data:populate-ballots
   ```

## When to Run

- **After initial seed**: Run `npm run data:populate-ballots` to replace sample data
- **Before deployment**: Ensure production has real data
- **After database reset**: Re-populate with real data
- **Periodically**: Refresh data if elections change

