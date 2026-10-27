-- Per-city page title and text for an election covering several cities: { "cities": { "<id>": { "title", "description" } } }
ALTER TABLE "elections" ADD COLUMN "metadata" JSONB;
