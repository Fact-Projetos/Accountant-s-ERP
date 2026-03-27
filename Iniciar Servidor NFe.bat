@echo off
title Fact ERP - Servidor de Automacao NFe/NFS-e
echo ===============================================
echo   Fact ERP - Servidor de Automacao
echo   NFe (Manifestacao) + NFS-e (Robo)
echo ===============================================
echo.

cd /d "%~dp0automation-server"

echo [1/2] Verificando dependencias...
if not exist "node_modules" (
    echo Instalando dependencias... Aguarde...
    call npm install
    echo.
)

echo [2/2] Iniciando servidor na porta 3099...
echo.
echo Mantenha esta janela ABERTA enquanto usa o sistema.
echo Para encerrar, feche esta janela ou pressione Ctrl+C.
echo.
echo ===============================================
node server.js
pause
