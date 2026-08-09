# Release Candidate Report

## Ergebnis

**Status: NOT READY / RELEASE BLOCKED**

Prüfzeitpunkt: 2026-08-09, Europe/Berlin. Geprüft wurde der lokale Workspace
einschließlich seiner nicht committeten Änderungen. Es wurden keine
Produktfunktionen repariert oder ergänzt.

Der Release Candidate ist nicht freigabefähig. Der Produktions-Build und der
Typecheck schlagen fehl. Verpflichtende MVP-Funktionen für persistente,
gemeinsame Daten, History/Restore sowie JSON-Import sind nicht vollständig
implementiert; Excel-Import ist ebenfalls nicht vorhanden. Der vollständige
Quality-Gate-Befehl bricht bereits beim Format-Check ab.

## Prüfgrundlage

Vollständig gelesen wurden:

- `docs/01_product/PRD.md`
- alle Dateien in `docs/02_requirements/`
- `docs/03_domain/BUSINESS_RULES.md`
- alle ADRs in `docs/13_adr/`
- `docs/16_traceability/EXCEL_TO_PRODUCT.md` und
  `docs/16_traceability/REQUIREMENTS_MATRIX.md`
- alle abgeschlossenen ExecPlans in `docs/14_exec_plans/completed/`
  (aktuell nur `000-bootstrap.md`)

Ergänzend wurden Teststrategie, QA-Checkliste, Storage-, Import/Export-,
Mobile- und Saisonmatrix-Spezifikation sowie die Statusangaben der aktiven
ExecPlans geprüft.

## Quality Gates

| Gate | Ergebnis | Nachweis |
| --- | --- | --- |
| Format | **Failed** | Prettier meldet `TrainingSessionEquipmentManagement.tsx` und `seasonPlanning.ts`. |
| Lint | **Failed** | `react-hooks/set-state-in-effect` sowie fehlende Effect-Abhängigkeit in `TrainingSessionEquipmentManagement.tsx:57-58`. |
| Typecheck | **Failed** | Vier TypeScript-Fehler in `seasonPlanning.ts:899-902`; `SessionEquipment` besitzt laut Typprüfung kein `id`/`version`, und der Put-Wert erfüllt `StoredEntity` nicht. |
| Unit Tests | **Passed** | 12 Testdateien, 50 Tests bestanden im protokollierten Lauf. Hinweis: Danach erschien eine neue, unversionierte `equipment-service.test.ts`; sie war nicht Bestandteil dieses erfolgreichen Laufs. |
| Build | **Failed** | Abbruch mit denselben TypeScript-Fehlern wie der Typecheck. |
| E2E | **Passed (begrenzter Scope)** | 7/7 Chrome-E2E-Tests bestanden nach Freigabe des lokalen Ports. Abgedeckt: Saison CRUD/Soft Delete, Datumsvalidierung, parallele Fokussegmente, Wettkampf/Ferien, je ein Macro/Meso/Micro. |
| Dokumentation | **Passed** | `python3 scripts/check_docs.py`: `Documentation baseline OK`. |
| Gesamtlauf `npm run check` | **Failed** | Abbruch beim Format-Check. |

## Szenario-Matrix

`Passed` bedeutet, dass ein reproduzierbarer automatisierter Nachweis für den
geprüften Stand vorliegt. `Failed` umfasst fehlende oder nicht lauffähige
Pflichtfunktionalität. `Warning` bezeichnet Teilabdeckung oder fehlende
End-to-End-/Viewport-Evidenz.

| # | Szenario | Status | Befund |
| ---: | --- | --- | --- |
| 1 | Neue Saison | **Passed** | Browser-E2E legt Saison 2026/27 an; Unit-Test validiert Servicepfad. |
| 2 | 52 Wochen | **Passed** | Matrix-Unit-Test erzeugt für 2026-08-01 bis 2027-07-31 eine Achse mit 53 ISO-Wochen. |
| 3 | Wettkampf | **Passed** | Browser-E2E legt Eventspur und A-Wettkampf an; Unit-Tests prüfen Saison-/Spurregeln. |
| 4 | Ferien | **Passed** | Browser-E2E legt Weihnachtsferien an; Unit-Tests prüfen Bereichsvalidierung. |
| 5 | 2 Makrozyklen | **Passed** | 12-Wochen-Integrationstest erzeugt exakt zwei Makrozyklen. |
| 6 | Mehrere Mesozyklen | **Passed** | 12-Wochen-Integrationstest erzeugt vier Mesozyklen in zwei Makrozyklen. |
| 7 | 52 Mikrozyklen | **Failed** | Es existiert nur ein 12-Mikrozyklen-Test; die 52-Wochen-Achse ersetzt keinen Test mit 52 Mikrozyklus-Entitäten. |
| 8 | Target RPE 1–10 | **Passed** | Schema/Service akzeptieren den Bereich 1 bis 10 und weisen Werte außerhalb ab; Unit-Nachweis vorhanden. |
| 9 | Alle Periodisierungsdimensionen | **Passed** | Strength, Aerobic, Anaerobic, Speed, Tactical und Technical werden im 12-Wochen-Test und in der Matrix geprüft. |
| 10 | Mehrere Fokussegmente | **Passed** | Sechs überlappende Segmente in parallelen Dimensionen sowie Browser-E2E mit zwei Segmenten. |
| 11 | Doppeltraining | **Failed** | Kein automatisierter Test weist zwei Sessions an demselben Tag nach; Session-/Equipment-Code besteht Typecheck und Build nicht. |
| 12 | Key Session | **Failed** | UI-/Typfeld vorhanden, aber kein ausführbarer Unit- oder E2E-Nachweis; Build ist rot. |
| 13 | Equipment | **Failed** | Implementierung ist im lokalen Arbeitsbaum unvollständig und verursacht Typecheck-/Buildfehler. Die neu erschienene unversionierte Testdatei war nicht Teil des erfolgreichen Unit-Laufs. |
| 14 | Bearbeiten | **Passed** | Browser-E2E bearbeitet Saison, Macro, Meso und Micro; Unit-Tests prüfen Versionserhöhung. |
| 15 | Soft Delete | **Passed** | Browser- und Storage-Tests weisen Ausblenden, Erhalt des Datensatzes und Revision nach. |
| 16 | History | **Warning** | Revisionsdaten und `listRevisions` sind unit-getestet; eine History-UI fehlt, ExecPlan 006 ist offen. |
| 17 | Restore | **Failed** | Kein Restore-Service und keine Restore-UI; ExecPlan 006 M4 ist offen. Snapshot-Hydration ist kein Entity-Restore. |
| 18 | Version Conflict | **Passed (Adapter)** | Unit-Stresstest weist genau einen Gewinner und `VersionConflictError` für einen stale Writer nach. Kein UI-Konfliktflow. |
| 19 | Reload Persistenz | **Failed** | Snapshot-Hydration in einen neuen In-Memory-Adapter besteht, aber Browser-Reload verliert Daten, da `App.tsx` bei Start einen neuen In-Memory-Adapter erzeugt. Sites-Persistenz ist laut ADR 0013 nicht provisioniert. |
| 20 | JSON Export | **Failed** | Adapter-Snapshot existiert, aber kein versioniertes JSON-Gesamtexportformat bzw. Benutzerflow gemäß FR-024/ADR 0010. |
| 21 | JSON Import | **Failed** | Kein Schema-/Validierungs-/Preview-/Diff-/Bestätigungsflow; ExecPlan 009 ist offen. `hydrate` ist kein konformer Import. |
| 22 | Excel Import | **Failed** | Nur Mapping-Dokumentation vorhanden; kein Parser, keine Validierung und keine Vorschau. FR-026 stuft Excel zwar als „später“ ein, der explizite RC-Prüfpunkt ist dennoch nicht erfüllt. |
| 23 | Desktop | **Warning** | Desktop-Chrome-E2E besteht, aber ohne explizite 1440/1280-Viewport-Assertions oder visuellen Matrix-Review. |
| 24 | Tablet | **Failed** | Kein Tablet-Projekt und kein 768px-Test in der Playwright-Konfiguration. |
| 25 | Smartphone 390px | **Failed** | Kein 390px-Test; Mobile-ExecPlan ist vollständig offen. Die geforderte Tag/Woche-UX ist nicht als RC-Nachweis geprüft. |
| 26 | Build | **Failed** | `npm run build` endet mit TypeScript-Fehlern. |

## Passed

- Dokumentationsbaseline.
- 50 Unit-Tests im protokollierten Lauf.
- 7 vorhandene Chrome-E2E-Tests.
- Saisonanlage und -bearbeitung, Wettkampf, Ferien sowie einzelne
  Macro-/Meso-/Micro-Flows.
- 52+-Wochen-Matrixmodell, zwei Makrozyklen, vier Mesozyklen, zwölf
  Mikrozyklen, sechs Periodisierungsdimensionen und parallele Fokussegmente.
- Adapter-Level: Revisionen, Soft Delete, Konflikterkennung,
  Snapshot-Export/Hydration.

## Failed

- Format, Lint, Typecheck, Produktions-Build und damit das Gesamt-Quality-Gate.
- Belastungstest mit 52 tatsächlichen Mikrozyklen.
- Doppeltraining, Key Session und Equipment als verifizierter Releaseflow.
- Restore.
- echte Reload-/Mehrbesucher-Persistenz.
- versionierter JSON-Gesamtexport und validierter JSON-Import mit Vorschau.
- Excel-Import.
- Tablet- und 390px-Smartphone-Abnahme.

## Warnings

- Der erfolgreiche Unit-Lauf bezog sich auf 12 Testdateien/50 Tests. Während
  des Reviews wurde der Workspace weiter verändert; anschließend lag zusätzlich
  `app/tests/unit/equipment-service.test.ts` unversioniert vor. Der Bericht ist
  deshalb ein Point-in-time-Befund und kein Nachweis eines unveränderlichen
  Commit-SHA.
- Die sieben E2E-Tests verwenden ausschließlich das Projekt `chrome` mit
  `Desktop Chrome`; es gibt keine definierte Browser-/Viewport-Matrix.
- „History“ ist auf Datenebene vorhanden, aber nicht als Benutzerfunktion.
- „Version Conflict“ ist nur auf Adapterebene geprüft; der geforderte
  Reload/erneut-anwenden-Flow der UI ist nicht belegt.
- Mehrere vollständig abgehakte ExecPlans liegen weiterhin unter `active/`.
  Das erschwert die Release- und Traceability-Aussage.
- Im Repository existieren Dateien mit Suffix ` 2.ts` sowie ein unversioniertes
  verschachteltes Verzeichnis `sgrs-swimplan-sites/`; beides sollte vor einer
  RC-Baseline geklärt werden.

## Technical Debt

- `SessionEquipment`/`SoftDeletableEntity`-Typvertrag und Storage-Generics sind
  aktuell inkonsistent.
- Der Equipment-React-Effect erzeugt eine synchrone State-Update-Kette und hat
  eine unvollständige Dependency-Liste.
- Format-Drift in zwei geänderten Quelldateien.
- Testlücken für Sessions, Equipment, Key Session, Doppeltraining, History-UI,
  Restore, Import/Export und responsive Viewports.
- Die Requirements-Matrix verweist nur grob auf ExecPlans und enthält keine
  testfallgenauen Nachweise oder aktuellen Implementierungsstatus.
- Die App verwendet ausschließlich `InMemoryStorageAdapter`; eine gemeinsam
  editierbare öffentliche Site ist damit nicht erreichbar.

## Blocking Issues

1. **Build nicht erzeugbar:** TypeScript-Fehler in der
   Session-Equipment-Implementierung blockieren ein Release-Artefakt.
2. **Quality Gate rot:** Format und Lint schlagen fehl; `npm run check` ist
   nicht erfolgreich.
3. **Keine gemeinsame dauerhafte Persistenz:** Der produktive
   `SitesStorageAdapter` ist absichtlich nicht implementiert, Runtime-Bindings
   sind nicht verifiziert/provisioniert. Das verfehlt das PRD-Ziel und die
   Reload-Anforderung.
4. **MVP-Portabilität fehlt:** FR-024/FR-025 und ADR 0010 sind nicht als
   versionierter Export-/Preview-Import-Flow umgesetzt.
5. **Recovery unvollständig:** History-UI und Restore fehlen.
6. **Pflicht-Viewport-Abnahme fehlt:** Tablet und Smartphone 390px sind nicht
   getestet; die Mobile-Wochenansicht ist nicht freigegeben.

## Release-Empfehlung

Kein RC-Tag und keine Veröffentlichung. Vor einer erneuten Abnahme muss ein
stabiler Commit ohne parallele Workspace-Änderungen vorliegen. Mindestens alle
Blocking Issues müssen behoben und danach Format, Lint, Typecheck, Unit, Build,
relevante E2E-Tests sowie die 1440/1280/768/390px-Viewport-Matrix in einem
durchgehenden Lauf erfolgreich ausgeführt werden.
