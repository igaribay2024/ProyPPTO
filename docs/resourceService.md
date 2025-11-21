# resourceService (frontend)

This document describes the small `resourceService` CRUD wrapper used by the React app to communicate with the backend generic CRUD endpoints under `/api`.

Location
- `src/services/resourceService.js`

Purpose
- Centralize simple REST calls and a light payload normalization step so the backend receives consistent numeric types when possible.

Behavior
- list(resource): GET `/api/<resource>?_ts=<timestamp>` (cache-busting timestamp)
- get(resource,id): GET `/api/<resource>/<id>`
- create(resource,data): POST `/api/<resource>` (applies resource-specific numeric normalization)
- update(resource,id,data): PUT `/api/<resource>/<id>` (applies resource-specific numeric normalization)
- remove(resource,id): DELETE `/api/<resource>/<id>`

Numeric normalization
- The frontend maintains a small map `numericFieldsByResource` mapping resource names to a list of field names that should be treated as numeric-like (e.g. `monto`, `tipo_cambio`).
- Only the fields listed for each resource are normalized: removing thousand separators, converting comma decimals to dot, and returning Number values when possible.
- This is implemented in `src/utils/formatters.js` as `normalizePayloadForFields(obj, fields)`.

Why per-resource?
- Normalizing only specified fields is safer than attempting to transform every string in the payload. It avoids accidental conversion of textual fields that contain punctuation or letters.

How to add/adjust fields
1. Edit `src/services/resourceService.js` and update the `numericFieldsByResource` map. Example:

```js
numericFieldsByResource.payments = ['amount', 'exchange_rate'];
```

2. If you prefer a configuration file, create `src/config/numeric-fields.json` and modify `resourceService` to import it instead of hard-coding.

Testing
- Start the frontend and backend locally.
- Test creating/updating resources with different formats:
  - Valid numeric strings: `"1.234,56"` -> becomes `1234.56`
  - Valid dot decimals: `"19.5"` -> becomes `19.5`
  - Invalid strings with letters: `"19L5"` -> NOT modified by client and will be sent as string; backend will now return a clearer 400 with logging when DB rejects it.

Example
```js
const payload = { monto: '1.234,56', descripcion: 'Taxi' };
resourceService.create('gastos', payload);
// payload sent to server will have monto: 1234.56
```

Notes
- The normalization helper uses heuristics (see `src/utils/formatters.js`) and will NOT change values containing letters. This avoids converting bad inputs into silently incorrect numbers.
- Backend (`backend/routes/crud.js`) now logs redacted payloads and returns 400 for data-truncation SQL errors to help debugging.

Changelog
- 2025-11-10: Introduced per-resource numeric field map and documentation.

>>> Contact
- If you want me to convert the map to a JSON configuration file or add unit tests for `normalizePayloadForFields`, I can prepare a small PR.
