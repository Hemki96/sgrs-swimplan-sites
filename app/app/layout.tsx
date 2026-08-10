import type { ReactNode } from "react";
import "../src/styles/base.css";

export const metadata = {
  title: "SGRS SwimPlan",
  description: "Gemeinsam editierbare Saisonplanung der SG Rhein-Sieg",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
