#!/bin/bash
# Script para correr todas las pruebas
# Guardar como run_all_tests.sh y dar permisos: chmod +x run_all_tests.sh

echo "🚀 INICIANDO PRUEBAS COMPLETAS DE MFH TOOLS"
echo "==========================================="

# Probar MX-SCANNER
echo -e "\n📌 Probando MX-SCANNER..."
cd tools/mx-scanner/
python3 test_mxscanner.py
cd ../..

# Probar MX-ENCRYPT
echo -e "\n📌 Probando MX-ENCRYPT..."
cd tools/mx-encrypt/
python3 test_mxencrypt.py
cd ../..

echo -e "\n✅ TODAS LAS PRUEBAS COMPLETADAS"
