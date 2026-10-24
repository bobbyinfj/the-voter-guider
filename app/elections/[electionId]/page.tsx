import { computeResults } from "@/lib/quiz/db";
import { quizOnBallot } from "@/lib/quiz/ballot";
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatElectionDate } from "@/lib/format";
import { snippetCandidates } from "@/lib/profile";
import { badgesFrom } from "@/lib/scorecard";
import { BallotHeader, outlineButton } from "@/components/ballot/Paper";
import { orderForBallot } from "@/components/ballot/ballot";
import { districtOptions, parseDistrictSelection } from "@/lib/districts";
import ElectionGuide from "@/components/guide/ElectionGuide";
import type { EditableGuide } from "@/components/guide/useGuideEditor";
import { defaultKeyFor, getViewer, ownedBy } from "@/lib/owner";

interface Props {
  params: Promise<{ electionId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ElectionPage({ params, searchParams }: Props) {
  const { electionId } = await params;
  const rawParams = await searchParams;
  const selection = parseDistrictSelection(
    Object.fromEntries(Object.entries(rawParams).filter(([, v]) => typeof v === "string")),
  );

  const election = await prisma.election.findUnique({
    where: { id: electionId },
    include: {
      jurisdiction: true,
      ballots: {
        select: {
          id: true,
          number: true,
          title: true,
          description: true,
          type: true,
          options: true,
          metadata: true,
          districtType: true,
          districtCode: true,
          office: {
            select: {
              id: true,
              district: true,
              candidates: {
                select: {
                  id: true, name: true, party: true, incumbent: true, shortBio: true, website: true, profile: true,
                  // Sourced positions, for "Where they stand" in each race
                  stances: {
                    select: {
                      position: true,
                      summary: true,
                      issue: { select: { slug: true, name: true } },
                      sources: { select: { url: true, title: true, quote: true } },
                    },
                  },
                },
              },
            },
          },
        },
      },
      offices: { select: { districtType: true, districtCode: true, district: true } },
      quiz: { select: { id: true, questions: { select: { id: true } } } },
    },
  });

  if (!election) notFound();

  const hasQuiz = (election.quiz?.questions.length ?? 0) > 0;
  // Topics where at least one candidate on this ballot has a sourced position
  const quizIssues = await prisma.issue.findMany({
    where: { stances: { some: { candidate: { office: { electionId } } } } },
    select: { slug: true, name: true },
    orderBy: { name: "asc" },
  });
  const pickerOptions = districtOptions([...election.offices, ...election.ballots]);
  const items = orderForBallot(
    election.ballots.map((b) => ({ ...b, office: b.office && { ...b.office, candidates: snippetCandidates(b.office.candidates) } })),
  );
  const districtQuery = new URLSearchParams(selection as Record<string, string>).toString();
  const quizHref = `/elections/${electionId}/quiz${districtQuery ? `?${districtQuery}` : ""}`;
  const stepHref = `/elections/${electionId}?${new URLSearchParams({ ...(selection as Record<string, string>), view: "step" })}`;

  // Your guide for this election: the checks on this ballot (if you've made any), and any
  // other guides you've started for it
  const viewer = await getViewer();
  const guideSelect = {
    id: true, title: true, visibility: true, shareToken: true, shareCommunity: true, notes: true, metadata: true,
    choices: { select: { ballotId: true, selection: true, notes: true, status: true, candidateNotes: true } },
  } as const;
  const [defaultGuide, otherGuides] = await Promise.all([
    prisma.guide.findUnique({ where: { defaultKey: defaultKeyFor(viewer, electionId) }, select: guideSelect }),
    prisma.guide.findMany({
      where: { AND: [ownedBy(viewer), { electionId, defaultKey: null, isTemplate: false }] },
      select: { id: true, title: true },
      orderBy: { updatedAt: "desc" },
    }),
  ]);
  // Published guides' picks (party slates, editorial boards, the League), as badges
  const templates = await prisma.guide.findMany({
    where: { electionId, isTemplate: true, visibility: "public" },
    select: { title: true, metadata: true, choices: { select: { ballotId: true, selection: true, sourceUrl: true, notes: true } } },
    orderBy: { title: "asc" },
  });
  const badges = badgesFrom(templates);
  const initialGuide: EditableGuide | null = defaultGuide && { ...defaultGuide, isDefault: true, isOwner: true };
  // What your quiz answers matched in each race, shown on the ballot
  const answered = defaultGuide && hasQuiz ? await prisma.userAnswer.count({ where: { guideId: defaultGuide.id } }) : 0;
  const quiz =
    defaultGuide && answered > 0 ? quizOnBallot(await computeResults(defaultGuide.id, electionId), electionId, defaultGuide.id) : null;

  return (
    <>
      <div className="container mx-auto max-w-6xl space-y-4 px-4 py-8">
        <BallotHeader
          electionId={electionId}
          date={formatElectionDate(election.electionDate)}
          title={election.title}
          place={election.jurisdiction.name}
          aside={
            <div className="flex flex-col items-start gap-1.5 sm:items-end">
              {/* A plain link: the ballot below opens "One at a time" from ?view=step */}
              <a href={stepHref} className={outlineButton}>
                Go through my ballot, one contest at a time
              </a>
              {hasQuiz && (
                <Link href={quizHref} className="text-sm text-blue-700 hover:underline">
                  Or take the issues quiz ({election.quiz?.questions.length} questions)
                </Link>
              )}
            </div>
          }
        >
          {election.description && <p className="mt-2 max-w-3xl text-sm">{election.description}</p>}
          {election.officialUrl && (
            <a
              href={election.officialUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-block text-sm text-blue-700 underline-offset-2 hover:underline"
            >
              Official election website ↗
            </a>
          )}
        </BallotHeader>

        {quizIssues.length > 0 && (
          <div className="border-[1.5px] border-ballot-ink bg-ballot-paper p-4 font-sans">
            <h2 className="mb-1 text-sm font-semibold">Where candidates stand</h2>
            <p className="mb-3 text-xs text-gray-600">
              Each topic shows candidates&apos; stated positions, quoted from their sources.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {quizIssues.map((issue) => (
                <Link
                  key={issue.slug}
                  href={`/issues/${issue.slug}`}
                  className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-700 transition-colors hover:bg-gray-200"
                >
                  {issue.name}
                </Link>
              ))}
            </div>
          </div>
        )}


        <ElectionGuide
          election={{
            id: election.id,
            title: election.title,
            electionDate: election.electionDate.toISOString(),
            districtLookupUrl: election.districtLookupUrl,
            jurisdiction: { name: election.jurisdiction.name },
          }}
          ballots={items}
          pickerOptions={pickerOptions}
          initialGuide={election.status === "completed" ? null : initialGuide}
          otherGuides={otherGuides}
          urlDistricts={selection}
          readOnly={election.status === "completed"}
          quiz={quiz}
          badges={badges}
        />
      </div>
    </>
  );
}
