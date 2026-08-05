#!/usr/bin/env node

/**
 * DNS Zone Transfer Checker - MFH TOOLS PRO
 * Verifica transferencias de zona DNS (AXFR)
 * 
 * Uso: node dns-zone-transfer-checker.js <dominio> [opciones]
 * Ejemplo: node dns-zone-transfer-checker.js ejemplo.com
 * Ejemplo: node dns-zone-transfer-checker.js ejemplo.com --ns ns1.ejemplo.com
 * Ejemplo: node dns-zone-transfer-checker.js ejemplo.com --verbose
 */

const dns = require('dns').promises;
const net = require('net');
const fs = require('fs');

// ==================== CONFIGURACIÓN ====================
const CONFIG = {
    timeout: 10000,
    defaultPort: 53,
    maxRetries: 2
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let domain = null;
let nsServer = null;
let outputFile = null;
let verbose = false;

if (args.length < 1) {
    console.error(`
🔍 DNS Zone Transfer Checker - MFH TOOLS PRO
=============================================
Verifica transferencias de zona DNS (AXFR).

Uso:
  node dns-zone-transfer-checker.js <dominio> [opciones]

Opciones:
  --ns <servidor>      Servidor DNS específico para la transferencia
  --output <archivo>   Guardar resultados en archivo
  --verbose            Mostrar más detalles
  --help               Mostrar esta ayuda

Ejemplos:
  node dns-zone-transfer-checker.js ejemplo.com
  node dns-zone-transfer-checker.js ejemplo.com --ns ns1.ejemplo.com
  node dns-zone-transfer-checker.js ejemplo.com --verbose
`);
    process.exit(1);
}

domain = args[0];

for (let i = 1; i < args.length; i++) {
    if (args[i] === '--ns' && args[i + 1]) {
        nsServer = args[i + 1];
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
async function resolveNS(domain) {
    try {
        const nsRecords = await dns.resolveNs(domain);
        return nsRecords;
    } catch (error) {
        return null;
    }
}

async function resolveTarget(host) {
    try {
        const resolved = await dns.lookup(host);
        return resolved.address;
    } catch (error) {
        return host;
    }
}

function dnsQuery(host, domain, type = 'AXFR', timeout = CONFIG.timeout) {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        let data = Buffer.alloc(0);
        let resolved = false;
        
        // Construir consulta DNS (simplificada para AXFR)
        // Esta es una implementación básica, para una completa usar librerías como dns2
        const queryId = Math.floor(Math.random() * 65535);
        const flags = 0x0100; // Standard query
        const qCount = 1;
        
        // Construir nombre de dominio en formato DNS
        const nameParts = domain.split('.');
        let nameBuffer = Buffer.alloc(0);
        for (const part of nameParts) {
            nameBuffer = Buffer.concat([nameBuffer, Buffer.from([part.length]), Buffer.from(part, 'ascii')]);
        }
        nameBuffer = Buffer.concat([nameBuffer, Buffer.from([0])]);
        
        // Construir consulta
        const header = Buffer.alloc(12);
        header.writeUInt16BE(queryId, 0); // ID
        header.writeUInt16BE(flags, 2); // Flags
        header.writeUInt16BE(qCount, 4); // QDCOUNT
        header.writeUInt16BE(0, 6); // ANCOUNT
        header.writeUInt16BE(0, 8); // NSCOUNT
        header.writeUInt16BE(0, 10); // ARCOUNT
        
        // QTYPE = AXFR (252), QCLASS = IN (1)
        const question = Buffer.concat([
            nameBuffer,
            Buffer.from([0, 0xFC, 0, 1]) // AXFR + IN
        ]);
        
        const query = Buffer.concat([header, question]);
        
        socket.setTimeout(timeout);
        
        socket.on('connect', () => {
            socket.write(query);
        });
        
        socket.on('data', (chunk) => {
            data = Buffer.concat([data, chunk]);
            // Verificar respuesta
            if (data.length >= 12) {
                const responseId = data.readUInt16BE(0);
                if (responseId === queryId) {
                    const flagsResp = data.readUInt16BE(2);
                    const rcode = flagsResp & 0x0F;
                    if (rcode === 0) {
                        // Respuesta exitosa
                        const anCount = data.readUInt16BE(6);
                        if (anCount > 0) {
                            // Parsear registros (simplificado)
                            const records = parseDNSRecords(data, 12);
                            resolved = true;
                            socket.end();
                            resolve({ success: true, records, raw: data });
                        }
                    } else {
                        const errors = ['No error', 'Format error', 'Server failure', 'Name error', 'Not implemented', 'Refused'];
                        resolved = true;
                        socket.end();
                        resolve({ success: false, error: errors[rcode] || 'Unknown error', rcode });
                    }
                }
            }
        });
        
        socket.on('timeout', () => {
            socket.destroy();
            if (!resolved) {
                resolve({ success: false, error: 'Timeout' });
            }
        });
        
        socket.on('error', (err) => {
            if (!resolved) {
                resolve({ success: false, error: err.message });
            }
        });
        
        socket.on('end', () => {
            if (!resolved) {
                resolve({ success: false, error: 'Connection closed' });
            }
        });
        
        const port = 53;
        socket.connect(port, host);
    });
}

function parseDNSRecords(buffer, offset) {
    const records = [];
    let pos = offset;
    
    // Saltar nombre comprimido o nombre completo
    while (pos < buffer.length) {
        const labelLen = buffer[pos];
        if (labelLen === 0) {
            pos++;
            break;
        }
        if ((labelLen & 0xC0) === 0xC0) {
            // Es un puntero comprimido
            pos += 2;
            break;
        }
        pos += labelLen + 1;
    }
    
    // Leer TYPE, CLASS, TTL, RDLENGTH
    while (pos + 10 <= buffer.length) {
        const type = buffer.readUInt16BE(pos);
        const class_ = buffer.readUInt16BE(pos + 2);
        const ttl = buffer.readUInt32BE(pos + 4);
        const rdlength = buffer.readUInt16BE(pos + 8);
        pos += 10;
        
        if (pos + rdlength > buffer.length) break;
        
        const rdata = buffer.slice(pos, pos + rdlength);
        pos += rdlength;
        
        // Parsear RDATA según el tipo
        let rdataStr = '';
        if (type === 1) { // A
            rdataStr = rdata.join('.');
        } else if (type === 28) { // AAAA
            const parts = [];
            for (let i = 0; i < 8; i++) {
                parts.push(rdata.readUInt16BE(i * 2).toString(16));
            }
            rdataStr = parts.join(':');
        } else if (type === 15) { // MX
            const preference = rdata.readUInt16BE(0);
            const exchange = parseName(rdata, 2);
            rdataStr = `${preference} ${exchange}`;
        } else if (type === 5) { // CNAME
            rdataStr = parseName(rdata, 0);
        } else if (type === 2) { // NS
            rdataStr = parseName(rdata, 0);
        } else if (type === 16) { // TXT
            rdataStr = rdata.slice(1).toString();
        } else {
            rdataStr = rdata.toString('hex');
        }
        
        records.push({ type, class: class_, ttl, rdata: rdataStr });
    }
    
    return records;
}

function parseName(buffer, offset) {
    let pos = offset;
    let name = '';
    let labels = [];
    let jumped = false;
    
    while (pos < buffer.length) {
        const labelLen = buffer[pos];
        if (labelLen === 0) {
            pos++;
            break;
        }
        if ((labelLen & 0xC0) === 0xC0) {
            // Puntero comprimido
            const pointer = ((labelLen & 0x3F) << 8) | buffer[pos + 1];
            pos += 2;
            // Parsear el puntero
            let ptrPos = pointer;
            while (ptrPos < buffer.length) {
                const pLen = buffer[ptrPos];
                if (pLen === 0) break;
                if ((pLen & 0xC0) === 0xC0) {
                    const pPointer = ((pLen & 0x3F) << 8) | buffer[ptrPos + 1];
                    ptrPos = pPointer;
                    continue;
                }
                ptrPos++;
                const label = buffer.slice(ptrPos, ptrPos + pLen).toString();
                labels.push(label);
                ptrPos += pLen;
            }
            jumped = true;
            break;
        }
        pos++;
        const label = buffer.slice(pos, pos + labelLen).toString();
        labels.push(label);
        pos += labelLen;
    }
    
    name = labels.join('.');
    return name;
}

function getTypeName(type) {
    const types = {
        1: 'A', 2: 'NS', 5: 'CNAME', 6: 'SOA', 12: 'PTR', 15: 'MX',
        16: 'TXT', 28: 'AAAA', 33: 'SRV', 252: 'AXFR', 255: 'ANY'
    };
    return types[type] || `TYPE${type}`;
}

function isVulnerable(results) {
    if (!results || !results.records) return false;
    return results.records.length > 0;
}

function getSecurityScore(vulnerable) {
    if (vulnerable) return 0;
    return 100;
}

function getRecommendations(vulnerable, nsServers) {
    const recommendations = [];
    if (vulnerable) {
        recommendations.push('🔴 ¡VULNERABLE! - El servidor DNS permite transferencias de zona');
        recommendations.push('💡 Configurar el servidor DNS para rechazar transferencias de zona no autorizadas');
        recommendations.push('💡 Usar TSIG (Transaction Signatures) para autenticar transferencias');
        recommendations.push('💡 Limitar transferencias de zona solo a servidores DNS autorizados');
        recommendations.push('💡 Considerar usar DNSSEC para mayor seguridad');
    } else {
        recommendations.push('✅ El servidor DNS no permite transferencias de zona');
        recommendations.push('✅ Configuración segura detectada');
        if (nsServers && nsServers.length > 0) {
            recommendations.push(`💡 Verificar también los servidores: ${nsServers.join(', ')}`);
        }
    }
    return recommendations;
}

// ==================== MAIN ====================
(async function main() {
    try {
        console.log(`🔍 DNS Zone Transfer Checker - MFH TOOLS PRO`);
        console.log('='.repeat(60));
        console.log(`🎯 Dominio: ${domain}`);
        console.log('');
        
        // Obtener servidores NS
        let nsServers = [];
        if (nsServer) {
            nsServers = [nsServer];
        } else {
            nsServers = await resolveNS(domain);
            if (nsServers && nsServers.length > 0) {
                console.log(`📡 Servidores NS encontrados: ${nsServers.join(', ')}`);
            } else {
                console.log('⚠️ No se encontraron servidores NS para el dominio');
                console.log('   Usando servidores DNS públicos para prueba...');
                nsServers = ['8.8.8.8', '1.1.1.1'];
            }
        }
        console.log('');
        
        let vulnerable = false;
        let allResults = [];
        
        // Probar cada servidor NS
        for (const ns of nsServers) {
            console.log(`🔍 Probando servidor NS: ${ns}`);
            try {
                const ip = await resolveTarget(ns);
                console.log(`   📡 IP: ${ip}`);
                
                const result = await dnsQuery(ip, domain);
                
                if (result.success) {
                    console.log(`   ✅ Transferencia de zona EXITOSA`);
                    console.log(`   📋 Registros encontrados: ${result.records.length}`);
                    vulnerable = true;
                    allResults.push({ server: ns, success: true, records: result.records });
                    
                    if (verbose || result.records.length > 0) {
                        console.log('   📋 REGISTROS:');
                        const sortedRecords = result.records.sort((a, b) => a.type - b.type);
                        for (const record of sortedRecords.slice(0, 20)) {
                            const typeName = getTypeName(record.type);
                            console.log(`      ${typeName} ${record.rdata} (TTL: ${record.ttl})`);
                        }
                        if (result.records.length > 20) {
                            console.log(`      ... y ${result.records.length - 20} registros más`);
                        }
                    }
                } else {
                    console.log(`   ❌ Transferencia fallida: ${result.error || 'Desconocido'}`);
                    if (result.rcode) {
                        const errors = ['No error', 'Format error', 'Server failure', 'Name error', 'Not implemented', 'Refused'];
                        console.log(`   Código de error: ${result.rcode} (${errors[result.rcode] || 'Unknown'})`);
                    }
                }
            } catch (error) {
                console.log(`   ❌ Error al probar ${ns}: ${error.message}`);
            }
            console.log('');
        }
        
        // Resumen
        console.log('📊 RESUMEN');
        console.log('='.repeat(60));
        console.log(`🎯 Dominio: ${domain}`);
        console.log(`🔍 Servidores probados: ${nsServers.length}`);
        console.log(`⚠️ Vulnerable: ${vulnerable ? '🔴 SÍ' : '✅ NO'}`);
        
        if (vulnerable) {
            console.log('   ⚠️ El servidor DNS permite transferencias de zona');
            console.log('   Esto puede exponer información sensible del dominio');
        } else {
            console.log('   ✅ El servidor DNS no permite transferencias de zona');
        }
        
        // Recomendaciones
        console.log('');
        console.log('🔹 RECOMENDACIONES:');
        const recommendations = getRecommendations(vulnerable, nsServers);
        for (const rec of recommendations) {
            console.log(`   ${rec}`);
        }
        
        // Guardar resultados
        if (outputFile) {
            const exportData = {
                domain,
                timestamp: new Date().toISOString(),
                nsServers,
                vulnerable,
                results: allResults,
                recommendations
            };
            fs.writeFileSync(outputFile, JSON.stringify(exportData, null, 2));
            console.log(`\n📁 Resultados guardados en: ${outputFile}`);
        }
        
        console.log('\n✅ DNS Zone Transfer Checker completado exitosamente');
        
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        process.exit(1);
    }
})();
