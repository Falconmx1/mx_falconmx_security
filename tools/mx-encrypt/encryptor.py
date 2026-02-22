#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MX-ENCRYPT v1.0 - Suite de cifrado mexa profesional
Hecho en México 🇲🇽 - AES-256 + RSA - Por los compas, para los compas
"""

import os
import sys
import base64
import argparse
from pathlib import Path
from colorama import init, Fore, Style

# Inicializar colorama para colores en consola
init(autoreset=True)

# Criptografía bien cabrona
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.backends import default_backend
import secrets
import hashlib

VERSION = "1.0"
BANNER = f"""
{Fore.RED}╔══════════════════════════════════════════════════════════╗
║     {Fore.WHITE}MX-ENCRYPT v{VERSION} - HECHO EN MÉXICO {Fore.RED}                     ║
║     {Fore.YELLOW}La neta del cifrado profesional AES-256 + RSA {Fore.RED}           ║
║     {Fore.GREEN}Desarrollado en CDMX - Como los tlacoyos pero criptográfico {Fore.RED} ║
╚══════════════════════════════════════════════════════════╝{Style.RESET_ALL}
"""

class MXEncrypt:
    def __init__(self):
        self.backend = default_backend()
        self.SALT_SIZE = 32  # bytes para la sal
        self.KEY_SIZE = 32    # 32 bytes = AES-256
        self.ITERATIONS = 100000  # Iteraciones PBKDF2
        
    def generar_llave_desde_password(self, password: str, salt: bytes = None) -> tuple:
        """
        Genera una llave AES-256 a partir de una contraseña
        Si no se proporciona sal, genera una nueva
        """
        if salt is None:
            salt = secrets.token_bytes(self.SALT_SIZE)
        
        # Usar PBKDF2 para derivar la llave
        kdf = PBKDF2(
            algorithm=hashes.SHA256(),
            length=self.KEY_SIZE,
            salt=salt,
            iterations=self.ITERATIONS,
            backend=self.backend
        )
        key = kdf.derive(password.encode())
        return key, salt
    
    def generar_llave_aleatoria(self) -> bytes:
        """Genera una llave AES-256 completamente aleatoria"""
        return secrets.token_bytes(self.KEY_SIZE)
    
    def cifrar_archivo(self, archivo_entrada: str, password: str = None, llave: bytes = None) -> str:
        """
        Cifra un archivo usando AES-256 en modo GCM (autenticado)
        Retorna la ruta del archivo cifrado (.enc)
        """
        print(f"{Fore.CYAN}[+] Cifrando archivo: {archivo_entrada}{Style.RESET_ALL}")
        
        # Validar que el archivo existe
        if not os.path.exists(archivo_entrada):
            raise FileNotFoundError(f"No existe el archivo: {archivo_entrada}")
        
        # Generar o usar llave proporcionada
        if llave is None and password is None:
            raise ValueError("Necesitas proporcionar una contraseña o una llave")
        
        # Preparar componentes de cifrado
        if password:
            salt = secrets.token_bytes(self.SALT_SIZE)
            llave, _ = self.generar_llave_desde_password(password, salt)
        else:
            salt = b''  # Sin sal si usamos llave directa
        
        # Generar IV (nonce) para GCM
        iv = secrets.token_bytes(12)  # 96 bits recomendado para GCM
        
        # Crear cifrador AES-256-GCM
        cipher = Cipher(
            algorithms.AES(llave),
            modes.GCM(iv),
            backend=self.backend
        )
        encryptor = cipher.encryptor()
        
        # Leer y cifrar el archivo
        archivo_salida = archivo_entrada + '.enc'
        with open(archivo_entrada, 'rb') as f_in:
            with open(archivo_salida, 'wb') as f_out:
                # Escribir metadata: [salt (32)][iv (12)][tag (16)]
                f_out.write(len(salt).to_bytes(1, 'big'))
                if salt:
                    f_out.write(salt)
                f_out.write(iv)
                
                # Cifrar y escribir datos
                while True:
                    chunk = f_in.read(64 * 1024)  # 64KB chunks
                    if not chunk:
                        break
                    f_out.write(encryptor.update(chunk))
                
                # Finalizar y obtener tag de autenticación
                encryptor.finalize()
                f_out.write(encryptor.tag)
        
        print(f"{Fore.GREEN}[✔] Archivo cifrado exitosamente: {archivo_salida}{Style.RESET_ALL}")
        return archivo_salida
    
    def descifrar_archivo(self, archivo_cifrado: str, password: str = None, llave: bytes = None) -> str:
        """
        Descifra un archivo .enc usando AES-256-GCM
        Retorna la ruta del archivo descifrado
        """
        print(f"{Fore.CYAN}[+] Descifrando archivo: {archivo_cifrado}{Style.RESET_ALL}")
        
        if not os.path.exists(archivo_cifrado):
            raise FileNotFoundError(f"No existe el archivo: {archivo_cifrado}")
        
        with open(archivo_cifrado, 'rb') as f_in:
            # Leer metadata
            salt_len = int.from_bytes(f_in.read(1), 'big')
            salt = f_in.read(salt_len) if salt_len > 0 else b''
            iv = f_in.read(12)
            
            # Obtener o derivar llave
            if password:
                llave, _ = self.generar_llave_desde_password(password, salt if salt_len > 0 else None)
            elif llave is None:
                raise ValueError("Necesitas contraseña o llave para descifrar")
            
            # Crear descifrador
            cipher = Cipher(
                algorithms.AES(llave),
                modes.GCM(iv),
                backend=self.backend
            )
            decryptor = cipher.decryptor()
            
            # Leer datos cifrados (todo excepto últimos 16 bytes que son el tag)
            datos_cifrados = f_in.read()
            tag = datos_cifrados[-16:]
            datos_cifrados = datos_cifrados[:-16]
            
            # Descifrar
            archivo_salida = archivo_cifrado.replace('.enc', '.decrypted')
            with open(archivo_salida, 'wb') as f_out:
                f_out.write(decryptor.update(datos_cifrados))
                decryptor.verify(tag)  # Verifica autenticidad
                decryptor.finalize()
        
        print(f"{Fore.GREEN}[✔] Archivo descifrado exitosamente: {archivo_salida}{Style.RESET_ALL}")
        return archivo_salida
    
    def generar_checksum(self, archivo: str) -> str:
        """Genera SHA-256 del archivo para verificación"""
        sha256 = hashlib.sha256()
        with open(archivo, 'rb') as f:
            for chunk in iter(lambda: f.read(4096), b''):
                sha256.update(chunk)
        return sha256.hexdigest()

def main():
    print(BANNER)
    
    parser = argparse.ArgumentParser(description='MX-ENCRYPT - Cifrado profesional mexicano')
    parser.add_argument('--modo', choices=['cifrar', 'descifrar', 'generar-llave'], required=True)
    parser.add_argument('--archivo', help='Archivo a procesar')
    parser.add_argument('--password', help='Contraseña para cifrar/descifrar')
    parser.add_argument('--output', help='Archivo de salida (opcional)')
    
    args = parser.parse_args()
    
    mx = MXEncrypt()
    
    try:
        if args.modo == 'generar-llave':
            llave = mx.generar_llave_aleatoria()
            llave_b64 = base64.b64encode(llave).decode()
            print(f"{Fore.GREEN}[+] Llave AES-256 generada (BASE64):{Style.RESET_ALL}")
            print(llave_b64)
            print(f"\n{Fore.YELLOW}⚠️  GUARDA ESTA LLAVE EN LUGAR SEGURO{Style.RESET_ALL}")
            
        elif args.modo == 'cifrar':
            if not args.archivo:
                print(f"{Fore.RED}[!] Necesitas especificar --archivo{Style.RESET_ALL}")
                return
            if not args.password:
                print(f"{Fore.RED}[!] Necesitas --password para cifrar{Style.RESET_ALL}")
                return
            
            mx.cifrar_archivo(args.archivo, password=args.password)
            
        elif args.modo == 'descifrar':
            if not args.archivo:
                print(f"{Fore.RED}[!] Necesitas especificar --archivo{Style.RESET_ALL}")
                return
            if not args.password:
                print(f"{Fore.RED}[!] Necesitas --password para descifrar{Style.RESET_ALL}")
                return
            
            mx.descifrar_archivo(args.archivo, password=args.password)
            
    except Exception as e:
        print(f"{Fore.RED}[!] Error: {str(e)}{Style.RESET_ALL}")
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
