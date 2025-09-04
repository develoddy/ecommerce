npm cache clean --force

@echo off
chcp 65001 > nul
title 🚀 Iniciando Ecommerce Angular Lujandev
color 0A

REM -------------------------------
REM Cambiar a la carpeta del ecommerce Angular
REM -------------------------------
cd /d C:\laragon\www\ecommerce\e-commerce_mean\ecommerce

REM -------------------------------
REM Seleccionar Node.js versión 14 para compatibilidad con Angular 12
REM -------------------------------
echo Usando Node.js 14 LTS para compatibilidad con Angular 12...
nvm use 14.21.3

REM -------------------------------
REM Eliminar node_modules si existe
REM -------------------------------
if exist node_modules (
    echo Eliminando carpeta node_modules...
    rd /s /q node_modules
) else (
    echo No existe node_modules
)

REM -------------------------------
REM Eliminar package-lock.json si existe
REM -------------------------------
if exist package-lock.json (
    echo Eliminando package-lock.json...
    del /f /q package-lock.json
) else (
    echo No existe package-lock.json
)

REM -------------------------------
REM Instalar dependencias con legacy-peer-deps
REM -------------------------------
echo Instalando dependencias con npm install --legacy-peer-deps...
npm install --legacy-peer-deps

REM -------------------------------
REM Ejecutar Angular en modo desarrollo
REM -------------------------------
echo Iniciando servidor Ecommerce - Angular con ng serve...
ng serve --host 0.0.0.0 --port 4200 --open

REM -------------------------------
REM Fin del script
REM -------------------------------
echo.
echo ✅ Script finalizado.
