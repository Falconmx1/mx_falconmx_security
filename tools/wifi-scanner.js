#!/usr/bin/env node

/**
 * Wifi Scanner - MFH TOOLS PRO
 * Escanea redes WiFi cercanas y muestra información de seguridad
 * 
 * Uso: node wifi-scanner.js
 * Ejemplo: node wifi-scanner.js
 * Ejemplo: node wifi-scanner.js --interface wlan0
 * 
 * Nota: Requiere instalación de herramientas del sistema:
 * Linux: sudo apt-get install wireless-tools
 * macOS: brew install wireless-tools
 * Windows: Requiere herramientas adicionales
 */

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const os = require('os');

// ==================== CONFIGURACIÓN ====================
const CONFIG = {
    timeout: 10000,
    defaultInterface: 'wlan0'
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);
let interface = CONFIG.defaultInterface;
let verbose = false;

for (let i = 0; i < args.length; i++) {
    if (args[i] === '--interface' && args[i + 1]) {
        interface = args[i + 1];
        i++;
    } else if (args[i] === '--verbose') {
        verbose = true;
    } else if (args[i] === '--help') {
        console.error(`
🔍 Wifi Scanner - MFH TOOLS PRO
================================
Escanea redes WiFi cercanas y muestra información de seguridad.

Uso:
  node wifi-scanner.js [opciones]

Opciones:
  --interface <iface>   Interfaz de red (default: wlan0)
  --verbose             Mostrar más detalles
  --help                Mostrar esta ayuda

Ejemplos:
  node wifi-scanner.js
  node wifi-scanner.js --interface wlp2s0
`);
        process.exit(0);
    }
}

// ==================== FUNCIONES ====================
async function checkDependencies() {
    try {
        await execPromise('which iwlist', { timeout: 2000 });
        return true;
    } catch (error) {
        return false;
    }
}

async function scanWifi(interface) {
    try {
        const { stdout } = await execPromise(`sudo iwlist ${interface} scan`, { timeout: CONFIG.timeout });
        return parseWifiScan(stdout);
    } catch (error) {
        // Intentar sin sudo (si no se necesita)
        try {
            const { stdout } = await execPromise(`iwlist ${interface} scan`, { timeout: CONFIG.timeout });
            return parseWifiScan(stdout);
        } catch (e2) {
            // Intentar con nmcli (alternativa)
            try {
                const { stdout } = await execPromise(`nmcli dev wifi list`, { timeout: CONFIG.timeout });
                return parseNmcliScan(stdout);
            } catch (e3) {
                return { error: 'No se pudo escanear redes WiFi', details: error.message };
            }
        }
    }
}

function parseWifiScan(output) {
    const networks = [];
    const lines = output.split('\n');
    let current = null;
    
    for (const line of lines) {
        const trimmed = line.trim();
        
        if (trimmed.includes('Cell') && trimmed.includes('Address')) {
            if (current) {
                networks.push(current);
            }
            current = {
                ssid: null,
                bssid: null,
                channel: null,
                frequency: null,
                quality: null,
                signal: null,
                encryption: null,
                mode: null
            };
            const bssidMatch = trimmed.match(/Address: ([0-9A-F:]+)/i);
            if (bssidMatch) current.bssid = bssidMatch[1];
        }
        
        if (current) {
            if (trimmed.includes('ESSID:')) {
                const ssidMatch = trimmed.match(/ESSID:"(.+)"/);
                if (ssidMatch) current.ssid = ssidMatch[1] || 'Oculta';
            }
            if (trimmed.includes('Channel:')) {
                const channelMatch = trimmed.match(/Channel:(\d+)/);
                if (channelMatch) current.channel = parseInt(channelMatch[1]);
            }
            if (trimmed.includes('Frequency:')) {
                const freqMatch = trimmed.match(/Frequency:([\d.]+)/);
                if (freqMatch) current.frequency = parseFloat(freqMatch[1]);
            }
            if (trimmed.includes('Quality=')) {
                const qualityMatch = trimmed.match(/Quality=(\d+)\/(\d+)/);
                if (qualityMatch) {
                    current.quality = `${qualityMatch[1]}/${qualityMatch[2]}`;
                    current.signal = Math.round((parseInt(qualityMatch[1]) / parseInt(qualityMatch[2])) * 100);
                }
            }
            if (trimmed.includes('Signal level=')) {
                const signalMatch = trimmed.match(/Signal level=(-?\d+)/);
                if (signalMatch) current.signal = parseInt(signalMatch[1]);
            }
            if (trimmed.includes('Encryption key:')) {
                const encMatch = trimmed.match(/Encryption key:(on|off)/i);
                if (encMatch) current.encryption = encMatch[1] === 'on' ? 'AES/WPA2' : 'Ninguna';
            }
            if (trimmed.includes('Group Cipher:')) {
                const cipherMatch = trimmed.match(/Group Cipher:(.+)/);
                if (cipherMatch) current.encryption = cipherMatch[1].trim();
            }
            if (trimmed.includes('Mode:')) {
                const modeMatch = trimmed.match(/Mode:(.+)/);
                if (modeMatch) current.mode = modeMatch[1].trim();
            }
        }
    }
    
    if (current && current.bssid) {
        networks.push(current);
    }
    
    return networks;
}

function parseNmcliScan(output) {
    const networks = [];
    const lines = output.split('\n');
    let headers = [];
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.includes('IN-USE') && line.includes('SSID')) {
            headers = line.split(/\s{2,}/);
            continue;
        }
        if (headers.length > 0 && line) {
            const parts = line.split(/\s{2,}/);
            if (parts.length >= headers.length) {
                const network = {};
                headers.forEach((h, idx) => {
                    const key = h.toLowerCase().replace(/[^a-z]/g, '');
                    if (key === 'ssid') network.ssid = parts[idx] || 'Oculta';
                    else if (key === 'signal') network.signal = parseInt(parts[idx]) || 0;
                    else if (key === 'security') network.encryption = parts[idx] || 'Ninguna';
                    else if (key === 'mode') network.mode = parts[idx] || 'Unknown';
                });
                if (network.ssid) {
                    networks.push(network);
                }
            }
        }
    }
    
    return networks;
}

function getSecurityEmoji(security) {
    if (!security || security === 'Ninguna' || security === 'None') return '🔓';
    if (security.includes('WPA3')) return '🟢';
    if (security.includes('WPA2')) return '🟡';
    if (security.includes('WPA')) return '🟠';
    if (security.includes('WEP')) return '🔴';
    return '❓';
}

function getSignalEmoji(signal) {
    if (signal > 70) return '📶';
    if (signal > 40) return '📶';
    if (signal > 20) return '📶';
    return '📶';
}

// ==================== MAIN ====================
(async function main() {
    try {
        console.log(`🔍 Wifi Scanner - MFH TOOLS PRO`);
        console.log('='.repeat(60));
        console.log(`📡 Interfaz: ${interface}`);
        console.log('');
        
        // Verificar dependencias
        const hasDependencies = await checkDependencies();
        if (!hasDependencies) {
            console.warn('⚠️ iwlist no encontrado. Intentando con nmcli...');
        }
        
        // Escanear
        console.log('🔍 Escaneando redes WiFi...');
        const networks = await scanWifi(interface);
        
        if (networks.error) {
            console.error(`❌ Error: ${networks.error}`);
            console.log('');
            console.log('💡 Soluciones:');
            console.log('  1. Instala wireless-tools: sudo apt-get install wireless-tools');
            console.log('  2. Usa nmcli: sudo apt-get install network-manager');
            console.log('  3. Ejecuta con sudo: sudo node wifi-scanner.js');
            process.exit(1);
        }
        
        if (networks.length === 0) {
            console.log('❌ No se encontraron redes WiFi');
            console.log('   Asegúrate de que el WiFi esté activo y la interfaz sea correcta');
            process.exit(0);
        }
        
        // Mostrar resultados
        console.log(`\n📊 REDES ENCONTRADAS: ${networks.length}`);
        console.log('='.repeat(60));
        
        networks.sort((a, b) => (b.signal || 0) - (a.signal || 0));
        
        networks.forEach((net, i) => {
            const securityEmoji = getSecurityEmoji(net.encryption);
            const signalBar = net.signal > 70 ? '🟢' : net.signal > 40 ? '🟡' : '🔴';
            
            console.log(`\n${i + 1}. ${securityEmoji} ${net.ssid || 'Red Oculta'}`);
            console.log(`   🔹 BSSID: ${net.bssid || 'N/A'}`);
            console.log(`   🔹 Canal: ${net.channel || 'N/A'}`);
            console.log(`   🔹 Frecuencia: ${net.frequency || 'N/A'} GHz`);
            console.log(`   🔹 Señal: ${net.signal || 0}% ${signalBar}`);
            console.log(`   🔹 Seguridad: ${net.encryption || 'N/A'}`);
            console.log(`   🔹 Modo: ${net.mode || 'N/A'}`);
        });
        
        // Resumen de seguridad
        console.log('\n📊 RESUMEN DE SEGURIDAD:');
        const secure = networks.filter(n => n.encryption && !n.encryption.includes('Ninguna')).length;
        const insecure = networks.filter(n => !n.encryption || n.encryption.includes('Ninguna')).length;
        console.log(`   🔒 Redes seguras: ${secure}`);
        console.log(`   🔓 Redes inseguras: ${insecure}`);
        
        console.log('\n✅ Wifi Scanner completado exitosamente');
        
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        if (error.message.includes('sudo')) {
            console.log('   💡 Ejecuta con sudo: sudo node wifi-scanner.js');
        }
        process.exit(1);
    }
})();
