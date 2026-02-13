#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
MX-ENCRYPT v1.0 - Suite de Cifrado Profesional
Hecho en México 🇲🇽 por MFH TOOLS SECURITY MX
"Cifra como los grandes, pero con más sazón"
"""

import os
import sys
import hashlib
import base64
from datetime import datetime
import argparse

# Colores bien chingones
class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    END = '\033[0m'
    BOLD = '\033[1m'
    ORANGE = '\033[38;5;208m'
    MEXICO_GREEN = '\033[38;5;34m'
    MEXICO_RED = '\033[38;5;196m'

# Intentar importar crypto (con mensaje si no está)
try:
    from cryptography.fernet import Fernet
    from cryptography.hazmat.primitives import hashes
    from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2
    CRYPTO_AVAILABLE = True
except ImportError:
    CRYPTO_AVAILABLE = False

try:
    from Crypto.PublicKey import RSA
    from Crypto.Cipher import PKCS1_OAEP
    from Crypto.Signature import pkcs1_15
    from Crypto.Hash import SHA256
    PYCRYPTO_AVAILABLE = True
except ImportError:
    PYCRYPTO_AVAILABLE = False

# ========== BANNER ==========
def show_banner():
    banner = f"""
{Colors.ORANGE}╔══════════════════════════════════════════════════════════╗
║                                                              ║
║   {Colors.MEXICO_GREEN}███╗   ███╗██╗  ██╗    ███████╗███╗   ██╗{Colors.ORANGE}         ║
║   {Colors.MEXICO_GREEN}████╗ ████║╚██╗██╔╝    ██╔════╝████╗  ██║{Colors.ORANGE}         ║
║   {Colors.MEXICO_GREEN}██╔████╔██║ ╚███╔╝     █████╗  ██╔██╗ ██║{Colors.ORANGE}         ║
║   {Colors.MEXICO_GREEN}██║╚██╔╝██║ ██╔██╗     ██╔══╝  ██║╚██╗██║{Colors.ORANGE}         ║
║   {Colors.MEXICO_GREEN}██║ ╚═╝ ██║██╔╝ ██╗    ███████╗██║ ╚████║{Colors.ORANGE}         ║
║   {Colors.MEXICO_GREEN}╚═╝     ╚═╝╚═╝  ╚═╝    ╚══════╝╚═╝  ╚═══╝{Colors.ORANGE}         ║
║                                                              ║
║   {Colors.MEXICO_WHITE}MX-ENCRYPT v1.0 - Suite de Cifrado Profesional{Colors.ORANGE}       ║
║   {Colors.MEXICO_GREEN}Hecho en México 🇲🇽 - Cifra como los grandes{Colors.ORANGE}          ║
║   {Colors.CYAN}MFH TOOLS SECURITY MX - Más seguro que el águila{Colors.ORANGE}             ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝{Colors.END}
    """
    print(banner)

# ========== FUNCIONES DE ARCHIVOS ==========
def check_dependencies():
    """Verifica que las dependencias estén instaladas"""
    if not CRYPTO_AVAILABLE:
        print(f"{Colors.WARNING}[!] Advertencia: cryptography no instalado{Colors.END}")
        print(f"{Colors.CYAN}[*] Instalar con: pip install cryptography{Colors.END}")
    
    if not PYCRYPTO_AVAILABLE:
        print(f"{Colors.WARNING}[!] Advertencia: pycryptodome no instalado{Colors.END}")
        print(f"{Colors.CYAN}[*] Instalar con: pip install pycryptodome{Colors.END}")
    
    if not CRYPTO_AVAILABLE and not PYCRYPTO_AVAILABLE:
        print(f"{Colors.FAIL}[!] Error: No hay librerías de cifrado instaladas{Colors.END}")
        return False
    return True

# ========== CIFRADO AES (Fernet) ==========
def generate_key(password: str, salt: bytes = None):
    """Genera una llave a partir de una contraseña"""
    if salt is None:
        salt = os.urandom(16)
    kdf = PBKDF2(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=100000,
    )
    key = base64.urlsafe_b64encode(kdf.derive(password.encode()))
    return key, salt

def encrypt_file_aes(input_file, output_file, password):
    """Cifra un archivo usando AES-256 (Fernet)"""
    if not CRYPTO_AVAILABLE:
        print(f"{Colors.FAIL}[!] cryptography no instalado. Usa: pip install cryptography{Colors.END}")
        return False
    
    from cryptography.fernet import Fernet
    
    try:
        # Generar llave
        salt = os.urandom(16)
        key, _ = generate_key(password, salt)
        f = Fernet(key)
        
        # Leer y cifrar
        with open(input_file, 'rb') as f_in:
            data = f_in.read()
        
        encrypted = f.encrypt(data)
        
        # Guardar: salt + datos cifrados
        with open(output_file, 'wb') as f_out:
            f_out.write(salt + encrypted)
        
        print(f"{Colors.GREEN}[✓] Archivo cifrado: {output_file}{Colors.END}")
        return True
    except Exception as e:
        print(f"{Colors.FAIL}[!] Error cifrando: {e}{Colors.END}")
        return False

def decrypt_file_aes(input_file, output_file, password):
    """Descifra un archivo usando AES-256 (Fernet)"""
    if not CRYPTO_AVAILABLE:
        print(f"{Colors.FAIL}[!] cryptography no instalado. Usa: pip install cryptography{Colors.END}")
        return False
    
    from cryptography.fernet import Fernet
    
    try:
        # Leer salt y datos
        with open(input_file, 'rb') as f_in:
            salt = f_in.read(16)
            encrypted = f_in.read()
        
        # Regenerar llave
        kdf = PBKDF2(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
        )
        key = base64.urlsafe_b64encode(kdf.derive(password.encode()))
        f = Fernet(key)
        
        # Descifrar
        decrypted = f.decrypt(encrypted)
        
        # Guardar
        with open(output_file, 'wb') as f_out:
            f_out.write(decrypted)
        
        print(f"{Colors.GREEN}[✓] Archivo descifrado: {output_file}{Colors.END}")
        return True
    except Exception as e:
        print(f"{Colors.FAIL}[!] Error descifrando: {e}{Colors.END}")
        return False

# ========== HASHING ==========
def calculate_hash(text, algorithm='sha256'):
    """Calcula el hash de un texto"""
    text_bytes = text.encode()
    
    if algorithm.lower() == 'md5':
        return hashlib.md5(text_bytes).hexdigest()
    elif algorithm.lower() == 'sha1':
        return hashlib.sha1(text_bytes).hexdigest()
    elif algorithm.lower() == 'sha256':
        return hashlib.sha256(text_bytes).hexdigest()
    elif algorithm.lower() == 'sha512':
        return hashlib.sha512(text_bytes).hexdigest()
    else:
        return None

def hash_file(filename, algorithm='sha256'):
    """Calcula el hash de un archivo"""
    hash_func = None
    if algorithm.lower() == 'md5':
        hash_func = hashlib.md5()
    elif algorithm.lower() == 'sha1':
        hash_func = hashlib.sha1()
    elif algorithm.lower() == 'sha256':
        hash_func = hashlib.sha256()
    elif algorithm.lower() == 'sha512':
        hash_func = hashlib.sha512()
    else:
        return None
    
    try:
        with open(filename, 'rb') as f:
            for chunk in iter(lambda: f.read(4096), b''):
                hash_func.update(chunk)
        return hash_func.hexdigest()
    except:
        return None

# ========== RSA ==========
def generate_rsa_keys(bits=2048):
    """Genera par de llaves RSA"""
    if not PYCRYPTO_AVAILABLE:
        print(f"{Colors.FAIL}[!] pycryptodome no instalado. Usa: pip install pycryptodome{Colors.END}")
        return None, None
    
    key = RSA.generate(bits)
    private_key = key.export_key()
    public_key = key.publickey().export_key()
    return private_key, public_key

def encrypt_rsa(data, public_key):
    """Cifra datos con llave pública RSA"""
    if not PYCRYPTO_AVAILABLE:
        return None
    
    key = RSA.import_key(public_key)
    cipher = PKCS1_OAEP.new(key)
    return cipher.encrypt(data)

def decrypt_rsa(data, private_key):
    """Descifra datos con llave privada RSA"""
    if not PYCRYPTO_AVAILABLE:
        return None
    
    key = RSA.import_key(private_key)
    cipher = PKCS1_OAEP.new(key)
    return cipher.decrypt(data)

# ========== CIFRADO DE TEXTO RÁPIDO ==========
def quick_encrypt(text, password):
    """Cifrado rápido de texto usando AES simple"""
    if not CRYPTO_AVAILABLE:
        return None
    
    from cryptography.fernet import Fernet
    
    # Derivar llave
    key = base64.urlsafe_b64encode(hashlib.sha256(password.encode()).digest())
    f = Fernet(key)
    
    # Cifrar
    encrypted = f.encrypt(text.encode())
    return base64.b64encode(encrypted).decode()

def quick_decrypt(encrypted_text, password):
    """Descifrado rápido de texto"""
    if not CRYPTO_AVAILABLE:
        return None
    
    from cryptography.fernet import Fernet
    
    try:
        key = base64.urlsafe_b64encode(hashlib.sha256(password.encode()).digest())
        f = Fernet(key)
        decrypted = f.decrypt(base64.b64decode(encrypted_text))
        return decrypted.decode()
    except:
        return None

# ========== MENÚ PRINCIPAL ==========
def show_menu():
    print(f"\n{Colors.BOLD}{Colors.CYAN}════════════════════════════════════════════════{Colors.END}")
    print(f"{Colors.BOLD}              MENÚ PRINCIPAL MX-ENCRYPT{Colors.END}")
    print(f"{Colors.BOLD}{Colors.CYAN}════════════════════════════════════════════════{Colors.END}\n")
    
    print(f"{Colors.GREEN}1.{Colors.END} 🔐 Cifrar archivo (AES-256)")
    print(f"{Colors.GREEN}2.{Colors.END} 🔓 Descifrar archivo")
    print(f"{Colors.GREEN}3.{Colors.END} 🔑 Calcular hash (MD5/SHA1/SHA256)")
    print(f"{Colors.GREEN}4.{Colors.END} 📝 Cifrado rápido de texto")
    print(f"{Colors.GREEN}5.{Colors.END} 🔏 Generar llaves RSA")
    print(f"{Colors.GREEN}6.{Colors.END} 📂 Hash de archivo")
    print(f"{Colors.GREEN}7.{Colors.END} ℹ️  Verificar dependencias")
    print(f"{Colors.GREEN}0.{Colors.END} 🚪 Salir")
    print()

def main():
    show_banner()
    
    while True:
        show_menu()
        choice = input(f"{Colors.BOLD}Selecciona una opción: {Colors.END}").strip()
        
        if choice == '1':
            # Cifrar archivo
            input_file = input("Archivo a cifrar: ").strip()
            if not os.path.exists(input_file):
                print(f"{Colors.FAIL}[!] Archivo no encontrado{Colors.END}")
                continue
            
            output_file = input("Archivo de salida (Enter para nombre automático): ").strip()
            if not output_file:
                output_file = input_file + ".encrypted"
            
            password = input("Contraseña: ").strip()
            encrypt_file_aes(input_file, output_file, password)
        
        elif choice == '2':
            # Descifrar archivo
            input_file = input("Archivo cifrado: ").strip()
            if not os.path.exists(input_file):
                print(f"{Colors.FAIL}[!] Archivo no encontrado{Colors.END}")
                continue
            
            output_file = input("Archivo de salida (Enter para nombre automático): ").strip()
            if not output_file:
                if input_file.endswith('.encrypted'):
                    output_file = input_file[:-10]
                else:
                    output_file = input_file + ".decrypted"
            
            password = input("Contraseña: ").strip()
            decrypt_file_aes(input_file, output_file, password)
        
        elif choice == '3':
            # Hash de texto
            text = input("Texto a hashear: ").strip()
            print(f"\n{Colors.CYAN}Algoritmos disponibles: md5, sha1, sha256, sha512{Colors.END}")
            algo = input("Algoritmo [sha256]: ").strip() or 'sha256'
            
            result = calculate_hash(text, algo)
            if result:
                print(f"\n{Colors.GREEN}[✓] Hash {algo.upper()}:{Colors.END}")
                print(result)
            else:
                print(f"{Colors.FAIL}[!] Algoritmo no válido{Colors.END}")
        
        elif choice == '4':
            # Cifrado rápido de texto
            if not CRYPTO_AVAILABLE:
                print(f"{Colors.FAIL}[!] cryptography no instalado{Colors.END}")
                continue
            
            print(f"\n{Colors.CYAN}1. Cifrar texto{Colors.END}")
            print(f"{Colors.CYAN}2. Descifrar texto{Colors.END}")
            subchoice = input("Elige: ").strip()
            
            if subchoice == '1':
                text = input("Texto a cifrar: ").strip()
                password = input("Contraseña: ").strip()
                result = quick_encrypt(text, password)
                if result:
                    print(f"\n{Colors.GREEN}[✓] Texto cifrado:{Colors.END}")
                    print(result)
            elif subchoice == '2':
                encrypted = input("Texto cifrado: ").strip()
                password = input("Contraseña: ").strip()
                result = quick_decrypt(encrypted, password)
                if result:
                    print(f"\n{Colors.GREEN}[✓] Texto descifrado:{Colors.END}")
                    print(result)
                else:
                    print(f"{Colors.FAIL}[!] Error descifrando (¿contraseña incorrecta?){Colors.END}")
        
        elif choice == '5':
            # Generar RSA
            if not PYCRYPTO_AVAILABLE:
                print(f"{Colors.FAIL}[!] pycryptodome no instalado{Colors.END}")
                continue
            
            bits = input("Tamaño de llave [2048]: ").strip() or '2048'
            try:
                bits = int(bits)
                private, public = generate_rsa_keys(bits)
                
                # Guardar llaves
                with open("private_key.pem", 'wb') as f:
                    f.write(private)
                with open("public_key.pem", 'wb') as f:
                    f.write(public)
                
                print(f"{Colors.GREEN}[✓] Llaves RSA generadas:{Colors.END}")
                print(f"   - Privada: private_key.pem")
                print(f"   - Pública: public_key.pem")
            except:
                print(f"{Colors.FAIL}[!] Error generando llaves{Colors.END}")
        
        elif choice == '6':
            # Hash de archivo
            filename = input("Archivo: ").strip()
            if not os.path.exists(filename):
                print(f"{Colors.FAIL}[!] Archivo no encontrado{Colors.END}")
                continue
            
            print(f"\n{Colors.CYAN}Algoritmos disponibles: md5, sha1, sha256, sha512{Colors.END}")
            algo = input("Algoritmo [sha256]: ").strip() or 'sha256'
            
            result = hash_file(filename, algo)
            if result:
                print(f"\n{Colors.GREEN}[✓] Hash {algo.upper()} del archivo:{Colors.END}")
                print(result)
            else:
                print(f"{Colors.FAIL}[!] Error calculando hash{Colors.END}")
        
        elif choice == '7':
            # Verificar dependencias
            check_dependencies()
        
        elif choice == '0':
            print(f"\n{Colors.GREEN}¡Nos vemos, mi compa! 🥚🔥{Colors.END}")
            break
        
        else:
            print(f"{Colors.WARNING}[!] Opción no válida{Colors.END}")
        
        input(f"\n{Colors.CYAN}Presiona Enter para continuar...{Colors.END}")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print(f"\n\n{Colors.GREEN}¡Hasta luego, mi compa! 🥚🔥{Colors.END}")
        sys.exit(0)
