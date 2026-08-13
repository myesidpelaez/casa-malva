@echo off
chcp 65001 >nul
title Casa Malva — Servidor Local
cd /d "D:\MeJorIA\Proyectos\casa-malva"

echo [%date% %time%] Iniciando Casa Malva... >> server.log
where npm >> server.log 2>&1

if not exist ".next\BUILD_ID" (
  echo [%date% %time%] Compilando (sin build previo)... >> server.log
  call "C:\Program Files\nodejs\npm.cmd" run build >> server.log 2>&1
)

echo [%date% %time%] npm start -H 0.0.0.0 -p 3000 >> server.log
call "C:\Program Files\nodejs\npm.cmd" start -- -H 0.0.0.0 -p 3000 >> server.log 2>&1
echo [%date% %time%] Servidor detenido >> server.log
pause
