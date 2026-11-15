#!/bin/bash

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[1;35m'
NC='\033[0m' # No Color

# ================= CONFIGURACIÓN DE NODE =================
# Cargar NVM y usar Node v14.21.3
export NVM_DIR="$HOME/.nvm"

if [ ! -s "$NVM_DIR/nvm.sh" ]; then
  echo -e "${RED}❌ No se encontró NVM${NC}"
  exit 1
fi

. "$NVM_DIR/nvm.sh"

if ! nvm use 14.21.3; then
  echo -e "${RED}❌ No se pudo activar Node.js 14.21.3${NC}"
  exit 1
fi

if [ "$(node -v)" != "v14.21.3" ]; then
  echo -e "${RED}❌ La versión activa de Node.js no es la esperada${NC}"
  exit 1
fi

echo -e "${CYAN}📦 Node version: $(node -v)${NC}"
echo -e "${CYAN}📦 NPM version: $(npm -v)${NC}"

# ================= CONFIGURACIÓN =================
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)" # Repo local ecommerce
cd "$PROJECT_DIR" || {
  echo -e "${RED}❌ No se pudo acceder al directorio del proyecto${NC}"
  exit 1
}
BUILD_DIR="dist/ecommerce"
DEPLOY_DIR="$HOME/Developer/LujanDev/deployment/ecommerce/ecommerce"

# Servidor remoto
SSH_USER="root"
SSH_HOST="64.226.123.91"
REMOTE_PATH="/var/www/tienda_ecommerce_mean"
SSH_KEY="$HOME/.ssh/id_ed25519"

divider="========================================================="

# ================= BANNER =================
echo -e "${MAGENTA}$divider${NC}"
echo -e "${MAGENTA}##                                                     ##${NC}"
echo -e "${MAGENTA}##       🚀🚀🚀 DEPLOY ECOMMERCE 🚀🚀🚀                ##${NC}"
echo -e "${MAGENTA}##                                                     ##${NC}"
echo -e "${MAGENTA}$divider${NC}"
echo -e "${YELLOW}🚀 Iniciando proceso de Deploy de ECOMMERCE${NC}"
echo -e "${BLUE}$divider${NC}"

# ================= PASO 1: Guardar y publicar código fuente =================
echo -e "\n${CYAN}1️⃣ PASO 1: Preparar código fuente Ecommerce${NC}"

if [ "$(git branch --show-current)" != "main" ]; then
  echo -e "${RED}❌ Solo se permite desplegar desde main${NC}"
  exit 1
fi

if ! git fetch origin main; then
  echo -e "${RED}❌ No se pudo consultar origin/main${NC}"
  exit 1
fi

if [ "$(git rev-parse HEAD)" != "$(git rev-parse origin/main)" ]; then
  echo -e "${RED}❌ main no está sincronizada con origin/main${NC}"
  exit 1
fi

if [ -n "$(git status --porcelain)" ]; then
  echo -e "${YELLOW}Archivos modificados:${NC}"
  git status --short

  read -r -p "¿Guardar y publicar estos cambios en main? [s/N]: " CONFIRM_SOURCE

  if [ "$CONFIRM_SOURCE" != "s" ]; then
    echo -e "${YELLOW}Operación cancelada${NC}"
    exit 1
  fi

  read -r -p "Mensaje del commit (Enter = Pre-Deploy Ecommerce): " COMMIT_MESSAGE
  COMMIT_MESSAGE=${COMMIT_MESSAGE:-"Pre-Deploy Ecommerce $(date '+%Y-%m-%d %H:%M:%S')"}

  if ! git add -A; then
    echo -e "${RED}❌ Error preparando los cambios${NC}"
    exit 1
  fi

  echo -e "${CYAN}Cambios preparados:${NC}"
  git diff --cached --stat

  if ! git diff --cached --quiet; then
    if ! git commit -m "$COMMIT_MESSAGE"; then
      echo -e "${RED}❌ Error creando el commit${NC}"
      exit 1
    fi

    if ! git push origin main; then
      echo -e "${RED}❌ Error publicando el código fuente${NC}"
      exit 1
    fi
  fi
fi

if [ -n "$(git status --porcelain)" ]; then
  echo -e "${RED}❌ El repositorio sigue teniendo cambios locales${NC}"
  exit 1
fi

if ! git fetch origin main; then
  exit 1
fi

if [ "$(git rev-parse HEAD)" != "$(git rev-parse origin/main)" ]; then
  echo -e "${RED}❌ Falló la verificación final de GitHub${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Código fuente limpio y publicado correctamente${NC}"

# ================= PASO 2: Compilar Angular =================
echo -e "\n${CYAN}2️⃣ PASO 2: Compilar proyecto Angular${NC}"
./node_modules/.bin/ng build --configuration=production
if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Error en la compilación de Angular. Se detiene la ejecución${NC}"
  exit 1
else
  echo -e "${GREEN}✅ Compilación completada correctamente${NC}"
fi

# ================= VALIDACIÓN DEL ARTEFACTO ANGULAR =================
if [ ! -d "$BUILD_DIR" ]; then
  echo -e "${RED}❌ No existe el directorio de compilación: $BUILD_DIR${NC}"
  exit 1
fi

if [ ! -s "$BUILD_DIR/index.html" ]; then
  echo -e "${RED}❌ Falta index.html o está vacío en la compilación${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Artefacto Angular validado${NC}"

# ================= PASO 2.5: Limpiar archivos de metadatos de macOS =================
echo -e "\n${CYAN}🧹 LIMPIEZA: Eliminando archivos de metadatos de macOS${NC}"
find "$BUILD_DIR" -name "._*" -type f -delete 2>/dev/null || true
find "$BUILD_DIR" -name ".DS_Store" -type f -delete 2>/dev/null || true
dot_clean "$BUILD_DIR" 2>/dev/null || true
echo -e "${GREEN}✅ Archivos de metadatos eliminados${NC}"

# ================= VALIDACIÓN PREVIA: Repositorio de distribución =================
DEPLOY_REPO="$(dirname "$DEPLOY_DIR")"

if [ ! -d "$DEPLOY_REPO/.git" ]; then
  echo -e "${RED}❌ No existe el repositorio Git de distribución${NC}"
  exit 1
fi

if [ "$(git -C "$DEPLOY_REPO" branch --show-current)" != "main" ]; then
  echo -e "${RED}❌ El repositorio de distribución no está en main${NC}"
  exit 1
fi

if [ -n "$(git -C "$DEPLOY_REPO" status --porcelain)" ]; then
  echo -e "${RED}❌ El repositorio de distribución contiene cambios locales${NC}"
  exit 1
fi

if ! git -C "$DEPLOY_REPO" fetch origin main; then
  echo -e "${RED}❌ No se pudo consultar el remoto de distribución${NC}"
  exit 1
fi

if [ "$(git -C "$DEPLOY_REPO" rev-parse HEAD)" != "$(git -C "$DEPLOY_REPO" rev-parse origin/main)" ]; then
  echo -e "${RED}❌ El repositorio de distribución no está sincronizado con origin/main${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Repositorio de distribución validado${NC}"

# ================= PASO 3: Sincronizar carpeta de deploy local =================
echo -e "\n${CYAN}3️⃣ PASO 3: Sincronizar archivos con carpeta de deploy local${NC}"

EXPECTED_BUILD_DIR="$PROJECT_DIR/dist/ecommerce"
EXPECTED_DEPLOY_DIR="$HOME/Developer/LujanDev/deployment/ecommerce/ecommerce"

if [ ! -d "$BUILD_DIR" ] || [ -L "$BUILD_DIR" ]; then
  echo -e "${RED}❌ El origen de compilación no existe o es un enlace simbólico${NC}"
  exit 1
fi

if ! RESOLVED_BUILD_DIR="$(cd "$BUILD_DIR" && pwd -P)"; then
  echo -e "${RED}❌ No se pudo resolver el origen de compilación${NC}"
  exit 1
fi

if [ "$RESOLVED_BUILD_DIR" != "$EXPECTED_BUILD_DIR" ]; then
  echo -e "${RED}❌ El origen de compilación no coincide con la ruta esperada${NC}"
  exit 1
fi

if [ ! -s "$BUILD_DIR/index.html" ]; then
  echo -e "${RED}❌ index.html no existe o está vacío${NC}"
  exit 1
fi

BUILD_FILE_COUNT="$(find "$BUILD_DIR" -type f | wc -l | tr -d ' ')"

if [ "$BUILD_FILE_COUNT" -lt 100 ]; then
  echo -e "${RED}❌ Número insuficiente de archivos en el artefacto: $BUILD_FILE_COUNT${NC}"
  exit 1
fi

if [ ! -d "$DEPLOY_DIR" ] || [ -L "$DEPLOY_DIR" ]; then
  echo -e "${RED}❌ El destino no existe o es un enlace simbólico${NC}"
  exit 1
fi

if ! RESOLVED_DEPLOY_DIR="$(cd "$DEPLOY_DIR" && pwd -P)"; then
  echo -e "${RED}❌ No se pudo resolver el destino${NC}"
  exit 1
fi

if [ "$RESOLVED_DEPLOY_DIR" != "$EXPECTED_DEPLOY_DIR" ]; then
  echo -e "${RED}❌ El destino no coincide con la ruta esperada${NC}"
  exit 1
fi

if [ "$RESOLVED_BUILD_DIR" = "$RESOLVED_DEPLOY_DIR" ]; then
  echo -e "${RED}❌ Origen y destino son idénticos${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Origen y destino validados${NC}"
echo -e "${CYAN}📦 Archivos de origen: $BUILD_FILE_COUNT${NC}"

echo -e "\n${CYAN}🔍 SIMULACIÓN DE SINCRONIZACIÓN (DRY-RUN)${NC}"

if ! rsync -avn --delete \
  --exclude='._*' \
  --exclude='.DS_Store' \
  --filter='P ._*' \
  --filter='P .DS_Store' \
  "$BUILD_DIR/" "$DEPLOY_DIR/"; then
  echo -e "${RED}❌ Falló la simulación de rsync${NC}"
  exit 1
fi

echo -e "\n${YELLOW}⚠️ La sincronización real utilizará --delete.${NC}"
echo -e "${YELLOW}⚠️ Revisa los archivos que se eliminarían antes de continuar.${NC}"

read -r -p "¿Confirmas la sincronización de Ecommerce? (s/N): " CONFIRM_DEPLOY

case "$CONFIRM_DEPLOY" in
  s|S|si|SI|Si|sí|Sí)
    ;;
  *)
    echo -e "${YELLOW}⚠️ Sincronización cancelada por el usuario${NC}"
    exit 1
    ;;
esac

if ! rsync -av --delete \
  --exclude='._*' \
  --exclude='.DS_Store' \
  --filter='P ._*' \
  --filter='P .DS_Store' \
  "$BUILD_DIR/" "$DEPLOY_DIR/"; then
  echo -e "${RED}❌ Error durante la sincronización${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Archivos sincronizados correctamente${NC}"

# ================= PASO 3.5: Verificación final de limpieza =================
echo -e "\n${CYAN}🔍 VERIFICACIÓN: Limpieza final en carpeta de deploy${NC}"
find "$DEPLOY_DIR" -name "._*" -type f -delete 2>/dev/null || true
find "$DEPLOY_DIR" -name ".DS_Store" -type f -delete 2>/dev/null || true
echo -e "${GREEN}✅ Verificación completada${NC}"

# ================= PASO 4: Push final desde deploy local =================
echo -e "\n${CYAN}4️⃣ PASO 4: Push final desde carpeta de deploy local${NC}"
cd "$(dirname "$DEPLOY_DIR")" || exit

# Actualizar referencias y comprobar errores antes de publicar
echo -e "${CYAN}📥 Sincronizando con remote...${NC}"
if ! git fetch origin main; then
  echo -e "${RED}❌ Error al consultar el remoto de distribución${NC}"
  exit 1
fi

if [ "$(git rev-parse HEAD)" != "$(git rev-parse origin/main)" ]; then
  echo -e "${RED}❌ El remoto de distribución ha cambiado durante el despliegue${NC}"
  exit 1
fi

# Publicar únicamente si existen cambios en la distribución
if ! git add -A -- ecommerce/; then
  echo -e "${RED}❌ Error al preparar los archivos de distribución${NC}"
  exit 1
fi

git diff --cached --quiet
DIFF_STATUS=$?

if [ "$DIFF_STATUS" -eq 0 ]; then
  echo -e "${GREEN}✅ No hay cambios de distribución que publicar${NC}"
elif [ "$DIFF_STATUS" -eq 1 ]; then
  if ! git commit -m "🚀 Deploy ECOMMERCE $(date '+%Y-%m-%d %H:%M:%S')"; then
    echo -e "${RED}❌ Error al crear el commit de distribución${NC}"
    exit 1
  fi

  if ! git push origin main; then
    echo -e "${RED}❌ Error al publicar la distribución en GitHub${NC}"
    exit 1
  fi

  echo -e "${GREEN}✅ Cambios de distribución publicados correctamente${NC}"
else
  echo -e "${RED}❌ Error al comprobar los cambios preparados para distribución${NC}"
  exit 1
fi

# ================= PASO 5: Pull automático en servidor remoto =================
echo -e "\n${CYAN}5️⃣ PASO 5: Actualizar servidor remoto${NC}"
ssh -i "$SSH_KEY" "$SSH_USER@$SSH_HOST" "
  cd '$REMOTE_PATH' || exit 1
  test -z \"\$(git status --porcelain)\" || {
    echo 'ERROR: El repositorio remoto contiene cambios locales'
    exit 1
  }
  test \"\$(git branch --show-current)\" = main || {
    echo 'ERROR: El repositorio remoto no está en main'
    exit 1
  }
  git fetch origin main || exit 1
  git merge --ff-only origin/main || exit 1
"
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ Servidor remoto actualizado correctamente${NC}"
else
  echo -e "${RED}❌ Error al actualizar el servidor remoto. Se detiene la ejecución${NC}"
  exit 1
fi

# ================= PASO 5.5: Limpieza y validación de Nginx =================
echo -e "\n${CYAN}🧹 LIMPIEZA REMOTA Y VALIDACIÓN DE NGINX${NC}"

if ssh -i "$SSH_KEY" "$SSH_USER@$SSH_HOST" "
  cd '$REMOTE_PATH' || exit 1

  find . -name '._*' -type f -delete || exit 1
  find . -name '.DS_Store' -type f -delete || exit 1

  nginx -t || exit 1
  if command -v systemctl >/dev/null 2>&1; then
    systemctl reload nginx || exit 1
  else
    service nginx reload || exit 1
  fi
"; then
  echo -e "${GREEN}✅ Limpieza y recarga de Nginx completadas${NC}"
else
  echo -e "${RED}❌ Error durante la limpieza o recarga de Nginx${NC}"
  exit 1
fi

# ================= PASO 6: Smoke test HTTPS =================
echo -e "\n${CYAN}🌐 Verificando disponibilidad HTTPS de Ecommerce${NC}"

ECOMMERCE_URL="https://tienda.lujandev.com/"

if ! HTTP_STATUS="$(curl -sS -L \
  --connect-timeout 10 \
  --max-time 20 \
  -o /dev/null \
  -w '%{http_code}' \
  "$ECOMMERCE_URL")"; then
  echo -e "${RED}❌ No se pudo consultar Ecommerce por HTTPS${NC}"
  exit 1
fi

if [ "$HTTP_STATUS" != "200" ]; then
  echo -e "${RED}❌ Ecommerce respondió HTTP $HTTP_STATUS (esperado: 200)${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Ecommerce responde HTTP 200 por HTTPS${NC}"

# ================= FIN =================
echo -e "${MAGENTA}=========================================================${NC}"
echo -e "${MAGENTA}##                                                     ##${NC}"
echo -e "${MAGENTA}##    🎉🎉🎉 DEPLOY ECOMMERCE COMPLETADO 🎉🎉🎉        ##${NC}"
echo -e "${MAGENTA}##       ✅ Todo actualizado y en producción ✅        ##${NC}"
echo -e "${MAGENTA}##          🥳🚀🎊 FELICIDADES 🚀🎊🥳                  ##${NC}"
echo -e "${MAGENTA}##                                                     ##${NC}"
echo -e "${MAGENTA}=========================================================${NC}\n"

