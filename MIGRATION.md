# Project Hub UI Migration Rules

This React/Vite frontend was exported from Base44 and is being migrated to the Project Hub FastAPI backend. The supplied `openapi.json` is the source of truth for all backend endpoints, request schemas, response schemas, and supported operations.

## Core Rules

1. Preserve the existing Base44-exported visual UI.
2. Do not redesign screens.
3. Reuse existing components, dialogs, tables, sidebars, `TaskSheet`, `KanbanBoard`, `GanttChart`, and forms.
4. Replace Base44 data access with Project Hub API services.
5. Do not create mock APIs unless an endpoint genuinely does not exist in `openapi.json`.
6. Centralize API calls in `src/api`.
7. Centralize API-to-UI mapping in mapper functions.
8. Do not transform API responses throughout React components.
9. Work on only one feature or screen per task.
10. Do not refactor unrelated code.
11. Build successfully before stopping.
12. Report the following before stopping:
    - Files changed
    - Endpoints used
    - Build result
    - API/UI mismatches
    - Remaining Base44 references
13. Stop after the requested task.

## Migration Workflow

For each feature or screen migration:

1. Identify the existing Base44 data access for only the requested feature or screen.
2. Locate the corresponding Project Hub FastAPI endpoint(s) and schemas in `openapi.json`.
3. Add or update API service functions under `src/api`.
4. Add or update mapper functions that convert API payloads into the existing UI shape.
5. Replace the feature or screen's Base44 calls with the centralized API services and mappers.
6. Preserve the existing component structure and visual behavior unless a backend contract mismatch requires a minimal compatibility adjustment.
7. Run the frontend build before stopping.
8. Provide the required migration report.

## Reporting Template

Use this format at the end of every migration task:

```md
## Migration Report

### Files Changed
- `path/to/file`

### Endpoints Used
- `METHOD /path`

### Build Result
- Command: `npm run build`
- Result: Passed/Failed
- Notes: ...

### API/UI Mismatches
- None, or list each mismatch and how it was handled.

### Remaining Base44 References
- None in migrated feature, or list remaining references and why they remain.
```