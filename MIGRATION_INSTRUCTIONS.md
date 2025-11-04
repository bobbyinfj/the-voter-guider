# Migration Instructions

## Issue: Precincts Table Doesn't Exist

The seed script is failing because the `precincts` table hasn't been created yet. You need to run a migration first.

## Solution

Run these commands in order:

### 1. Create the Migration

```bash
# Make sure DATABASE_URL is in .env.local
npx prisma migrate dev --name add_precincts_table
```

This will:
- Create a migration file
- Apply it to your database
- Generate the Prisma client

### 2. Run the Seed Script

```bash
npm run seed
```

## Alternative: Use `db push` (Quick Development)

If you just want to sync the schema without creating migration files:

```bash
npx prisma db push
npm run seed
```

## Check Your Database Connection

Make sure your `.env.local` file has:

```bash
DATABASE_URL="your-neon-postgresql-connection-string"
```

## If Migration Fails

If you get errors about the table already existing or other issues:

1. Check your database connection
2. Try resetting the database (⚠️ WARNING: This deletes all data):
   ```bash
   npx prisma migrate reset
   npm run seed
   ```

3. Or manually create the table using Prisma Studio:
   ```bash
   npx prisma studio
   ```


