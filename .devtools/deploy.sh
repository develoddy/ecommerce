#!/bin/bash

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[1;35m'
NC='\033[0m' # No Color

# ================= CONFIGURACIÓN =================
PROJECT_DIR="$(pwd)" # Repo local ecommerce
BUILD_DIR="dist/ecommerce"
DEPLOY_DIR="/Volumes/lujandev/dev/projects/ECOMMERCE/ECOMMERCE-RECURSOS/PRO-DIST/ecommerce_deploy/ecommerce"

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

# ================= PASO 1: Guardar cambios locales =================
echo -e "\n${CYAN}1️⃣ PASO 1: Guardar cambios en el repo local${NC}"
git add .
git commit -m "💾 Pre-Deploy commit $(date '+%Y-%m-%d %H:%M:%S')" >/dev/null 2>&1
git push origin main
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ Cambios guardados y enviados a GitHub correctamente${NC}"
else
  echo -e "${RED}❌ Error al guardar/enviar cambios a GitHub. Se detiene la ejecución${NC}"
  exit 1
fi

# ================= PASO 2: Compilar Angular =================
echo -e "\n${CYAN}2️⃣ PASO 2: Compilar proyecto Angular${NC}"
ng build --configuration=production
if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Error en la compilación de Angular. Se detiene la ejecución${NC}"
  exit 1
else
  echo -e "${GREEN}✅ Compilación completada correctamente${NC}"
fi

# ================= PASO 3: Sincronizar carpeta de deploy local =================
echo -e "\n${CYAN}3️⃣ PASO 3: Sincronizar archivos con carpeta de deploy local${NC}"
rsync -a --delete --exclude='._*' "$BUILD_DIR/" "$DEPLOY_DIR/"
if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Error al sincronizar archivos. Se detiene la ejecución${NC}"
  exit 1
else
  echo -e "${GREEN}✅ Archivos sincronizados correctamente${NC}"
fi

# ================= PASO 4: Push final desde deploy local =================
echo -e "\n${CYAN}4️⃣ PASO 4: Push final desde carpeta de deploy local${NC}"
cd "$(dirname "$DEPLOY_DIR")" || exit
git add .
git commit -m "🚀 Deploy ECOMMERCE $(date '+%Y-%m-%d %H:%M:%S')" >/dev/null 2>&1
git push origin main
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ Cambios de deploy local enviados a GitHub correctamente${NC}"
else
  echo -e "${RED}❌ Error en push desde deploy local. Se detiene la ejecución${NC}"
  exit 1
fi

# ================= PASO 5: Pull automático en servidor remoto =================
echo -e "\n${CYAN}5️⃣ PASO 5: Actualizar servidor remoto${NC}"
ssh -i "$SSH_KEY" "$SSH_USER@$SSH_HOST" "cd $REMOTE_PATH && git pull origin main"
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ Servidor remoto actualizado correctamente${NC}"
else
  echo -e "${RED}❌ Error al actualizar el servidor remoto. Se detiene la ejecución${NC}"
  exit 1
fi

# ================= FIN =================
echo -e "${MAGENTA}$divider${NC}"
echo -e "${GREEN}🎉 DEPLOY ECOMMERCE completado con éxito!${NC}"
echo -e "${MAGENTA}$divider${NC}\n"
