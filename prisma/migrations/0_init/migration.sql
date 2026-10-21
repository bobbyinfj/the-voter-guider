-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "jurisdictions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "countyName" TEXT,
    "fipsCode" TEXT,
    "type" TEXT NOT NULL DEFAULT 'county',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jurisdictions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "precincts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "number" TEXT,
    "jurisdictionId" TEXT NOT NULL,
    "boundaries" JSONB,
    "centerLat" DOUBLE PRECISION,
    "centerLng" DOUBLE PRECISION,
    "addressRange" JSONB,
    "zipCodes" TEXT[],
    "registeredVoters" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "precincts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "elections" (
    "id" TEXT NOT NULL,
    "jurisdictionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "electionDate" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'upcoming',
    "officialUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "elections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ballots" (
    "id" TEXT NOT NULL,
    "electionId" TEXT NOT NULL,
    "number" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "options" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ballots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "choices" (
    "id" TEXT NOT NULL,
    "guideId" TEXT NOT NULL,
    "ballotId" TEXT NOT NULL,
    "selection" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "choices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guides" (
    "id" TEXT NOT NULL,
    "electionId" TEXT NOT NULL,
    "jurisdictionId" TEXT NOT NULL,
    "precinctId" TEXT,
    "title" TEXT NOT NULL,
    "author" TEXT,
    "description" TEXT,
    "notes" TEXT,
    "shareToken" TEXT NOT NULL,
    "visibility" TEXT NOT NULL DEFAULT 'private',
    "isTemplate" BOOLEAN NOT NULL DEFAULT false,
    "sessionId" TEXT,
    "userId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastAccessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guide_analytics" (
    "id" TEXT NOT NULL,
    "guideId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "referrer" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guide_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "jurisdictions_fipsCode_key" ON "jurisdictions"("fipsCode");

-- CreateIndex
CREATE INDEX "jurisdictions_state_countyName_idx" ON "jurisdictions"("state", "countyName");

-- CreateIndex
CREATE INDEX "precincts_jurisdictionId_idx" ON "precincts"("jurisdictionId");

-- CreateIndex
CREATE INDEX "precincts_number_idx" ON "precincts"("number");

-- CreateIndex
CREATE INDEX "precincts_centerLat_centerLng_idx" ON "precincts"("centerLat", "centerLng");

-- CreateIndex
CREATE UNIQUE INDEX "precincts_jurisdictionId_number_key" ON "precincts"("jurisdictionId", "number");

-- CreateIndex
CREATE INDEX "elections_jurisdictionId_electionDate_idx" ON "elections"("jurisdictionId", "electionDate");

-- CreateIndex
CREATE INDEX "elections_status_electionDate_idx" ON "elections"("status", "electionDate");

-- CreateIndex
CREATE INDEX "ballots_electionId_idx" ON "ballots"("electionId");

-- CreateIndex
CREATE INDEX "choices_guideId_idx" ON "choices"("guideId");

-- CreateIndex
CREATE UNIQUE INDEX "choices_guideId_ballotId_key" ON "choices"("guideId", "ballotId");

-- CreateIndex
CREATE UNIQUE INDEX "guides_shareToken_key" ON "guides"("shareToken");

-- CreateIndex
CREATE INDEX "guides_electionId_idx" ON "guides"("electionId");

-- CreateIndex
CREATE INDEX "guides_precinctId_idx" ON "guides"("precinctId");

-- CreateIndex
CREATE INDEX "guides_shareToken_idx" ON "guides"("shareToken");

-- CreateIndex
CREATE INDEX "guides_sessionId_idx" ON "guides"("sessionId");

-- CreateIndex
CREATE INDEX "guides_visibility_idx" ON "guides"("visibility");

-- CreateIndex
CREATE INDEX "guide_analytics_guideId_createdAt_idx" ON "guide_analytics"("guideId", "createdAt");

-- AddForeignKey
ALTER TABLE "precincts" ADD CONSTRAINT "precincts_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "jurisdictions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "elections" ADD CONSTRAINT "elections_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "jurisdictions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ballots" ADD CONSTRAINT "ballots_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "elections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "choices" ADD CONSTRAINT "choices_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "guides"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "choices" ADD CONSTRAINT "choices_ballotId_fkey" FOREIGN KEY ("ballotId") REFERENCES "ballots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guides" ADD CONSTRAINT "guides_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "elections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guides" ADD CONSTRAINT "guides_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "jurisdictions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guides" ADD CONSTRAINT "guides_precinctId_fkey" FOREIGN KEY ("precinctId") REFERENCES "precincts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

