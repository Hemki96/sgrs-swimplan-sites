# ADR 0014: Sites-D1 hinter dem StorageAdapter

## Status

Accepted

## Datum

2026-08-09

## Kontext

Die private Site ist provisioniert. Die aktuelle offizielle Sites-Runtime
dokumentiert D1 als persistenten strukturierten Speicher, das logische Binding
`DB`, vorbereitete Einzelstatements und `batch(...)`. Der Sites-Starter liefert
eine Cloudflare-Worker-kompatible vinext-Ausgabe. Der bisherige Checkout war
dagegen eine rein statische Vite-Anwendung und verwendete produktiv den
`InMemoryStorageAdapter`.

## Entscheidung

1. Das Hosting-Manifest deklariert D1 ausschließlich als `DB`; R2 bleibt
   ungenutzt.
2. Die bestehende React-/TypeScript-Fachanwendung bleibt erhalten und wird durch
   vinext in eine Sites-kompatible Worker-Ausgabe gebaut.
3. `SitesStorageAdapter` bleibt die einzige Runtime-Grenze der UI. Er spricht
   eine gleich-originige Storage-Route im Worker an.
4. D1 speichert alle fachlichen Collections in `storage_entities`. Fachliche
   Objekte bleiben JSON, während Collection, ID, Season-ID, Version und
   Löschzeitpunkt indiziert vorliegen.
5. Mutation und Revision werden gemeinsam als D1-Batch ausgeführt. Updates und
   Soft Deletes verwenden einen bedingten Versionsvergleich. Konflikte werden
   als `VersionConflictError` an die Anwendung zurückgegeben.
6. Import/Hydrate bleibt in Sites gesperrt, bis der verpflichtende validierte
   Vorschau- und Bestätigungsflow implementiert ist. Der Gesamtexport ist davon
   unabhängig verfügbar.

## Alternativen

- Browser-Storage: verworfen, weil nicht gemeinsam und nicht dauerhaft.
- Direkter D1-Zugriff aus React-Komponenten: verworfen, weil er ADR 0005 und die
  Runtime-Isolation verletzt.
- Eine Tabelle pro Collection: vorerst verworfen; sie würde die bestehende
  runtime-neutrale Collection-Abstraktion ohne fachlichen Mehrwert duplizieren.
- Ungeschützter Snapshot-Import: verworfen, weil Importe zwingend validiert und
  vor Anwendung als Vorschau gezeigt werden müssen.

## Konsequenzen

- Reloads und neue Browsersitzungen lesen denselben D1-Datenbestand.
- Jede Mutation erzeugt weiterhin genau eine fachliche Revision; Soft Delete
  bleibt erhalten.
- Der Build erzeugt `dist/server/index.js`, Hosting-Metadaten und die Migration.
- Vor einem späteren öffentlichen Publish sind die private Runtime, parallele
  Schreibzugriffe, Importvorschau und Betriebsgrenzen erneut zu prüfen.
