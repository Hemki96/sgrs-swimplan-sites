# Private Sites Preview: Anpassungen

Stand: 2026-08-09

## Sites-spezifische Anpassungen

- Bestehende React-Fachanwendung in die offizielle vinext/Sites-App-Struktur
  eingebettet; keine Fachfunktion ersetzt.
- Cloudflare-Worker-Einstieg für gleich-originige Storage-Routen ergänzt.
- D1-Binding `DB` in `.openai/hosting.json` aktiviert; R2 bleibt `null`.
- Migration `app/drizzle/0000_storage.sql` für die gemeinsame Entity- und
  Revision-Ablage ergänzt.
- `SitesStorageAdapter` an die Worker-Routen angebunden. UI und Domain greifen
  weiterhin ausschließlich auf `StorageAdapter` zu.
- Optimistische Versionsprüfung, Soft Delete und Revision pro Mutation in
  atomaren D1-Batches umgesetzt.
- Versionierten JSON-Gesamtexport (`schemaVersion: 1`) in die bestehende
  Saisonverwaltung aufgenommen.
- Build-Metadaten werden zusammen mit Migrationen in `dist/.openai` verpackt.
- E2E-Abdeckung um Reload-Persistenz, Saisonmatrix, Wochenansicht, 390-px-Mobile
  und Dateiexport erweitert.

## Bewusst nicht ergänzt

- Kein Login oder Benutzerkonto.
- Keine personenbezogenen Daten, Gesundheitsdaten oder Trainingsserien.
- Kein R2, kein Upload und keine externe Datenbank.
- Kein Import ohne die vorgeschriebene Validierungs- und Vorschauphase.
- Keine öffentliche Freigabe.
