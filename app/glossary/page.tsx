import type { Metadata } from "next";
import { MolesesAvatar } from "@/components/Moleses";
import OfficeExplainer from "@/components/ballot/OfficeExplainer";
import { OFFICE_GLOSSARY, STATE_NAMES } from "@/lib/glossary";

export const metadata: Metadata = {
  title: "What these offices do — The VoTer GuidEr",
  description: "Plain-English explanations of the offices on your ballot, each from an official source, and how to choose between candidates.",
};

// Every office we've explained (data/glossary/offices.json), grouped by state, with an anchor per
// office (#ca-insurance-commissioner) that the ballot's "What's this job?" popover links to.
export default function GlossaryPage() {
  const states = [...new Set(OFFICE_GLOSSARY.map((e) => e.state))].sort();
  return (
    <div className="container mx-auto max-w-3xl space-y-6 px-4 py-8 text-gray-900">
      <div className="flex items-center gap-3">
        <MolesesAvatar size={56} className="border border-gray-200" />
        <h1 className="text-2xl font-bold">What these offices do</h1>
      </div>
      <p>
        Not sure what an Insurance Commissioner does, let alone which candidate to pick? You&apos;re not alone. Each
        office below gets a plain-English summary in our words, the official description it&apos;s based on (with a link),
        and questions worth asking every candidate. On your ballot, the <strong>What&apos;s this job?</strong> button on a
        contest shows the same thing.
      </p>

      <section id="how-to-choose" className="scroll-mt-4 space-y-2">
        <h2 className="text-lg font-bold">How to choose between candidates</h2>
        <p className="text-sm text-gray-700">Our suggestions. We never tell you who to vote for.</p>
        <ol className="ml-5 list-decimal space-y-1.5">
          <li>
            <strong>Learn what the job does.</strong> Below, or with <em>What&apos;s this job?</em> on the ballot. It tells
            you what the winner will actually decide.
          </li>
          <li>
            <strong>Hear from each candidate.</strong> Their own statement shows under their name; the Expanded view adds a
            short video of them speaking.
          </li>
          <li>
            <strong>Ask everyone the same questions.</strong> Each office below lists a few, about the job&apos;s real powers.
            Notice who answers in a way you agree with, and who dodges.
          </li>
          <li>
            <strong>Check the scorecard.</strong> 🚩 flags, the 💩 fact-check meter and 🏅 who backs them, each from a named
            source (<a href="/how-we-score" className="text-blue-700 underline">how we score</a>).
          </li>
          <li>
            <strong>Still stuck?</strong> Mark the contest <em>?</em> (no clue yet) and come back to it, try the quiz, or use{" "}
            <em>Copy for an AI</em> to ask an assistant to explain the race with sources.
          </li>
        </ol>
      </section>

      {states.map((state) => (
        <section key={state} className="space-y-3">
          <h2 className="text-lg font-bold">{STATE_NAMES[state] ?? state}</h2>
          {OFFICE_GLOSSARY.filter((e) => e.state === state).map((e) => (
            <article key={e.key} id={e.key} className="scroll-mt-4 space-y-1 rounded border-l-2 border-sky-400 bg-sky-50 p-3 text-sky-950">
              <h3 className="font-bold">{e.title}</h3>
              <OfficeExplainer entry={e} />
            </article>
          ))}
        </section>
      ))}

      <p className="text-sm text-gray-600">
        More offices are on the way. We only add one when we find an official description of the job to base it on.
      </p>
    </div>
  );
}
