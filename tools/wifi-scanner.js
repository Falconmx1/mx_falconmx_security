#!/usr/bin/env node

/**
 * Wifi Scanner - MFH TOOLS PRO
 * Escanea redes WiFi cercanas con información detallada
 * 
 * Uso: node wifi-scanner.js
 * Ejemplo: node wifi-scanner.js --interface wlan0
 * Ejemplo: node wifi-scanner.js --verbose
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
    timeout: 15000,
    defaultInterface: 'wlan0',
    channels: {
        1: 2412, 2: 2417, 3: 2422, 4: 2427, 5: 2432, 6: 2437, 7: 2442,
        8: 2447, 9: 2452, 10: 2457, 11: 2462, 12: 2467, 13: 2472, 14: 2484,
        36: 5180, 40: 5200, 44: 5220, 48: 5240, 52: 5260, 56: 5280,
        60: 5300, 64: 5320, 100: 5500, 104: 5520, 108: 5540, 112: 5560,
        116: 5580, 120: 5600, 124: 5620, 128: 5640, 132: 5660, 136: 5680,
        140: 5700, 149: 5745, 153: 5765, 157: 5785, 161: 5805, 165: 5825
    },
    channelBands: {
        1: '2.4 GHz', 2: '2.4 GHz', 3: '2.4 GHz', 4: '2.4 GHz', 5: '2.4 GHz',
        6: '2.4 GHz', 7: '2.4 GHz', 8: '2.4 GHz', 9: '2.4 GHz', 10: '2.4 GHz',
        11: '2.4 GHz', 12: '2.4 GHz', 13: '2.4 GHz', 14: '2.4 GHz',
        36: '5 GHz', 40: '5 GHz', 44: '5 GHz', 48: '5 GHz',
        52: '5 GHz', 56: '5 GHz', 60: '5 GHz', 64: '5 GHz',
        100: '5 GHz', 104: '5 GHz', 108: '5 GHz', 112: '5 GHz',
        116: '5 GHz', 120: '5 GHz', 124: '5 GHz', 128: '5 GHz',
        132: '5 GHz', 136: '5 GHz', 140: '5 GHz',
        149: '5 GHz', 153: '5 GHz', 157: '5 GHz', 161: '5 GHz', 165: '5 GHz'
    }
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
Escanea redes WiFi cercanas con información detallada.

Uso:
  node wifi-scanner.js [opciones]

Opciones:
  --interface <iface>   Interfaz de red (default: wlan0)
  --verbose             Mostrar más detalles
  --help                Mostrar esta ayuda

Ejemplos:
  node wifi-scanner.js
  node wifi-scanner.js --interface wlp2s0
  node wifi-scanner.js --verbose
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

async function getInterfaceInfo(interface) {
    try {
        const { stdout } = await execPromise(`iwconfig ${interface}`, { timeout: 5000 });
        return parseIwconfig(stdout);
    } catch (error) {
        return null;
    }
}

function parseIwconfig(output) {
    const info = {
        mode: null,
        frequency: null,
        channel: null,
        bitrate: null,
        txpower: null,
        linkQuality: null,
        essid: null
    };
    
    const lines = output.split('\n');
    for (const line of lines) {
        if (line.includes('Mode:')) {
            const match = line.match(/Mode:([^\s]+)/);
            if (match) info.mode = match[1];
        }
        if (line.includes('Frequency:')) {
            const match = line.match(/Frequency:([\d.]+)/);
            if (match) info.frequency = parseFloat(match[1]);
        }
        if (line.includes('Channel:')) {
            const match = line.match(/Channel:(\d+)/);
            if (match) info.channel = parseInt(match[1]);
        }
        if (line.includes('Bit Rate:')) {
            const match = line.match(/Bit Rate:([\d.]+)/);
            if (match) info.bitrate = parseFloat(match[1]);
        }
        if (line.includes('Tx-Power=')) {
            const match = line.match(/Tx-Power=(\d+)/);
            if (match) info.txpower = parseInt(match[1]);
        }
        if (line.includes('Link Quality=')) {
            const match = line.match(/Link Quality=(\d+)\/(\d+)/);
            if (match) {
                info.linkQuality = Math.round((parseInt(match[1]) / parseInt(match[2])) * 100);
            }
        }
        if (line.includes('ESSID:')) {
            const match = line.match(/ESSID:"(.+)"/);
            if (match) info.essid = match[1];
        }
    }
    return info;
}

async function scanWifi(interface) {
    // Intentar con iwlist
    try {
        const { stdout } = await execPromise(`sudo iwlist ${interface} scan`, { timeout: CONFIG.timeout });
        if (stdout.includes('No scan results')) {
            throw new Error('No scan results');
        }
        return parseWifiScan(stdout);
    } catch (error) {
        // Intentar sin sudo
        try {
            const { stdout } = await execPromise(`iwlist ${interface} scan`, { timeout: CONFIG.timeout });
            if (stdout.includes('No scan results')) {
                throw new Error('No scan results');
            }
            return parseWifiScan(stdout);
        } catch (e2) {
            // Intentar con nmcli
            try {
                const { stdout } = await execPromise(`nmcli dev wifi list --rescan yes`, { timeout: CONFIG.timeout });
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
        
        // Detectar nueva red
        if (trimmed.includes('Cell') && trimmed.includes('Address')) {
            if (current && current.bssid) {
                networks.push(current);
            }
            current = {
                ssid: null,
                bssid: null,
                channel: null,
                frequency: null,
                band: null,
                quality: null,
                signal: null,
                signalDb: null,
                encryption: null,
                mode: null,
                bitrate: null,
                vendor: null
            };
            const bssidMatch = trimmed.match(/Address: ([0-9A-F:]+)/i);
            if (bssidMatch) current.bssid = bssidMatch[1].toUpperCase();
        }
        
        if (!current) continue;
        
        // ESSID
        if (trimmed.includes('ESSID:')) {
            const ssidMatch = trimmed.match(/ESSID:"(.+)"/);
            if (ssidMatch) current.ssid = ssidMatch[1] || 'Red Oculta';
        }
        
        // Channel
        if (trimmed.includes('Channel:')) {
            const channelMatch = trimmed.match(/Channel:(\d+)/);
            if (channelMatch) {
                current.channel = parseInt(channelMatch[1]);
                current.band = CONFIG.channelBands[current.channel] || 'Desconocida';
                current.frequency = CONFIG.channels[current.channel] || null;
            }
        }
        
        // Frequency
        if (trimmed.includes('Frequency:')) {
            const freqMatch = trimmed.match(/Frequency:([\d.]+)/);
            if (freqMatch) {
                current.frequency = parseFloat(freqMatch[1]);
                // Determinar banda por frecuencia
                if (current.frequency > 5000) current.band = '5 GHz';
                else if (current.frequency > 2400) current.band = '2.4 GHz';
                else current.band = 'Desconocida';
            }
        }
        
        // Quality y Signal
        if (trimmed.includes('Quality=')) {
            const qualityMatch = trimmed.match(/Quality=(\d+)\/(\d+)/);
            if (qualityMatch) {
                current.quality = `${qualityMatch[1]}/${qualityMatch[2]}`;
                current.signal = Math.round((parseInt(qualityMatch[1]) / parseInt(qualityMatch[2])) * 100);
            }
        }
        
        // Signal level (dBm)
        if (trimmed.includes('Signal level=')) {
            const signalMatch = trimmed.match(/Signal level=(-?\d+)/);
            if (signalMatch) {
                current.signalDb = parseInt(signalMatch[1]);
                // Convertir dBm a porcentaje (aproximado)
                if (current.signalDb >= -30) current.signal = 100;
                else if (current.signalDb >= -50) current.signal = 80;
                else if (current.signalDb >= -60) current.signal = 60;
                else if (current.signalDb >= -70) current.signal = 40;
                else if (current.signalDb >= -80) current.signal = 20;
                else current.signal = 10;
            }
        }
        
        // Encryption
        if (trimmed.includes('Encryption key:')) {
            const encMatch = trimmed.match(/Encryption key:(on|off)/i);
            if (encMatch) {
                current.encryption = encMatch[1] === 'on' ? 'Cifrado' : 'Ninguna';
            }
        }
        
        // Group Cipher (para detalles de seguridad)
        if (trimmed.includes('Group Cipher:')) {
            const cipherMatch = trimmed.match(/Group Cipher:(.+)/);
            if (cipherMatch) {
                const cipher = cipherMatch[1].trim();
                if (cipher.includes('CCMP')) current.encryption = 'WPA2-AES (CCMP)';
                else if (cipher.includes('TKIP')) current.encryption = 'WPA-TKIP';
                else if (cipher.includes('WEP')) current.encryption = 'WEP';
                else current.encryption = cipher;
            }
        }
        
        // Mode
        if (trimmed.includes('Mode:')) {
            const modeMatch = trimmed.match(/Mode:(.+)/);
            if (modeMatch) current.mode = modeMatch[1].trim();
        }
        
        // Bit Rate
        if (trimmed.includes('Bit Rate:')) {
            const bitMatch = trimmed.match(/Bit Rate:([\d.]+)/);
            if (bitMatch) current.bitrate = parseFloat(bitMatch[1]);
        }
        
        // Vendor (usando OUI)
        if (trimmed.includes('IE: Unknown') || trimmed.includes('IE: WPA')) {
            // Intentar identificar vendor por BSSID
            if (current.bssid) {
                current.vendor = getVendorByOUI(current.bssid);
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
                    const value = parts[idx] || '';
                    if (key === 'ssid') network.ssid = value || 'Red Oculta';
                    else if (key === 'signal') {
                        network.signal = parseInt(value) || 0;
                        network.signalDb = network.signal;
                    }
                    else if (key === 'security') network.encryption = value || 'Ninguna';
                    else if (key === 'mode') network.mode = value || 'Unknown';
                    else if (key === 'bssid') {
                        network.bssid = value;
                        network.vendor = getVendorByOUI(value);
                    }
                    else if (key === 'chan') {
                        network.channel = parseInt(value) || null;
                        network.band = CONFIG.channelBands[network.channel] || 'Desconocida';
                        network.frequency = CONFIG.channels[network.channel] || null;
                    }
                });
                if (network.ssid) {
                    networks.push(network);
                }
            }
        }
    }
    
    return networks;
}

function getVendorByOUI(bssid) {
    const oui = bssid.substring(0, 8).toUpperCase();
    const vendors = {
        '00:00:0C': 'Cisco',
        '00:10:18': 'Cisco-Linksys',
        '00:14:BF': 'Linksys',
        '00:17:9A': 'D-Link',
        '00:18:4D': 'Belkin',
        '00:1D:7E': 'Netgear',
        '00:1E:2A': 'Netgear',
        '00:1F:33': 'Netgear',
        '00:21:29': 'TP-Link',
        '00:22:75': 'TP-Link',
        '00:23:CD': 'TP-Link',
        '00:24:01': 'TP-Link',
        '00:25:86': 'TP-Link',
        '00:26:5A': 'TP-Link',
        '00:27:19': 'TP-Link',
        '00:30:BD': 'D-Link',
        '00:50:F1': 'D-Link',
        '00:5A:56': 'Netgear',
        '00:A0:80': '3Com',
        '00:B0:8E': 'Netgear',
        '00:C0:02': 'Netgear',
        '00:D0:59': 'Netgear',
        '00:E0:4C': 'Netgear',
        '00:E0:98': 'Netgear',
        '00:E0:FC': 'Netgear',
        '00:13:CE': 'ZyXEL',
        '00:14:A5': 'ZyXEL',
        '00:19:CB': 'ZyXEL',
        '00:1B:2F': 'ZyXEL',
        '00:90:0C': 'Netgear',
        '00:A0:C5': 'Netgear',
        '00:AB:CD': 'Mikrotik',
        '00:1C:42': 'UBNT',
        '00:15:6D': 'UBNT',
        '00:27:22': 'UBNT',
        '00:24:A4': 'UBNT',
        '00:11:22': 'Mikrotik',
        '00:1F:7A': 'Mikrotik',
        '00:2A:6A': 'Mikrotik',
        '00:40:96': 'Mikrotik',
        '00:50:4C': 'Mikrotik',
        '00:80:48': 'Mikrotik',
        '00:E0:63': 'Mikrotik',
        '00:01:24': 'Aruba',
        '00:02:6F': 'Aruba',
        '00:1B:7F': 'Aruba',
        '00:1E:13': 'Aruba',
        '00:1F:47': 'Aruba',
        '00:24:6E': 'Aruba',
        '00:2A:10': 'Aruba',
        '00:00:5E': 'Aruba',
        '00:0F:24': 'Aruba',
        '00:04:75': 'Aruba'
    };
    
    for (const [prefix, vendor] of Object.entries(vendors)) {
        if (bssid.startsWith(prefix)) {
            return vendor;
        }
    }
    return 'Desconocido';
}

function getSecurityEmoji(security) {
    if (!security || security === 'Ninguna') return '🔓';
    if (security.includes('WPA3')) return '🟢';
    if (security.includes('WPA2')) return '🟡';
    if (security.includes('WPA')) return '🟠';
    if (security.includes('WEP')) return '🔴';
    return '❓';
}

function getSignalBar(signal) {
    if (signal > 80) return '📶🟢 Excelente';
    if (signal > 60) return '📶🟡 Buena';
    if (signal > 40) return '📶🟠 Regular';
    if (signal > 20) return '📶🔴 Mala';
    return '📶🔴 Muy mala';
}

function getRecommendations(networks) {
    const recommendations = [];
    
    // Analizar canales en 2.4 GHz
    const channels24 = networks
        .filter(n => n.band === '2.4 GHz' && n.channel)
        .map(n => n.channel);
    
    const channelCount = {};
    channels24.forEach(c => {
        channelCount[c] = (channelCount[c] || 0) + 1;
    });
    
    if (Object.keys(channelCount).length > 0) {
        const sortedChannels = Object.entries(channelCount).sort((a, b) => b[1] - a[1]);
        const busiest = sortedChannels.slice(0, 3);
        recommendations.push(`📡 Canales más congestionados (2.4 GHz): ${busiest.map(([ch, count]) => `${ch} (${count} redes)`).join(', ')}`);
        
        // Recomendar canales
        const recommended = [1, 6, 11];
        const available = recommended.filter(ch => !channels24.includes(ch));
        if (available.length > 0) {
            recommendations.push(`💡 Canales recomendados (menos congestión): ${available.join(', ')}`);
        } else {
            recommendations.push('💡 Todos los canales 1, 6, 11 están ocupados. Considera 5 GHz.');
        }
    }
    
    // Análisis de seguridad
    const insecure = networks.filter(n => !n.encryption || n.encryption === 'Ninguna');
    if (insecure.length > 0) {
        recommendations.push(`🔴 ${insecure.length} red(es) sin cifrado: ${insecure.map(n => n.ssid).join(', ')}`);
    }
    
    // Análisis de señal
    const strong = networks.filter(n => n.signal > 70);
    if (strong.length > 0) {
        recommendations.push(`📶 ${strong.length} red(es) con señal excelente`);
    }
    
    // Recomendación de red
    const best = networks
        .filter(n => n.encryption && n.encryption !== 'Ninguna')
        .sort((a, b) => (b.signal || 0) - (a.signal || 0))[0];
    
    if (best) {
        recommendations.push(`🏆 Mejor red para conectarse: ${best.ssid} (${best.encryption}) señal ${best.signal}%`);
    }
    
    return recommendations;
}

// ==================== MAIN ====================
(async function main() {
    try {
        console.log(`🔍 Wifi Scanner - MFH TOOLS PRO`);
        console.log('='.repeat(60));
        console.log(`📡 Interfaz: ${interface}`);
        console.log(`📅 ${new Date().toLocaleString()}`);
        console.log('');
        
        // Obtener información de la interfaz
        const interfaceInfo = await getInterfaceInfo(interface);
        if (interfaceInfo) {
            console.log('📋 INFORMACIÓN DE LA INTERFAZ:');
            console.log(`   Modo: ${interfaceInfo.mode || 'N/A'}`);
            console.log(`   ESSID: ${interfaceInfo.essid || 'No conectado'}`);
            if (interfaceInfo.frequency) console.log(`   Frecuencia: ${interfaceInfo.frequency} GHz`);
            if (interfaceInfo.channel) console.log(`   Canal: ${interfaceInfo.channel}`);
            if (interfaceInfo.bitrate) console.log(`   Bitrate: ${interfaceInfo.bitrate} Mb/s`);
            if (interfaceInfo.txpower) console.log(`   Tx-Power: ${interfaceInfo.txpower} dBm`);
            if (interfaceInfo.linkQuality) console.log(`   Link Quality: ${interfaceInfo.linkQuality}%`);
            console.log('');
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
            console.log('  4. Verifica tu interfaz WiFi: iwconfig');
            process.exit(1);
        }
        
        if (networks.length === 0) {
            console.log('❌ No se encontraron redes WiFi');
            console.log('   Asegúrate de que el WiFi esté activo y la interfaz sea correcta');
            console.log('   Prueba: sudo iwlist scan');
            process.exit(0);
        }
        
        // Ordenar por señal
        networks.sort((a, b) => (b.signal || 0) - (a.signal || 0));
        
        // Mostrar resultados
        console.log(`\n📊 REDES ENCONTRADAS: ${networks.length}`);
        console.log('='.repeat(60));
        
        networks.forEach((net, i) => {
            const securityEmoji = getSecurityEmoji(net.encryption);
            const signalBar = getSignalBar(net.signal || 0);
            
            console.log(`\n${i + 1}. ${securityEmoji} ${net.ssid || 'Red Oculta'}`);
            console.log(`   🔹 BSSID: ${net.bssid || 'N/A'} ${net.vendor ? `(${net.vendor})` : ''}`);
            console.log(`   🔹 Canal: ${net.channel || 'N/A'} ${net.band ? `(${net.band})` : ''}`);
            console.log(`   🔹 Frecuencia: ${net.frequency ? net.frequency + ' MHz' : 'N/A'}`);
            console.log(`   🔹 Señal: ${net.signal || 0}% (${net.signalDb || 'N/A'} dBm)`);
            console.log(`   🔹 Calidad: ${signalBar}`);
            console.log(`   🔹 Seguridad: ${net.encryption || 'N/A'}`);
            console.log(`   🔹 Modo: ${net.mode || 'N/A'}`);
            if (net.bitrate) console.log(`   🔹 Bitrate: ${net.bitrate} Mb/s`);
            if (verbose) {
                console.log(`   🔹 Calidad: ${net.quality || 'N/A'}`);
            }
        });
        
        // Resumen de seguridad
        console.log('\n📊 RESUMEN DE SEGURIDAD:');
        const secure = networks.filter(n => n.encryption && !n.encryption.includes('Ninguna')).length;
        const insecure = networks.filter(n => !n.encryption || n.encryption.includes('Ninguna')).length;
        const wpa2 = networks.filter(n => n.encryption && n.encryption.includes('WPA2')).length;
        const wpa3 = networks.filter(n => n.encryption && n.encryption.includes('WPA3')).length;
        
        console.log(`   🔒 Redes seguras: ${secure}`);
        console.log(`   🔓 Redes inseguras: ${insecure}`);
        console.log(`   🟡 WPA2: ${wpa2}`);
        console.log(`   🟢 WPA3: ${wpa3}`);
        
        // Recomendaciones
        console.log('\n🔹 RECOMENDACIONES:');
        const recommendations = getRecommendations(networks);
        if (recommendations.length === 0) {
            console.log('   No se generaron recomendaciones específicas');
        } else {
            recommendations.forEach(rec => console.log(`   ${rec}`));
        }
        
        // Mostrar interfaz
        console.log('\n💡 Comandos útiles:');
        console.log(`   Ver interfaces: iwconfig`);
        console.log(`   Cambiar canal: sudo iwconfig ${interface} channel 6`);
        console.log(`   Conectar a red: nmcli dev wifi connect "SSID" password "pass"`);
        
        console.log('\n✅ Wifi Scanner completado exitosamente');
        
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        if (error.message.includes('sudo')) {
            console.log('   💡 Ejecuta con sudo: sudo node wifi-scanner.js');
        }
        process.exit(1);
    }
})();
