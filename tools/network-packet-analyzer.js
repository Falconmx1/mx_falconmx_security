#!/usr/bin/env node

/**
 * Network Packet Analyzer - MFH TOOLS PRO
 * Analiza paquetes de red (PCAP)
 * 
 * Uso: node network-packet-analyzer.js <archivo.pcap> [opciones]
 * Ejemplo: node network-packet-analyzer.js capture.pcap
 * Ejemplo: node network-packet-analyzer.js capture.pcap --protocols TCP,UDP,HTTP
 * Ejemplo: node network-packet-analyzer.js capture.pcap --output reporte.txt
 */

const fs = require('fs');
const path = require('path');

// ==================== CONFIGURACIÓN ====================
const CONFIG = {
    maxFileSize: 200 * 1024 * 1024, // 200MB
    commonPorts: {
        21: 'FTP', 22: 'SSH', 23: 'Telnet', 25: 'SMTP', 53: 'DNS',
        80: 'HTTP', 110: 'POP3', 111: 'RPC', 135: 'MSRPC', 139: 'NetBIOS',
        143: 'IMAP', 443: 'HTTPS', 445: 'SMB', 993: 'IMAPS', 995: 'POP3S',
        1723: 'PPTP', 3306: 'MySQL', 3389: 'RDP', 5432: 'PostgreSQL',
        5900: 'VNC', 6379: 'Redis', 8080: 'HTTP-Proxy', 27017: 'MongoDB'
    },
    protocols: {
        6: 'TCP',
        17: 'UDP',
        1: 'ICMP',
        2: 'IGMP',
        6: 'TCP',
        17: 'UDP',
        47: 'GRE',
        50: 'ESP',
        51: 'AH'
    }
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let inputFile = null;
let outputFile = null;
let selectedProtocols = null;
let verbose = false;

if (args.length < 1) {
    console.error(`
🔍 Network Packet Analyzer - MFH TOOLS PRO
===========================================
Analiza paquetes de red (PCAP).

Uso:
  node network-packet-analyzer.js <archivo.pcap> [opciones]

Opciones:
  --protocols <lista>  Protocolos a analizar (TCP,UDP,HTTP,DNS,ICMP)
  --output <archivo>   Guardar reporte en archivo
  --verbose            Mostrar más detalles
  --help               Mostrar esta ayuda

Ejemplos:
  node network-packet-analyzer.js capture.pcap
  node network-packet-analyzer.js capture.pcap --protocols TCP,UDP,HTTP
  node network-packet-analyzer.js capture.pcap --output reporte.txt
`);
    process.exit(1);
}

inputFile = args[0];

for (let i = 1; i < args.length; i++) {
    if (args[i] === '--protocols' && args[i + 1]) {
        selectedProtocols = args[i + 1].split(',').map(p => p.trim().toUpperCase());
        i++;
    } else if (args[i] === '--output' && args[i + 1]) {
        outputFile = args[i + 1];
        i++;
    } else if (args[i] === '--verbose') {
        verbose = true;
    } else if (args[i] === '--help') {
        console.error('Ayuda: revisa el mensaje de uso arriba.');
        process.exit(0);
    }
}

// ==================== FUNCIONES ====================
function getFileInfo(filePath) {
    try {
        const stats = fs.statSync(filePath);
        return {
            size: stats.size,
            sizeFormatted: formatFileSize(stats.size),
            modified: stats.mtime
        };
    } catch (error) {
        return null;
    }
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function parsePCAP(buffer) {
    const packets = [];
    let offset = 0;
    
    // PCAP Global Header (24 bytes)
    if (buffer.length < 24) {
        return { error: 'Archivo PCAP inválido' };
    }
    
    const magic = buffer.readUInt32LE(0);
    if (magic !== 0xA1B2C3D4) {
        return { error: 'Formato PCAP no soportado' };
    }
    
    const versionMajor = buffer.readUInt16LE(4);
    const versionMinor = buffer.readUInt16LE(6);
    const timezone = buffer.readInt32LE(8);
    const sigfigs = buffer.readUInt32LE(12);
    const snaplen = buffer.readUInt32LE(16);
    const network = buffer.readUInt32LE(20);
    
    offset = 24;
    let packetCount = 0;
    const maxPackets = 10000;
    
    console.log(`📡 Procesando paquetes (máximo ${maxPackets})...`);
    
    while (offset + 16 <= buffer.length && packetCount < maxPackets) {
        // Packet Header (16 bytes)
        const tsSec = buffer.readUInt32LE(offset);
        const tsUsec = buffer.readUInt32LE(offset + 4);
        const inclLen = buffer.readUInt32LE(offset + 8);
        const origLen = buffer.readUInt32LE(offset + 12);
        offset += 16;
        
        if (offset + inclLen > buffer.length) break;
        
        const packetData = buffer.slice(offset, offset + inclLen);
        offset += inclLen;
        
        if (packetData.length < 14) continue;
        
        // Parsear Ethernet Header (14 bytes)
        const ethDest = packetData.slice(0, 6);
        const ethSrc = packetData.slice(6, 12);
        const ethType = packetData.readUInt16BE(12);
        
        let packet = {
            timestamp: new Date(tsSec * 1000 + tsUsec / 1000).toISOString(),
            srcMAC: formatMAC(ethSrc),
            dstMAC: formatMAC(ethDest),
            type: 'Ethernet',
            ethType: ethType
        };
        
        // IP (IPv4 = 0x0800)
        if (ethType === 0x0800 && packetData.length >= 34) {
            const ipHeader = packetData.slice(14);
            const version = (ipHeader[0] >> 4) & 0x0F;
            const ihl = ipHeader[0] & 0x0F;
            const protocol = ipHeader[9];
            const srcIP = formatIP(ipHeader.slice(12, 16));
            const dstIP = formatIP(ipHeader.slice(16, 20));
            
            packet.type = 'IP';
            packet.protocol = CONFIG.protocols[protocol] || `Unknown(${protocol})`;
            packet.srcIP = srcIP;
            packet.dstIP = dstIP;
            
            // TCP
            if (protocol === 6 && packetData.length >= 14 + ihl * 4 + 20) {
                const tcpOffset = 14 + ihl * 4;
                const srcPort = ipHeader.readUInt16BE(tcpOffset);
                const dstPort = ipHeader.readUInt16BE(tcpOffset + 2);
                const flags = ipHeader[tcpOffset + 13];
                
                packet.protocol = 'TCP';
                packet.srcPort = srcPort;
                packet.dstPort = dstPort;
                packet.srcService = CONFIG.commonPorts[srcPort] || 'unknown';
                packet.dstService = CONFIG.commonPorts[dstPort] || 'unknown';
                packet.flags = {
                    FIN: (flags & 0x01) !== 0,
                    SYN: (flags & 0x02) !== 0,
                    RST: (flags & 0x04) !== 0,
                    PSH: (flags & 0x08) !== 0,
                    ACK: (flags & 0x10) !== 0,
                    URG: (flags & 0x20) !== 0
                };
                
                // HTTP
                if (dstPort === 80 || srcPort === 80) {
                    packet.protocol = 'HTTP';
                    packet.isHTTP = true;
                    
                    // Verificar si es petición HTTP
                    const dataOffset = tcpOffset + ((ipHeader[tcpOffset + 12] >> 4) & 0x0F) * 4;
                    if (packetData.length > dataOffset + 4) {
                        const httpData = packetData.slice(dataOffset).toString('ascii');
                        if (httpData.includes('GET') || httpData.includes('POST') || httpData.includes('HTTP/')) {
                            packet.httpMethod = httpData.split(' ')[0] || 'UNKNOWN';
                            const urlMatch = httpData.match(/(GET|POST|PUT|DELETE)\s+([^\s]+)/);
                            if (urlMatch) packet.httpURL = urlMatch[2];
                        }
                    }
                }
                
                // HTTPS
                if (dstPort === 443 || srcPort === 443) {
                    packet.protocol = 'HTTPS';
                }
            }
            
            // UDP
            if (protocol === 17 && packetData.length >= 14 + ihl * 4 + 8) {
                const udpOffset = 14 + ihl * 4;
                const srcPort = ipHeader.readUInt16BE(udpOffset);
                const dstPort = ipHeader.readUInt16BE(udpOffset + 2);
                
                packet.protocol = 'UDP';
                packet.srcPort = srcPort;
                packet.dstPort = dstPort;
                packet.srcService = CONFIG.commonPorts[srcPort] || 'unknown';
                packet.dstService = CONFIG.commonPorts[dstPort] || 'unknown';
                
                // DNS
                if (dstPort === 53 || srcPort === 53) {
                    packet.protocol = 'DNS';
                }
            }
            
            // ICMP
            if (protocol === 1) {
                packet.protocol = 'ICMP';
                packet.icmpType = ipHeader[20];
                packet.icmpCode = ipHeader[21];
            }
        }
        
        packets.push(packet);
        packetCount++;
        
        if (packetCount % 1000 === 0) {
            process.stdout.write(`\r📊 Paquetes procesados: ${packetCount}`);
        }
    }
    
    process.stdout.write('\n');
    return { packets, total: packetCount };
}

function formatMAC(buffer) {
    if (buffer.length < 6) return 'Unknown';
    return buffer.toString('hex').match(/.{1,2}/g).join(':').toUpperCase();
}

function formatIP(buffer) {
    if (buffer.length < 4) return 'Unknown';
    return [buffer[0], buffer[1], buffer[2], buffer[3]].join('.');
}

function analyzePackets(packets) {
    const analysis = {
        total: packets.length,
        protocols: {},
        services: {},
        srcIPs: {},
        dstIPs: {},
        topConversations: {},
        httpRequests: [],
        dnsQueries: [],
        errors: 0,
        bytesTotal: 0,
        uniqueSrcIPs: new Set(),
        uniqueDstIPs: new Set()
    };
    
    for (const packet of packets) {
        // Protocolos
        if (packet.protocol) {
            analysis.protocols[packet.protocol] = (analysis.protocols[packet.protocol] || 0) + 1;
        }
        
        // Servicios
        if (packet.dstService && packet.dstService !== 'unknown') {
            analysis.services[packet.dstService] = (analysis.services[packet.dstService] || 0) + 1;
        }
        
        // IPs
        if (packet.srcIP) {
            analysis.uniqueSrcIPs.add(packet.srcIP);
            analysis.srcIPs[packet.srcIP] = (analysis.srcIPs[packet.srcIP] || 0) + 1;
        }
        if (packet.dstIP) {
            analysis.uniqueDstIPs.add(packet.dstIP);
            analysis.dstIPs[packet.dstIP] = (analysis.dstIPs[packet.dstIP] || 0) + 1;
        }
        
        // Conversaciones
        if (packet.srcIP && packet.dstIP) {
            const key = `${packet.srcIP} → ${packet.dstIP}`;
            analysis.topConversations[key] = (analysis.topConversations[key] || 0) + 1;
        }
        
        // HTTP
        if (packet.httpURL) {
            analysis.httpRequests.push({
                timestamp: packet.timestamp,
                method: packet.httpMethod || 'GET',
                url: packet.httpURL,
                srcIP: packet.srcIP
            });
        }
        
        // DNS
        if (packet.protocol === 'DNS') {
            analysis.dnsQueries.push({
                timestamp: packet.timestamp,
                srcIP: packet.srcIP,
                dstIP: packet.dstIP
            });
        }
    }
    
    return analysis;
}

function getNetworkStatus(analysis) {
    const status = {
        isBusy: analysis.total > 10000,
        hasHTTPS: analysis.protocols['HTTPS'] > 0,
        hasHTTP: analysis.protocols['HTTP'] > 0,
        hasDNS: analysis.protocols['DNS'] > 0,
        hasSSH: analysis.protocols['SSH'] > 0,
        topProtocol: null
    };
    
    // Protocolo más usado
    let max = 0;
    for (const [proto, count] of Object.entries(analysis.protocols)) {
        if (count > max) {
            max = count;
            status.topProtocol = proto;
        }
    }
    
    return status;
}

function getRecommendations(analysis, status) {
    const recommendations = [];
    
    if (analysis.total === 0) {
        recommendations.push('⚠️ No se encontraron paquetes para analizar');
        return recommendations;
    }
    
    if (status.isBusy) {
        recommendations.push('📊 Red con alto tráfico - Considerar segmentación');
    }
    
    if (!status.hasHTTPS && status.hasHTTP) {
        recommendations.push('🔒 Tráfico HTTP detectado sin HTTPS - Considerar cifrado');
    }
    
    if (!status.hasDNS) {
        recommendations.push('⚠️ No se detectaron consultas DNS - Verificar configuración');
    }
    
    if (analysis.uniqueSrcIPs.size > 100) {
        recommendations.push('📡 Múltiples orígenes de IP - Posible red grande o ataque');
    }
    
    if (analysis.protocols['TCP'] > analysis.total * 0.8) {
        recommendations.push('🔗 Alto tráfico TCP - Verificar conexiones establecidas');
    }
    
    if (analysis.httpRequests.length > 0) {
        recommendations.push(`🌐 ${analysis.httpRequests.length} peticiones HTTP detectadas`);
    }
    
    if (analysis.dnsQueries.length > 0) {
        recommendations.push(`🔍 ${analysis.dnsQueries.length} consultas DNS detectadas`);
    }
    
    if (recommendations.length === 0) {
        recommendations.push('✅ Tráfico normal - Sin anomalías detectadas');
    }
    
    return recommendations;
}

// ==================== MAIN ====================
(async function main() {
    try {
        console.log(`🔍 Network Packet Analyzer - MFH TOOLS PRO`);
        console.log('='.repeat(60));
        console.log(`📁 Archivo: ${inputFile}`);
        
        // Verificar archivo
        if (!fs.existsSync(inputFile)) {
            console.error(`❌ Archivo no encontrado: ${inputFile}`);
            process.exit(1);
        }
        
        const fileInfo = getFileInfo(inputFile);
        console.log(`📏 Tamaño: ${fileInfo.sizeFormatted}`);
        console.log(`📅 Última modificación: ${fileInfo.modified.toLocaleString()}`);
        
        // Leer archivo
        console.log('📖 Leyendo archivo PCAP...');
        const buffer = fs.readFileSync(inputFile);
        console.log(`📏 Tamaño del buffer: ${formatFileSize(buffer.length)}`);
        console.log('');
        
        // Parsear PCAP
        console.log('🔍 Parseando paquetes...');
        const result = parsePCAP(buffer);
        
        if (result.error) {
            console.error(`❌ ${result.error}`);
            process.exit(1);
        }
        
        const packets = result.packets;
        console.log(`✅ ${packets.length} paquetes analizados`);
        console.log('');
        
        // Analizar paquetes
        console.log('📊 Analizando tráfico...');
        const analysis = analyzePackets(packets);
        const status = getNetworkStatus(analysis);
        
        console.log('📊 RESULTADOS DEL ANÁLISIS');
        console.log('='.repeat(60));
        console.log(`📦 Total de paquetes: ${analysis.total}`);
        console.log(`🔄 Protocolos únicos: ${Object.keys(analysis.protocols).length}`);
        console.log(`🖥️ IPs origen únicas: ${analysis.uniqueSrcIPs.size}`);
        console.log(`🖥️ IPs destino únicas: ${analysis.uniqueDstIPs.size}`);
        console.log(`📡 Protocolo más usado: ${status.topProtocol || 'N/A'}`);
        console.log('');
        
        // Protocolos
        if (Object.keys(analysis.protocols).length > 0) {
            console.log('🔹 PROTOCOLOS DETECTADOS:');
            const sortedProtocols = Object.entries(analysis.protocols).sort((a, b) => b[1] - a[1]);
            for (const [protocol, count] of sortedProtocols.slice(0, 10)) {
                const percent = ((count / analysis.total) * 100).toFixed(2);
                console.log(`   ${protocol}: ${count} paquetes (${percent}%)`);
            }
            if (sortedProtocols.length > 10) {
                console.log(`   ... y ${sortedProtocols.length - 10} protocolos más`);
            }
            console.log('');
        }
        
        // HTTP Requests
        if (analysis.httpRequests.length > 0) {
            console.log('🌐 PETICIONES HTTP:');
            const preview = analysis.httpRequests.slice(0, 5);
            for (const req of preview) {
                console.log(`   ${req.method} ${req.url}`);
            }
            if (analysis.httpRequests.length > 5) {
                console.log(`   ... y ${analysis.httpRequests.length - 5} peticiones más`);
            }
            console.log('');
        }
        
        // Top conversaciones
        if (Object.keys(analysis.topConversations).length > 0) {
            console.log('💬 TOP CONVERSACIONES:');
            const sortedConvs = Object.entries(analysis.topConversations).sort((a, b) => b[1] - a[1]).slice(0, 5);
            for (const [conv, count] of sortedConvs) {
                console.log(`   ${conv}: ${count} paquetes`);
            }
            console.log('');
        }
        
        // Recomendaciones
        console.log('🔹 RECOMENDACIONES:');
        const recommendations = getRecommendations(analysis, status);
        for (const rec of recommendations) {
            console.log(`   ${rec}`);
        }
        
        // Guardar resultados
        if (outputFile) {
            const content = `
Network Packet Analyzer - MFH TOOLS PRO
======================================
Archivo: ${inputFile}
Fecha: ${new Date().toLocaleString()}
Paquetes: ${analysis.total}
Protocolos: ${Object.keys(analysis.protocols).length}

PROTOCOLOS:
${Object.entries(analysis.protocols).map(([p, c]) => `  ${p}: ${c}`).join('\n')}

IPs ORIGEN:
${Object.entries(analysis.srcIPs).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([ip, c]) => `  ${ip}: ${c}`).join('\n')}

IPs DESTINO:
${Object.entries(analysis.dstIPs).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([ip, c]) => `  ${ip}: ${c}`).join('\n')}

HTTP REQUESTS:
${analysis.httpRequests.map(r => `  ${r.method} ${r.url}`).join('\n')}
`;
            fs.writeFileSync(outputFile, content);
            console.log(`\n📁 Reporte guardado en: ${outputFile}`);
        }
        
        console.log('\n✅ Network Packet Analyzer completado exitosamente');
        
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        process.exit(1);
    }
})();
