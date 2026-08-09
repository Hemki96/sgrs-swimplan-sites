import { useState } from "react";

import { SeasonManagement } from "./features/seasons/SeasonManagement";
import { InMemoryStorageAdapter } from "./lib/storage/InMemoryStorageAdapter";

export function App() {
  const [storage] = useState(() => new InMemoryStorageAdapter());
  return <SeasonManagement storage={storage} />;
}
