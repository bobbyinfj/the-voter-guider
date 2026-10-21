-- AlterTable
ALTER TABLE "elections" ADD COLUMN     "districtLookupUrl" TEXT;

-- AlterTable
ALTER TABLE "ballots" ADD COLUMN     "districtCode" TEXT,
ADD COLUMN     "districtType" TEXT,
ADD COLUMN     "officeId" TEXT;

-- CreateTable
CREATE TABLE "offices" (
    "id" TEXT NOT NULL,
    "jurisdictionId" TEXT NOT NULL,
    "electionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "district" TEXT,
    "districtType" TEXT,
    "districtCode" TEXT,
    "level" TEXT NOT NULL,
    "description" TEXT,
    "termYears" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 100,

    CONSTRAINT "offices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidates" (
    "id" TEXT NOT NULL,
    "officeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "party" TEXT,
    "incumbent" BOOLEAN NOT NULL DEFAULT false,
    "shortBio" TEXT,
    "longBio" TEXT,
    "photoUrl" TEXT,
    "website" TEXT,
    "email" TEXT,
    "phone" TEXT,

    CONSTRAINT "candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "issues" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "description" TEXT,
    "jurisdictionId" TEXT,
    "level" TEXT NOT NULL DEFAULT 'state',

    CONSTRAINT "issues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_stances" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "summary" TEXT NOT NULL,
    "rationale" TEXT,

    CONSTRAINT "candidate_stances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sources" (
    "id" TEXT NOT NULL,
    "stanceId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT,
    "quote" TEXT,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quizzes" (
    "id" TEXT NOT NULL,
    "electionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,

    CONSTRAINT "quizzes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questions" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "helpText" TEXT,
    "order" INTEGER NOT NULL,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_issues" (
    "questionId" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,

    CONSTRAINT "question_issues_pkey" PRIMARY KEY ("questionId","issueId")
);

-- CreateTable
CREATE TABLE "question_options" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "stanceValue" INTEGER NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "question_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_answers" (
    "id" TEXT NOT NULL,
    "guideId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "importance" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "user_answers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "offices_electionId_idx" ON "offices"("electionId");

-- CreateIndex
CREATE INDEX "offices_jurisdictionId_idx" ON "offices"("jurisdictionId");

-- CreateIndex
CREATE INDEX "candidates_officeId_idx" ON "candidates"("officeId");

-- CreateIndex
CREATE UNIQUE INDEX "issues_slug_key" ON "issues"("slug");

-- CreateIndex
CREATE INDEX "issues_slug_idx" ON "issues"("slug");

-- CreateIndex
CREATE INDEX "issues_jurisdictionId_idx" ON "issues"("jurisdictionId");

-- CreateIndex
CREATE INDEX "candidate_stances_candidateId_idx" ON "candidate_stances"("candidateId");

-- CreateIndex
CREATE INDEX "candidate_stances_issueId_idx" ON "candidate_stances"("issueId");

-- CreateIndex
CREATE UNIQUE INDEX "candidate_stances_candidateId_issueId_key" ON "candidate_stances"("candidateId", "issueId");

-- CreateIndex
CREATE INDEX "sources_stanceId_idx" ON "sources"("stanceId");

-- CreateIndex
CREATE UNIQUE INDEX "quizzes_electionId_key" ON "quizzes"("electionId");

-- CreateIndex
CREATE INDEX "questions_quizId_idx" ON "questions"("quizId");

-- CreateIndex
CREATE INDEX "question_options_questionId_idx" ON "question_options"("questionId");

-- CreateIndex
CREATE INDEX "user_answers_guideId_idx" ON "user_answers"("guideId");

-- CreateIndex
CREATE UNIQUE INDEX "user_answers_guideId_questionId_key" ON "user_answers"("guideId", "questionId");

-- CreateIndex
CREATE UNIQUE INDEX "ballots_officeId_key" ON "ballots"("officeId");

-- AddForeignKey
ALTER TABLE "ballots" ADD CONSTRAINT "ballots_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "offices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offices" ADD CONSTRAINT "offices_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "jurisdictions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offices" ADD CONSTRAINT "offices_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "elections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "offices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issues" ADD CONSTRAINT "issues_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "jurisdictions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_stances" ADD CONSTRAINT "candidate_stances_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_stances" ADD CONSTRAINT "candidate_stances_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "issues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sources" ADD CONSTRAINT "sources_stanceId_fkey" FOREIGN KEY ("stanceId") REFERENCES "candidate_stances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "elections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_issues" ADD CONSTRAINT "question_issues_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_issues" ADD CONSTRAINT "question_issues_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "issues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_options" ADD CONSTRAINT "question_options_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_answers" ADD CONSTRAINT "user_answers_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "guides"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_answers" ADD CONSTRAINT "user_answers_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_answers" ADD CONSTRAINT "user_answers_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "question_options"("id") ON DELETE CASCADE ON UPDATE CASCADE;

