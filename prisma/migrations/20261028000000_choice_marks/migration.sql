-- Soft labels on several options of one contest: { "<option>": "tentative" | "possible" | "unsure" }
ALTER TABLE "choices" ADD COLUMN "marks" JSONB;
