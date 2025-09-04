#!/bin/bash

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Rutas
PROJECT_DIR="$(pwd)" # Asumiendo que estás dentro de ecommerce/
BUILD_DIR="dist/ecommerce"
DEPLOY_DIR="/Volumes/lujandev/dev/projects/ECOMMERCE/ECOMMERCE-RECURSOS/PRO-DIST/ecommerce_deploy/ecommerce"

divider="---------------------------------------------------------"

# Banner ASCII
echo -e "${CYAN}
██████╗ ███████╗██████╗ ██╗   ██╗ ██████╗ ██╗   ██╗███████╗
██╔══██╗██╔════╝██╔══██╗██║   ██║██╔═══██╗██║   ██║██╔════╝
██████╔╝█████╗  ██████╔╝██║   ██║██║   ██║██║   ██║█████╗  
██╔═══╝ ██╔══╝  ██╔═══╝ ██║   ██║██║   ██║██║   ██║██╔══╝  
██║     ███████╗██║     ╚██████╔╝╚██████╔╝╚██████╔╝███████╗
╚═╝     ╚══════╝╚═╝      ╚═════╝  ╚═════╝  ╚═════╝ ╚══════╝
                 >>> DEPLOY ECOMMERCE <<<
${NC}"
echo -e "${BLUE}$divider${NC}"
echo -e "🚀 ${YELLOW}Iniciando proceso de Deploy de ECOMMERCE${NC}"
echo -e "${BLUE}$divider${NC}"

# 1️⃣ Guardar cambios en el repo del proyecto Angular
echo -e "\n${CYAN}>>> 💾 Guardando cambios en repo de ecommerce...${NC}"
git add .
git commit -m "💾 Pre-Deploy commit $(date '+%Y-%m-%d %H:%M:%S')" >/dev/null 2>&1
git push origin main
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ Cambios guardados y enviados a GitHub correctamente${NC}"
else
  echo -e "${RED}❌ Error al guardar/enviar cambios a GitHub. Se detiene la ejecución${NC}"
  exit 1
fi

# 2️⃣ Compilar Angular
echo -e "\n${CYAN}>>> 🛠️ Construyendo proyecto Angular...${NC}"
ng build --configuration=production
if [ $? -ne 0 ]; then
  echo -e "\n${RED}❌ Error en la compilación de Angular. Se detiene la ejecución${NC}"
  exit 1
else
  echo -e "${GREEN}✅ Compilación Angular completada correctamente${NC}"
fi

# 3️⃣ Sincronizar archivos con la carpeta de deploy
echo -e "\n${CYAN}>>> 📂 Sincronizando archivos con la carpeta de deploy...${NC}"
rsync -a --delete --exclude='._*' "$BUILD_DIR/" "$DEPLOY_DIR/"
if [ $? -ne 0 ]; then
  echo -e "\n${RED}❌ Error al copiar los archivos con rsync. Se detiene la ejecución${NC}"
  exit 1
else
  echo -e "${GREEN}✅ Archivos sincronizados correctamente${NC}"
fi

# 4️⃣ Git push final en carpeta de deploy (opcional)
echo -e "\n${CYAN}>>> 📤 Subiendo cambios a GitHub desde deploy...${NC}"
cd "$(dirname "$DEPLOY_DIR")" || exit
git add .
git commit -m "🚀 Deploy ECOMMERCE $(date '+%Y-%m-%d %H:%M:%S')" >/dev/null 2>&1
git push origin main
if [ $? -eq 0 ]; then
  echo -e "\n${GREEN}$divider${NC}"
  echo -e "✅ ${GREEN}DEPLOY ECOMMERCE completado y enviado a GitHub${NC}"
  echo -e "👉 ${YELLOW}Ahora entra al servidor y ejecuta:${NC} ${CYAN}git pull origin main${NC}"
  echo -e "${GREEN}$divider${NC}\n"
else
  echo -e "\n${RED}❌ Error al hacer push a GitHub desde deploy. Se detiene la ejecución${NC}"
  exit 1
fi
