-- Your notes on each candidate in a contest: { "<candidate name>": "<note>" }
ALTER TABLE "choices" ADD COLUMN "candidateNotes" JSONB;
