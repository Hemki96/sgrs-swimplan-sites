# ExecPlan: Wiederkehrende Trainingstermine (TrainingScheduleTemplate)

## Ziel

Trainer definieren regelmäßige Trainingszeiten einmalig. Aus diesen
`TrainingScheduleTemplate`-Einträgen werden automatisch `TrainingSession`s für
jede passende Kalenderwoche der Saison erzeugt (idempotent). Einzelne Wochen
bleiben individuell änderbar, ohne den Standard zu beeinflussen.

## Scope

- neue Entity `TrainingScheduleTemplate` (seasonId, name, weekday, startTime,
  endTime, location, active, validFrom, validUntil, versioniert, soft-deletable)
- minimale Erweiterung von `TrainingSession`:
  `scheduleTemplateId`, `generatedFromSchedule`, `scheduleDetached`, `status`
  (`planned` | `cancelled`)
- idempotente Generierung pro Kalenderwoche der Saison
- automatische Übernahme von Template-Änderungen auf noch nicht individuell
  veränderte, zukünftige Sessions (`scheduleDetached = false`)
- Verwaltungsoberfläche „Einstellungen → Trainingszeiten“ (hinzufügen,
  bearbeiten, deaktivieren, Soft Delete)
- Wochenansicht zeigt Standardtermine dezent als „Standardtermin“, einzeln
  ausfallbare Sessions und Warnung bei Kalenderrestriktionen
- Export/Import inklusive Templates und erzeugter Sessions

## Non-Scope

- Trainingsserien (Einzelübungen) – ADR 0003
- Drag & Drop, Benutzerkonten, neue Authentifizierung, neue Datenbanktechnologie
- komplette Kalenderüberarbeitung
- Änderungen am Sites-Runtime-Storage (generische `storage_entities`-Tabelle)

## Voraussetzungen

- ADR 0005 (StorageAdapter), ADR 0007 (Revisionen), ADR 0008 (Soft Delete),
  ADR 0016 (JSON-Export/-Import), ADR 0012 (Mobile Wochenansicht)
- bestehende ExecPlans 005 (Training Sessions), 007 (Trainer-Wochenansicht)

## Meilensteine

- [x] M1: Analyse und ExecPlan
- [x] M2: Domain Model und Validation
- [x] M3: Storage-, Worker-, Export-/Import-Erweiterung
- [x] M4: Generierung, Sync und Detach-Logik im Service
- [x] M5: Unit-Tests (11 Szenarien, inkl. der 10 aus der Aufgabe)
- [x] M6: Verwaltung „Einstellungen → Trainingszeiten“
- [x] M7: Wochenansicht (Standardtermin, Ausfall, Restriktionswarnung)
- [x] M8: Dokumentation, Changelog, Quality Gate

## Betroffene Dateien

- `app/src/lib/domain/types.ts`
- `app/src/lib/domain/seasonPlanning.ts`
- `app/src/lib/validation/domain.ts`
- `app/src/lib/storage/StorageAdapter.ts`
- `app/src/lib/storage/importScope.ts`
- `app/src/lib/import/jsonImport.ts`
- `app/worker/storage.ts`
- `app/src/lib/domain/seedDemoSeason.ts`
- `app/src/features/settings/SettingsPage.tsx` + neues Trainingszeiten-Modul
- `app/src/features/training-week/TrainerWeekView.tsx`
- `app/src/features/training-week/SessionCard.tsx`
- `app/src/features/training-week/SessionEditor.tsx`
- `app/src/features/mobile/MobileWeekPlanning.tsx`, `TodayView.tsx`
- `app/src/features/seasons/SeasonPlanning.tsx`
- `app/tests/unit/training-schedule.test.ts`
- Doku: DOMAIN_MODEL, BUSINESS_RULES, DATA_DICTIONARY, STORAGE_MODEL,
  JSON_FORMAT, GLOSSARY, CHANGELOG

## Akzeptanzkriterien

- Pro `scheduleTemplateId` + Datum existiert höchstens eine automatisch
  erzeugte Session (idempotent, auch bei mehrfachem Laden).
- Erzeugte Sessions tragen Datum/Wochentag/Uhrzeit bereits gesetzt.
- Eine individuell geänderte Session wird mit `scheduleDetached = true`
  markiert und von Template-Änderungen nicht überschrieben.
- Nur zukünftige, nicht getrennte Sessions übernehmen neue Standardzeiten.
- Template-Änderung/-Deaktivierung erzeugt keine neuen Sessions nach
  `validUntil` bzw. bei `active = false`.
- Sessions innerhalb einer Kalenderrestriktion bleiben bestehen und zeigen die
  Restriktionswarnung.
- Einzelne Session kann als `cancelled` markiert werden, der Standard bleibt.
- JSON-Export/Import überträgt Templates und erzeugte Sessions vollständig.
- Quality Gate: format, lint, typecheck, unit tests, build, relevante E2E-Tests.

## Risiken

- Eager-Generierung über die ganze Saison erzeugt viele Sessions; deshalb ist
  die Generierung idempotent und nur einmalig mutierend.
- Alte Exporte ohne die neuen Felder bleiben kompatibel (optional/fehlend).
- `buildWeeks` liefert auch Wochen außerhalb der Saison; daher wird jedes Datum
  gegen Saisonbeginn/-ende sowie `validFrom`/`validUntil` geprüft.

## Entscheidungen

- Wochentag als ISO-Name (`Monday`..`Sunday`), UI zeigt deutsche Labels.
- `status` wird optional ergänzt; `undefined` = geplant, `cancelled` = ausgefallen.
- Detach-Regel: Eine erzeugte Session wird bei abweichender Startzeit oder
  abweichender Dauer (gegenüber dem Template) getrennt; reine Planungsfelder
  (RPE, Fokus, Umfang, Hinweis) trennen nicht.
- Generierung und Sync laufen im `SeasonPlanningService` über den
  `StorageAdapter`; keine direkten UI-Speicherzugriffe.

## Fortschritt

Umgesetzt: Domain-Model (types, validation), Storage-/Worker-/Import-/Export-
Anbindung, idempotente Generierung plus Sync- und Detach-Logik im
SeasonPlanningService, Verwaltungsoberfläche, Wochenansicht-Kennzeichnung,
Seed-Daten und 11 Unit-Tests.

## Abschluss

Abgeschlossen. Quality Gate (format, lint, typecheck, 160 Unit-Tests, Build)
grün.
