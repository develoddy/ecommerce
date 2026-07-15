# ================= DEPLOY ECOMMERCE - WINDOWS VERSION =================
# Version PowerShell del script deploy.sh para Windows
# ======================================================================

# Colores
$Magenta = "Magenta"
$Yellow = "Yellow"
$Green = "Green"
$Red = "Red"
$Cyan = "Cyan"
$Blue = "Blue"

# ================= CONFIGURACION =================
$PROJECT_DIR = Get-Location
$BUILD_DIR = "dist\ecommerce"
$DEPLOY_DIR = "C:\backup_lujandev\dev\projects\ECOMMERCE\ECOMMERCE-RECURSOS\PRO-DIST\ecommerce_deploy\ecommerce"

# Servidor remoto
$SSH_USER = "root"
$SSH_HOST = "64.226.123.91"
$REMOTE_PATH = "/var/www/tienda_ecommerce_mean"
$SSH_KEY = "$env:USERPROFILE\.ssh\id_droplet"

$divider = "========================================================="

# ================= BANNER =================
Write-Host $divider -ForegroundColor $Magenta
Write-Host "##                                                     ##" -ForegroundColor $Magenta
Write-Host "##       DEPLOY ECOMMERCE                              ##" -ForegroundColor $Magenta
Write-Host "##                                                     ##" -ForegroundColor $Magenta
Write-Host $divider -ForegroundColor $Magenta
Write-Host "Iniciando proceso de Deploy de ECOMMERCE" -ForegroundColor $Yellow
Write-Host $divider -ForegroundColor $Blue

# ================= PASO 1: Guardar cambios locales =================
Write-Host "`nPASO 1: Guardar cambios en el repo local" -ForegroundColor $Cyan
git add .
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
git commit -m "Pre-Deploy commit $timestamp" 2>&1 | Out-Null
git push origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host "Cambios guardados y enviados a GitHub correctamente" -ForegroundColor $Green
} else {
    Write-Host "Error al guardar/enviar cambios a GitHub. Se detiene la ejecucion" -ForegroundColor $Red
    exit 1
}

# ================= PASO 2: Compilar Angular =================
Write-Host "`nPASO 2: Compilar proyecto Angular" -ForegroundColor $Cyan
ng build --configuration=production

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error en la compilacion de Angular. Se detiene la ejecucion" -ForegroundColor $Red
    exit 1
} else {
    Write-Host "Compilacion completada correctamente" -ForegroundColor $Green
}

# ================= PASO 2.5: Limpiar archivos de metadatos =================
Write-Host "`nLIMPIEZA: Eliminando archivos de metadatos" -ForegroundColor $Cyan
if (Test-Path $BUILD_DIR) {
    Get-ChildItem -Path $BUILD_DIR -Recurse -Force -Include "._*", ".DS_Store" | Remove-Item -Force -ErrorAction SilentlyContinue
    Write-Host "Archivos de metadatos eliminados" -ForegroundColor $Green
}

# ================= PASO 3: Sincronizar carpeta de deploy local =================
Write-Host "`nPASO 3: Sincronizar archivos con carpeta de deploy local" -ForegroundColor $Cyan

# Crear directorio de destino si no existe
if (-not (Test-Path $DEPLOY_DIR)) {
    New-Item -ItemType Directory -Path $DEPLOY_DIR -Force | Out-Null
}

# Limpiar carpeta destino
if (Test-Path $DEPLOY_DIR) {
    Get-ChildItem -Path $DEPLOY_DIR -Recurse | Remove-Item -Force -Recurse -ErrorAction SilentlyContinue
}

# Copiar archivos
Copy-Item -Path "$BUILD_DIR\*" -Destination $DEPLOY_DIR -Recurse -Force

if ($LASTEXITCODE -eq 0 -or $?) {
    Write-Host "Archivos sincronizados correctamente" -ForegroundColor $Green
} else {
    Write-Host "Error al sincronizar archivos. Se detiene la ejecucion" -ForegroundColor $Red
    exit 1
}

# ================= PASO 3.5: Verificacion final de limpieza =================
Write-Host "`nVERIFICACION: Limpieza final en carpeta de deploy" -ForegroundColor $Cyan
Get-ChildItem -Path $DEPLOY_DIR -Recurse -Force -Include "._*", ".DS_Store" | Remove-Item -Force -ErrorAction SilentlyContinue
Write-Host "Verificacion completada" -ForegroundColor $Green

# ================= PASO 4: Push final desde deploy local =================
Write-Host "`nPASO 4: Push final desde carpeta de deploy local" -ForegroundColor $Cyan
$deployParentDir = Split-Path $DEPLOY_DIR -Parent
Set-Location $deployParentDir
git add .
git commit -m "Deploy ECOMMERCE $timestamp" 2>&1 | Out-Null
git push origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host "Cambios de deploy local enviados a GitHub correctamente" -ForegroundColor $Green
} else {
    Write-Host "Error en push desde deploy local. Se detiene la ejecucion" -ForegroundColor $Red
    Set-Location $PROJECT_DIR
    exit 1
}

Set-Location $PROJECT_DIR

# ================= PASO 5: Pull automatico en servidor remoto =================
Write-Host "`nPASO 5: Actualizar servidor remoto" -ForegroundColor $Cyan
$pullCommand = "cd $REMOTE_PATH && git pull origin main"
ssh -i $SSH_KEY "${SSH_USER}@${SSH_HOST}" $pullCommand

if ($LASTEXITCODE -eq 0) {
    Write-Host "Servidor remoto actualizado correctamente" -ForegroundColor $Green
} else {
    Write-Host "Error al actualizar el servidor remoto. Se detiene la ejecucion" -ForegroundColor $Red
    exit 1
}

# ================= PASO 5.5: Limpieza final en servidor remoto =================
Write-Host "`nLIMPIEZA REMOTA: Eliminando archivos problematicos en servidor" -ForegroundColor $Cyan
$cleanCommand = "cd $REMOTE_PATH && find . -name '._*' -type f -delete 2>/dev/null || true; find . -name '.DS_Store' -type f -delete 2>/dev/null || true; systemctl reload nginx 2>/dev/null || service nginx reload 2>/dev/null || true"
ssh -i $SSH_KEY "${SSH_USER}@${SSH_HOST}" $cleanCommand

if ($LASTEXITCODE -eq 0) {
    Write-Host "Limpieza remota y recarga de nginx completadas" -ForegroundColor $Green
} else {
    Write-Host "Limpieza completada (nginx reload opcional fallo)" -ForegroundColor $Yellow
}

# ================= FIN =================
Write-Host "`n$divider" -ForegroundColor $Magenta
Write-Host "##                                                     ##" -ForegroundColor $Magenta
Write-Host "##    DEPLOY ECOMMERCE COMPLETADO                      ##" -ForegroundColor $Magenta
Write-Host "##       Todo actualizado y en produccion              ##" -ForegroundColor $Magenta
Write-Host "##          FELICIDADES                                ##" -ForegroundColor $Magenta
Write-Host "##                                                     ##" -ForegroundColor $Magenta
Write-Host $divider -ForegroundColor $Magenta
