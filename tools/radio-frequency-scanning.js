#!/usr/bin/env node
/**
 * MFH TOOLS - Radio Frequency Scanning
 * Reconocimiento: Radio Frequency (SDR)
 * 
 * Integra: HackRF, GNU Radio, RTL-SDR, GQRX, SDR#
 * 
 * Uso: node radio-frequency-scanning.js [--tool <nombre>] [--freq <Hz>]
 * 
 * Autor: FalconMX Security
 */

'use strict';

const CONFIG = { version: '1.0.0', author: 'FalconMX Security' };

// ============================================================
// HERRAMIENTAS SDR
// ============================================================
const TOOLS = {
    hackrf: {
        name: 'HackRF One',
        description: 'SDR half-duplex 1 MHz - 6 GHz (transceptor)',
        install: [
            'sudo apt install hackrf',
            '# Firmware:',
            'hackrf_spiflash -w firmware.bin'
        ],
        usage: [
            'hackrf_info',
            'hackrf_transfer -r capture.iq -f 100000000 -s 2000000'
        ],
        commands: [
            'hackrf_info               # Info del dispositivo',
            'hackrf_transfer -r out.iq -f 100M -s 2M    # Recibir',
            'hackrf_transfer -t in.iq -f 100M -s 2M     # Transmitir',
            'hackrf_sweep -f 88:108    # Barrido FM',
            'hackrf_debug              # Debug'
        ]
    },
    gnurdio: {
        name: 'GNU Radio',
        description: 'Framework de procesamiento de señales SDR',
        install: [
            'sudo apt install gnuradio',
            '# O con pybombs:',
            'pip install pybombs && pybombs install gnuradio'
        ],
        usage: [
            'gnuradio-companion',
            'python3 my_flowgraph.py'
        ],
        commands: [
            'gnuradio-companion        # GUI',
            'gnuradio-config-info      # Info de config',
            'volk_profile              # Optimizar kernels'
        ]
    },
    rtlsdr: {
        name: 'RTL-SDR',
        description: 'Receptor SDR económico 24 MHz - 1.7 GHz',
        install: [
            'sudo apt install rtl-sdr'
        ],
        usage: [
            'rtl_test',
            'rtl_fm -f 100M -M fm -s 200k -r 48k - | aplay -f S16_LE'
        ],
        commands: [
            'rtl_test                  # Probar dispositivo',
            'rtl_test -t               # Test de tuning',
            'rtl_sdr -f 100M -s 2M out.iq   # Capturar IQ',
            'rtl_fm -f 100M -M fm -s 200k -r 48k - | aplay -f S16_LE   # FM',
            'rtl_power -f 88M:108M:100k -i 1 scan.csv    # Barrido'
        ]
    },
    gqrx: {
        name: 'GQRX',
        description: 'Receptor SDR con interfaz gráfica (basado en GNU Radio)',
        install: [
            'sudo apt install gqrx-sdr'
        ],
        usage: [
            'gqrx'
        ],
        commands: [
            'gqrx                     # Lanzar GUI',
            '# Configurar:',
            '#   Device: RTL-SDR / HackRF / Airspy',
            '#   Sample rate: 2.4 MSps',
            '#   Frequency: ajustar según banda'
        ]
    },
    'sdr-sharp': {
        name: 'SDR#',
        description: 'SDR# (SDRSharp) - Popular SDR para Windows',
        install: [
            '# Descargar desde: https://airspy.com/download/',
            '# Extraer y ejecutar SDRSharp.exe'
        ],
        usage: [
            'SDRSharp.exe'
        ],
        commands: [
            '# Requiere .NET Framework',
            '# Plugins:',
            '#   Frequency Manager',
            '#   Scanner',
            '#   DSD+ (digital voice)',
            '#   CTCSS/DCS decoder'
        ]
    },
    'universal-radio-hacker': {
        name: 'Universal Radio Hacker',
        description: 'Suite para análisis de protocolos inalámbricos',
        install: [
            'pip install urh',
            '# O desde: https://github.com/jopohl/urh'
        ],
        usage: [
            'urh'
        ],
        commands: [
            'urh                      # GUI',
            '# Soporta:',
            '#   HackRF, RTL-SDR, Airspy, USRP',
            '#   Análisis de protocolos',
            '#   Fuzzing',
            '#   Simulación'
        ]
    }
};

// ============================================================
// BANDAS FRECUENCIAS COMUNES
// ============================================================
const BANDS = [
    { name: 'FM Broadcast', range: '88 - 108 MHz' },
    { name: 'Aeronautical', range: '108 - 137 MHz' },
    { name: 'Weather Satellite', range: '137 - 138 MHz' },
    { name: 'Amateur 2m', range: '144 - 148 MHz' },
    { name: 'Public Safety', range: '150 - 174 MHz' },
    { name: 'Amateur 70cm', range: '430 - 450 MHz' },
    { name: 'ISM 433', range: '433.05 - 434.79 MHz' },
    { name: 'LPD/PMR', range: '446 MHz' },
    { name: 'GSM 900', range: '880 - 960 MHz' },
    { name: 'ISM 868', range: '863 - 870 MHz' },
    { name: 'GPS L1', range: '1575.42 MHz' },
    { name: 'GSM 1800', range: '1710 - 1880 MHz' },
    { name: 'ISM 2.4G (WiFi/BT)', range: '2400 - 2483.5 MHz' },
    { name: 'ISM 5G (WiFi)', range: '5150 - 5850 MHz' }
];

// ============================================================
// REPORTE
// ============================================================
function printReport(selectedTool, freq) {
    console.log('');
    console.log('═'.repeat(65));
    console.log('  📻 RADIO FREQUENCY SCANNING REPORT');
    console.log('  Frecuencia: ' + (freq || 'No especificada'));
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

    console.log('  📡 BANDAS FRECUENCIAS COMUNES');
    console.log('─'.repeat(65));
    BANDS.forEach(function(b) {
        console.log('   • ' + b.name.padEnd(25) + ' ' + b.range);
    });
    console.log('');
    console.log('  ⚠️ ADVERTENCIA');
    console.log('     Transmitir en frecuencias sin licencia es ilegal.');
    console.log('     Recibir (RX) es generalmente legal, transmitir (TX) NO.');
    console.log('     Verifica las leyes de tu país (México: IFT).');
    console.log('');
    console.log('─'.repeat(65));
    console.log('');
}

// ============================================================
// CLI
// ============================================================
function main() {
    var args = process.argv.slice(2);
    var toolIdx = args.indexOf('--tool');
    var freqIdx = args.indexOf('--freq');

    if (toolIdx === -1 && freqIdx === -1 && args.length === 0) {
        console.log('');
        console.log('╔══════════════════════════════════════════════════════╗');
        console.log('║  MFH TOOLS — Radio Frequency Scanning v' + CONFIG.version + '       ║');
        console.log('║  ' + CONFIG.author + '                              ║');
        console.log('╚══════════════════════════════════════════════════════╝');
        console.log('');
        console.log('  Uso: node radio-frequency-scanning.js [--tool <nombre>] [--freq <Hz>]');
        console.log('');
        console.log('  Herramientas:');
        Object.keys(TOOLS).forEach(function(k) {
            console.log('    • ' + k + ' - ' + TOOLS[k].name);
        });
        console.log('');
        console.log('  Ejemplos:');
        console.log('    node radio-frequency-scanning.js');
        console.log('    node radio-frequency-scanning.js --tool hackrf --freq 100000000');
        console.log('');
        process.exit(0);
    }

    var tool = toolIdx !== -1 ? args[toolIdx + 1].toLowerCase() : 'all';
    var freq = freqIdx !== -1 ? args[freqIdx + 1] : null;

    console.log('\n📻 Generando comandos SDR...\n');
    printReport(tool, freq);
}

main();
