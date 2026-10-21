import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import DistrictPicker from "@/components/DistrictPicker";
import { formatElectionDate } from "@/lib/format";
import BallotSheet from "@/components/ballot/BallotSheet";
import { BallotHeader, Extra, accentButton, outlineButton } from "@/components/ballot/Paper";
import { groupSections, hasPrintedLayout, layoutOf, orderForBallot } from "@/components/ballot/ballot";
import { districtOptions, matchesSelection, parseDistrictSelection } from "@/lib/districts";

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
              candidates: { select: { id: true, name: true, party: true, incumbent: true, shortBio: true, website: true } },
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
  const items = orderForBallot(election.ballots.filter((b) => matchesSelection(b, selection)));
  const sections = groupSections(items);
  const printed = hasPrintedLayout(items);
  const source = items[0] ? layoutOf(items[0])?.source : undefined;
  const districtQuery = new URLSearchParams(selection as Record<string, string>).toString();
  const quizHref = `/elections/${electionId}/quiz${districtQuery ? `?${districtQuery}` : ""}`;
  const guideHref = `/guide/new?electionId=${electionId}${districtQuery ? `&${districtQuery}` : ""}`;

  return (
    <>
      <div className="container mx-auto max-w-6xl space-y-4 px-4 py-8">
        <BallotHeader
          electionId={electionId}
          date={formatElectionDate(election.electionDate)}
          title={election.title}
          place={election.jurisdiction.name}
          aside={
            <>
              {election.status !== "completed" && (
                <Link href={guideHref} className={accentButton}>
                  Build my guide
                </Link>
              )}
              {hasQuiz && (
                <Link href={quizHref} className={outlineButton}>
                  Take the quiz ({election.quiz?.questions.length} questions)
                </Link>
              )}
            </>
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

        <div className="grid gap-4 font-sans lg:grid-cols-3">
          <div className="lg:col-span-2">
            <DistrictPicker options={pickerOptions} selection={selection} lookupUrl={election.districtLookupUrl} />
          </div>
          {quizIssues.length > 0 && (
            <div className="border-[1.5px] border-ballot-ink bg-ballot-paper p-4">
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
        </div>

        <Extra className="text-sm">
          <strong>Preview of your ballot.</strong>{" "}
          {printed ? (
            <>
              Contests, order and wording come from the county&apos;s official sample ballot
              {source && (
                <>
                  {" "}
                  (
                  <a href={source} target="_blank" rel="noopener noreferrer" className="underline">
                    source ↗
                  </a>
                  )
                </>
              )}
              .
            </>
          ) : (
            <>We couldn&apos;t get this county&apos;s printed ballot, so order and wording may differ from yours.</>
          )}{" "}
          Tap ⓘ on a contest for candidates and explainers. To mark your picks, build a guide.
        </Extra>

        {sections.length === 0 ? (
          <p className="text-sm italic text-gray-600">No contests loaded yet.</p>
        ) : (
          <BallotSheet sections={sections} electionId={electionId} readOnly />
        )}
      </div>
    </>
  );
}
