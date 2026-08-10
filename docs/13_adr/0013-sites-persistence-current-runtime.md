# ADR 0013: Sites-Persistenz in der aktuell verfügbaren Runtime

## Status

Superseded by ADR 0014

## Datum

2026-08-09

## Kontext

SGRS SwimPlan benötigt gemeinsam veränderbare, dauerhafte Daten. Nach ADR 0005
darf die Anwendung Persistenz ausschließlich über einen `StorageAdapter`
verwenden. ADR 0006 verbietet die Verwendung undokumentierter Sites-APIs. Vor
der Implementierung eines `SitesStorageAdapter` müssen deshalb die tatsächlich
verfügbaren Runtime-Bindings geprüft werden.

Die Prüfung bezog sich auf den aktuell angemeldeten ChatGPT-Workspace und den
lokalen Checkout. Es wurde keine Site erstellt, kein Storage provisioniert und
keine Site veröffentlicht.

## Prüfgrundlage

- `AGENTS.md` und die projektinternen Sites-/Storage-Unterlagen
- lokaler Checkout, insbesondere `.openai/hosting.json`
- der in dieser Sitzung verfügbare OpenAI-Sites-Connector und dessen deklarierte
  Schemas
- `sites_list_sites` für den aktuell angemeldeten Workspace
- offizielle OpenAI-Dokumentation:
  - <https://learn.chatgpt.com/docs/sites>
  - <https://help.openai.com/en/articles/20001339-creating-and-managing-chatgpt-sites>
  - <https://help.openai.com/en/articles/9903489-data-residency-for-chatgpt>

## Tatsächlich festgestellter Zustand

Der Sites-Connector ist in der aktuellen ChatGPT-Umgebung verfügbar. Die
Abfrage der zugänglichen Sites ergab jedoch eine leere Liste. Im Checkout ist
keine `.openai/hosting.json` vorhanden. Damit existieren für dieses Projekt
aktuell weder eine provisionierte Sites-Runtime noch ein D1- oder R2-Binding.

Die offizielle Sites-Dokumentation beschreibt D1 und R2 als mögliche, aber
account-, runtime- und limitabhängige Produktfähigkeiten. Sie belegt nicht, dass
diese Speicher im aktuellen Projekt bereits provisioniert sind.

## Capability-Matrix

| Frage | Feststellung für die aktuelle Umgebung | Evidenz und Einordnung |
| --- | --- | --- |
| 1. Persistente Storage-Technologie | Für dieses Projekt ist aktuell **keine** persistente Storage-Instanz provisioniert. Sites unterstützt grundsätzlich D1 für dauerhafte strukturierte Daten und R2 für dauerhafte Dateien. | Keine Site und kein Hosting-Manifest; offizielle Sites-Dokumentation nennt D1/R2 als auswählbare Site-Form. |
| 2. Bindings/API | Aktuell ist **kein Runtime-Binding** vorhanden. Dokumentiert sind ausschließlich die Manifestfelder `d1` und `r2`; als Beispiel nennt OpenAI den D1-Bindingnamen `DB`. Ein konkreter Bindingname für dieses Projekt und Runtime-Methoden sind nicht verifiziert. | Offizielles Manifestbeispiel: `{"project_id":"…","d1":"DB","r2":null}`. Der Checkout enthält kein solches Manifest. |
| 3. Lesen | Nicht verifiziert. Es ist keine projektspezifische Lese-API verfügbar oder testbar. | Die geprüfte OpenAI-Dokumentation nennt keine Lese-Funktionssignatur; ohne Binding ist kein Runtime-Test möglich. |
| 4. Schreiben | Nicht verifiziert. Es ist keine projektspezifische Schreib-API verfügbar oder testbar. | Die geprüfte OpenAI-Dokumentation nennt keine Schreib-Funktionssignatur; ohne Binding ist kein Runtime-Test möglich. |
| 5. Transaktionen | Nicht verifiziert. | D1 wird als relationale Datenbank beschrieben; daraus wird ausdrücklich keine Transaktions-API für Sites abgeleitet. |
| 6. Versionierung | Site-Quellstände können als nummerierte Versionen gespeichert und anschließend deployt werden. Eine Versionierung der **Anwendungsdaten** in D1/R2 ist nicht nachgewiesen. Fachliche Revisionen müssen daher weiterhin durch das Domänenmodell erzeugt werden. | Der Connector stellt Site-Versionen mit Versionsnummer, Commit-SHA und optionalem Quellarchiv bereit. Das ist Deployment-, nicht Datensatzversionierung. |
| 7. Strukturierte Datenbanktabellen | Grundsätzlich ja: D1 ist laut OpenAI die relationale Datenbank für strukturierte, dauerhafte Daten. Für dieses Projekt sind Schema, Migrationen und Tabellen noch nicht provisioniert oder getestet. | Offizielle Site-Shape-Tabelle und Hinweis, Datenbankmigrationen vor Veröffentlichung zu prüfen. |
| 8. Dateispeicher | Grundsätzlich ja: R2 ist laut OpenAI Objekt-/Dateispeicher für Uploads. Für dieses Projekt ist kein R2-Binding vorhanden. | Offizielle Site-Shape-Tabelle; `r2` ist im Manifest vorgesehen. |
| 9. Preview und veröffentlichte Site | Eine private Preview ist Teil des Sites-Workflows. Jeder Deployment-URL ist laut OpenAI eine Produktions-URL; ein gespeicherter, nicht deployter Stand dient als Review-Kandidat. Ob Preview und veröffentlichte Site dieselbe D1/R2-Instanz sehen oder getrennte Datenbestände verwenden, ist in dieser Umgebung nicht verifiziert. | Keine Site vorhanden; deshalb kein kontrollierter Preview-/Publish-Vergleich möglich. |
| 10. Limits | Sites ist Public Beta; Limits sind plan-/workspaceabhängig, gelten accountweit und können sich ändern. Bei Erreichen eines Limits können Site-Erstellung, zusätzliches Storage oder öffentliche Verfügbarkeit eingeschränkt werden. Ein beobachtetes Connectorlimit ist maximal 50 Einträge pro `list_sites`-Abfrage. Konkrete D1-/R2-Größen-, Request-, Zeilen-, Objekt- oder Transaktionslimits wurden für diesen Workspace nicht angezeigt und sind nicht verifiziert. | Offizielle Beta-Hinweise; Connector-Schemavalidierung wies `limit=100` zurück und akzeptiert höchstens 50. |
| 11. Export/Backup | Für Site-Code existieren Git-Commit-Provenienz und optional ein archivierter Quellstand pro gespeicherter Site-Version. Ein D1-/R2-Datenexport, Snapshot, Dump, Point-in-time Restore oder automatisches Backup ist im verfügbaren Connector und in der geprüften Sites-Dokumentation nicht nachgewiesen. Der verpflichtende JSON-Gesamtexport bleibt daher die einzige festgelegte Anwendungsdaten-Backupstrategie. | Sites-Versionen enthalten Commit-SHA und optional Archivmetadaten; keine verfügbaren Storage-Exportoperationen. |

## Verfügbare Management-Schnittstellen

Der aktuell verfügbare Sites-Connector kann Sites, gespeicherte Versionen,
Deployments, Zugriffsregeln, Produktions-Umgebungsvariablen und Worker-Logs
verwalten beziehungsweise lesen. Seine deklarierten Werkzeuge stellen **keine**
D1-Abfrage, R2-Objektoperation, Migration, Transaktion, Datenbanksicherung oder
Storage-Exportoperation bereit. Diese Management-Schnittstellen sind deshalb
kein Ersatz für ein Runtime-Binding im Site-Code.

## Entscheidung

1. Für die spätere Architektur kommen ausschließlich die von OpenAI
   dokumentierten Sites-Speicherklassen D1 (strukturierte Daten) und bei echtem
   Dateibedarf R2 (Objekte) in Betracht.
2. Für SGRS SwimPlan ist aktuell keine Sites-Persistenz nutzbar, weil dem Projekt
   keine Site und keine Storage-Bindings zugeordnet sind.
3. Ein `SitesStorageAdapter` wird noch nicht implementiert.
4. Weder Cloudflare-D1-/R2-Methoden noch Bindingnamen werden aus allgemeinem
   Cloudflare-Wissen übernommen. Sie müssen in einer für dieses Projekt
   provisionierten Sites-Runtime oder in expliziter OpenAI-Sites-Dokumentation
   nachgewiesen werden.
5. Site-Versionen ersetzen keine fachlichen Revisionen. Jede Mutation muss
   weiterhin eine Revision erzeugen; Löschen bleibt Soft Delete.
6. Der JSON-Gesamtexport bleibt verpflichtend, unabhängig von späteren
   Plattform-Backupfunktionen.

## Erforderliche Folgeprüfung vor Adapter-Implementierung

Nach ausdrücklicher Freigabe zur Site-Provisionierung ist eine private Site mit
minimalem Storage einzurichten. Vor jeder Adapter-Implementierung sind danach zu
dokumentieren und praktisch zu testen:

1. erzeugte `.openai/hosting.json` einschließlich der exakten Bindingnamen,
2. von der Sites-Runtime bereitgestellte Typen oder dokumentierte
   Funktionssignaturen,
3. minimale Lese- und Schreiboperation,
4. Schema- und Migrationsablauf,
5. atomare Mutation beziehungsweise nachgewiesenes Transaktionsverhalten,
6. parallele Schreibzugriffe und Konfliktverhalten,
7. Datenbestand in privater Preview, gespeichertem Stand und Produktion,
8. konkrete Workspace-Limits,
9. D1-/R2-Export, Backup und Restore.

Kann einer dieser Punkte nicht nachgewiesen werden, bleibt der
`SitesStorageAdapter` blockiert.

## Betrachtete Alternativen

### Allgemeine Cloudflare-D1-/R2-APIs voraussetzen

Verworfen. Die Sites-Runtime kann einen eingeschränkten oder abweichenden
Vertrag bereitstellen. Dies würde ADR 0006 und die verbindliche Regel gegen
erfundene Sites-APIs verletzen.

### In-Memory- oder Browser-Storage als gemeinsame Persistenz verwenden

Verworfen. Damit entstehen keine verlässlich gemeinsam editierbaren Daten für
alle Besucher.

### Externe Datenbank vor der Runtime-Verifikation anbinden

Verworfen. Das erweitert Architektur und Betriebsumfang, ohne dass die
eingebaute Sites-Fähigkeit zuvor geprüft wurde.

## Konsequenzen

- M1 der Storage-Phase ist für den **aktuellen, nicht provisionierten Zustand**
  dokumentiert, aber die Runtime-API-Prüfung nach Provisionierung bleibt offen.
- M2 ist mit diesem Capability-Gate erfüllt; bei neuem Binding oder geänderter
  Runtime muss dieses ADR ergänzt oder ersetzt werden.
- M3 bis M5 des ExecPlans dürfen noch nicht begonnen werden.
- Es wurden keine Produktivdaten, Sites, Bindings oder Deployments erzeugt oder
  verändert.
