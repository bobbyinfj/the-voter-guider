import Image from "next/image";
import Link from "next/link";
import { Calendar, FileText, MapPin, ArrowRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatElectionDate } from "@/lib/format";

// Always read the current list of curated elections
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const elections = await prisma.election.findMany({
    where: { status: { not: "completed" } },
    include: {
      jurisdiction: true,
      _count: { select: { offices: true } },
      ballots: { where: { type: { not: "candidate" } }, select: { id: true } },
    },
    orderBy: [{ electionDate: "asc" }, { title: "asc" }],
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">

      <main className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-6">
            <Image
              src="/moleses-1.png"
              alt="Moleses"
              width={200}
              height={133}
              className="object-contain"
              priority
            />
            <div>
              <h2 className="text-4xl font-bold text-gray-800 mb-4">Know Your Whole Ballot</h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Every race and measure on your ballot, from Congress to city council, sourced from
                official election offices. Build a guide with your picks and notes, and share it.
              </p>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto">
          <h3 className="text-2xl font-semibold mb-6 text-gray-800">Upcoming Elections</h3>
          {elections.length === 0 ? (
            <p className="text-gray-500 italic">No upcoming elections are loaded yet.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {elections.map((election) => (
                <div
                  key={election.id}
                  className="bg-white rounded-lg border-2 border-gray-200 p-6 hover:border-blue-500 hover:shadow-lg transition-all"
                >
                  <h4 className="text-lg font-semibold text-gray-800 mb-3">{election.title}</h4>
                  <div className="space-y-2 text-sm text-gray-600 mb-4">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      <span>{election.jurisdiction.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>{formatElectionDate(election.electionDate)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      <span>
                        {election._count.offices} races · {election.ballots.length} measures
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={`/elections/${election.id}`}
                      className="flex-1 text-center px-3 py-2 border border-blue-500 text-blue-600 rounded-lg text-sm hover:bg-blue-50 transition-colors"
                    >
                      See the ballot
                    </Link>
                    <Link
                      href={`/guide/new?electionId=${election.id}`}
                      className="flex-1 text-center px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 flex items-center justify-center gap-1"
                    >
                      Build my guide <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
