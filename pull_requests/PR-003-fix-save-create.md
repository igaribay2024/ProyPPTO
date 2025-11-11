PR-003: Improve save/create flows — validation and server logging

Branch: fix/save-create-validation

Resumen
- Añadir validación cliente/servidor para asegurar que los payloads enviados cumplen el esquema esperado antes de INSERT/UPDATE.
- Añadir logs más descriptivos en `backend/routes/crud.js` para capturar errores SQL y payloads problemáticos con `tipo_cambio` y campos numéricos.

Cambios previstos (pequeños):
- Frontend: `src/services/resourceService.js` -> antes de `create` y `update`, validar los campos numéricos y convertir comas a puntos, eliminar separadores de miles.
- Backend: en `backend/routes/crud.js`, mejorar el manejo de errores para devolver mensajes claros y loguear `req.body` cuando una operación falla con `Data truncated`.

Ejemplo de validación cliente (sugerencia):
- Crear helper `utils/formatters.js` con `normalizeNumberString(str)` que reemplaza `,` por `.` y quita ` ` y `\u00A0`.
- Usar antes de enviar:
  const payload = { ...data, tipo_cambio: normalizeNumberString(data.tipo_cambio) }

Patch sugerido (mínimo):
- Añadir `src/utils/formatters.js` con `normalizeNumberString`.
- Usar en `resourceService.create/update` antes de llamar a API.
- Backend: añadir try/catch alrededor de `pool.query` en `routes/crud.js` y loggear `err.sqlMessage` y `req.body`.

Notas de QA
- Reproducir envío con `tipo_cambio` malformado (ej. '19L5') y confirmar que el cliente previene el envío o el servidor devuelve un error claro con payload logueado en servidor.
