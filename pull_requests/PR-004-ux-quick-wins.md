PR-004: UX quick wins (Nielsen heuristics) — small, high-impact changes

Branch: feat/ux-quick-wins

Resumen
- Implementar pequeñas mejoras de usabilidad mapeadas a heurísticas de Nielsen.

Cambios propuestos (cada uno es un PR pequeño o un conjunto de commits):
1) Feedback inmediato tras acciones (visibilidad del sistema)
   - Asegurar toasts consistentes para guardado/errores (usar `react-toastify` ya presente). Archivos: `src/dashboard/ResourcePage.jsx`, `src/services/resourceService.js`.
2) Consistencia y estándares
   - Establecer botones primarios secundarios y revisar `Login.jsx` y `ResourcePage` para usar clases consistentes. Archivos: `src/components/Login.jsx`, `src/dashboard/ResourcePage.jsx`.
3) Prevención de errores y validación inline
   - Añadir validaciones en formularios (`GastoForm.js`, `PresupuestoForm.js`) para validar `monto`, `tipo_cambio`, fechas.
4) Reducción de carga cognitiva
   - Simplificar el menú lateral: mostrar iconos + textos, agrupar secciones.
5) Recuperación fácil
   - Añadir botón "Volver al dashboard" en páginas CRUD (ya implementado por defecto) y añadir confirm dialog en borrado.

Notas de QA
- Cada cambio es pequeño; probar que los toasts aparecen en operaciones CRUD, y que formularios rechazan inputs inválidos.

Sugerencia de rollout
- Hacer PRs independientes: `feat/ux-toasts`, `feat/ux-forms-validation`, `feat/ux-menu-tidy`.
