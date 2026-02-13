#!/usr/bin/env python3
# Script de prueba para MX-SCANNER
# Cópialo y pégalo en tools/mx-scanner/test_mxscanner.py

import subprocess
import sys
import os

print("""
╔══════════════════════════════════════════╗
║  🔍 MX-SCANNER - PRUEBA RÁPIDA          ║
║  Escaneando localhost (127.0.0.1)       ║
╚══════════════════════════════════════════╝
""")

# Ejecutar escáner en localhost
cmd = [sys.executable, "mx_scanner.py", "-t", "127.0.0.1", "-p", "1-100", "--threads", "50"]

try:
    subprocess.run(cmd)
    print("\n✅ Prueba completada. Revisa los resultados arriba.")
except Exception as e:
    print(f"❌ Error: {e}")
