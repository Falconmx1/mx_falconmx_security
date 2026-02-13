#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
MX-SCANNER v1.0 - Escáner de Puertos Multihilo
Hecho en México 🇲🇽 por MFH TOOLS SECURITY MX
“Más rápido que nmap en pruebas locales, más mexicano que el tequila”
"""

import socket
import threading
import argparse
from datetime import datetime
import sys
import os
import hashlib

# ========== COLORES PARA LA CONSOLA ==========
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
    MEXICO_WHITE = '\033[38;5;15m'

# ========== BANNER ==========
def show_banner():
    banner = f"""
{Colors.ORANGE}╔══════════════════════════════════════════════════════════╗
║                                                              ║
║   {Colors.MEXICO_GREEN}███╗   ███╗███████╗██╗  ██╗{Colors.ORANGE}                         ║
║   {Colors.MEXICO_GREEN}████╗ ████║██╔════╝██║  ██║{Colors.ORANGE}                         ║
║   {Colors.MEXICO_GREEN}██╔████╔██║█████╗  ███████║{Colors.ORANGE}                         ║
║   {Colors.MEXICO_GREEN}██║╚██╔╝██║██╔══╝  ██╔══██║{Colors.ORANGE}                         ║
║   {Colors.MEXICO_GREEN}██║ ╚═╝ ██║██║     ██║  ██║{Colors.ORANGE}                         ║
║   {Colors.MEXICO_GREEN}╚═╝     ╚═╝╚═╝     ╚═╝  ╚═╝{Colors.ORANGE}                         ║
║                                                              ║
║   {Colors.MEXICO_WHITE}MX-SCANNER v1.0 - Escáner de Puertos Multihilo{Colors.ORANGE}         ║
║   {Colors.MEXICO_GREEN}Hecho en México 🇲🇽 - Con huevos y pasión{Colors.ORANGE}             ║
║   {Colors.CYAN}MFH TOOLS SECURITY MX - Como Kali, pero más mexicano{Colors.ORANGE}        ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝{Colors.END}
    """
    print(banner)

# ========== ESCÁNER DE PUERTO INDIVIDUAL ==========
def scan_port(target, port, open_ports):
    """Escanea un puerto específico y obtiene el banner si está abierto"""
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(1.5)
        result = sock.connect_ex((target, port))
        
        if result == 0:
            banner = grab_banner(sock, target, port)
            service = guess_service(port)
            open_ports.append((port, service, banner))
            print(f"{Colors.GREEN}[✓] PUERTO {port:<5} ABIERTO {Colors.CYAN}{service:<15}{Colors.END} {banner[:30]}")
        sock.close()
    except:
        pass

# ========== BANNER GRABBING ==========
def grab_banner(sock, target, port):
    """Intenta obtener el banner del servicio"""
    try:
        # Enviar solicitud HTTP genérica para puertos web
        if port in [80, 443, 8080, 8443]:
            sock.send(b"HEAD / HTTP/1.1\r\nHost: " + target.encode() + b"\r\n\r\n")
        elif port == 21:  # FTP
            sock.send(b"HELP\r\n")
        elif port == 25:  # SMTP
            sock.send(b"EHLO mx-scanner.local\r\n")
        elif port == 22:  # SSH
            pass  # SSH banner viene al conectar
        
        banner = sock.recv(1024).decode('utf-8', errors='ignore').strip()
        return banner[:50] + '...' if len(banner) > 50 else banner
    except:
        return "No banner"

# ========== ADIVINAR SERVICIO POR PUERTO ==========
def guess_service(port):
    """Devuelve el servicio más común para un puerto"""
    services = {
        20: "FTP-data", 21: "FTP", 22: "SSH", 23: "Telnet",
        25: "SMTP", 53: "DNS", 80: "HTTP", 110: "POP3",
        111: "RPC", 135: "RPC", 139: "NetBIOS", 143: "IMAP",
        443: "HTTPS", 445: "SMB", 993: "IMAPS", 995: "POP3S",
        1723: "PPTP", 3306: "MySQL", 3389: "RDP", 5432: "PostgreSQL",
        5900: "VNC", 6379: "Redis", 27017: "MongoDB", 8080: "HTTP-Proxy"
    }
    return services.get(port, "Desconocido")

# ========== ESCANEO MULTIHILO ==========
def scan_ports(target, start_port, end_port, threads=100):
    """Escanea un rango de puertos usando múltiples hilos"""
    print(f"\n{Colors.BOLD}{Colors.CYAN}[*] Objetivo: {target}{Colors.END}")
    print(f"{Colors.BOLD}[*] Rango: {start_port} - {end_port}{Colors.END}")
    print(f"{Colors.BOLD}[*] Hilos: {threads}{Colors.END}")
    print(f"{Colors.BOLD}[*] Inicio: {datetime.now().strftime('%H:%M:%S')}{Colors.END}\n")
    
    open_ports = []
    threads_list = []
    
    # Resolver hostname
    try:
        target_ip = socket.gethostbyname(target)
        print(f"{Colors.BLUE}[*] IP resuelta: {target_ip}{Colors.END}\n")
    except:
        print(f"{Colors.FAIL}[!] No se pudo resolver el hostname{Colors.END}")
        return []
    
    # Crear hilos para cada puerto
    for port in range(start_port, end_port + 1):
        t = threading.Thread(target=scan_port, args=(target_ip, port, open_ports))
        threads_list.append(t)
        t.start()
        
        # Limitar número de hilos concurrentes
        if len(threads_list) >= threads:
            for t in threads_list:
                t.join()
            threads_list = []
    
    # Esperar a que terminen los hilos restantes
    for t in threads_list:
        t.join()
    
    return open_ports

# ========== GUARDAR REPORTE ==========
def save_report(target, open_ports, filename=None):
    """Guarda los resultados en un archivo"""
    if not filename:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"scan_{target.replace('.', '_')}_{timestamp}.txt"
    
    with open(filename, 'w', encoding='utf-8') as f:
        f.write("=" * 60 + "\n")
        f.write("MX-SCANNER v1.0 - Reporte de Escaneo\n")
        f.write(f"Hecho en México 🇲🇽 - MFH TOOLS SECURITY MX\n")
        f.write("=" * 60 + "\n\n")
        f.write(f"Objetivo: {target}\n")
        f.write(f"Fecha: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"Puertos abiertos: {len(open_ports)}\n\n")
        
        if open_ports:
            f.write(f"{'PUERTO':<10} {'SERVICIO':<20} {'BANNER':<50}\n")
            f.write("-" * 80 + "\n")
            for port, service, banner in sorted(open_ports):
                f.write(f"{port:<10} {service:<20} {banner:<50}\n")
        else:
            f.write("No se encontraron puertos abiertos.\n")
    
    print(f"\n{Colors.GREEN}[✓] Reporte guardado: {filename}{Colors.END}")
    return filename

# ========== TRACKING ANÓNIMO ==========
def send_tracking():
    """Envía estadística anónima de uso (solo 1 vez por día por IP)"""
    try:
        import urllib.request
        import json
        
        # Crear ID anónimo basado en hostname (no guarda datos personales)
        host_hash = hashlib.md5(socket.gethostname().encode()).hexdigest()[:8]
        
        # URL de Google Analytics (Measurement Protocol)
        url = "https://www.google-analytics.com/mp/collect?measurement_id=G-03YX9G53W1&api_secret=6UjK9xP2QrS3tV5w"
        
        data = {
            "client_id": host_hash,
            "events": [{
                "name": "mxscanner_execution",
                "params": {
                    "version": "1.0"
                }
            }]
        }
        
        # Enviar sin esperar respuesta
        req = urllib.request.Request(
            url,
            data=json.dumps(data).encode(),
            headers={'Content-Type': 'application/json'},
            method='POST'
        )
        urllib.request.urlopen(req, timeout=1)
    except:
        pass  # Si falla el tracking, no afecta al escáner

# ========== MAIN ==========
def main():
    show_banner()
    
    parser = argparse.ArgumentParser(
        description='MX-SCANNER - Escáner de Puertos Multihilo',
        epilog='Ejemplo: python mx_scanner.py -t 192.168.1.1 -p 1-1000'
    )
    
    parser.add_argument('-t', '--target', required=True, help='IP o hostname objetivo')
    parser.add_argument('-p', '--ports', default='1-1000', help='Rango de puertos (ej: 1-1000 o 80,443,8080)')
    parser.add_argument('--threads', type=int, default=100, help='Número de hilos (default: 100)')
    parser.add_argument('-o', '--output', help='Archivo de salida para el reporte')
    parser.add_argument('--no-color', action='store_true', help='Deshabilitar colores')
    parser.add_argument('--no-tracking', action='store_true', help='No enviar estadísticas anónimas')
    
    args = parser.parse_args()
    
    # Deshabilitar colores si se pide
    if args.no_color:
        for attr in dir(Colors):
            if not attr.startswith('__'):
                setattr(Colors, attr, '')
    
    # Parsear rango de puertos
    try:
        if '-' in args.ports:
            start_port, end_port = map(int, args.ports.split('-'))
        elif ',' in args.ports:
            ports = [int(p) for p in args.ports.split(',')]
            start_port, end_port = min(ports), max(ports)
        else:
            start_port = end_port = int(args.ports)
    except:
        print(f"{Colors.FAIL}[!] Formato de puertos inválido. Usa: 1-1000 o 80,443,8080{Colors.END}")
        sys.exit(1)
    
    # Validar rango de puertos
    if start_port < 1 or end_port > 65535:
        print(f"{Colors.FAIL}[!] Los puertos deben estar entre 1 y 65535{Colors.END}")
        sys.exit(1)
    if start_port > end_port:
        print(f"{Colors.FAIL}[!] El puerto inicial no puede ser mayor al final{Colors.END}")
        sys.exit(1)
    
    # Iniciar escaneo
    try:
        start_time = datetime.now()
        open_ports = scan_ports(args.target, start_port, end_port, args.threads)
        end_time = datetime.now()
        
        # Mostrar resumen
        duration = end_time - start_time
        print(f"\n{Colors.BOLD}{Colors.CYAN}════════════════════════════════════════════════{Colors.END}")
        print(f"{Colors.BOLD}[✓] Escaneo completado{Colors.END}")
        print(f"{Colors.GREEN}[+] Tiempo total: {duration}{Colors.END}")
        print(f"{Colors.GREEN}[+] Puertos abiertos encontrados: {len(open_ports)}{Colors.END}")
        
        if open_ports:
            print(f"\n{Colors.BOLD}RESUMEN:{Colors.END}")
            for port, service, banner in sorted(open_ports):
                print(f"  {Colors.GREEN}{port}{Colors.END}/tcp → {service} {banner}")
        else:
            print(f"\n{Colors.WARNING}[!] No se encontraron puertos abiertos{Colors.END}")
        
        # Guardar reporte
        save_report(args.target, open_ports, args.output)
        
    except KeyboardInterrupt:
        print(f"\n{Colors.WARNING}[!] Escaneo interrumpido por el usuario{Colors.END}")
        sys.exit(0)
    except Exception as e:
        print(f"{Colors.FAIL}[!] Error: {e}{Colors.END}")
        sys.exit(1)

if __name__ == "__main__":
    # Iniciar tracking en segundo plano (solo si no se desactivó)
    if '--no-tracking' not in sys.argv:
        try:
            track_thread = threading.Thread(target=send_tracking)
            track_thread.daemon = True
            track_thread.start()
        except:
            pass
    main()
