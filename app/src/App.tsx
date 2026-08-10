"use client";

import { useState } from "react";

import { SeasonManagement } from "./features/seasons/SeasonManagement";
import { SitesStorageAdapter } from "./lib/storage/SitesStorageAdapter";

export function App({ initialSeasonId }: { initialSeasonId?: string }) {
  const [storage] = useState(() => new SitesStorageAdapter());
  return (
    <SeasonManagement storage={storage} initialSeasonId={initialSeasonId} />
  );
}
