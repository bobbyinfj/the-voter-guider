// Removes data that isn't backed by a curated, source-documented election bundle:
// elections with no data/elections/*.json bundle, the old sample precincts and the
// precinct-level jurisdictions they hung off, sample ballot items, and issues no
// bundle uses any more.
//
// Dry run by default — prints what would be deleted, including user guides that
// would be removed with their election. Pass --execute to delete.
//
//   DATABASE_URL=... npx tsx scripts/remove-unsourced-data.ts [--execute]
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { readFileSync, readdirSync } from "fs";
import { resolve } from "path";

const execute = process.argv.includes("--execute");
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

function bundleElectionIds(): string[] {
  const dir = resolve(process.cwd(), "data", "elections");
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(resolve(dir, f), "utf-8")).electionId as string);
}

async function main() {
  const keep = bundleElectionIds();
  console.log(`Bundled elections (kept): ${keep.join(", ")}`);

  const elections = await prisma.election.findMany({
    where: { id: { notIn: keep } },
    select: { id: true, title: true, _count: { select: { guides: true, ballots: true, offices: true } } },
  });
  const precinctJurisdictions = await prisma.jurisdiction.findMany({
    where: { type: "precinct" },
    select: { id: true, name: true, _count: { select: { guides: true, precincts: true, elections: true } } },
  });
  const sampleBallots = await prisma.ballot.count({
    where: { metadata: { path: ["isSample"], equals: true } },
  });
  const precincts = await prisma.precinct.count();
  // Issues no bundle uses any more (no stances and not linked to any quiz question)
  const orphanIssues = await prisma.issue.findMany({
    where: { stances: { none: {} }, questionLinks: { none: {} } },
    select: { slug: true },
  });

  console.log("\nElections with no bundle:");
  for (const e of elections) {
    console.log(`  - ${e.id} "${e.title}": ${e._count.ballots} ballot items, ${e._count.offices} offices, ${e._count.guides} user guides`);
  }
  console.log("\nPrecinct-level jurisdictions (sample precincts):");
  for (const j of precinctJurisdictions) {
    console.log(`  - ${j.name}: ${j._count.precincts} precincts, ${j._count.elections} elections, ${j._count.guides} user guides`);
  }
  console.log(`\nSample ballot items: ${sampleBallots}`);
  console.log(`Precincts: ${precincts}`);
  console.log(`Unused issues: ${orphanIssues.map((i) => i.slug).join(", ") || "none"}`);

  if (!execute) {
    console.log("\nDry run — nothing deleted. Re-run with --execute to delete the above.");
    return;
  }

  const deletedBallots = await prisma.ballot.deleteMany({
    where: { metadata: { path: ["isSample"], equals: true } },
  });
  // Elections cascade to their ballots, offices, quizzes and guides
  const deletedElections = await prisma.election.deleteMany({ where: { id: { notIn: keep } } });
  const deletedPrecincts = await prisma.precinct.deleteMany({});
  const deletedJurisdictions = await prisma.jurisdiction.deleteMany({ where: { type: "precinct" } });
  const deletedIssues = await prisma.issue.deleteMany({
    where: { stances: { none: {} }, questionLinks: { none: {} } },
  });
  console.log(
    `\nDeleted: ${deletedElections.count} elections, ${deletedBallots.count} sample ballot items, ` +
      `${deletedPrecincts.count} precincts, ${deletedJurisdictions.count} precinct jurisdictions, ` +
      `${deletedIssues.count} unused issues.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
