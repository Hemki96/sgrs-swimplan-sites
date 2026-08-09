# Domain Model
```mermaid
erDiagram
 Season ||--o{ EventTrack : has
 EventTrack ||--o{ Event : contains
 Season ||--o{ CalendarConstraint : has
 Season ||--o{ Macrocycle : has
 Macrocycle ||--o{ Mesocycle : contains
 Mesocycle ||--o{ Microcycle : contains
 Microcycle ||--o{ MicrocycleSegment : may_have
 Season ||--o{ PeriodizationDimension : has
 PeriodizationDimension ||--o{ FocusSegment : plans
 FocusDefinition ||--o{ FocusSegment : classifies
 Season ||--o{ TrainingDay : has
 TrainingDay ||--o{ TrainingSession : has
 TrainingSession ||--o{ SessionEquipment : needs
 Season ||--o{ Revision : records
```
