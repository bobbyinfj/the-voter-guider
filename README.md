# The VoTer GuidEr

**A modern, future-proof system for tracking voting choices across multiple jurisdictions.**

## Features

- ✅ **Save & Return**: Your voting choices are automatically saved using browser sessions
- ✅ **Easy Sharing**: Share your guide with a simple link - no account required
- ✅ **Future Proof**: Handles elections across multiple jurisdictions and election cycles
- ✅ **Professional Maps**: Interactive US map with jurisdiction selection
- ✅ **Free Services**: Built with Supabase (free tier) and Vercel (free hosting)

## Tech Stack

- **Next.js 14+** - App Router with Server Components
- **TypeScript** - Type-safe development
- **Prisma** - Database ORM
- **PostgreSQL** - Via Supabase (free tier)
- **Tailwind CSS** - Modern styling
- **Vercel** - Free hosting and deployment

## Quick Start

### 1. Set up environment variables

```bash
cp .env.example .env
```

Fill in:
- `DATABASE_URL` - From Supabase project settings
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon key

### 2. Set up database

```bash
# Generate Prisma client
npx prisma generate

# Run migrations (after setting up Supabase)
npx prisma migrate dev
```

### 3. Seed initial data (optional)

```bash
npm run seed
```

### 4. Run development server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## Database Setup

### Option 1: Supabase (Recommended - Free)

1. Create account at [supabase.com](https://supabase.com)
2. Create new project
3. Go to Settings > Database
4. Copy the connection string
5. Update `.env` with `DATABASE_URL`

### Option 2: Local PostgreSQL

1. Install PostgreSQL locally
2. Create database: `createdb voter-guider`
3. Update `.env` with: `DATABASE_URL="postgresql://user:password@localhost:5432/voter-guider"`

## Deployment

### Vercel (Free Tier)

1. Push to GitHub
2. Connect repo to Vercel
3. Add environment variables
4. Deploy!

```bash
# Or use Vercel CLI
npm i -g vercel
vercel
```

## Project Structure

```
the-voter-guider/
├── app/
│   ├── api/           # API routes
│   ├── guide/         # Guide pages
│   └── page.tsx       # Home page
├── components/
│   ├── map/           # US map component
│   └── ...            # UI components
├── lib/
│   ├── prisma.ts      # Prisma client
│   ├── session.ts     # Session management
│   └── election-data.ts # Election data fetchers
├── prisma/
│   └── schema.prisma  # Database schema
└── ...
```

## API Routes

- `GET /api/jurisdictions` - List available jurisdictions
- `GET /api/elections` - Get elections for a jurisdiction
- `GET /api/guides` - Get user's guides
- `POST /api/guides` - Create new guide
- `POST /api/choices` - Save voting choice
- `GET /api/guides?shareToken=xxx` - View shared guide

## Free Data Sources

- **Ballotpedia API** - Election information
- **Google Civic Information API** - Voter information
- **Census.gov** - US county/GIS data
- **Vote411.org** - Ballot information

## License

MIT - Feel free to use and modify for your own projects.

## Contributing

This is a brainstorming repository. Ideas and contributions welcome!
