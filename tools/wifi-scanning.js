#!/usr/bin/env node
/**
 * MFH TOOLS - WiFi Scanning
 * Reconocimiento: WiFi
 * 
 * Integra: Bettercap, Sparrow-WiFi, Kismet, Airodump-ng, Wifite
 * 
 * Uso: node wifi-scanning.js --iface <wlan0> [--tool <nombre>]
 * 
 * Autor: FalconMX Security
 */

'use strict';

const CONFIG = { version: '1.0.0', author: 'FalconMX Security' };

// ============================================================
// HERRAMIENTAS WIFI
// ============================================================
const TOOLS = {
    bettercap: {
        name: 'Bettercap',
        description: 'Framework Swiss-army para WiFi, BLE, HID, Ethernet',
        install: [
            'sudo apt install bettercap',
            'go install github.com/bettercap/bettercap@latest'
        ],
        usage: [
            'sudo bettercap -iface wlan0',
            'sudo bettercap -eval "wifi.recon on"'
        ],
        commands: [
            'wifi.recon on             # Iniciar reconocimiento WiFi',
            'wifi.recon off            # Detener',
            'wifi.show                # Mostrar APs detectados',
            'wifi.deauth <BSSID>       # Deauth (¡peligroso!)',
            'wifi.assoc <BSSID>        # Asociar',
            'wifi.ap                  # Crear AP falso',
            'net.sniff on             # Sniff de tráfico'
        ]
    },
    'sparrow-wifi': {
        name: 'Sparrow-WiFi',
        description: 'GUI moderna para análisis WiFi con GPS',
        install: [
            'git clone https://github.com/ghostop14/sparrow-wifi',
            'cd sparrow-wifi && pip install -r requirements.txt'
        ],
        usage: [
            'python3 sparrow-wifi.py'
        ],
        commands: [
            'python3 sparrow-wifi.py   # Lanzar GUI',
            '# Características:',
            '#   • Mapa con GPS',
            '#   • Análisis de canales',
            '#   • Detección de clientes',
            '#   • Exportación KML'
        ]
    },
    kismet: {
        name: 'Kismet',
        description: 'Detector de redes inalámbricas, sniffer y IDS',
        install: [
            'sudo apt install kismet'
        ],
        usage: [
            'sudo kismet -c wlan0'
        ],
        commands: [
            'sudo kismet -c wlan0      # Capturar en wlan0',
            'kismet -c wlan0:type=linuxwifi   # Especificar tipo',
            '# Web UI: http://localhost:2501',
            '# Usuario: kismet / contraseña generada'
        ]
    },
    airodump: {
        name: 'Airodump-ng',
        description: 'Captura de paquetes 802.11 (parte de Aircrack-ng)',
        install: [
            'sudo apt install aircrack-ng'
        ],
        usage: [
            'sudo airmon-ng start wlan0',
            'sudo airodump-ng wlan0mon'
        ],
        commands: [
            'airmon-ng start wlan0     # Modo monitor',
            'airmon-ng stop wlan0mon   # Detener',
            'airodump-ng wlan0mon      # Escanear todos',
            'airodump-ng -c 6 --bssid AA:BB:CC:DD:EE:FF -w capture wlan0mon   # Canal específico'
        ]
    },
    airodump_ng: {
        name: 'Aireplay-ng',
        description: 'Inyección de paquetes 802.11 (deauth, ARP replay)',
        install: [
            'sudo apt install aircrack-ng'
        ],
        usage: [
            'sudo aireplay-ng --deauth 10 -a <BSSID> wlan0mon'
        ],
        commands: [
            'aireplay-ng --test wlan0mon         # Test de inyección',
            'aireplay-ng --deauth 10 -a <BSSID> wlan0mon   # Deauth',
            'aireplay-ng --arpreplay -b <BSSID> -h <MAC> wlan0mon',
            'aireplay-ng --fakeauth 0 -a <BSSID> -h <MAC> wlan0mon'
        ]
    },
    wifite: {
        name: 'Wifite',
        description: 'Automatización de auditoría WiFi',
        install: [
            'git clone https://github.com/derv82/wifite2',
            'cd wifite2 && sudo python3 setup.py install'
        ],
        usage: [
            'sudo wifite'
        ],
        commands: [
            'sudo wifite                # Modo interactivo',
            'sudo wifite --wpa          # Solo WPA',
            'sudo wifite --wep          # Solo WEP',
            'sudo wifite --kill         # Matar procesos conflictivos',
            'sudo wifite --dict file.txt  # Diccionario personalizado'
        ]
    },
    wash: {
        name: 'Wash',
        description: 'Detector de WPS (WiFi Protected Setup)',
        install: [
            'sudo apt install reaver'
        ],
        usage: [
            'sudo wash -i wlan0mon'
        ],
        commands: [
            'wash -i wlan0mon          # Buscar APs con WPS',
            'wash -i wlan0mon -C       # Ignorar APs sin WPS',
            'wash -i wlan0mon -s       # Modo scan'
        ]
    },
    reaver: {
        name: 'Reaver',
        description: 'Ataque brute-force contra WPS PIN',
        install: [
            'sudo apt install reaver'
        ],
        usage: [
            'sudo reaver -i wlan0mon -b <BSSID> -vv'
        ],
        commands: [
            'reaver -i wlan0mon -b <BSSID> -vv        # Ataque completo',
            'reaver -i wlan0mon -b <BSSID> -p 1234    # PIN específico',
            'reaver -i wlan0mon -b <BSSID> -K 1       # Usar Pixie Dust',
            'reaver -i wlan0mon -b <BSSID> -d 5 -T 5  # Delay y timeout'
        ]
    }
};

// ============================================================
// VALIDACIONES
// ============================================================
function isValidIface(iface) {
    return /^[a-zA-Z0-9:_-]+$/.test(iface);
}

function isValidBSSID(bssid) {
    return /^([0-9A-F]{2}[:-]){5}([0-9A-F]{2})$/i.test(bssid);
}

// ============================================================
// REPORTE
// ============================================================
function printReport(iface, selectedTool) {
    console.log('');
    console.log('═'.repeat(65));
    console.log('  📡 WIFI SCANNING REPORT');
    console.log('  Interface: ' + iface);
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
        console.log('   💻 Uso:');
        tool.usage.forEach(function(line) { console.log('      ' + line); });
        console.log('');
        if (tool.commands) {
            console.log('   ⚙️ Comandos:');
            tool.commands.forEach(function(line) { console.log('      ' + line); });
            console.log('');
        }
        console.log('─'.repeat(65));
        console.log('');
    });

    console.log('  📋 FLUJO RECOMENDADO DE AUDITORÍA');
    console.log('─'.repeat(65));
    console.log('');
    console.log('  1. Poner interfaz en modo monitor:');
    console.log('     sudo airmon-ng start ' + iface);
    console.log('');
    console.log('  2. Escanear redes cercanas:');
    console.log('     sudo airodump-ng ' + iface + 'mon');
    console.log('');
    console.log('  3. Capturar handshake (si es WPA):');
    console.log('     sudo airodump-ng -c <CANAL> --bssid <BSSID> -w capture ' + iface + 'mon');
    console.log('');
    console.log('  4. Deauth para forzar reconexión:');
    console.log('     sudo aireplay-ng --deauth 10 -a <BSSID> ' + iface + 'mon');
    console.log('');
    console.log('  5. Crackear con aircrack-ng:');
    console.log('     aircrack-ng capture-01.cap -w /usr/share/wordlists/rockyou.txt');
    console.log('');
    console.log('  ⚠️ ADVERTENCIA');
    console.log('     Escanear/atacar redes WiFi SIN AUTORIZACIÓN es delito');
    console.log('     en la mayoría de países. Solo audita tu propia red o');
    console.log('     redes con autorización escrita (engagement formal).');
    console.log('');
    console.log('─'.repeat(65));
    console.log('');
}

// ============================================================
// CLI
// ============================================================
function main() {
    var args = process.argv.slice(2);
    var ifaceIdx = args.indexOf('--iface');
    var toolIdx = args.indexOf('--tool');

    if (ifaceIdx === -1) {
        console.log('');
        console.log('╔══════════════════════════════════════════════════════╗');
        console.log('║  MFH TOOLS — WiFi Scanning v' + CONFIG.version + '                    ║');
        console.log('║  ' + CONFIG.author + '                              ║');
        console.log('╚══════════════════════════════════════════════════════╝');
        console.log('');
        console.log('  Uso: node wifi-scanning.js --iface <wlan0> [--tool <nombre>]');
        console.log('');
        console.log('  Herramientas:');
        Object.keys(TOOLS).forEach(function(k) {
            console.log('    • ' + k + ' - ' + TOOLS[k].name);
        });
        console.log('');
        console.log('  Ejemplos:');
        console.log('    node wifi-scanning.js --iface wlan0');
        console.log('    node wifi-scanning.js --iface wlan0mon --tool kismet');
        console.log('');
        process.exit(0);
    }

    var iface = args[ifaceIdx + 1] || 'wlan0';
    var tool = toolIdx !== -1 ? args[toolIdx + 1].toLowerCase() : 'all';

    if (!isValidIface(iface)) {
        console.log('\n❌ Interface inválida: ' + iface + '\n');
        process.exit(1);
    }

    console.log('\n📡 Generando comandos WiFi para ' + iface + '...\n');
    printReport(iface, tool);
}

main();
