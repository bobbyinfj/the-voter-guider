import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import DistrictPicker from "@/components/DistrictPicker";
import MeasureExplainer, { measureOfficial } from "@/components/MeasureExplainer";
import { formatElectionDate } from "@/lib/format";
import { districtOptions, matchesSelection, parseDistrictSelection } from "@/lib/districts";

interface Props {
  params: Promise<{ electionId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const MEASURE_LEVEL_LABELS: Record<string, string> = {
  state: "Statewide",
  county: "County",
  city: "City",
  district: "Special district",
};

function measureLevel(metadata: unknown): string {
  if (metadata && typeof metadata === "object" && "level" in metadata) {
    const level = (metadata as { level?: unknown }).level;
    if (typeof level === "string") return level;
  }
  return "state";
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
      ballots: { orderBy: { number: "asc" } },
      offices: {
        include: {
          candidates: { orderBy: [{ incumbent: "desc" }, { name: "asc" }] },
        },
        orderBy: { sortOrder: "asc" },
      },
      quiz: {
        select: {
          id: true,
          questions: {
            select: { id: true, issues: { select: { issue: { select: { slug: true, name: true } } } } },
            orderBy: { order: "asc" },
          },
        },
      },
    },
  });

  if (!election) notFound();

  const hasQuiz = (election.quiz?.questions.length ?? 0) > 0;
  const quizIssues = Array.from(
    new Map(
      (election.quiz?.questions ?? []).flatMap((q) => q.issues.map((qi) => [qi.issue.slug, qi.issue] as const)),
    ).values(),
  );
  const pickerOptions = districtOptions([...election.offices, ...election.ballots]);
  const offices = election.offices.filter((o) => matchesSelection(o, selection));
  const measures = election.ballots
    .filter((b) => b.type !== "candidate" && matchesSelection(b, selection))
    .sort((a, b) => (a.number ?? "").localeCompare(b.number ?? "", undefined, { numeric: true }));
  const measureGroups = ["state", "county", "city", "district"]
    .map((level) => ({ level, items: measures.filter((m) => measureLevel(m.metadata) === level) }))
    .filter((g) => g.items.length > 0);
  const districtQuery = new URLSearchParams(selection as Record<string, string>).toString();
  const quizHref = `/elections/${electionId}/quiz${districtQuery ? `?${districtQuery}` : ""}`;
  const guideHref = `/guide/new?electionId=${electionId}${districtQuery ? `&${districtQuery}` : ""}`;
  const electionDate = formatElectionDate(election.electionDate);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Election header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm text-gray-500 mb-1">{election.jurisdiction.name}</p>
              <h1 className="text-2xl font-bold text-gray-900">{election.title}</h1>
              <p className="text-gray-600 mt-1">
                <span className="font-medium">Election Day:</span> {electionDate}
              </p>
              {election.officialUrl && (
                <a
                  href={election.officialUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline mt-1 inline-block"
                >
                  Official election website ↗
                </a>
              )}
            </div>
            <div className="flex flex-col gap-2 flex-shrink-0">
              {election.status !== "completed" && (
                <Link
                  href={guideHref}
                  className="px-6 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors text-center"
                >
                  📝 Build my guide
                  <p className="text-xs font-normal opacity-80 mt-0.5">
                    Record your picks and notes · share it
                  </p>
                </Link>
              )}
              {hasQuiz && (
                <Link
                  href={quizHref}
                  className="flex-shrink-0 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors text-center"
                >
                  🗳️ Take the Quiz
                  <p className="text-xs font-normal opacity-80 mt-0.5">
                    {election.quiz?.questions.length} questions · see who matches you
                  </p>
                </Link>
              )}
            </div>
          </div>
          {election.description && (
            <p className="text-gray-600 mt-4 text-sm">{election.description}</p>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Offices / Candidate Races */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">Candidate Races</h2>
            {offices.length === 0 ? (
              <p className="text-sm text-gray-500 italic">No offices loaded yet.</p>
            ) : (
              offices.map((office) => (
                <div
                  key={office.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
                >
                  <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-800">
                        {office.title}
                        {office.districtType && office.district && !selection[office.districtType as keyof typeof selection] && (
                          <span className="ml-2 align-middle text-xs font-normal bg-gray-100 text-gray-600 rounded px-1.5 py-0.5">
                            {office.district} only
                          </span>
                        )}
                      </h3>
                      {office.description && (
                        <p className="text-xs text-gray-500 mt-0.5">{office.description}</p>
                      )}
                    </div>
                    <Link
                      href={`/elections/${electionId}/offices/${office.id}`}
                      className="text-xs text-blue-600 hover:underline whitespace-nowrap"
                    >
                      Compare all →
                    </Link>
                  </div>
                  <ul className="divide-y divide-gray-50">
                    {office.candidates.map((c) => (
                      <li key={c.id} className="px-5 py-3 flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <Link
                            href={`/candidates/${c.id}`}
                            className="font-medium text-gray-800 hover:text-blue-600 hover:underline"
                          >
                            {c.name}
                          </Link>
                          {c.party && (
                            <span className="ml-2 text-xs text-gray-400">{c.party}</span>
                          )}
                          {c.incumbent && (
                            <span className="ml-1 text-xs bg-yellow-100 text-yellow-700 border border-yellow-200 rounded px-1.5 py-0.5">
                              Incumbent
                            </span>
                          )}
                          {c.shortBio && (
                            <p className="text-xs text-gray-500 mt-0.5 truncate">{c.shortBio}</p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            )}

            {/* Ballot measures */}
            {measureGroups.map((group) => (
              <div key={group.level} className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-800 mt-6">
                  {MEASURE_LEVEL_LABELS[group.level] ?? group.level} Ballot Measures
                </h2>
                {group.items.map((b) => (
                  <div key={b.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                    <div className="flex items-start gap-3">
                      {b.number && (
                        <span className="flex-shrink-0 text-xs font-bold bg-gray-100 text-gray-600 px-2 py-1 rounded">
                          {b.number}
                        </span>
                      )}
                      <div>
                        <h3 className="font-semibold text-gray-800">{b.title}</h3>
                        {b.description && (
                          <p className="text-sm text-gray-600 mt-1">{b.description}</p>
                        )}
                        <MeasureExplainer official={measureOfficial(b.metadata)} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <DistrictPicker
              options={pickerOptions}
              selection={selection}
              lookupUrl={election.districtLookupUrl}
            />
            {hasQuiz && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
                <h3 className="font-semibold text-blue-800 mb-2">Not sure who to vote for?</h3>
                <p className="text-sm text-blue-700 mb-4">
                  Take our {election.quiz?.questions.length}-question quiz to see which candidates
                  match your views — with a full explanation of every point.
                </p>
                <Link
                  href={quizHref}
                  className="block text-center px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 text-sm"
                >
                  Start the quiz
                </Link>
              </div>
            )}

            {quizIssues.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                <h3 className="font-semibold text-gray-700 mb-1 text-sm">Where candidates stand</h3>
                <p className="text-xs text-gray-500 mb-3">
                  Each topic shows candidates&apos; stated positions, quoted from their sources.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {quizIssues.map((issue) => (
                    <Link
                      key={issue.slug}
                      href={`/issues/${issue.slug}`}
                      className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full text-xs transition-colors"
                    >
                      {issue.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
