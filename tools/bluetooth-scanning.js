#!/usr/bin/env node
/**
 * MFH TOOLS - Bluetooth Scanning
 * Reconocimiento: Bluetooth
 * 
 * Integra: Bettercap, BlueZ, Bluetoothctl, btmon, hcitool
 * 
 * Uso: node bluetooth-scanning.js --target <MAC|all> [--tool <nombre>]
 * 
 * Autor: FalconMX Security
 */

'use strict';

const CONFIG = { version: '1.0.0', author: 'FalconMX Security' };

// ============================================================
// HERRAMIENTAS BLUETOOTH
// ============================================================
const TOOLS = {
    bettercap: {
        name: 'Bettercap',
        description: 'Framework de ataque MITM para WiFi, Bluetooth, HID, Ethernet',
        install: [
            'sudo apt install bettercap',
            '# O desde GitHub:',
            'go install github.com/bettercap/bettercap@latest'
        ],
        usage: [
            'sudo bettercap -iface hci0',
            'sudo bettercap -eval "ble.recon on"'
        ],
        commands: [
            'ble.recon on              # Iniciar reconocimiento BLE',
            'ble.recon off             # Detener',
            'ble.show                  # Mostrar dispositivos',
            'ble.enum <MAC>            # Enumerar servicios GATT',
            'ble.write <MAC> <UUID> <data>  # Escribir característica',
            'ble.sniff <MAC>           # Sniff de notificaciones'
        ]
    },
    bluetoothctl: {
        name: 'bluetoothctl',
        description: 'Cliente oficial de BlueZ para gestionar dispositivos BT',
        install: [
            'sudo apt install bluez bluez-tools'
        ],
        usage: [
            'bluetoothctl',
            '  > scan on',
            '  > devices',
            '  > info <MAC>',
            '  > connect <MAC>'
        ],
        commands: [
            'scan on                   # Escanear dispositivos',
            'scan off                  # Detener escaneo',
            'devices                   # Listar dispositivos conocidos',
            'info <MAC>                # Información detallada',
            'connect <MAC>             # Conectar',
            'pair <MAC>                # Emparejar',
            'trust <MAC>               # Confiar',
            'remove <MAC>              # Eliminar'
        ]
    },
    hcitool: {
        name: 'hcitool',
        description: 'Herramienta legacy de BlueZ para configuración de bajo nivel',
        install: [
            'sudo apt install bluez'
        ],
        usage: [
            'sudo hcitool scan',
            'sudo hcitool lescan'
        ],
        commands: [
            'hcitool dev               # Listar adaptadores',
            'hcitool scan              # Escaneo clásico',
            'hcitool lescan            # Escaneo BLE',
            'hcitool inq               # Inquiry',
            'hcitool name <MAC>        # Obtener nombre',
            'hcitool rssi <MAC>        # Obtener RSSI'
        ]
    },
    btmon: {
        name: 'btmon',
        description: 'Monitor de tráfico HCI de BlueZ',
        install: [
            'sudo apt install bluez'
        ],
        usage: [
            'sudo btmon'
        ],
        commands: [
            'sudo btmon                # Monitorear tráfico HCI',
            'sudo btmon -w capture.log # Guardar en archivo'
        ]
    },
    bluelog: {
        name: 'Bluelog',
        description: 'Escáner y logger de dispositivos Bluetooth',
        install: [
            'sudo apt install bluelog'
        ],
        usage: [
            'sudo bluelog -i hci0 -o scan.log -v'
        ],
        commands: [
            'bluelog -i hci0           # Escanear en hci0',
            'bluelog -o scan.log       # Guardar en archivo',
            'bluelog -v                # Modo verbose'
        ]
    }
};

// ============================================================
// VALIDACIONES
// ============================================================
function isValidMAC(mac) {
    return /^([0-9A-F]{2}[:-]){5}([0-9A-F]{2})$/i.test(mac);
}

// ============================================================
// REPORTE
// ============================================================
/**
 * Bluetooth Scanning es un generador de comandos, no un escáner.
 * No hace Bluetooth real: no lanza bluetoothctl, hcitool, btmon,
 * bettercap ni bluelog. Solo imprime comandos genéricos de 5 herramientas.
 *
 * Lo que realmente hace:
 * - Valida el target como MAC (si no es 'all').
 * - Imprime un reporte con instalación, uso y comandos de las 5 herramientas.
 * - Acepta --tool para elegir una herramienta específica o 'all'.
 *
 * Ventaja de seguridad:
 * - El target NO se interpola en los comandos. Los comandos son genéricos
 *   (info <MAC>, hcitool lescan, ble.recon on, etc.). No hay riesgo de
 *   inyección por copiar/pegar, a diferencia de Web Scanning, Vuln Scanning
 *   y Web Vuln Scanning, que sí interpolaban el target.
 *
 * Bugs funcionales conocidos:
 * - --tool inválida no advierte: cae silenciosamente a mostrar todas.
 *   (Contraste con Web Scanning/Web Vuln Scanning que sí advierten.)
 * - Exit code 0 en --tool inválida (debería ser 1).
 * - MAC con guion no se normaliza a ':' en el header del reporte.
 *
 * Limitaciones:
 * - No escanea nada (solo imprime comandos).
 * - Los comandos son genéricos, no específicos para el target.
 *   Si pasas --target AA:BB:..., no recibes "bluetoothctl info AA:BB:...".
 * - No hace Bluetooth real.
 */
function printReport(target, selectedTool) {
    console.log('');
    console.log('═'.repeat(65));
    console.log('  📶 BLUETOOTH SCANNING REPORT');
    console.log('  Target: ' + (target || 'Todos los dispositivos'));
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

    console.log('  ⚠️ ADVERTENCIA');
    console.log('     Escanear Bluetooth en tu zona puede ser ilegal en');
    console.log('     algunas jurisdicciones. Solo escanea dispositivos');
    console.log('     que te pertenezcan o tengas autorización escrita.');
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
    var toolIdx = args.indexOf('--tool');

    if (targetIdx === -1) {
        console.log('');
        console.log('╔══════════════════════════════════════════════════════╗');
        console.log('║  MFH TOOLS — Bluetooth Scanning v' + CONFIG.version + '              ║');
        console.log('║  ' + CONFIG.author + '                              ║');
        console.log('╚══════════════════════════════════════════════════════╝');
        console.log('');
        console.log('  Uso: node bluetooth-scanning.js --target <MAC|all> [--tool <nombre>]');
        console.log('');
        console.log('  Herramientas:');
        Object.keys(TOOLS).forEach(function(k) {
            console.log('    • ' + k + ' - ' + TOOLS[k].name);
        });
        console.log('');
        console.log('  Ejemplos:');
        console.log('    node bluetooth-scanning.js --target all');
        console.log('    node bluetooth-scanning.js --target AA:BB:CC:DD:EE:FF --tool bettercap');
        console.log('');
        process.exit(0);
    }

    var target = args[targetIdx + 1] || 'all';
    var tool = toolIdx !== -1 ? args[toolIdx + 1].toLowerCase() : 'all';

    if (target !== 'all' && !isValidMAC(target)) {
        console.log('\n❌ MAC inválida: ' + target + ' (formato: AA:BB:CC:DD:EE:FF)\n');
        process.exit(1);
    }

    console.log('\n🔍 Generando comandos para Bluetooth...\n');
    printReport(target, tool);
}

main();
