PR-001: Fix lint warnings and hook dependencies in `DashboardHome`

Branch: fix/dashboard-lint

Resumen
- Corrige warnings de ESLint en `src/dashboard/DashboardHome.jsx`:
  - Elimina/usa la variable `loading` o la reemplaza por `isLoading` si procede.
  - Arregla dependencias de hooks `useEffect`, `useMemo` y `useCallback` envolviendo funciones con `useCallback` o incluyendo dependencias correctas.

Objetivo
- Eliminar advertencias de ESLint para una base de código más estable y evitar efectos secundarios inesperados cuando React HMR recarga el módulo.

Archivos previstos a cambiar
- src/dashboard/DashboardHome.jsx

Cambios sugeridos (alta prioridad, pequeño):
1) Reemplazar `const [loading, setLoading] = useState(false)` por `const [isLoading, setIsLoading] = useState(false);` y asegurarse de usar `isLoading` en JSX o eliminarlo si no usado.
2) Extraer `loadData` y `processByMonth` en `useCallback` con dependencias explícitas o mover la lógica dentro de `useEffect` con dependencias listas.

Patch sugerido (manual)
- Abrir `src/dashboard/DashboardHome.jsx` y:
  - Importar `useCallback` si no existe.
  - Convertir funciones auxiliares a `useCallback` o `useMemo` según su propósito.
  - Asegurarse que `useEffect` incluye todas las dependencias necesarias.

Notas de QA
- Ejecutar `npm start` y confirmad que la compilación muestra "Compiled successfully" sin warnings en `DashboardHome.jsx`.
- Probar que el dashboard sigue mostrando datos y que el comportamiento del gráfico no cambia.
