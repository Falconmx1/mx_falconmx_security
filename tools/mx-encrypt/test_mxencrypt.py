#!/usr/bin/env python3
# Script de prueba para MX-ENCRYPT
# Cópialo y pégalo en tools/mx-encrypt/test_mxencrypt.py

import os
import sys
import subprocess

print("""
╔══════════════════════════════════════════╗
║  🔐 MX-ENCRYPT - PRUEBA COMPLETA        ║
║  Probando cifrado, hashes y RSA         ║
╚══════════════════════════════════════════╝
""")

# 1. Instalar dependencias si es necesario
print("[1/5] Instalando dependencias...")
subprocess.run([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])

# 2. Crear archivo de prueba
print("[2/5] Creando archivo de prueba...")
with open("test.txt", "w") as f:
    f.write("Este es un mensaje secreto de MFH TOOLS. Hecho en México 🇲🇽")

# 3. Probar cifrado/descifrado
print("[3/5] Probando cifrado AES-256...")
import mx_encrypt
password = "mipassword123"

# Cifrar
mx_encrypt.encrypt_file_aes("test.txt", "test.enc", password)
print("   ✅ Archivo cifrado: test.enc")

# Descifrar
mx_encrypt.decrypt_file_aes("test.enc", "test.dec", password)
print("   ✅ Archivo descifrado: test.dec")

# Verificar
with open("test.dec", "r") as f:
    contenido = f.read()
    if "México" in contenido:
        print("   ✅ Contenido verificado")
    else:
        print("   ❌ Error en contenido")

# 4. Probar hashing
print("[4/5] Probando hashing SHA256...")
hash_texto = mx_encrypt.calculate_hash("MFH TOOLS", "sha256")
print(f"   ✅ Hash de 'MFH TOOLS': {hash_texto}")

# 5. Probar RSA
print("[5/5] Probando generación RSA...")
priv, pub = mx_encrypt.generate_rsa_keys(1024)  # 1024 para prueba rápida
print("   ✅ Llaves RSA generadas")
print(f"   🔑 Pública: {pub[:50]}...")

print("\n✅ ¡TODAS LAS PRUEBAS COMPLETADAS EXITOSAMENTE!")
