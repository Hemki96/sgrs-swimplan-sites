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
  Preview/Publish, Limits, Backup).
- [ ] SitesStorageAdapter implementieren.
- [ ] Persistence Smoke Test.
- [ ] Concurrency Test.

## Entscheidungen
ADR 0013: D1/R2 sind dokumentierte Sites-Produktfähigkeiten, für dieses Projekt
aber noch nicht provisioniert. Ohne nachgewiesene Runtime-APIs bleibt die
Adapter-Implementierung blockiert.

## Abschluss
Offen.
