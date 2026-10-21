import { BallotPage } from "@/components/ballot/Paper";

// Every page of an election (overview, races, quiz) wears that county's ballot look
export default async function ElectionLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ electionId: string }>;
}) {
  const { electionId } = await params;
  return <BallotPage electionId={electionId}>{children}</BallotPage>;
}
