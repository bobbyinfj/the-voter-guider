"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { parseDistrictSelection } from "@/lib/districts";

// Creates a guide for ?electionId=… (carrying any district picks from the election
// page) and sends the voter straight to it.
function NewGuide() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const electionId = searchParams.get("electionId");
  const query = searchParams.toString();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!electionId) return;
    let cancelled = false;
    (async () => {
      try {
        const electionRes = await fetch(`/api/elections?id=${encodeURIComponent(electionId)}`);
        if (!electionRes.ok) throw new Error("That election wasn't found.");
        const election = await electionRes.json();
        const districts = parseDistrictSelection(new URLSearchParams(query));
        const guideRes = await fetch("/api/guides", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            electionId,
            jurisdictionId: election.jurisdictionId,
            title: `My guide: ${election.title}`,
            metadata: { districts },
          }),
        });
        if (!guideRes.ok) throw new Error("Couldn't create your guide. Please try again.");
        const guide = await guideRes.json();
        if (!cancelled) router.replace(`/guide/${guide.id}`);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [electionId, query, router]);

  if (!electionId || error) {
    return (
      <div className="text-center py-24">
        <p className="text-gray-700 mb-4">
          {error ?? "Pick an election first, then choose “Build my guide”."}
        </p>
        <Link href="/" className="text-blue-600 hover:underline">
          See upcoming elections
        </Link>
      </div>
    );
  }

  return <div className="text-center py-24 text-gray-500">Creating your guide…</div>;
}

export default function NewGuidePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Suspense fallback={<div className="text-center py-24 text-gray-500">Loading…</div>}>
        <NewGuide />
      </Suspense>
    </div>
  );
}
