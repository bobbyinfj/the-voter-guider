import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import StanceBadge from "@/components/quiz/StanceBadge";
import { BallotHeader, accentButton } from "@/components/ballot/Paper";
import { formatElectionDate } from "@/lib/format";
import { inPrintedOrder } from "@/components/ballot/ballot";

interface Props {
  params: Promise<{ electionId: string; officeId: string }>;
}

export default async function OfficePage({ params }: Props) {
  const { electionId, officeId } = await params;

  const office = await prisma.office.findUnique({
    where: { id: officeId },
    include: {
      election: { include: { jurisdiction: true, quiz: { select: { id: true } } } },
      ballot: { select: { metadata: true, options: true } },
      candidates: {
        include: {
          stances: {
            include: { issue: true, sources: true },
            orderBy: { issue: { name: "asc" } },
          },
        },
        orderBy: [{ incumbent: "desc" }, { name: "asc" }],
      },
    },
  });

  if (!office || office.election.id !== electionId) notFound();
  const candidates = inPrintedOrder(office.candidates, office.ballot);

  // Collect all unique issues across all candidates
  const issueSet = new Map<string, { id: string; name: string; slug: string; summary: string }>();
  for (const c of candidates) {
    for (const s of c.stances) {
      issueSet.set(s.issue.id, { id: s.issue.id, name: s.issue.name, slug: s.issue.slug, summary: s.issue.summary });
    }
  }
  const issues = [...issueSet.values()].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Breadcrumb */}
        <div className="mb-6 text-sm text-gray-500 flex gap-2">
          <Link href={`/elections/${electionId}`} className="text-blue-600 hover:underline">
            {office.election.title}
          </Link>
          <span>/</span>
          <span>{office.title}</span>
        </div>

        <div className="mb-6">
          <BallotHeader
            electionId={electionId}
            date={formatElectionDate(office.election.electionDate)}
            title={office.title}
            place={office.election.title}
            aside={
              office.election.quiz ? (
                <Link href={`/elections/${electionId}/quiz`} className={accentButton}>
                  Take the quiz
                </Link>
              ) : undefined
            }
          >
            {office.description && <p className="mt-1 text-sm">{office.description}</p>}
            <p className="mt-1 text-xs capitalize text-gray-600">
              {office.level} office{office.termYears ? ` · ${office.termYears}-year term` : ""}
            </p>
          </BallotHeader>
        </div>

        {/* Candidate comparison table */}
        {issues.length === 0 ? (
          <div className="border-[1.5px] border-ballot-ink bg-ballot-paper p-6">
            <h2 className="text-base font-semibold text-gray-700 mb-4">Candidates</h2>
            <ul className="space-y-3">
              {candidates.map((c) => (
                <li key={c.id} className="flex items-center gap-3">
                  <Link href={`/candidates/${c.id}`} className="font-medium text-blue-600 hover:underline">
                    {c.name}
                  </Link>
                  {c.party && <span className="text-xs text-gray-400">{c.party}</span>}
                  {c.incumbent && <span className="text-xs bg-yellow-100 text-yellow-700 border border-yellow-200 rounded px-1.5 py-0.5">Incumbent</span>}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="overflow-x-auto border-[1.5px] border-ballot-ink bg-ballot-paper">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-[1.5px] border-ballot-ink bg-ballot-head">
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 min-w-[120px]">Issue</th>
                  {candidates.map((c) => (
                    <th key={c.id} className="px-4 py-3 text-center font-medium text-gray-700 min-w-[140px]">
                      <Link href={`/candidates/${c.id}`} className="hover:text-blue-600 hover:underline block">
                        {c.name}
                      </Link>
                      {c.party && <span className="text-xs text-gray-400 font-normal">{c.party}</span>}
                      {c.incumbent && <span className="block text-xs text-yellow-600 font-normal">Incumbent</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {issues.map((issue) => (
                  <tr key={issue.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link href={`/issues/${issue.slug}`} className="font-medium text-gray-700 hover:text-blue-600 hover:underline">
                        {issue.name}
                      </Link>
                      <p className="text-xs text-gray-500 mt-0.5">&ldquo;{issue.summary}&rdquo;</p>
                    </td>
                    {candidates.map((c) => {
                      const stance = c.stances.find((s) => s.issueId === issue.id);
                      return (
                        <td key={c.id} className="px-4 py-3 text-center align-top">
                          {stance ? (
                            <div>
                              <StanceBadge position={stance.position} />
                              <p className="text-xs text-gray-500 mt-1 text-left">{stance.summary}</p>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">No stated position</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Individual candidate cards */}
        <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {candidates.map((c) => (
            <Link
              key={c.id}
              href={`/candidates/${c.id}`}
              className="border-[1.5px] border-ballot-ink bg-ballot-paper p-5 hover:border-blue-300 hover:shadow-md transition-all block"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-lg flex-shrink-0">
                  {c.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-800">{c.name}</p>
                  {c.party && <p className="text-xs text-gray-500">{c.party}</p>}
                  {c.shortBio && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{c.shortBio}</p>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
