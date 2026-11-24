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
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use 14.21.3

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
SSH_KEY="$HOME/.ssh/id_rsa_do"

divider="========================================================="

# ================= BANNER =================
echo -e "${MAGENTA}$divider${NC}"
echo -e "${MAGENTA}##                                                     ##${NC}"
echo -e "${MAGENTA}##       🚀🚀🚀 DEPLOY ECOMMERCE 🚀🚀🚀                ##${NC}"
echo -e "${MAGENTA}##                                                     ##${NC}"
echo -e "${MAGENTA}$divider${NC}"
echo -e "${YELLOW}🚀 Iniciando proceso de Deploy de ECOMMERCE${NC}"
echo -e "${BLUE}$divider${NC}"

# ================= PASO 1: Validar repositorio fuente =================
echo -e "\n${CYAN}1️⃣ PASO 1: Validar código fuente antes del despliegue${NC}"

if [ "$(git branch --show-current)" != "main" ]; then
  echo -e "${RED}❌ El despliegue requiere la rama main${NC}"
  exit 1
fi

if [ -n "$(git status --porcelain)" ]; then
  echo -e "${RED}❌ Existen cambios locales sin confirmar${NC}"
  exit 1
fi

if ! git fetch origin main; then
  echo -e "${RED}❌ No se pudo consultar origin/main${NC}"
  exit 1
fi

if [ "$(git rev-parse HEAD)" != "$(git rev-parse origin/main)" ]; then
  echo -e "${RED}❌ La rama main no está sincronizada con origin/main${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Código fuente validado${NC}"

# ================= PASO 2: Compilar Angular =================
echo -e "\n${CYAN}2️⃣ PASO 2: Compilar proyecto Angular${NC}"
./node_modules/.bin/ng build --configuration=production
if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Error en la compilación de Angular. Se detiene la ejecución${NC}"
  exit 1
else
  echo -e "${GREEN}✅ Compilación completada correctamente${NC}"
fi

# ================= PASO 2.1: Versionado automático de assets =================
echo -e "\n${CYAN}🔄 VERSIONADO: Actualizando referencias de assets${NC}"

if ! RELEASE_VERSION="$(git rev-parse --short=12 HEAD)"; then
  echo -e "${RED}❌ No se pudo obtener la versión${NC}"
  exit 1
fi

if ! node - "$BUILD_DIR/index.html" "$RELEASE_VERSION" <<'NODE'
const fs = require('fs');

const file = process.argv[2];
const version = process.argv[3];

let html = fs.readFileSync(file, 'utf8');
let count = 0;

html = html.replace(
  /((?:href|src)\s*=\s*["'])(assets\/[^"'?#]+\.(?:css|js))(["'])/gi,
  (_, prefix, asset, suffix) => {
    count++;
    console.log(`${asset}?v=${version}`);
    return `${prefix}${asset}?v=${version}${suffix}`;
  }
);

if (count === 0) {
  throw new Error('No se encontraron assets para versionar');
}

fs.writeFileSync(file, html, 'utf8');

console.log(`Release: ${version}`);
console.log(`Referencias versionadas: ${count}`);
NODE
then
  echo -e "${RED}❌ Error al versionar assets${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Assets versionados correctamente${NC}"

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
rsync -av --delete --exclude='._*' --exclude='.DS_Store' --filter='P ._*' --filter='P .DS_Store' "$BUILD_DIR/" "$DEPLOY_DIR/"
if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Error al sincronizar archivos. Se detiene la ejecución${NC}"
  exit 1
else
  echo -e "${GREEN}✅ Archivos sincronizados correctamente${NC}"
fi

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

# ================= FIN =================
echo -e "${MAGENTA}=========================================================${NC}"
echo -e "${MAGENTA}##                                                     ##${NC}"
echo -e "${MAGENTA}##    🎉🎉🎉 DEPLOY ECOMMERCE COMPLETADO 🎉🎉🎉        ##${NC}"
echo -e "${MAGENTA}##       ✅ Todo actualizado y en producción ✅        ##${NC}"
echo -e "${MAGENTA}##          🥳🚀🎊 FELICIDADES 🚀🎊🥳                  ##${NC}"
echo -e "${MAGENTA}##                                                     ##${NC}"
echo -e "${MAGENTA}=========================================================${NC}\n"

