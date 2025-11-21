<#
PowerShell script para archivar (mover) archivos/carpeta listados en la propuesta.
USO (desde la raíz del proyecto):
  - Abre PowerShell en la raíz del repo y ejecútalo: 
    .\scripts\perform_cleanup.ps1
  - El script creará `archive\cleanup-YYYYMMDD-HHMMSS` y moverá los elementos existentes.

NOTA: No borra nada permanentemente; solo mueve archivos/carpetas a la carpeta de archivo.
#>

# --- Timestamp y paths
$timestamp = (Get-Date).ToString('yyyyMMdd-HHmmss')
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Resolve-Path "$scriptDir\.." | Select-Object -ExpandProperty Path
$archiveDir = Join-Path $repoRoot "archive\cleanup-$timestamp"

Write-Host "Repo root: $repoRoot"
Write-Host "Creando archive: $archiveDir"
New-Item -Path $archiveDir -ItemType Directory -Force | Out-Null

# --- Lista de elementos a mover (relativos a la raíz del repo)
$items = @(
  "build",
  "backend\gaspayload.json",
  "backend\prespayload.json",
  "backend\userpayload.json",
  "backend\invalid_tipo_attempts.log",
  "backend\post_gasto.js",
  "backend\post_pres.js",
  "backend\post_user.js",
  "backend\e2e.js",
  "backend\inspectTable.js",
  "backend\drop_tipo_column.js",
  "backend\migrate_tipo_usuario.js",
  "backend\migrate-usuarios.js",
  "backend\test_update_user.js",
  "backend\show_create_usuarios.js",
  "backend\show_users_tipo.js",
  "backend\get_meta_usuarios.js",
  "backend\reset-password.js"
)

# --- Mover cada elemento si existe
foreach ($rel in $items) {
    $full = Join-Path $repoRoot $rel
    if (Test-Path $full) {
        try {
            $dest = Join-Path $archiveDir (Split-Path $rel -Leaf)
            Write-Host "Moviendo: $rel -> $archiveDir"
            Move-Item -Path $full -Destination $archiveDir -Force -ErrorAction Stop
        } catch {
            Write-Warning "Error moviendo $rel : $_"
        }
    } else {
        Write-Host "No existe (omitido): $rel"
    }
}

Write-Host "Archiving terminado. Revisa: $archiveDir"
Write-Host "Si quieres, puedo crear un commit con estos cambios si confirmas."