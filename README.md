# SGRS SwimPlan – ChatGPT Sites Edition

Gemeinsam editierbare Saison-, Periodisierungs- und Belastungsplanung für die SG Rhein-Sieg.

## Kernidee
Die Site digitalisiert die Excel-Saisonplanung als interaktive Web-App. Alle Besucher der veröffentlichten Site dürfen lesen und bearbeiten. Es gibt im MVP keine Benutzerkonten und keine personenbezogenen Athletendaten.

## Kernfunktionen
- Saison und Wettkämpfe
- Makro-, Meso- und Mikrozyklen
- Mikrozyklussegmente
- parallele Periodisierungsdimensionen
- mehrere Trainingseinheiten pro Tag
- Main Focus / Technical Focus
- Umfang / Dauer / erwartetes RPE
- Ausrüstung und Hinweise
- Saisonmatrix
- Wochen- und Mobile-Ansicht
- Revision History und Soft Delete
- JSON-Backup, später Excel/PDF

## Technische Leitidee
React + TypeScript, runtime-neutrale Domain und `StorageAdapter`. Der konkrete ChatGPT-Sites-Storage wird erst implementiert, nachdem Codex die real verfügbare Sites-Runtime verifiziert hat.

## Start für Codex
1. `AGENTS.md`
2. `docs/00_overview/PROJECT_CONTEXT.md`
3. `docs/01_product/PRD.md`
4. `docs/04_architecture/ARCHITECTURE.md`
5. `docs/07_sites/SITES_RUNTIME.md`
6. `docs/14_exec_plans/completed/000-bootstrap.md`
