# Sites Preview Report – Release Candidate

## Ergebnis

**Nicht freigabefähig.** Der Release Candidate ist bereits beim ersten Öffnen
für einen neuen Besucher blockiert. Die Site zeigt nur die Runtime-Fehlerseite
„This page couldn’t load“. Dadurch konnten die fachlichen Mutations-,
Persistenz-, Historien-, Undo- und Export-Flows nicht sicher ausgeführt werden.
Es wurde keine Site veröffentlicht, keine neue Version deployt und keine
Zugriffseinstellung verändert.

## Testkontext

- Zeitpunkt: 2026-08-12, Europe/Berlin
- Site: `SGRS SwimPlan`
- Project-ID: `appgprj_6a7874f81b3881918dde16a47aee3055`
- geprüfte URL: `https://sgrs-swimplan.chemker.chatgpt.site`
- gemeldete Version: 4
- Commit der Site-Version: `8b46ae0f343c318988b32d0cae04131b27e9ffcc`
- Browser: frischer Tab im ChatGPT-internen Chromium-Browser
- Desktop: Standard-Viewport
- Mobile: 390 × 844 px
- Hosting-Metadaten: `current_preview_url = null`,
  `current_live_url = https://sgrs-swimplan.chemker.chatgpt.site`,
  `access_mode = public`

Hinweis: Mangels separater Preview-URL wurde die bestehende Deployment-URL
ausschließlich lesend als Testziel verwendet. Der Test war kein Inkognito- oder
vollständig isolierter Browserprofil-Test.

## Besucher-Flow

| Schritt | Status | Beobachtung |
| --- | --- | --- |
| Seite öffnen | **Fehler** | Navigation endet auf `/saisons/00000000-0000-4000-8000-000000000001`; statt der Anwendung erscheint „This page couldn’t load“. |
| Saison ansehen | **Blockiert** | Keine Saison-UI erreichbar. |
| Wettkampf bearbeiten | **Blockiert** | Keine editierbare Oberfläche erreichbar; keine Mutation ausgeführt. |
| Mikrozyklus bearbeiten | **Blockiert** | Keine editierbare Oberfläche erreichbar; keine Mutation ausgeführt. |
| Session anlegen | **Blockiert** | Keine editierbare Oberfläche erreichbar; keine Mutation ausgeführt. |
| Seite neu laden | **Fehler reproduziert** | Reload zeigt erneut dieselbe Fehlerseite und denselben JavaScript-Fehler. |
| Änderung weiterhin vorhanden | **Nicht prüfbar** | Es konnte zuvor keine Änderung angelegt werden. |
| Änderungshistorie prüfen | **Blockiert** | Historienansicht nicht erreichbar. |
| Änderung rückgängig machen | **Blockiert** | Undo nicht erreichbar; keine Mutation ausgeführt. |
| JSON-Export erstellen | **Blockiert** | Export-UI nicht erreichbar; es wurde kein Export erzeugt. |
| Mobile Darstellung prüfen | **Fehler** | Bei 390 × 844 px ebenfalls nur die Runtime-Fehlerseite; die eigentliche mobile Tag-/Wochenansicht ist nicht prüfbar. |

## Fehler

### F-01 – Startabsturz durch inkompatible persistierte Konfiguration

**Schweregrad: Blocker**

Browser-Konsole:

```text
TypeError: Cannot read properties of undefined (reading 'localeCompare')
at Array.sort
at El.list
at async El.ensureDefaults
```

Der Fehler ist desktop und mobil reproduzierbar. Der aktuelle Client sortiert
Konfigurationswerte nach `group`, `sortOrder` und `label`. Die öffentliche
Storage-Antwort für `configuration_values?includeDeleted=true` enthält jedoch
mindestens diese strukturell inkompatible Zeile:

```json
{
  "id": "9b6ed330-3582-4029-a0f9-f74643a2ddb4",
  "version": 1,
  "key": "calendarSystem",
  "value": "ISO-8601"
}
```

`group`, `code`, `label`, `sortOrder` und `active` fehlen. Dadurch wird beim
Sortieren `a.group.localeCompare(...)` auf `undefined` aufgerufen. Die Site hat
keine fehlertolerante Behandlung für Alt-/Fremddaten und keinen nutzbaren
Fallback für Besucher.

### F-02 – Dokumentrouten liefern HTTP 500

**Schweregrad: Blocker**

Die Site-Worker-Logs enthalten wiederholte HTTP-500-Antworten für `GET /` und
`GET /saisons/<id>`, einschließlich des aktuellen Testlaufs. Einzelne
Storage-GETs (unter anderem `training_sessions`, `training_days`,
`macrocycles`, `mesocycles`, `microcycles` und Konfigurationsdaten) antworten
dagegen mit HTTP 200. Das grenzt den Fehler auf Anwendungsinitialisierung bzw.
Rendering nach erfolgreichem Datenabruf ein.

### F-03 – Favicon fehlt

**Schweregrad: Niedrig**

`GET /favicon.ico` liefert wiederholt HTTP 404. Das blockiert die Fachfunktion
nicht, erzeugt aber vermeidbare Fehler-/Warnsignale in den Site-Logs und eine
unfertige Browserdarstellung.

## Warnungen

### W-01 – Keine private Preview vorhanden

Die Hosting-Metadaten melden keine `current_preview_url`, aber eine
`current_live_url`. Gleichzeitig ist der Zugriff als `public` konfiguriert.
Das widerspricht dem Auftrag, eine private Site als Release Candidate zu
prüfen, und der Projektdokumentation, die eine private Vorschau vor
Veröffentlichung fordert. Die bestehende Site ist daher nicht als isolierte
private Preview nachgewiesen.

### W-02 – Deployed Commit ist nicht der aktuelle Checkout

Version 4 verweist auf Commit `8b46ae0...`; der geprüfte lokale Checkout steht
auf `e9a0509...`. Der Bericht bewertet die tatsächlich ausgelieferte Version 4,
nicht automatisch alle späteren lokalen Änderungen.

### W-03 – Logs klassifizieren 404-Ereignisse in der Fehlerabfrage mit

Die Site-Log-Abfrage `errors_only=true` enthält auch `favicon.ico`-Ereignisse
mit Metadaten-Level `info`, weil die Response 404 ist. Für Release-Triage sollten
HTTP-Status, Worker-Outcome und Log-Level getrennt ausgewertet werden.

## UX-Probleme

- Der globale Fehlerzustand enthält nur „Reload“ und „Back“ und erklärt weder
  Ursache noch Wiederherstellungsmöglichkeit.
- Reload führt deterministisch in denselben Fehler; es gibt keinen
  degradierenden Nur-Lese-Modus.
- Bei einem einzelnen ungültigen Konfigurationsdatensatz fällt die gesamte Site
  einschließlich Saisonansicht, Historie und Export aus.
- Die eigentliche Mobile-UX kann wegen des Startabsturzes nicht beurteilt
  werden; auch dort sieht ein Besucher nur die generische Runtime-Fehlerseite.

## Datenprobleme

### D-01 – Vermischte Schemas in `configuration_values`

Die Collection enthält sowohl gültig wirkende `ConfigurationValue`-Objekte als
auch mindestens ein Legacy-/Fremdobjekt im Schema `{ key, value }`. Persistierte
Daten und aktuelles Domain-Schema sind nicht konsistent.

### D-02 – Konfigurationsbestand vollständig inaktiv

In der gelesenen Antwort sind alle sichtbaren fachlichen Konfigurationswerte
(`season_status`, Event-Prioritäten/-Kategorien, Equipment,
Periodisierungsdimensionen und Foki) auf `active: false` gesetzt. Das sieht nach
Test-/Altbestand oder einer fehlerhaften Massenänderung aus. Selbst nach
Beseitigung des Absturzes ist zu prüfen, ob Dropdowns und Defaults damit leer
oder fachlich unbrauchbar werden.

### D-03 – Runtime-Validierung schützt den Leseweg nicht vor Altbestand

Die API liefert den inkompatiblen Datensatz mit HTTP 200 aus. Entweder wurde er
vor Einführung der aktuellen Validierung gespeichert oder die aktuelle
Lese-/Migrationsgrenze validiert bestehende Daten nicht. Ein einzelner solcher
Datensatz darf den kompletten Client nicht blockieren.

## Browser- und Runtime-Fehler

- Browser: ein reproduzierbarer JavaScript-`TypeError` in
  `App-Bq5MClOM.js`, ausgelöst in `ensureDefaults()`/`list()`.
- Runtime: wiederholte HTTP 500 für Dokumentrouten `/` und `/saisons/<id>`.
- Runtime: Storage-Lesezugriffe während des Starts überwiegend HTTP 200.
- Runtime: wiederholte HTTP 404 für `/favicon.ico`.
- In den geprüften Ereignissen wurde kein D1-/Worker-Ausführungsabbruch für die
  Storage-GETs beobachtet; der Worker-Outcome war dort `ok`.

## Blocker für Veröffentlichung

1. **Startabsturz beheben und bestehenden D1-Bestand migrieren/bereinigen.**
   Die Anwendung muss mit alten oder ungültigen Zeilen kontrolliert umgehen.
2. **Alle Dokumentrouten müssen ohne HTTP 500 laden.** Erst dann ist der
   vollständige Besucher-Flow erneut ausführbar.
3. **Private Preview wiederherstellen oder nachweisen.** Es darf keine
   versehentliche öffentliche Freigabe des Release Candidates bestehen.
4. **Konfigurationsdaten fachlich prüfen.** Die flächendeckend inaktiven Werte
   müssen erklärt oder korrigiert werden.
5. **Kompletten Flow nach Fix erneut testen:** Saison ansehen, Wettkampf und
   Mikrozyklus bearbeiten, Session anlegen, Reload-Persistenz, Historie, Undo,
   JSON-Gesamtexport und 390-px-Mobile.
6. **Browserkonsole und Site-Logs nach dem Retest fehlerfrei prüfen.**

## Release-Entscheidung

**NO-GO.** Veröffentlichung bleibt blockiert. Dieser Test hat keine
Veröffentlichung, kein Deployment und keine Änderung an Site-Zugriff oder
Anwendungsdaten vorgenommen.
