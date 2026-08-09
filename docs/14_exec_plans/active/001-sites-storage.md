# ExecPlan: Sites Storage

## Ziel

Sites Storage vollständig und testbar umsetzen.

## Scope

Nur diese Phase.

## Non-Scope

Keine späteren Funktionen vorziehen.

## Meilensteine

- [ ] M1: Runtime Capability Check
- [ ] M2: Runtime ADR
- [ ] M3: SitesStorageAdapter
- [ ] M4: Persistence Smoke Test
- [ ] M5: Concurrency Test

## Akzeptanz

Alle Meilensteine + Quality Gate.

## Fortschritt

- [x] Aktuellen Workspace geprüft: Sites-Connector vorhanden, aber keine
      zugängliche Site und kein `.openai/hosting.json`.
- [x] Capability-Gate in ADR 0013 dokumentiert.
- [ ] Storage-provisionierte private Runtime prüfen (Bindings, APIs,
      Preview/Publish, Limits, Backup). Am 2026-08-09 wurde hierfür die private,
      noch nicht deployte Site `sgrs-swimplan` provisioniert und ihre opaque
      Projekt-ID in `.openai/hosting.json` hinterlegt. Der dabei erzeugte
      Projektcontainer stellt weiterhin **kein** D1-/R2-Binding bereit:
      `d1` und `r2` sind `null`, Runtime-Umgebungsvariablen und Site-Versionen sind
      leer, Preview- und Live-URL fehlen. Die verfügbaren Connector-Schemas bieten
      weiterhin nur Site-Management, aber keine Datenbankabfrage, Migration,
      Transaktion oder Storage-Provisionierung. M1 bleibt daher offen und an der
      Storage-Provisionierung blockiert.
- [ ] SitesStorageAdapter implementieren.
- [ ] Persistence Smoke Test.
- [ ] Concurrency Test.

## Entscheidungen

ADR 0013: D1/R2 sind dokumentierte Sites-Produktfähigkeiten, für dieses Projekt
aber noch nicht provisioniert. Ohne nachgewiesene Runtime-APIs bleibt die
Adapter-Implementierung blockiert.

## M1-Prüfprotokoll (2026-08-09)

- Private Site erstellt; kein Deployment und keine öffentliche Freigabe.
- Hosting-Manifest mit der vom Connector gelieferten Projekt-ID angelegt;
  keine Bindingnamen erfunden (`d1: null`, `r2: null`).
- Projekt erneut über den Connector gelesen: Status `active`, Version `0`,
  keine Preview-/Live-URL und keine gespeicherte Site-Version.
- Produktions-Runtime-Konfiguration erneut gelesen: keine Einträge, Revision
  `0`.
- Persistenz-Smoke-Test `Speichern -> Seite/Runtime neu laden -> erneut lesen`
  nicht ausführbar, weil weder eine persistente Instanz noch eine dokumentierte
  Lese-/Schreib-API vorhanden ist. Dies wird nicht durch In-Memory- oder
  Browser-Storage simuliert.
- Der Unit-Test des Capability-Gates stellt sicher, dass sämtliche
  `SitesStorageAdapter`-Operationen explizit fehlschlagen und insbesondere kein
  stiller, flüchtiger Fallback Lost Updates kaschiert.
- Integrations-, Reload-, Soft-Delete-, `updatedAt`- und Konflikttests gegen die
  Sites-Runtime bleiben bis zur Storage-Provisionierung offen; sie werden nicht
  als bestanden ausgewiesen.

### Blocker und nächste Freigabebedingung

M1 kann erst abgeschlossen werden, wenn der Sites-Workspace eine private
Storage-Instanz samt exaktem Binding und dokumentierten Runtime-Signaturen
bereitstellt. Erst danach dürfen Migration, atomarer Versionsvergleich,
Revision, Soft Delete, Fehlerfälle und der Reload-Roundtrip praktisch geprüft
und dokumentiert werden. Gemäß ADR 0013 wurden M3 bis M5 nicht begonnen.

## Persistenz-Stresstest (2026-08-09)

- Der vollständige StorageAdapter-Vertrag wurde gegen den
  `InMemoryStorageAdapter` als Referenzadapter getestet: Erstellen, Lesen,
  Ändern, Export/Hydrate in eine neue Adapterinstanz, erneutes Lesen, Soft
  Delete, standardmäßiges Ausblenden, Versionskonflikt, zwei parallele
  Schreibversuche und Gesamtexport einschließlich Revisionen.
- Gefundener und behobener Storage-Fehler: `get()` lieferte soft-gelöschte
  Datensätze weiterhin aus. `get()` gibt nun wie `list()` standardmäßig `null`
  zurück; der Gesamtexport behält den Datensatz für Wiederherstellung und Audit.
- Beim Paralleltest gewinnt genau ein Schreibversuch. Der zweite wird als
  `VersionConflictError` abgewiesen; es entsteht keine zusätzliche Revision und
  kein stilles Lost Update.
- Der Reload im Referenztest erzeugt eine neue Adapterinstanz und hydriert den
  zuvor exportierten Snapshot. Das prüft den Reload-Vertrag, ist aber kein
  Nachweis dauerhafter Sites-Persistenz.
- Der gleiche Stresstest gegen `SitesStorageAdapter` bleibt blockiert: Das
  Hosting-Manifest enthält weiterhin weder D1 noch R2 und es existiert keine
  dokumentierte Runtime-Lese-/Schreib-API. M4 und M5 werden deshalb nicht als
  abgeschlossen markiert.

## Abschluss

Offen.
