@echo off
echo 🚀 INICIANDO PRUEBAS COMPLETAS DE MFH TOOLS
echo ===========================================

echo.
echo 📌 Probando MX-SCANNER...
cd tools\mx-scanner
python test_mxscanner.py
cd ..\..

echo.
echo 📌 Probando MX-ENCRYPT...
cd tools\mx-encrypt
python test_mxencrypt.py
cd ..\..

echo.
echo ✅ TODAS LAS PRUEBAS COMPLETADAS
pause
