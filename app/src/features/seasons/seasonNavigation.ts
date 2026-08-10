import type { Season } from "../../lib/domain/types";

export function preferredSeason(
  seasons: readonly Season[],
  today = new Date().toISOString().slice(0, 10),
): Season | undefined {
  const available = seasons.filter((season) => season.status !== "archived");
  return (
    available.find((season) => season.status === "active") ??
    available.find(
      (season) => season.startDate <= today && season.endDate >= today,
    ) ??
    [...available].sort((left, right) =>
      right.startDate.localeCompare(left.startDate),
    )[0]
  );
}

export function seasonIdFromPath(pathname: string): string | undefined {
  const match = pathname.match(/^\/saisons\/([^/]+)\/?$/);
  return match ? decodeURIComponent(match[1]) : undefined;
}
