import type { Metadata } from "next";
import { MolesesAvatar } from "@/components/Moleses";

export const metadata: Metadata = {
  title: "Privacy — The Voter Guider",
  description: "What the Voter Guider stores, who helps us run it, and how to have your data changed or deleted.",
};

// What we promise visitors. Keep this page in step with the code: lib/session-cookie.ts, lib/auth.ts,
// lib/mail.ts, components/candidate/VideoFacade.tsx.
export default function PrivacyPage() {
  return (
    <div className="container mx-auto max-w-3xl space-y-6 px-4 py-8 text-gray-900">
      <div className="flex items-center gap-3">
        <MolesesAvatar size={56} className="border border-gray-200" />
        <h1 className="text-2xl font-bold">Privacy</h1>
      </div>
      <p className="text-sm text-gray-600">Last updated: October 30, 2026</p>
      <p>
        The Voter Guider helps you work through your ballot. Your picks are your business: we don&apos;t sell your
        information, and we don&apos;t run advertising or analytics trackers on this site.
      </p>

      <h2 className="text-xl font-semibold">What we store</h2>
      <ul className="list-disc space-y-2 pl-6">
        <li>
          <strong>Your guide:</strong> your picks, your notes, and the district or city you choose. You don&apos;t
          need an account; a guide is tied to a cookie in your browser until you sign in.
        </li>
        <li>
          <strong>Your email address,</strong> if you sign in, so we can send you sign-in links. We don&apos;t use
          it for anything else.
        </li>
        <li>
          <strong>A scrambled version of your IP address</strong> (a one-way hash) when you ask for a sign-in link,
          to limit abuse.
        </li>
      </ul>

      <h2 className="text-xl font-semibold">Cookies</h2>
      <p>
        We use two cookies, only to run the site: one remembers your guide for up to a year, and one keeps you
        signed in for up to 90 days. Neither is used for advertising.
      </p>

      <h2 className="text-xl font-semibold">Who can see your guide</h2>
      <p>
        A guide is private unless you choose to share it; anyone with its link can then see it. If you tick
        &quot;Count my picks&quot;, your picks are added to anonymous community totals, which we show only once
        at least five people have shared.
      </p>

      <h2 className="text-xl font-semibold">Services that help run the site</h2>
      <ul className="list-disc space-y-2 pl-6">
        <li>Vercel hosts the site and Neon hosts the database. Hosts keep routine server logs, which can include IP addresses.</li>
        <li>Our email provider delivers sign-in links.</li>
        <li>
          YouTube plays a video only after you click it, using its privacy-enhanced mode. From then on, YouTube&apos;s
          own privacy policy applies to that video.
        </li>
        <li>
          If you use &quot;Ask Claude about it&quot; or copy your ballot for an AI, what you send goes to that service
          under its own terms. Nothing is sent unless you choose to.
        </li>
      </ul>

      <h2 className="text-xl font-semibold">Do Not Track</h2>
      <p>We don&apos;t track visitors across other websites, so Do Not Track signals don&apos;t change anything here.</p>

      <h2 className="text-xl font-semibold">Your choices</h2>
      <p>
        You can edit or clear your picks at any time. To see, correct or delete what we hold about you, including
        your account, contact us through{" "}
        <a href="https://robertnakano.com" className="underline">robertnakano.com</a>.
      </p>

      <h2 className="text-xl font-semibold">Children</h2>
      <p>This site is meant for voters and isn&apos;t directed at children under 13.</p>

      <h2 className="text-xl font-semibold">Changes</h2>
      <p>If this policy changes, we&apos;ll update this page and the date at the top.</p>
    </div>
  );
}
