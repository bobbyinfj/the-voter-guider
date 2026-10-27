import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { electionPageFor } from "@/lib/districts";
import StanceBadge from "@/components/quiz/StanceBadge";
import { BallotPage, accentButton, outlineButton } from "@/components/ballot/Paper";
import PamphletSummary from "@/components/candidate/PamphletSummary";
import VideoFacade from "@/components/candidate/VideoFacade";
import { EndorsementList } from "@/components/candidate/Endorsements";
import { asProfile, isHttpUrl, sortVideos } from "@/lib/profile";
import NewsGuide from "@/components/candidate/NewsGuide";

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
          ballot: { select: { metadata: true } },
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
  const profile = asProfile(candidate.profile);
  const electionPage = electionPageFor(election, { ...office, metadata: office.ballot?.metadata });
  const section = "mb-6 border-[1.5px] border-ballot-ink bg-ballot-paper p-5 font-sans";

  return (
    <BallotPage electionId={election.id}>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Breadcrumb */}
        <div className="mb-6 text-sm text-gray-500 flex flex-wrap gap-2">
          <Link href={electionPage.href} className="text-blue-600 hover:underline">
            {electionPage.title}
          </Link>
          <span>/</span>
          <Link href={`/elections/${election.id}/offices/${office.id}`} className="text-blue-600 hover:underline">
            {office.title}
          </Link>
          <span>/</span>
          <span>{candidate.name}</span>
        </div>

        {/* Candidate header */}
        <div className="mb-6 border-[1.5px] border-t-[6px] border-ballot-ink border-t-ballot-accent bg-ballot-paper p-6">
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
                {isHttpUrl(candidate.website) && (
                  <a href={candidate.website} target="_blank" rel="noopener noreferrer nofollow"
                    className="text-sm text-blue-600 hover:underline">
                    Campaign website ↗
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

        {profile?.summary && (
          <section className={section} aria-labelledby="own-words">
            <h2 id="own-words" className="mb-3 font-ballot-heading text-lg font-bold">In their own words</h2>
            <PamphletSummary summary={profile.summary} pamphletEndorsements={profile.pamphletEndorsements} full />
          </section>
        )}

        {profile?.guide && (
          <section className={section} aria-labelledby="news-guide">
            <h2 id="news-guide" className="mb-3 font-ballot-heading text-lg font-bold">
              In {profile.guide.source.publisher}&apos;s voter guide
            </h2>
            <NewsGuide guide={profile.guide} />
          </section>
        )}

        {profile?.videos?.length ? (
          <section className={section} aria-labelledby="watch">
            <h2 id="watch" className="mb-3 font-ballot-heading text-lg font-bold">Watch</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {sortVideos(profile.videos).map((v) => (
                <VideoFacade key={`${v.youtubeId}-${v.startSec ?? 0}`} video={v} />
              ))}
            </div>
            <p className="mt-3 text-xs text-gray-600">
              Most independent first: news outlets and nonpartisan series, then civic forums, viewpoint outlets, public meeting records, and
              the campaign&apos;s own videos. Each one says who made it; click that label for what it means.
            </p>
          </section>
        ) : null}

        {profile?.endorsements && (
          <section className={section} aria-labelledby="endorsements">
            <h2 id="endorsements" className="mb-3 font-ballot-heading text-lg font-bold">
              Endorsements{" "}
              <span className="text-sm font-normal text-gray-600">
                ({(profile.endorsements.list.length + (profile.endorsements.individuals ?? 0)).toLocaleString()})
              </span>
            </h2>
            <EndorsementList
              list={profile.endorsements.list}
              individuals={profile.endorsements.individuals}
              source={profile.endorsements.source}
            />
          </section>
        )}

        {/* Stances */}
        {candidate.stances.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">Stated Positions</h2>
            {candidate.stances.map((stance) => (
              <div key={stance.id} className="border-[1.5px] border-ballot-ink bg-ballot-paper p-5">
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
                    <p className="text-xs text-gray-500 mb-1">Statement: &ldquo;{stance.issue.summary}&rdquo;</p>
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
                              &ldquo;{src.quote}&rdquo;
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
            className={outlineButton}
          >
            ← Compare all candidates for {office.title}
          </Link>
          <Link
            href={`/elections/${election.id}/quiz`}
            className={accentButton}
          >
            Take the quiz
          </Link>
        </div>
      </div>
    </BallotPage>
  );
}
