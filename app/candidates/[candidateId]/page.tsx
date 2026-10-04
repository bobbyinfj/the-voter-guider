import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import StanceBadge from "@/components/quiz/StanceBadge";

interface Props {
  params: Promise<{ candidateId: string }>;
}

export default async function CandidatePage({ params }: Props) {
  const { candidateId } = await params;

  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
    include: {
      office: {
        include: {
          election: { include: { jurisdiction: true } },
        },
      },
      stances: {
        include: {
          issue: true,
          sources: { orderBy: { publishedAt: "desc" } },
        },
        orderBy: { issue: { name: "asc" } },
      },
    },
  });

  if (!candidate) notFound();

  const { office } = candidate;
  const { election } = office;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Breadcrumb */}
        <div className="mb-6 text-sm text-gray-500 flex flex-wrap gap-2">
          <Link href={`/elections/${election.id}`} className="text-blue-600 hover:underline">
            {election.title}
          </Link>
          <span>/</span>
          <Link href={`/elections/${election.id}/offices/${office.id}`} className="text-blue-600 hover:underline">
            {office.title}
          </Link>
          <span>/</span>
          <span>{candidate.name}</span>
        </div>

        {/* Candidate header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-start gap-4">
            {candidate.photoUrl ? (
              <img
                src={candidate.photoUrl}
                alt={candidate.name}
                className="w-20 h-20 rounded-full object-cover flex-shrink-0 border border-gray-200"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 text-3xl flex-shrink-0">
                {candidate.name.charAt(0)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-start gap-2">
                <h1 className="text-2xl font-bold text-gray-900">{candidate.name}</h1>
                {candidate.incumbent && (
                  <span className="text-sm bg-yellow-100 text-yellow-700 border border-yellow-200 rounded px-2 py-0.5 mt-1">
                    Incumbent
                  </span>
                )}
              </div>
              {candidate.party && (
                <p className="text-gray-600 mt-1">{candidate.party}</p>
              )}
              <p className="text-sm text-gray-500 mt-1">
                Running for: <strong>{office.title}</strong> · {election.jurisdiction.name}
              </p>
              {candidate.shortBio && (
                <p className="text-gray-700 mt-3 text-sm">{candidate.shortBio}</p>
              )}
              {candidate.longBio && (
                <p className="text-gray-600 mt-2 text-sm whitespace-pre-wrap">{candidate.longBio}</p>
              )}
              {/* Links */}
              <div className="flex flex-wrap gap-3 mt-3">
                {candidate.website && (
                  <a href={candidate.website} target="_blank" rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline">
                    Website ↗
                  </a>
                )}
                {candidate.email && (
                  <a href={`mailto:${candidate.email}`} className="text-sm text-blue-600 hover:underline">
                    Email
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stances */}
        {candidate.stances.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">Policy Stances</h2>
            {candidate.stances.map((stance) => (
              <div key={stance.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                <div className="flex items-start gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Link
                        href={`/issues/${stance.issue.slug}`}
                        className="font-semibold text-gray-800 hover:text-blue-600 hover:underline"
                      >
                        {stance.issue.name}
                      </Link>
                      <StanceBadge position={stance.position} />
                    </div>
                    <p className="text-sm text-gray-700">{stance.summary}</p>
                    {stance.rationale && (
                      <p className="text-sm text-gray-500 mt-2">{stance.rationale}</p>
                    )}
                  </div>
                </div>
                {/* Sources */}
                {stance.sources.length > 0 && (
                  <div className="mt-3 border-t border-gray-100 pt-3">
                    <p className="text-xs text-gray-400 mb-1 font-medium">Sources</p>
                    <ul className="space-y-1">
                      {stance.sources.map((src) => (
                        <li key={src.id} className="text-xs">
                          <a href={src.url} target="_blank" rel="noopener noreferrer"
                            className="text-blue-500 hover:underline">
                            {src.title ?? src.url}
                          </a>
                          {src.publishedAt && (
                            <span className="text-gray-400 ml-2">
                              {new Date(src.publishedAt).toLocaleDateString()}
                            </span>
                          )}
                          {src.quote && (
                            <blockquote className="mt-1 pl-3 border-l-2 border-gray-200 text-gray-500 italic">
                              "{src.quote}"
                            </blockquote>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href={`/elections/${election.id}/offices/${office.id}`}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50"
          >
            ← Compare all candidates for {office.title}
          </Link>
          <Link
            href={`/elections/${election.id}/quiz`}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            Take the quiz
          </Link>
        </div>
      </div>
    </div>
  );
}
