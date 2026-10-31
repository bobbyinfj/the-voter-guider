import Image from "next/image";
import Link from "next/link";
import { Calendar, FileText, MapPin, ArrowRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatElectionDate } from "@/lib/format";
import { cityLabel, cityPagesOf, matchesSelection } from "@/lib/districts";

// Always read the current list of curated elections
export const dynamic = "force-dynamic";

export default async function HomePage() {
  // Only elections that haven't happened yet, whatever their stored status says
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const elections = await prisma.election.findMany({
    where: { status: { not: "completed" }, electionDate: { gte: today } },
    include: {
      jurisdiction: true,
      // Counted per city for an election covering several
      ballots: { select: { type: true, districtType: true, districtCode: true, metadata: true } },
    },
    orderBy: [{ electionDate: "asc" }, { title: "asc" }],
  });

  // One card per ballot: an election covering several cities gets a card for each (its own page)
  const cards = elections.flatMap((election) => {
    const count = (city?: string) => {
      const on = election.ballots.filter((b) => !city || matchesSelection(b, { city }));
      return { races: on.filter((b) => b.type === "candidate").length, measures: on.filter((b) => b.type !== "candidate").length };
    };
    const base = { date: election.electionDate };
    const pages = cityPagesOf(election.metadata);
    const ids = Object.keys(pages);
    if (ids.length === 0) {
      return [{ ...base, key: election.id, title: election.title, place: election.jurisdiction.name, href: `/elections/${election.id}`, ...count() }];
    }
    return ids.map((id) => ({
      ...base,
      key: `${election.id}-${id}`,
      title: pages[id].title,
      place: `${cityLabel(id)}, ${election.jurisdiction.name}`,
      href: `/elections/${election.id}?city=${id}`,
      ...count(id),
    }));
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">

      <main className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-6">
            <Image
              src="/moleses.png"
              alt="Moleses, our nearly blind mole wizard, squinting through thick glasses"
              width={160}
              height={160}
              className="object-contain"
              priority
            />
            <div>
              <h2 className="text-4xl font-bold text-gray-800 mb-4">Vote better. And easier.</h2>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto">
          <h3 className="text-2xl font-semibold mb-6 text-gray-800">Upcoming Elections</h3>
          {cards.length === 0 ? (
            <p className="text-gray-500 italic">No upcoming elections are loaded yet.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {cards.map((card) => (
                <div
                  key={card.key}
                  className="bg-white rounded-lg border-2 border-gray-200 p-6 hover:border-blue-500 hover:shadow-lg transition-all"
                >
                  <h4 className="text-lg font-semibold text-gray-800 mb-3">{card.title}</h4>
                  <div className="space-y-2 text-sm text-gray-600 mb-4">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      <span>{card.place}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>{formatElectionDate(card.date)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      <span>
                        {card.races} races · {card.measures} measures
                      </span>
                    </div>
                  </div>
                  <Link href={card.href} className="flex items-center justify-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-center text-sm text-white hover:bg-blue-700">
                    Open my ballot <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
