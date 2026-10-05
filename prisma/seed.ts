// Seed script: loads the curated, source-backed election bundles in data/.
// Nothing here invents data — every election, office, candidate and measure comes
// from a bundle file whose facts are documented in data/research/.
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";
import { readFileSync, readdirSync } from "fs";
import { resolve } from "path";

// Load environment variables from .env.local (an explicit DATABASE_URL wins)
config({ path: resolve(process.cwd(), ".env.local") });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding curated election bundles...");
  await seedElectionBundles();
  console.log("");
  console.log("🎉 Seeding complete!");
  console.log(`   - Elections: ${await prisma.election.count()}`);
  console.log(`   - Offices: ${await prisma.office.count()}`);
  console.log(`   - Candidates: ${await prisma.candidate.count()}`);
  console.log(`   - Ballot items: ${await prisma.ballot.count()}`);
}

// ────────────────────────────────────────────────────────────────────────────
// Curated election bundles
// ────────────────────────────────────────────────────────────────────────────

interface IssueFile {
  slug: string;
  name: string;
  level: string;
  summary: string;
  description?: string;
  jurisdictionFips?: string;
}

interface CandidateData {
  id: string;
  name: string;
  party?: string;
  incumbent?: boolean;
  shortBio?: string;
  longBio?: string;
  photoUrl?: string;
  website?: string | null;
  email?: string;
  phone?: string;
}

interface OfficeData {
  id: string;
  title: string;
  level: string;
  jurisdictionFips: string;
  district?: string;
  districtType?: string;
  districtCode?: string;
  termYears?: number;
  sortOrder?: number;
  description?: string;
  candidates: CandidateData[];
}

interface MeasureData {
  id: string;
  number?: string;
  title: string;
  description?: string;
  // state | county | city | district
  level: string;
  type?: string;
  districtType?: string;
  districtCode?: string;
  sourceUrl?: string;
  // Official explanations, verbatim from the state/county voter guide
  yesMeans?: string;
  noMeans?: string;
  fiscalImpact?: string;
  placedBy?: string;
  passes?: string;
}

interface ElectionFile {
  slug: string;
  electionId: string;
  title: string;
  electionDate: string;
  type: string;
  status: string;
  description?: string;
  officialUrl?: string;
  districtLookupUrl?: string;
  jurisdiction: { name: string; state: string; type: string; fipsCode: string };
  localJurisdictions?: Array<{
    id: string;
    name: string;
    state: string;
    countyName?: string;
    type: string;
    fipsCode: string;
  }>;
  offices: OfficeData[];
  measures?: MeasureData[];
}

interface StanceData {
  candidateId: string;
  issueId: string;
  position: number;
  summary: string;
  rationale?: string;
  sources: Array<{ url: string; title?: string; quote?: string; publishedAt?: string }>;
}

interface StancesFile {
  electionSlug: string;
  stances: StanceData[];
}

interface QuestionData {
  id: string;
  prompt: string;
  helpText?: string;
  order: number;
  issues: Array<{ issueId: string; weight: number }>;
  options: Array<{ label: string; stanceValue: number; order: number }>;
}

interface QuizFile {
  electionSlug: string;
  title: string;
  questions: QuestionData[];
}

async function seedElectionBundles() {
  const electionsDir = resolve(process.cwd(), "data", "elections");
  let files: string[];
  try {
    files = readdirSync(electionsDir).filter((f) => f.endsWith(".json")).sort();
  } catch {
    console.log("⚠️  data/elections not found — skipping election bundles.");
    return;
  }
  for (const file of files) {
    await seedElectionBundle(file.replace(/\.json$/, ""));
  }
}

async function seedElectionBundle(slug: string) {
  const dataRoot = resolve(process.cwd(), "data");
  const electionPath = resolve(dataRoot, "elections", `${slug}.json`);
  const electionData: ElectionFile = JSON.parse(readFileSync(electionPath, "utf-8"));

  console.log(`\n🗳️  Seeding ${electionData.title} (${slug})...`);

  // 1. Upsert jurisdictions
  const stateJurisdiction = await prisma.jurisdiction.upsert({
    where: { fipsCode: electionData.jurisdiction.fipsCode },
    update: { name: electionData.jurisdiction.name },
    create: {
      name: electionData.jurisdiction.name,
      state: electionData.jurisdiction.state,
      type: electionData.jurisdiction.type,
      fipsCode: electionData.jurisdiction.fipsCode,
    },
  });

  const localJurisdictions: Record<string, string> = {};
  for (const lj of electionData.localJurisdictions ?? []) {
    const jur = await prisma.jurisdiction.upsert({
      where: { fipsCode: lj.fipsCode },
      update: { name: lj.name },
      create: {
        name: lj.name,
        state: lj.state,
        countyName: lj.countyName,
        type: lj.type,
        fipsCode: lj.fipsCode,
      },
    });
    localJurisdictions[lj.fipsCode] = jur.id;
  }
  localJurisdictions[electionData.jurisdiction.fipsCode] = stateJurisdiction.id;

  console.log("   ✅ Jurisdictions upserted");

  // 2. Upsert election
  const election = await prisma.election.upsert({
    where: { id: electionData.electionId },
    update: {
      title: electionData.title,
      description: electionData.description,
      electionDate: new Date(electionData.electionDate),
      status: electionData.status,
      officialUrl: electionData.officialUrl,
      districtLookupUrl: electionData.districtLookupUrl ?? null,
    },
    create: {
      id: electionData.electionId,
      jurisdictionId: stateJurisdiction.id,
      title: electionData.title,
      description: electionData.description,
      electionDate: new Date(electionData.electionDate),
      type: electionData.type,
      status: electionData.status,
      officialUrl: electionData.officialUrl,
      districtLookupUrl: electionData.districtLookupUrl ?? null,
    },
  });
  console.log("   ✅ Election upserted");

  // 3. Upsert issues from data/issues/*.json
  const issuesDir = resolve(dataRoot, "issues");
  const issueFiles = readdirSync(issuesDir).filter((f) => f.endsWith(".json"));
  const issueSlugToId: Record<string, string> = {};

  for (const file of issueFiles) {
    const issueData: IssueFile = JSON.parse(readFileSync(resolve(issuesDir, file), "utf-8"));
    const jurisdictionId = issueData.jurisdictionFips
      ? localJurisdictions[issueData.jurisdictionFips]
      : undefined;

    const issue = await prisma.issue.upsert({
      where: { slug: issueData.slug },
      update: {
        name: issueData.name,
        summary: issueData.summary,
        description: issueData.description,
        level: issueData.level,
      },
      create: {
        slug: issueData.slug,
        name: issueData.name,
        summary: issueData.summary,
        description: issueData.description,
        level: issueData.level,
        jurisdictionId: jurisdictionId ?? null,
      },
    });
    issueSlugToId[issueData.slug] = issue.id;
  }
  console.log(`   ✅ ${issueFiles.length} issues upserted`);

  // 4. Upsert offices + candidates
  const candidateLocalId: Record<string, string> = {}; // data-file id → db id

  for (const officeData of electionData.offices) {
    const jurisdictionId =
      localJurisdictions[officeData.jurisdictionFips] ?? stateJurisdiction.id;

    const office = await prisma.office.upsert({
      where: { id: officeData.id },
      update: {
        title: officeData.title,
        level: officeData.level,
        description: officeData.description,
        district: officeData.district ?? null,
        districtType: officeData.districtType ?? null,
        districtCode: officeData.districtCode ?? null,
        termYears: officeData.termYears,
        sortOrder: officeData.sortOrder ?? 100,
      },
      create: {
        id: officeData.id,
        jurisdictionId,
        electionId: election.id,
        title: officeData.title,
        level: officeData.level,
        description: officeData.description,
        district: officeData.district ?? null,
        districtType: officeData.districtType ?? null,
        districtCode: officeData.districtCode ?? null,
        termYears: officeData.termYears,
        sortOrder: officeData.sortOrder ?? 100,
      },
    });

    // Ballot row for the race, so guides can record a pick for every contest
    const raceBallot = {
      number: null,
      title: officeData.title,
      description: officeData.description ?? null,
      type: "candidate",
      options: officeData.candidates.map((c) => c.name),
      metadata: { level: officeData.level, sortOrder: officeData.sortOrder ?? 100 },
      districtType: officeData.districtType ?? null,
      districtCode: officeData.districtCode ?? null,
    };
    await prisma.ballot.upsert({
      where: { officeId: office.id },
      update: raceBallot,
      create: { id: `${office.id}-race`, electionId: election.id, officeId: office.id, ...raceBallot },
    });

    for (const cd of officeData.candidates) {
      const candidate = await prisma.candidate.upsert({
        where: { id: cd.id },
        update: {
          name: cd.name,
          party: cd.party,
          incumbent: cd.incumbent ?? false,
          shortBio: cd.shortBio,
          website: cd.website ?? null,
        },
        create: {
          id: cd.id,
          officeId: office.id,
          name: cd.name,
          party: cd.party,
          incumbent: cd.incumbent ?? false,
          shortBio: cd.shortBio,
          longBio: cd.longBio,
          photoUrl: cd.photoUrl,
          website: cd.website ?? null,
          email: cd.email,
          phone: cd.phone,
        },
      });
      candidateLocalId[cd.id] = candidate.id;
    }
  }
  console.log(
    `   ✅ ${electionData.offices.length} offices + ${Object.keys(candidateLocalId).length} candidates upserted`,
  );

  // Prune offices/candidates that were removed from the bundle (bundles are the source of truth)
  const bundleOfficeIds = electionData.offices.map((o) => o.id);
  const bundleCandidateIds = Object.keys(candidateLocalId);
  const prunedCandidates = await prisma.candidate.deleteMany({
    where: { office: { electionId: election.id }, id: { notIn: bundleCandidateIds } },
  });
  const prunedOffices = await prisma.office.deleteMany({
    where: { electionId: election.id, id: { notIn: bundleOfficeIds } },
  });
  if (prunedCandidates.count || prunedOffices.count) {
    console.log(`   🧹 Pruned ${prunedOffices.count} offices, ${prunedCandidates.count} candidates no longer in the bundle`);
  }

  // 4b. Upsert ballot measures (ids are bundle-stable so re-seeding is idempotent)
  for (const m of electionData.measures ?? []) {
    const data = {
      number: m.number ?? null,
      title: m.title,
      description: m.description ?? null,
      type: m.type ?? "measure",
      options: ["YES", "NO"],
      metadata: {
        level: m.level,
        sourceUrl: m.sourceUrl ?? null,
        yesMeans: m.yesMeans ?? null,
        noMeans: m.noMeans ?? null,
        fiscalImpact: m.fiscalImpact ?? null,
        placedBy: m.placedBy ?? null,
        passes: m.passes ?? null,
      },
      districtType: m.districtType ?? null,
      districtCode: m.districtCode ?? null,
    };
    await prisma.ballot.upsert({
      where: { id: m.id },
      update: data,
      create: { id: m.id, electionId: election.id, ...data },
    });
  }
  const keepBallotIds = [
    ...(electionData.measures ?? []).map((m) => m.id),
    ...bundleOfficeIds.map((id) => `${id}-race`),
  ];
  const prunedBallots = await prisma.ballot.deleteMany({
    where: { electionId: election.id, id: { notIn: keepBallotIds } },
  });
  if (prunedBallots.count) console.log(`   🧹 Pruned ${prunedBallots.count} ballot items no longer in the bundle`);
  if (electionData.measures?.length) {
    console.log(`   ✅ ${electionData.measures.length} ballot measures upserted`);
  }

  // 5. Upsert stances + sources
  const stancesPath = resolve(dataRoot, "stances", `${slug}.json`);
  let stancesFile: StancesFile;
  try {
    stancesFile = JSON.parse(readFileSync(stancesPath, "utf-8"));
  } catch {
    console.log("   ℹ️  No stances file — skipping stances.");
    stancesFile = { electionSlug: "", stances: [] };
  }

  let stanceCount = 0;
  for (const s of stancesFile.stances) {
    const candidateDbId = candidateLocalId[s.candidateId];
    const issueDbId = issueSlugToId[s.issueId];
    if (!candidateDbId || !issueDbId) continue;

    const stance = await prisma.candidateStance.upsert({
      where: { candidateId_issueId: { candidateId: candidateDbId, issueId: issueDbId } },
      update: { position: s.position, summary: s.summary, rationale: s.rationale },
      create: {
        candidateId: candidateDbId,
        issueId: issueDbId,
        position: s.position,
        summary: s.summary,
        rationale: s.rationale,
      },
    });

    // Replace sources every time
    await prisma.source.deleteMany({ where: { stanceId: stance.id } });
    for (const src of s.sources) {
      await prisma.source.create({
        data: {
          stanceId: stance.id,
          url: src.url,
          title: src.title,
          quote: src.quote,
          publishedAt: src.publishedAt ? new Date(src.publishedAt) : null,
        },
      });
    }
    stanceCount++;
  }
  console.log(`   ✅ ${stanceCount} stances upserted`);

  // 6. Upsert quiz + questions + options + question-issue links
  const quizPath = resolve(dataRoot, "quizzes", `${slug}.json`);
  let quizFile: QuizFile;
  try {
    quizFile = JSON.parse(readFileSync(quizPath, "utf-8"));
  } catch {
    console.log("   ℹ️  No quiz file — skipping quiz.");
    return;
  }

  const quiz = await prisma.quiz.upsert({
    where: { electionId: election.id },
    update: { title: quizFile.title },
    create: { electionId: election.id, title: quizFile.title },
  });

  for (const qd of quizFile.questions) {
    const question = await prisma.question.upsert({
      where: { id: qd.id },
      update: { prompt: qd.prompt, helpText: qd.helpText, order: qd.order },
      create: {
        id: qd.id,
        quizId: quiz.id,
        prompt: qd.prompt,
        helpText: qd.helpText,
        order: qd.order,
      },
    });

    // Replace options + question-issue links
    await prisma.questionOption.deleteMany({ where: { questionId: question.id } });
    for (const opt of qd.options) {
      await prisma.questionOption.create({
        data: {
          questionId: question.id,
          label: opt.label,
          stanceValue: opt.stanceValue,
          order: opt.order,
        },
      });
    }

    await prisma.questionIssue.deleteMany({ where: { questionId: question.id } });
    for (const qi of qd.issues) {
      const issueDbId = issueSlugToId[qi.issueId];
      if (!issueDbId) continue;
      await prisma.questionIssue.create({
        data: { questionId: question.id, issueId: issueDbId, weight: qi.weight },
      });
    }
  }
  console.log(`   ✅ Quiz with ${quizFile.questions.length} questions upserted`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
