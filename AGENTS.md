# AGENTS.md

## Mission
Baue SGRS SwimPlan als öffentliche, gemeinsam editierbare ChatGPT Site.

## Verbindliche Regeln
1. Keine Benutzerkonten im MVP.
2. Jeder Besucher darf gemeinsame Planungsdaten lesen und bearbeiten.
3. Keine personenbezogenen Athletendaten oder Gesundheitsdaten.
4. Keine detaillierten Trainingsserien.
5. Saisonmatrix ist primäre Desktopansicht.
6. Jede Mutation erzeugt eine Revision.
7. Löschen zunächst nur Soft Delete.
8. Storage ausschließlich über `StorageAdapter`.
9. Keine undokumentierte Sites-API erfinden; Runtime-Bindings zuerst verifizieren.
10. Import immer validieren und vor Anwendung als Vorschau zeigen.
11. JSON-Gesamtexport bleibt Pflicht.
12. Mobile Ansicht fokussiert Tag/Woche, nicht Vollmatrix.
13. Größere Änderungen nur mit ExecPlan.
14. Architekturänderungen benötigen ADR.

## Quality Gate
format, lint, typecheck, unit tests, build und relevante E2E-Tests.
