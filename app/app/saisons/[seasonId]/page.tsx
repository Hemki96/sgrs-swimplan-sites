import { App } from "../../../src/App";

export default async function SeasonPage({
  params,
}: {
  params: Promise<{ seasonId: string }>;
}) {
  const { seasonId } = await params;
  return <App initialSeasonId={seasonId} />;
}
