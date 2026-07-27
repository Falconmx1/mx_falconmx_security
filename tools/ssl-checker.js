#!/usr/bin/env node

/**
 * SSL Checker - MFH TOOLS PRO
 * Verifica certificados SSL/TLS de dominios
 * 
 * Uso: node ssl-checker.js <dominio> [opciones]
 * Ejemplo: node ssl-checker.js google.com
 * Ejemplo: node ssl-checker.js ejemplo.com --port 443 --output ssl.json
 * Ejemplo: node ssl-checker.js google.com --verbose
 */

const tls = require('tls');
const net = require('net');
const https = require('https');
const fs = require('fs');
const dns = require('dns').promises;

// ==================== CONFIGURACIÓN ====================
const CONFIG = {
    timeout: 10000,
    defaultPort: 443,
    maxRetries: 2,
    weakCiphers: [
        'RC4', 'DES', '3DES', 'MD5', 'NULL', 'EXPORT', 'LOW', 'ANON'
    ],
    protocols: {
        'TLSv1.3': '✅ TLS 1.3 - Más reciente y seguro',
        'TLSv1.2': '✅ TLS 1.2 - Seguro y ampliamente usado',
        'TLSv1.1': '⚠️ TLS 1.1 - Obsoleto, no recomendado',
        'TLSv1.0': '❌ TLS 1.0 - Inseguro, no recomendado',
        'SSLv3': '❌ SSLv3 - Inseguro, no recomendado',
        'SSLv2': '❌ SSLv2 - Inseguro, no recomendado'
    },
    gradeScores: {
        'A+': { min: 95, label: 'Excelente - Configuración de seguridad óptima' },
        'A': { min: 85, label: 'Muy bueno - Configuración segura' },
        'B': { min: 70, label: 'Bueno - Configuración aceptable' },
        'C': { min: 50, label: 'Regular - Configuración mejorable' },
        'D': { min: 30, label: 'Malo - Configuración insegura' },
        'F': { min: 0, label: 'Muy malo - Configuración crítica' }
    }
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let domain = null;
let port = CONFIG.defaultPort;
let outputFile = null;
let verbose = false;

function showHelp() {
    console.error(`
🔍 SSL Checker - MFH TOOLS PRO
================================
Verifica certificados SSL/TLS de dominios y analiza su seguridad.

Uso:
  node ssl-checker.js <dominio> [opciones]

Opciones:
  --port <puerto>      Puerto a verificar (default: 443)
  --output <archivo>   Guardar resultados en archivo JSON
  --verbose            Mostrar más detalles en la salida
  --help               Mostrar esta ayuda

Ejemplos:
  node ssl-checker.js google.com
  node ssl-checker.js google.com --port 443 --output ssl.json
  node ssl-checker.js google.com --verbose
  node ssl-checker.js mail.google.com --port 993
`);
    process.exit(0);
}

// Parsear argumentos
for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--port' && args[i + 1]) {
        port = parseInt(args[i + 1]) || CONFIG.defaultPort;
        i++;
    } else if (arg === '--output' && args[i + 1]) {
        outputFile = args[i + 1];
        i++;
    } else if (arg === '--verbose') {
        verbose = true;
    } else if (arg === '--help') {
        showHelp();
    } else if (!arg.startsWith('--')) {
        domain = arg;
    }
}

if (!domain) {
    showHelp();
}

// ==================== FUNCIONES SSL ====================
async function getSSLCertificate(host, port) {
    return new Promise((resolve, reject) => {
        const socket = tls.connect({
            host: host,
            port: port,
            rejectUnauthorized: false,
            timeout: CONFIG.timeout
        }, () => {
            const cert = socket.getPeerCertificate(true);
            const cipher = socket.getCipher();
            const protocol = socket.getProtocol();
            
            socket.end();
            
            resolve({
                certificate: cert,
                cipher: cipher,
                protocol: protocol,
                connected: true
            });
        });
        
        socket.on('timeout', () => {
            socket.destroy();
            reject(new Error('Timeout al conectar'));
        });
        
        socket.on('error', (err) => {
            reject(err);
        });
    });
}

async function getSSLInfo(host, port) {
    try {
        // Intentar hasta 2 veces
        for (let attempt = 0; attempt <= CONFIG.maxRetries; attempt++) {
            try {
                const result = await getSSLCertificate(host, port);
                return result;
            } catch (err) {
                if (attempt === CONFIG.maxRetries) {
                    throw err;
                }
                await new Promise(r => setTimeout(r, 500));
            }
        }
        throw new Error('No se pudo obtener el certificado SSL');
    } catch (error) {
        throw new Error(`Error SSL: ${error.message}`);
    }
}

// ==================== ANALIZAR CERTIFICADO ====================
function parseCertificate(cert) {
    const info = {
        subject: {},
        issuer: {},
        validity: {},
        extensions: {},
        fingerprint: {}
    };
    
    // Subject
    if (cert.subject) {
        info.subject = cert.subject;
        info.subject.CN = cert.subject.CN || 'Desconocido';
        info.subject.O = cert.subject.O || 'Desconocido';
    }
    
    // Issuer
    if (cert.issuer) {
        info.issuer = cert.issuer;
        info.issuer.CN = cert.issuer.CN || 'Desconocido';
        info.issuer.O = cert.issuer.O || 'Desconocido';
    }
    
    // Validity
    if (cert.valid_from && cert.valid_to) {
        info.validity.from = new Date(cert.valid_from);
        info.validity.to = new Date(cert.valid_to);
        info.validity.daysLeft = Math.floor((info.validity.to - Date.now()) / (1000 * 60 * 60 * 24));
        info.validity.isExpired = info.validity.daysLeft < 0;
    }
    
    // Fingerprints
    if (cert.fingerprint256) {
        info.fingerprint.sha256 = cert.fingerprint256;
    }
    if (cert.fingerprint) {
        info.fingerprint.sha1 = cert.fingerprint;
    }
    
    // Extensions
    if (cert.extensions) {
        info.extensions = cert.extensions;
        info.extensions.san = cert.extensions.subjectAltName || 'No disponible';
    }
    
    // Información adicional
    info.serialNumber = cert.serialNumber || 'Desconocido';
    info.pubkeySize = cert.pubkeySize || 'Desconocido';
    info.signatureAlgorithm = cert.sigalg || 'Desconocido';
    
    return info;
}

// ==================== ANALIZAR SEGURIDAD ====================
function analyzeSecurity(certInfo, protocol, cipher) {
    const issues = [];
    const warnings = [];
    const recommendations = [];
    let score = 100;
    
    // 1. Verificar validez del certificado
    if (certInfo.validity.isExpired) {
        issues.push(`❌ El certificado expiró el ${certInfo.validity.to.toLocaleDateString()}`);
        score -= 30;
    } else if (certInfo.validity.daysLeft < 30) {
        warnings.push(`⚠️ El certificado expira en ${certInfo.validity.daysLeft} días (${certInfo.validity.to.toLocaleDateString()})`);
        score -= 10;
    } else if (certInfo.validity.daysLeft < 90) {
        warnings.push(`ℹ️ El certificado expira en ${certInfo.validity.daysLeft} días`);
        score -= 5;
    }
    
    // 2. Verificar protocolo TLS/SSL
    if (protocol) {
        if (protocol.includes('TLSv1.3')) {
            recommendations.push('✅ Usando TLS 1.3 - excelente');
        } else if (protocol.includes('TLSv1.2')) {
            recommendations.push('✅ Usando TLS 1.2 - seguro');
        } else if (protocol.includes('TLSv1.1')) {
            warnings.push('⚠️ Usando TLS 1.1 - obsoleto, actualizar a TLS 1.2+');
            score -= 15;
        } else if (protocol.includes('TLSv1.0')) {
            issues.push('❌ Usando TLS 1.0 - inseguro');
            score -= 25;
        } else if (protocol.includes('SSL')) {
            issues.push('❌ Usando SSL - inseguro, descontinuado');
            score -= 40;
        } else {
            warnings.push(`⚠️ Protocolo desconocido: ${protocol}`);
            score -= 5;
        }
    }
    
    // 3. Verificar cifrado
    if (cipher && cipher.name) {
        const cipherName = cipher.name;
        const isWeak = CONFIG.weakCiphers.some(weak => cipherName.includes(weak));
        if (isWeak) {
            issues.push(`❌ Usando cifrado débil: ${cipherName}`);
            score -= 20;
        } else if (cipherName.includes('ECDHE') || cipherName.includes('DHE')) {
            recommendations.push(`✅ Usando cifrado con Perfect Forward Secrecy: ${cipherName}`);
        } else {
            warnings.push(`ℹ️ Cifrado: ${cipherName} (verificar compatibilidad)`);
        }
        
        // Verificar tamaño de clave
        if (cipher.bits && cipher.bits < 128) {
            issues.push(`❌ Tamaño de clave bajo: ${cipher.bits} bits`);
            score -= 15;
        } else if (cipher.bits && cipher.bits < 256) {
            warnings.push(`ℹ️ Tamaño de clave: ${cipher.bits} bits (recomendado 256+)`);
            score -= 5;
        }
    }
    
    // 4. Verificar SAN (Subject Alternative Name)
    const san = certInfo.extensions.san || '';
    if (san && san !== 'No disponible') {
        const domains = san.split(',').map(s => s.trim());
        if (domains.length > 1) {
            recommendations.push(`✅ Certificado con ${domains.length} nombres alternativos (SAN)`);
        }
    } else {
        warnings.push('⚠️ Certificado sin Subject Alternative Name (SAN)');
        score -= 5;
    }
    
    // 5. Verificar tamaño de clave pública
    if (certInfo.pubkeySize && certInfo.pubkeySize < 2048) {
        issues.push(`❌ Tamaño de clave pública bajo: ${certInfo.pubkeySize} bits (recomendado 2048+)`);
        score -= 15;
    } else if (certInfo.pubkeySize && certInfo.pubkeySize < 3072) {
        warnings.push(`ℹ️ Tamaño de clave pública: ${certInfo.pubkeySize} bits (recomendado 2048+, ideal 4096)`);
        score -= 5;
    }
    
    // 6. Verificar firma
    if (certInfo.signatureAlgorithm) {
        if (certInfo.signatureAlgorithm.includes('sha1')) {
            warnings.push('⚠️ Usando firma SHA-1 - obsoleta, considerar actualizar');
            score -= 5;
        } else if (certInfo.signatureAlgorithm.includes('sha256') || certInfo.signatureAlgorithm.includes('sha384')) {
            recommendations.push(`✅ Firma con ${certInfo.signatureAlgorithm} - seguro`);
        }
    }
    
    // 7. Verificar cadena de certificados (simulado)
    if (certInfo.issuer.CN && certInfo.issuer.CN !== certInfo.subject.CN) {
        recommendations.push('✅ Certificado firmado por CA: ' + certInfo.issuer.CN);
    } else {
        warnings.push('⚠️ Certificado autofirmado - no confiable en producción');
        score -= 10;
    }
    
    // Calcular nota
    const grade = calculateGrade(score);
    
    return {
        score: Math.max(0, Math.min(100, score)),
        grade,
        issues,
        warnings,
        recommendations
    };
}

function calculateGrade(score) {
    for (const [grade, data] of Object.entries(CONFIG.gradeScores)) {
        if (score >= data.min) {
            return {
                letter: grade,
                label: data.label,
                score: score
            };
        }
    }
    return {
        letter: 'F',
        label: CONFIG.gradeScores.F.label,
        score: score
    };
}

// ==================== MAIN ====================
(async function main() {
    try {
        console.log(`🔍 SSL Checker - ${domain}:${port}`);
        console.log('='.repeat(60));
        
        // Resolver dominio
        try {
            const ips = await dns.resolve4(domain);
            console.log(`📡 Resolviendo ${domain} → ${ips.join(', ')}`);
        } catch (dnsError) {
            console.warn(`⚠️ No se pudo resolver el dominio: ${dnsError.message}`);
        }
        
        console.log('');
        
        // Obtener certificado SSL
        console.log('🔐 Obteniendo certificado SSL...');
        const result = await getSSLInfo(domain, port);
        
        if (!result.connected) {
            console.error('❌ No se pudo conectar al servidor');
            process.exit(1);
        }
        
        // Parsear certificado
        const certInfo = parseCertificate(result.certificate);
        
        // Analizar seguridad
        const security = analyzeSecurity(certInfo, result.protocol, result.cipher);
        
        // ==================== MOSTRAR RESULTADOS ====================
        console.log('📊 RESULTADOS SSL');
        console.log('='.repeat(60));
        
        // 1. Información básica
        console.log('\n🔹 INFORMACIÓN BÁSICA:');
        console.log(`   Dominio: ${domain}`);
        console.log(`   Puerto: ${port}`);
        console.log(`   Protocolo: ${result.protocol || 'Desconocido'}`);
        console.log(`   Cifrado: ${result.cipher ? result.cipher.name : 'Desconocido'}`);
        console.log(`   Tamaño de clave: ${result.cipher && result.cipher.bits ? result.cipher.bits + ' bits' : 'Desconocido'}`);
        
        // 2. Certificado
        console.log('\n🔹 CERTIFICADO:');
        console.log(`   Emitido por: ${certInfo.issuer.CN}`);
        console.log(`   Organización: ${certInfo.issuer.O}`);
        console.log(`   Para: ${certInfo.subject.CN}`);
        console.log(`   Serial: ${certInfo.serialNumber}`);
        console.log(`   Algoritmo de firma: ${certInfo.signatureAlgorithm}`);
        console.log(`   Tamaño de clave pública: ${certInfo.pubkeySize} bits`);
        
        // 3. Validez
        console.log('\n🔹 VALIDEZ:');
        console.log(`   Desde: ${certInfo.validity.from.toLocaleDateString()}`);
        console.log(`   Hasta: ${certInfo.validity.to.toLocaleDateString()}`);
        console.log(`   Días restantes: ${certInfo.validity.daysLeft}`);
        if (certInfo.validity.isExpired) {
            console.log(`   ❌ CERTIFICADO EXPIRADO`);
        } else if (certInfo.validity.daysLeft < 30) {
            console.log(`   ⚠️ El certificado expira pronto`);
        }
        
        // 4. Huellas digitales
        console.log('\n🔹 HUELAS DIGITALES:');
        console.log(`   SHA-256: ${certInfo.fingerprint.sha256}`);
        console.log(`   SHA-1: ${certInfo.fingerprint.sha1}`);
        
        // 5. SAN
        console.log('\n🔹 NOMBRES ALTERNATIVOS (SAN):');
        console.log(`   ${certInfo.extensions.san}`);
        
        // 6. Seguridad
        console.log('\n🔹 ANÁLISIS DE SEGURIDAD:');
        console.log(`   Puntuación: ${security.score}/100`);
        console.log(`   Calificación: ${security.grade.letter} - ${security.grade.label}`);
        
        // 7. Problemas
        if (security.issues.length > 0) {
            console.log('\n🔴 PROBLEMAS ENCONTRADOS:');
            security.issues.forEach(issue => console.log(`   ${issue}`));
        }
        
        // 8. Advertencias
        if (security.warnings.length > 0) {
            console.log('\n🟡 ADVERTENCIAS:');
            security.warnings.forEach(warning => console.log(`   ${warning}`));
        }
        
        // 9. Recomendaciones
        if (security.recommendations.length > 0) {
            console.log('\n🟢 RECOMENDACIONES:');
            security.recommendations.forEach(rec => console.log(`   ${rec}`));
        }
        
        // ==================== GUARDAR RESULTADOS ====================
        if (outputFile) {
            const exportData = {
                domain,
                port,
                timestamp: new Date().toISOString(),
                protocol: result.protocol,
                cipher: result.cipher,
                certificate: {
                    subject: certInfo.subject,
                    issuer: certInfo.issuer,
                    validity: {
                        from: certInfo.validity.from.toISOString(),
                        to: certInfo.validity.to.toISOString(),
                        daysLeft: certInfo.validity.daysLeft,
                        isExpired: certInfo.validity.isExpired
                    },
                    fingerprint: certInfo.fingerprint,
                    serialNumber: certInfo.serialNumber,
                    pubkeySize: certInfo.pubkeySize,
                    signatureAlgorithm: certInfo.signatureAlgorithm,
                    san: certInfo.extensions.san
                },
                security: {
                    score: security.score,
                    grade: security.grade,
                    issues: security.issues,
                    warnings: security.warnings,
                    recommendations: security.recommendations
                }
            };
            fs.writeFileSync(outputFile, JSON.stringify(exportData, null, 2));
            console.log(`\n📁 Resultados guardados en: ${outputFile}`);
        }
        
        console.log('\n✅ SSL Checker completado exitosamente');
        
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        if (verbose) {
            console.error(error.stack);
        }
        process.exit(1);
    }
})();
