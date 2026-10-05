import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import StanceBadge from "@/components/quiz/StanceBadge";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function IssuePage({ params }: Props) {
  const { slug } = await params;

  const issue = await prisma.issue.findUnique({
    where: { slug },
    include: {
      stances: {
        // Only races voters can still act on — past elections stay on their own pages
        where: { candidate: { office: { election: { status: { not: "completed" } } } } },
        include: {
          candidate: {
            include: {
              office: {
                include: {
                  election: { include: { jurisdiction: true } },
                },
              },
            },
          },
          sources: true,
        },
        orderBy: { position: "desc" },
      },
    },
  });

  if (!issue) notFound();

  // Group stances by election
  const byElection = new Map<string, {
    election: { id: string; title: string; jurisdiction: { name: string } };
    stances: typeof issue.stances;
  }>();

  for (const stance of issue.stances) {
    const electionId = stance.candidate.office.election.id;
    if (!byElection.has(electionId)) {
      byElection.set(electionId, {
        election: stance.candidate.office.election,
        stances: [],
      });
    }
    byElection.get(electionId)!.stances.push(stance);
  }


  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Issue header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{issue.name}</h1>
          <p className="text-gray-700">{issue.summary}</p>
          {issue.description && (
            <p className="text-gray-600 mt-3 text-sm leading-relaxed">{issue.description}</p>
          )}
          <p className="text-xs text-gray-400 mt-3 capitalize">
            {issue.level} issue
          </p>
        </div>

        {/* Stances by election */}
        {byElection.size === 0 ? (
          <p className="text-sm text-gray-500 italic">No candidate stances loaded yet.</p>
        ) : (
          [...byElection.values()].map(({ election, stances }) => (
            <div key={election.id} className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold text-gray-700">
                  <Link href={`/elections/${election.id}`} className="hover:text-blue-600 hover:underline">
                    {election.title}
                  </Link>
                </h2>
              </div>

              {/* Visual stance spectrum */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-4">
                <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 grid grid-cols-5 text-xs text-center font-medium text-gray-400">
                  <span className="text-red-500">Strongly Opposes</span>
                  <span className="text-orange-500">Opposes</span>
                  <span className="text-gray-400">Neutral</span>
                  <span className="text-lime-600">Supports</span>
                  <span className="text-green-600">Strongly Supports</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {stances.map((stance) => (
                    <div key={stance.id} className="px-4 py-3 flex items-start gap-3">
                      <div className="w-5 flex-shrink-0" style={{ marginLeft: `${((stance.position + 2) / 4) * 80}%` }}>
                        <div className="w-2 h-2 rounded-full bg-blue-500 mt-1" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link
                            href={`/candidates/${stance.candidate.id}`}
                            className="font-medium text-gray-800 hover:text-blue-600 hover:underline text-sm"
                          >
                            {stance.candidate.name}
                          </Link>
                          {stance.candidate.party && (
                            <span className="text-xs text-gray-400">{stance.candidate.party}</span>
                          )}
                          <StanceBadge position={stance.position} />
                        </div>
                        <p className="text-xs text-gray-600 mt-0.5">{stance.summary}</p>
                        {stance.sources.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-1">
                            {stance.sources.map((src) => (
                              <a key={src.id} href={src.url} target="_blank" rel="noopener noreferrer"
                                className="text-xs text-blue-400 hover:underline">
                                {src.title ?? "Source"} ↗
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}

        {/* Other issues nav */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-600 mb-3">Other issues</h3>
          <div className="flex flex-wrap gap-2">
            {["housing", "climate", "public-safety", "economy", "healthcare", "immigration", "education", "water", "transportation"]
              .filter((s) => s !== slug)
              .map((s) => (
                <Link
                  key={s}
                  href={`/issues/${s}`}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full text-xs transition-colors"
                >
                  {s.replace(/-/g, " ")}
                </Link>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
