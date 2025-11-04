# Getting Real Ballot Data

## Current Status: Sample Data Only

The ballot items you're seeing (like "City Council District 1" and "Measure X") are **sample/placeholder data**, NOT your actual ballot items.

You mentioned you only saw "Prop 50" on your real ballot - that's correct! The current data is just examples.

## How to Get Real Ballot Data

### Option 1: Use the "Fetch Real Ballot Data" Button

1. Go to **Create New Voter Guide**
2. Select your jurisdiction (e.g., Monterey Park)
3. Click the **"📥 Fetch Real Ballot Data"** button
4. Enter your full address (e.g., "123 Main St, Monterey Park, CA 91754")
5. The system will fetch your actual ballot items from Google Civic Information API

### Option 2: Set Up Google Civic API Key

1. **Get a free API key:**
   - Go to https://console.cloud.google.com/
   - Create a new project (or use existing)
   - Enable "Civic Information API"
   - Create credentials → API Key
   - Copy the API key

2. **Add to `.env.local`:**
   ```bash
   GOOGLE_CIVIC_API_KEY=your_api_key_here
   ```

3. **Restart your dev server:**
   ```bash
   npm run dev
   ```

4. **Use the Fetch button** - it will now work with real data!

## What You'll Get

When you fetch real ballot data, you'll get:
- ✅ Actual ballot measures and propositions for your address
- ✅ Real candidates running for office
- ✅ Polling locations near you
- ✅ Early voting sites
- ✅ Voting deadlines

## Example

If you enter your Monterey Park address, you should see:
- **Prop 50** (the one you mentioned!)
- Any other actual propositions/measures for your area
- Real candidate races

## Troubleshooting

**If the fetch button doesn't work:**
- Make sure you have `GOOGLE_CIVIC_API_KEY` in `.env.local`
- Check that the API key is valid
- Try a more specific address format: "Street Address, City, State ZIP"

**If no data is found:**
- The address format might be incorrect
- There might not be an upcoming election
- Try using your exact address as it appears on your voter registration

## Note

The sample data (City Council District 1, Measure X) will remain in the database until you fetch real data. Once you fetch real data, it will replace or supplement the sample data for that election.



