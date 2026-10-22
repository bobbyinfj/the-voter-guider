import { redirect } from "next/navigation";

// Old "Build my guide" links: the election's ballot is your guide now (it saves as you mark it)
export default async function NewGuidePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const electionId = typeof params.electionId === "string" ? params.electionId : null;
  if (!electionId) redirect("/");
  const rest = new URLSearchParams(
    Object.entries(params).filter((e): e is [string, string] => typeof e[1] === "string" && e[0] !== "electionId"),
  ).toString();
  redirect(`/elections/${encodeURIComponent(electionId)}${rest ? `?${rest}` : ""}`);
}
