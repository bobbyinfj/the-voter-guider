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
          A video of the candidate speaking, and every video says who made it, most independent first:
          <strong> Independent</strong> (news outlets and nonpartisan series like the League of Women Voters),
          <strong> Civic forum</strong> (community groups that invited the candidates), <strong>Government</strong>{" "}
          (public meetings, where only officeholders and people who spoke appear) and <strong>From the campaign</strong>{" "}
          (the candidate&apos;s own video, from their website or channel). Forums start where that candidate speaks.
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
          Each card&apos;s &ldquo;What we checked&rdquo; lists every check that covered the candidate and what it found,
          with links. Lawyers who share their name with several others on the State Bar&apos;s rolls are marked as
          checked but unmatched: we won&apos;t guess which record is theirs. An ethics fine shared by everyone named in a
          case (a campaign committee, its treasurer and the candidate) says so.
        </p>
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
        <p className="rounded border border-gray-300 bg-gray-50 px-3 py-2 font-mono text-sm">
          💩 % = (Mostly False + False + Pants on Fire) ÷ all PolitiFact rulings × 100, rounded
        </p>
        <p className="text-sm text-gray-700">
          Each card shows the formula with that candidate&apos;s own numbers, the year of their newest ruling, and a
          link to their PolitiFact page. We find people in PolitiFact&apos;s own list of everyone it has rated, and only
          use a page when its description names the candidate&apos;s state (so a same-named actor doesn&apos;t count).
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            Fact-checkers choose which claims to check, so this is their record of a person, not a measure of everything
            they&apos;ve said.
          </li>
          <li>
            The meter only appears in races where someone has been fact-checked; in a race nobody has, there&apos;s nothing to
            show. Below a percentage, the icon shows the raw count (&ldquo;1/5&rdquo;: 1 of 5 rulings Mostly False or worse).
          </li>
          <li>
            Fewer than {FACTCHECK_MIN} rulings gets no percentage (&ldquo;too few to score&rdquo;), and no rulings is
            never shown as 0%.
          </li>
          <li>
            A race only shows percentages when every candidate in it has at least {FACTCHECK_MIN} rulings. Otherwise each
            card shows the raw counts, so one candidate&apos;s number never sits next to another&apos;s blank.
          </li>
          <li>
            News fact-checks that don&apos;t use a rating scale (like CapRadio&apos;s check of the governor&apos;s debate) are
            listed under the meter as &ldquo;claims fact-checked&rdquo;: the claim and the outlet&apos;s verdict, both quoted
            word for word. We never turn a verdict into a rating, so they don&apos;t count toward the %.
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
