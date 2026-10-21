import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import StanceBadge from "@/components/quiz/StanceBadge";
import { BallotHeader, accentButton } from "@/components/ballot/Paper";
import { formatElectionDate } from "@/lib/format";
import { inPrintedOrder } from "@/components/ballot/ballot";
import PamphletSummary from "@/components/candidate/PamphletSummary";
import VideoFacade from "@/components/candidate/VideoFacade";
import { EndorserStrip } from "@/components/candidate/Endorsements";
import { asProfile, snippet } from "@/lib/profile";

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

        {/* Side-by-side: each candidate's own words, a video, endorsements */}
        <div className="mb-8 grid gap-4 font-sans sm:grid-cols-2 lg:grid-cols-3">
          {candidates.map((c) => {
            const profile = asProfile(c.profile);
            const snip = snippet(c.profile, 8);
            return (
              <article key={c.id} className="flex flex-col border-[1.5px] border-ballot-ink bg-ballot-paper">
                <header className="bg-ballot-head px-4 py-2 font-ballot">
                  <h2 className="text-base font-bold">
                    <Link href={`/candidates/${c.id}`} className="hover:underline">
                      {c.name}
                    </Link>
                  </h2>
                  {c.party && <p className="text-xs">{c.party}</p>}
                </header>
                <div className="flex flex-1 flex-col gap-3 p-4">
                  {profile?.summary ? (
                    <PamphletSummary summary={{ ...profile.summary, statement: null }} />
                  ) : (
                    c.shortBio && <p className="text-sm">{c.shortBio}</p>
                  )}
                  {snip?.video && <VideoFacade video={snip.video} />}
                  {snip && snip.endorserTotal > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-gray-700">
                        Endorsements ({snip.endorserTotal.toLocaleString()})
                      </p>
                      <EndorserStrip endorsers={snip.endorsers} total={snip.endorserTotal} size="md" />
                    </div>
                  )}
                  <Link href={`/candidates/${c.id}`} className="mt-auto text-sm font-semibold text-blue-700 hover:underline">
                    Full profile →
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
        {candidates.some((c) => asProfile(c.profile)?.endorsements) && (
          <p className="-mt-6 mb-8 font-sans text-xs text-gray-600">
            Endorsements are as listed on each campaign&apos;s own website; some campaigns don&apos;t publish a list we can read.
          </p>
        )}

        {/* Candidate comparison table */}
        {issues.length > 0 && (
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

      </div>
    </>
  );
}
