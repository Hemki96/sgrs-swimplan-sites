# Architektur
```mermaid
flowchart LR
 U[Besucher] --> UI[React Site UI]
 UI --> APP[Application Services]
 APP --> SA[StorageAdapter]
 SA --> MEM[InMemory Adapter]
 SA --> SITE[ChatGPT Sites Storage Adapter]
 APP --> REV[Revision Service]
 APP --> EXP[Export Service]
```

Prinzipien: Domain/ UI kennen keine konkrete Storage-Technologie; Validierung vor Persistenz; Mutationen zentral; Revision zusammen mit Mutation; runtime-spezifischer Code isoliert; keine erfundene D1/R2-API.
