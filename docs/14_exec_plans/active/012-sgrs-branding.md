# ExecPlan: SGRS-Branding

## Ziel

Das offizielle Logo der SG Rhein-Sieg als kompakten Markenanker integrieren und
die globale UI-Farbwelt von Grün auf ein barrierefreies, aus dem Logo
abgeleitetes Blau-System umstellen.

## Scope

- Offizielles Logo technisch zuschneiden und als optimiertes Web-Asset ablegen.
- Globalen Seitenkopf responsiv um Logo und Titelblock erweitern.
- Semantische CSS-Farbtokens einführen und das globale UI-Chrome darauf
  umstellen.
- Logo-Präsenz, Barrierefreiheit und responsive Darstellung testen.
- Herkunft und Verwendung des Assets dokumentieren.

## Non-Scope

- Keine Änderung oder Umfärbung des offiziellen Logos.
- Keine neue Navigation, kein Dark Mode und keine inoffizielle Favicon-Variante.
- Keine Änderungen an Domain, Persistenz, Revisionen oder Import/Export.
- Fachlich semantische Status-, Warn-, Fehler-, Event- und RPE-Farben bleiben
  unterscheidbar.

## Voraussetzungen

- `/Users/christian/Downloads/base_logo_transparent_background.png` ist die
  verbindliche offizielle Logo-Vorlage.
- React/TypeScript und die bestehende Seitenkopfstruktur bleiben erhalten.
- Die Originalfarbe des Logos ist `#0085CA`.

## Betroffene Dateien

- `app/public/brand/sgrs-logo.png`
- `app/src/features/seasons/SeasonManagement.tsx`
- `app/src/styles/base.css`
- `app/tests/e2e/scaffold.spec.ts`
- `docs/CHANGELOG.md`
- `docs/14_exec_plans/active/012-sgrs-branding.md`

## Meilensteine

- [x] M1: Logo-Asset zuschneiden und optimieren.
- [x] M2: Responsiven Brandblock in den Seitenkopf integrieren.
- [x] M3: Globale Farb-Tokens und blaues UI-Chrome umsetzen.
- [x] M4: E2E-, Responsive-, Kontrast- und Quality-Gate-Prüfungen abschließen.

## Akzeptanzkriterien

- Das offizielle Logo ist genau einmal im globalen Seitenkopf sichtbar, besitzt
  den Alternativtext `Logo der SG Rhein-Sieg` und reservierte Abmessungen.
- Der zugeschnittene Asset-Inhalt ist quadratisch, transparent, scharf und nutzt
  unverändert das offizielle `#0085CA`.
- Desktop zeigt den Brandblock kompakt neben den Aktionen; Mobil stapelt die
  Aktionen ohne horizontalen Überlauf.
- Globale Primäraktionen nutzen `#00689D` mit weißer Schrift; Überschriften und
  starke Flächen nutzen `#0F2940`; dekorative Markenakzente dürfen `#0085CA`
  verwenden.
- Fokuszustände sind sichtbar und Text-/Buttonkontraste erfüllen WCAG AA.
- Erfolg, Fehler, Warnungen und fachliche Kategorien behalten ihre semantische
  Unterscheidbarkeit.
- Alle bestehenden Funktionen und Überschriften bleiben unverändert nutzbar.

## Prüfungen

- `npm run format:check`
- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run test:e2e`
- `python3 scripts/check_docs.py`
- Visuelle Screenshots bei 320, 375, 768, 1024 und 1440 Pixel Breite.
- Pixelprüfung des Assets auf Abmessungen, Alpha-Kanal und Markenfarbe.

## Risiken

- Das gelieferte PNG besitzt große transparente Außenflächen; ein unbeschnittener
  Einsatz würde das Logo im Header optisch zu klein darstellen.
- `#0085CA` mit weißem Normaltext erreicht nicht sicher WCAG AA und darf daher
  nicht als Primärbutton-Hintergrund dienen.
- Ein pauschaler Austausch aller Farben könnte semantische Zustände entwerten;
  diese bleiben bewusst außerhalb der globalen Marken-Tokens.

## Entscheidungen

- Kein ADR: Die Änderung betrifft ausschließlich Präsentation und Assets.
- Das Originalblau bleibt Markenakzent; `#00689D` ist die barrierefreie
  Interaktionsfarbe.
- Das vollständige offizielle Logo wird verwendet; es wird keine Teilmarke
  abgeleitet.

## Fortschritt

- 2026-08-10: Plan freigegeben; Logo, bestehende Headerstruktur, CSS-Farben und
  Testinfrastruktur analysiert.
- 2026-08-10: Sichtbaren Logo-Bereich von 1793 × 1792 Pixeln aus der
  3125 × 1875 Pixel großen Vorlage extrahiert und als transparentes
  512 × 512-PNG optimiert; dominante Volltonfarbe `#0085CA` verifiziert.
- 2026-08-10: Brandblock, semantische Farbtokens, barrierefreie Primäraktionen,
  Fokuszustände und mobile Kartenaktionen umgesetzt.
- 2026-08-10: Visuelle Aufnahmen für Desktop, 375 Pixel, 320 Pixel,
  Saisonmatrix und Wochenansicht unter `app/output/playwright/` geprüft.
- 2026-08-10: 57 Unit-Tests, Produktions-Build und neun E2E-Tests inklusive
  fünf responsiver Breiten erfolgreich; Dokumentationscheck und übrige Gates
  abschließend ausgeführt.

## Abschlussnotiz

Das offizielle Logo ist unverändert integriert, die globale Oberfläche folgt
der SGRS-Blaufamilie und fachlich semantische Farben bleiben erhalten. Es wurden
keine öffentlichen Schnittstellen, Datenmodelle oder Architekturgrenzen
verändert; daher ist kein ADR erforderlich.
