# Supabase Connection Types

Supabase offers several connection options:

## 1. Direct Connection (Primary Database)

- **Host**: `db.[PROJECT_REF].supabase.co`
- **Port**: `5432`
- **Format**: `postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres`
- **Use case**: Direct access, but limited connections (can hit limits quickly)
- **Connection limit**: ~90 concurrent connections

## 2. Transaction Pooler (Recommended for Next.js) ⭐

- **Host**: `aws-0-[region].pooler.supabase.com`
- **Port**: `6543`
- **Format**: `postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres`
- **Use case**: Serverless/Next.js API routes, Prisma
- **Connection limit**: ~15,000+ concurrent connections
- **How it works**: Each API request gets its own transaction, connections are shared efficiently
- **Best for**: Read/write operations, Prisma queries, Next.js App Router

## 3. Session Pooler

- **Host**: `aws-0-[region].pooler.supabase.com`
- **Port**: `6543`
- **Format**: `postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true`
- **Use case**: Long-lived connections, prepared statements, temporary tables
- **Connection limit**: Lower than transaction pooler
- **How it works**: Maintains session state across multiple queries
- **Best for**: Desktop apps, CLI tools, persistent connections

## Which to Use for This App?

### ✅ **Transaction Pooler** (Recommended)

**For Next.js + Prisma**: Use the **Transaction Pooler** (port 6543, default pooling)

**Why:**

- ✅ Perfect for serverless functions (Next.js API routes)
- ✅ Prisma works great with it
- ✅ Handles connection limits efficiently
- ✅ Each request gets a clean transaction
- ✅ No need for `pgbouncer=true` parameter

**Where to get it:**

1. Supabase Dashboard → Your Project
2. Settings → Database
3. **Connection pooling** tab
4. Copy the **Transaction Pooler URI** (default, port 6543)

### Session Pooler

Only use if you need:

- Prepared statements that persist
- Temporary tables
- Session variables

## Connection String Format

**Transaction Pooler (use this):**

```
postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres
```

**Session Pooler (if needed):**

```
postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true
```

**Direct Connection (not recommended for Next.js):**

```
postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
```
