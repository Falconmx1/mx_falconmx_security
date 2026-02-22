#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MX-ENCRYPT KeyGen v1.0 - Generación de llaves RSA
Hecho en México 🇲🇽 - Llaves bien vergas para cifrado asimétrico
"""

import os
import sys
from pathlib import Path
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding
import base64
from colorama import init, Fore, Style

init(autoreset=True)

BANNER = f"""
{Fore.BLUE}╔══════════════════════════════════════════════════════════╗
║     {Fore.WHITE}MX-ENCRYPT KEYGEN - RSA PARA MEXAS {Fore.BLUE}                     ║
║     {Fore.YELLOW}Genera llaves RSA de 2048/4096 bits {Fore.BLUE}                   ║
║     {Fore.GREEN}Porque lo público es público, lo privado es privado {Fore.BLUE}    ║
╚══════════════════════════════════════════════════════════╝{Style.RESET_ALL}
"""

class RSAKeyGenerator:
    def __init__(self, key_size=2048):
        self.key_size = key_size
        self.backend = default_backend()
        self.private_key = None
        self.public_key = None
    
    def generar_par_llaves(self):
        """Genera un par de llaves RSA (pública/privada)"""
        print(f"{Fore.CYAN}[+] Generando par de llaves RSA-{self.key_size}...{Style.RESET_ALL}")
        
        self.private_key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=self.key_size,
            backend=self.backend
        )
        self.public_key = self.private_key.public_key()
        
        print(f"{Fore.GREEN}[✔] Llaves generadas exitosamente{Style.RESET_ALL}")
        return self.private_key, self.public_key
    
    def guardar_llave_privada(self, archivo: str, password: str = None):
        """Guarda la llave privada en formato PEM"""
        if not self.private_key:
            raise ValueError("Primero genera las llaves con generar_par_llaves()")
        
        encryption = serialization.BestAvailableEncryption(password.encode()) if password else serialization.NoEncryption()
        
        pem = self.private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=encryption
        )
        
        with open(archivo, 'wb') as f:
            f.write(pem)
        
        print(f"{Fore.GREEN}[✔] Llave privada guardada en: {archivo}{Style.RESET_ALL}")
    
    def guardar_llave_publica(self, archivo: str):
        """Guarda la llave pública en formato PEM"""
        if not self.public_key:
            raise ValueError("Primero genera las llaves con generar_par_llaves()")
        
        pem = self.public_key.public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo
        )
        
        with open(archivo, 'wb') as f:
            f.write(pem)
        
        print(f"{Fore.GREEN}[✔] Llave pública guardada en: {archivo}{Style.RESET_ALL}")
    
    def cifrar_con_publica(self, mensaje: bytes, archivo_llave_publica: str = None) -> bytes:
        """
        Cifra un mensaje usando la llave pública (si se proporciona archivo, la carga)
        """
        if archivo_llave_publica:
            with open(archivo_llave_publica, 'rb') as f:
                public_key = serialization.load_pem_public_key(f.read(), backend=self.backend)
        else:
            public_key = self.public_key
        
        if not public_key:
            raise ValueError("No hay llave pública disponible")
        
        ciphertext = public_key.encrypt(
            mensaje,
            padding.OAEP(
                mgf=padding.MGF1(algorithm=hashes.SHA256()),
                algorithm=hashes.SHA256(),
                label=None
            )
        )
        return ciphertext
    
    def descifrar_con_privada(self, ciphertext: bytes, archivo_llave_privada: str = None, password: str = None):
        """Descifra usando llave privada"""
        if archivo_llave_privada:
            with open(archivo_llave_privada, 'rb') as f:
                if password:
                    private_key = serialization.load_pem_private_key(
                        f.read(),
                        password=password.encode(),
                        backend=self.backend
                    )
                else:
                    private_key = serialization.load_pem_private_key(
                        f.read(),
                        password=None,
                        backend=self.backend
                    )
        else:
            private_key = self.private_key
        
        if not private_key:
            raise ValueError("No hay llave privada disponible")
        
        plaintext = private_key.decrypt(
            ciphertext,
            padding.OAEP(
                mgf=padding.MGF1(algorithm=hashes.SHA256()),
                algorithm=hashes.SHA256(),
                label=None
            )
        )
        return plaintext

def main():
    print(BANNER)
    
    parser = argparse.ArgumentParser(description='MX-ENCRYPT KeyGen - Generador de llaves RSA')
    parser.add_argument('--bits', type=int, choices=[2048, 3072, 4096], default=2048,
                       help='Tamaño de llave en bits (2048, 3072, 4096)')
    parser.add_argument('--output', default='./llaves_rsa', help='Directorio de salida')
    parser.add_argument('--password', help='Contraseña para proteger llave privada')
    
    args = parser.parse_args()
    
    try:
        # Crear directorio de salida
        output_dir = Path(args.output)
        output_dir.mkdir(parents=True, exist_ok=True)
        
        # Generar llaves
        kg = RSAKeyGenerator(key_size=args.bits)
        kg.generar_par_llaves()
        
        # Guardar llaves
        kg.guardar_llave_privada(
            output_dir / f"private_key_{args.bits}.pem",
            password=args.password
        )
        kg.guardar_llave_publica(
            output_dir / f"public_key_{args.bits}.pem"
        )
        
        # Demostración de cifrado/descifrado
        print(f"\n{Fore.CYAN}[+] Probando cifrado RSA...{Style.RESET_ALL}")
        mensaje = b"Mensaje secreto mexicano - Viva México cabrones!"
        
        # Cifrar
        cifrado = kg.cifrar_con_publica(mensaje)
        print(f"{Fore.YELLOW}  Mensaje original: {mensaje}{Style.RESET_ALL}")
        print(f"{Fore.YELLOW}  Cifrado (base64): {base64.b64encode(cifrado[:50])}...{Style.RESET_ALL}")
        
        # Descifrar
        descifrado = kg.descifrar_con_privada(cifrado)
        print(f"{Fore.GREEN}  Descifrado correcto: {descifrado}{Style.RESET_ALL}")
        
        print(f"\n{Fore.GREEN}[✔] Proceso completado. Llaves guardadas en: {output_dir}{Style.RESET_ALL}")
        print(f"{Fore.YELLOW}⚠️  Respalda tus llaves en un lugar seguro{Style.RESET_ALL}")
        
    except Exception as e:
        print(f"{Fore.RED}[!] Error: {str(e)}{Style.RESET_ALL}")
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
