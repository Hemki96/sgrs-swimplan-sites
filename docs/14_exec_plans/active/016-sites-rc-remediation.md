# ExecPlan: Sites Release-Candidate Remediation

## Ziel

Die im Sites-Preview-Report vom 2026-08-12 dokumentierten Release-Blocker
beheben und den privaten Release Candidate vollständig erneut prüfen.

## Scope

- inkompatible Legacy-/Fremddaten in `configuration_values` sicher behandeln
- Startabsturz und HTTP-500-Dokumentrouten beseitigen
- Konfigurationsbestand und Defaults fachlich konsistent wiederherstellen
- fehlendes Favicon ergänzen
- Site-Zugriff wieder auf eine nicht öffentliche Review-Konfiguration setzen
- private Site-Version ohne öffentliche Veröffentlichung aktualisieren
- Besucher-Flow, Persistenz, History, Undo, JSON-Export, Mobile und Logs testen
- `docs/10_testing/SITES_PREVIEW_REPORT.md` mit dem Retest aktualisieren

## Non-Scope

- keine öffentliche Veröffentlichung
- keine neue Fachfunktion
- keine Benutzerkonten, Rollen oder personenbezogenen Daten
- kein direkter Storage-Zugriff außerhalb des `StorageAdapter`

## Voraussetzungen

- Site-Projekt und D1-Binding aus ADR 0014
- aktueller Sites-Connector und private Deployment-Funktion
- bestehende Storage-, Domain-, E2E- und Quality-Gate-Tests

## Meilensteine

- [ ] M1: deterministischen Regressionstest für inkompatible Konfigurationsdaten erstellen
- [ ] M2: Daten-/Client-/Worker-Ursache beheben und Favicon ergänzen
- [ ] M3: lokales Quality Gate vollständig ausführen
- [ ] M4: Zugriff nicht öffentlich konfigurieren und private Version deployen
- [ ] M5: vollständigen Browser- und Runtime-Retest ausführen
- [ ] M6: Preview-Bericht und Abschlussnotiz aktualisieren

## Betroffene Dateien

- `app/src/lib/domain/configuration.ts`
- `app/worker/storage.ts` und/oder zugehörige Validierung, falls erforderlich
- relevante Unit-/E2E-Tests
- `app/public/favicon.ico` oder äquivalentes Site-Asset
- `docs/10_testing/SITES_PREVIEW_REPORT.md`
- dieser ExecPlan

## Akzeptanzkriterien

- ein gespeicherter `{ key, value }`-Legacy-Datensatz kann die App nicht mehr
  zum Absturz bringen
- ungültige Konfigurationswerte werden nicht als aktive Fachkonfiguration
  verwendet
- gültige Defaults stehen nach Initialisierung zur Verfügung
- `/` und Saisonrouten laden ohne Browser-/Runtime-Fehler
- Wettkampf- und Mikrozyklusänderung sowie Session-Anlage erzeugen Revisionen
- Reload erhält Änderungen, History zeigt sie, Undo stellt den Vorzustand her
- JSON-Gesamtexport ist erzeugbar und strukturell gültig
- 390-px-Mobile zeigt die fokussierte Tag-/Wochenansicht
- Site ist nicht öffentlich und wurde nicht öffentlich veröffentlicht
- Format, Lint, Typecheck, Unit, Build und relevante E2E-Tests sind grün

## Tests

- gezielter Unit-/Integrations-Regressionslauf für `ConfigurationService`
- bestehende Storage-/Konfigurations-/E2E-Tests
- `npm run check` in `app`
- Browser-Smoke-Test gegen die private Site
- Site-Worker-Logs und Browser-Konsole nach dem Retest

## Risiken

- bestehende D1-Daten können weitere historische Schemas enthalten
- ein privates Deployment kann denselben D1-Bestand wie die aktuelle Version
  verwenden; Datenbereinigung muss daher rückwärtsverträglich sein
- Zugriffskorrektur darf die Site nicht veröffentlichen und keine
  nicht beauftragte Freigabe erzeugen

## Entscheidungen

- Ungültige persistierte Daten werden an der Runtime-/Domain-Grenze
  fehlertolerant ausgefiltert; gültige Daten bleiben unverändert erhalten.
- Datenbereinigung erfolgt nur über dokumentierte Anwendungs-/Sites-Wege.
- Öffentliches Publishing bleibt ausdrücklich ausgeschlossen.

## Fortschritt

- 2026-08-12: Startabsturz, HTTP 500, fehlendes Favicon, öffentlicher
  Zugriff und inkonsistente Konfigurationsdaten im Preview-Report bestätigt.

## Abschlussnotiz

Offen.
