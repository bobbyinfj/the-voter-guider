import type { Metadata } from "next";
import { FACTCHECK_MIN, FLAG_RULES, RULING_LABELS, FALSEISH } from "@/lib/scorecard";
import { MolesesAvatar } from "@/components/Moleses";

export const metadata: Metadata = {
  title: "How we score candidates — The VoTer GuidEr",
  description: "How the Expanded view's scorecard is built: videos, flags, the 💩 meter and badges, each from a named source.",
};

// The rules behind the Expanded view's scorecard (lib/scorecard.ts). Keep this page in step
// with that file: it's what we promise voters.
export default function HowWeScorePage() {
  return (
    <div className="container mx-auto max-w-3xl space-y-6 px-4 py-8 text-gray-900">
      <div className="flex items-center gap-3">
        <MolesesAvatar size={56} className="border border-gray-200" />
        <h1 className="text-2xl font-bold">How we score candidates</h1>
      </div>
      <p>
        Beside every candidate in the Expanded view there&apos;s a scorecard. Moleses squints hard at the sources
        so you don&apos;t have to, but he never makes anything up: every column comes from a named source, links to it,
        and is worked out the same way for everyone in the race. When we don&apos;t have something, the card says so
        instead of guessing.
      </p>

      <section id="video" className="scroll-mt-4 space-y-2">
        <h2 className="text-lg font-bold">🎥 Video</h2>
        <p>
          An interview with the candidate from a nonpartisan series (in California, KCRA 3&apos;s California Politics
          360; in Washington, League of Women Voters interviews and TVW / Seattle Channel video voters&apos; guides).
          Debates with everyone in the race show once, above the candidates, under &ldquo;Watch them together&rdquo;.
          Videos load from YouTube&apos;s privacy-enhanced player only when you press play.
        </p>
      </section>

      <section id="flags" className="scroll-mt-4 space-y-2">
        <h2 className="text-lg font-bold">🚩 Flags</h2>
        <p>
          A flag is a fact from a source, found by a written rule, never our own reading of someone. Red flags are
          judgments against a candidate by a body whose job is to judge that; yellow flags are things worth asking
          about. Each rule is applied to everyone its source covers, and the card lists which checks ran, so
          &ldquo;none found&rdquo; means none found by those checks, not a clean bill of health.
        </p>
        <ul className="list-disc space-y-1 pl-5">
          {Object.values(FLAG_RULES).map((r) => (
            <li key={r.name}>
              <span className={r.level === "red" ? "font-semibold text-red-700" : "font-semibold text-amber-700"}>
                {r.level === "red" ? "Red" : "Yellow"}:
              </span>{" "}
              {r.name}. Covers {r.covers}.
            </li>
          ))}
        </ul>
        <p className="text-sm text-gray-700">
          We don&apos;t flag a missing candidate statement: in California, candidates pay to print one, so that would
          measure money, not candor.
        </p>
      </section>

      <section id="meter" className="scroll-mt-4 space-y-2">
        <h2 className="text-lg font-bold">💩 The 💩 meter</h2>
        <p>
          How full of it a candidate has been, by the fact-checkers&apos; count: the share of the candidate&apos;s
          claims that{" "}
          <a href="https://www.politifact.com/" className="text-blue-700 underline" target="_blank" rel="noopener noreferrer">
            PolitiFact
          </a>{" "}
          checked and rated {FALSEISH.map((r) => RULING_LABELS[r]).join(", ").replace(/, ([^,]*)$/, " or $1")}, across
          every PolitiFact ruling on them (not only this campaign). Numbers are copied from the candidate&apos;s
          PolitiFact page on the date shown.
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            Fact-checkers choose which claims to check, so this is their record of a person, not a measure of everything
            they&apos;ve said.
          </li>
          <li>
            Fewer than {FACTCHECK_MIN} rulings gets no percentage (&ldquo;too few to score&rdquo;), and no rulings is
            never shown as 0%.
          </li>
          <li>
            A race only shows percentages when every candidate in it has at least {FACTCHECK_MIN} rulings. Otherwise each
            card shows the raw counts, so one candidate&apos;s number never sits next to another&apos;s blank.
          </li>
        </ul>
      </section>

      <section id="badges" className="scroll-mt-4 space-y-2">
        <h2 className="text-lg font-bold">🏅 Badges</h2>
        <p>
          Who recommends the candidate (or Yes or No on a measure): party slates, newspaper editorial boards and the
          League of Women Voters, each pick checked against a quote on the page it was published on. Party and advocacy
          guides only appear as left/right pairs, so no side is shown alone. Also here: the county bar
          association&apos;s rating for judges, key endorsements as a news voter guide lists them, and the endorsements
          on the campaign&apos;s own site. Hover a badge for the quote; click it for the source.
        </p>
      </section>

      <p className="text-sm text-gray-700">
        Spotted something wrong? The source link on each piece is where it came from, so you can check us.
      </p>
    </div>
  );
}
