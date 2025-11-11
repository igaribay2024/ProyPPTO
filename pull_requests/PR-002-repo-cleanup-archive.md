PR-002: Archive generated files and add .gitignore for `build/`

Branch: chore/archive-unused-artifacts

Resumen
- Mover `build/` y scripts/payloads de `backend/` a `archive/cleanup-<timestamp>/`.
- Añadir `build/` a `.gitignore` y documentar la política en `README.md`.

Archivos previstos a mover (si aceptado por mantenedor):
- build/
- backend/gaspayload.json
- backend/prespayload.json
- backend/userpayload.json
- backend/invalid_tipo_attempts.log
- backend/post_gasto.js
- backend/post_pres.js
- backend/post_user.js
- backend/e2e.js
- backend/inspectTable.js
- backend/drop_tipo_column.js
- backend/migrate_tipo_usuario.js
- backend/migrate-usuarios.js
- backend/test_update_user.js
- backend/show_create_usuarios.js
- backend/show_users_tipo.js
- backend/get_meta_usuarios.js
- backend/reset-password.js

Cambios propuestos (pequeños):
1) Añadir entrada `build/` a `.gitignore`.
2) Crear `scripts/perform_cleanup.ps1` (ya creado) y ejecutarlo en branch de mantenimiento para mover archivos a `archive/`.
3) Añadir `cleanup/cleanup-proposal.txt` (ya creado) con la explicación.

Patch sugerido (ejemplo):
- .gitignore: añadir una línea `build/`.
- Commit: mover archivos al directorio `archive/cleanup-XXXXXXXX/`.

Notas de QA
- Confirmar que `npm run build` sigue funcionando localmente y que `build/` no aparece en commits futuros.
- Verificar que archivos movidos están presentes en `archive/` y no rompen rutas en producción.
