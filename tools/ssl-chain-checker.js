#!/usr/bin/env node

/**
 * SSL Certificate Chain Checker - MFH TOOLS PRO
 * Verifica la cadena completa de certificados SSL
 * 
 * Uso: node ssl-chain-checker.js [opciones]
 * Ejemplo: node ssl-chain-checker.js --domain google.com
 * Ejemplo: node ssl-chain-checker.js --domain example.com --output report.json
 */

const https = require('https');
const tls = require('tls');
const fs = require('fs');
const path = require('path');

// ==================== CONFIGURACIÓN ====================
const CONFIG = {
    timeout: 10000,
    port: 443
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let domain = null;
let outputFile = null;
let verbose = false;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--domain':
        case '-d':
            domain = args[i + 1];
            i++;
            break;
        case '--output':
        case '-o':
            outputFile = args[i + 1];
            i++;
            break;
        case '--verbose':
        case '-v':
            verbose = true;
            break;
        case '--help':
        case '-h':
            console.log(`
🔍 SSL Certificate Chain Checker - MFH TOOLS PRO
==================================================
Verifica la cadena completa de certificados SSL.

Uso:
  node ssl-chain-checker.js [opciones]

Opciones:
  --domain, -d <dominio>   Dominio a verificar
  --output, -o <archivo>   Guardar resultados en JSON
  --verbose, -v            Mostrar más detalles
  --help, -h               Mostrar esta ayuda

Ejemplos:
  node ssl-chain-checker.js --domain google.com
  node ssl-chain-checker.js --domain example.com --output report.json
`);
            process.exit(0);
    }
}

// ==================== FUNCIONES ====================
function getCertificateChain(host, port = CONFIG.port) {
    return new Promise((resolve, reject) => {
        const socket = tls.connect({
            host,
            port,
            rejectUnauthorized: false,
            timeout: CONFIG.timeout
        });

        socket.once('secureConnect', () => {
            const cert = socket.getCertificate();
            const peerCertificates = socket.getPeerCertificate(true);
            
            // Extraer cadena completa
            const chain = [];
            let current = peerCertificates;
            
            while (current) {
                chain.push({
                    subject: current.subject,
                    issuer: current.issuer,
                    validFrom: current.valid_from,
                    validTo: current.valid_to,
                    fingerprint: current.fingerprint,
                    serialNumber: current.serialNumber,
                    issuerCertificate: current.issuerCertificate || null
                });
                
                // Avanzar al siguiente certificado
                if (current.issuerCertificate) {
                    current = current.issuerCertificate;
                } else {
                    break;
                }
            }

            socket.end();
            resolve({
                host,
                port,
                chain,
                raw: peerCertificates
            });
        });

        socket.on('error', (err) => {
            reject(err);
        });

        socket.on('timeout', () => {
            socket.destroy();
            reject(new Error('Connection timeout'));
        });
    });
}

function validateChain(chain) {
    const results = {
        valid: true,
        issues: [],
        warnings: [],
        details: []
    };

    if (!chain || chain.length === 0) {
        results.valid = false;
        results.issues.push('No se encontró cadena de certificados');
        return results;
    }

    // Verificar cada certificado
    for (let i = 0; i < chain.length; i++) {
        const cert = chain[i];
        const detail = {
            position: i,
            subject: cert.subject?.CN || 'Unknown',
            issuer: cert.issuer?.CN || 'Unknown',
            validFrom: cert.validFrom,
            validTo: cert.validTo,
            isValid: true
        };

        // Verificar fecha de expiración
        const now = new Date();
        const validFrom = new Date(cert.validFrom);
        const validTo = new Date(cert.validTo);

        if (now < validFrom) {
            detail.isValid = false;
            detail.issue = 'Certificate not yet valid';
            results.issues.push(`Certificado #${i} (${detail.subject}) no es válido todavía`);
        }

        if (now > validTo) {
            detail.isValid = false;
            detail.issue = 'Certificate expired';
            results.issues.push(`Certificado #${i} (${detail.subject}) ha expirado`);
        }

        if (validTo - now < 30 * 24 * 60 * 60 * 1000) {
            detail.warning = 'Certificate expires soon';
            results.warnings.push(`Certificado #${i} (${detail.subject}) expira en menos de 30 días`);
        }

        // Verificar issuer (solo para certificados intermedios y hoja)
        if (i < chain.length - 1) {
            const nextCert = chain[i + 1];
            if (cert.issuer?.CN !== nextCert.subject?.CN) {
                detail.isValid = false;
                detail.issue = 'Chain broken - issuer mismatch';
                results.issues.push(`Cadena rota: ${detail.subject} no fue emitido por ${nextCert.subject}`);
            }
        }

        results.details.push(detail);
    }

    // Verificar CA raíz
    const lastCert = chain[chain.length - 1];
    if (lastCert.issuer?.CN === lastCert.subject?.CN) {
        results.details.push({
            position: chain.length,
            subject: lastCert.subject?.CN,
            issuer: lastCert.issuer?.CN,
            validFrom: lastCert.validFrom,
            validTo: lastCert.validTo,
            isValid: true,
            note: 'Root CA certificate'
        });
    } else {
        results.warnings.push('La cadena no termina en una CA raíz (self-signed)');
    }

    results.valid = results.issues.length === 0;

    return results;
}

function formatChain(results) {
    let output = '';
    output += `🔍 SSL Certificate Chain Checker - MFH TOOLS PRO\n`;
    output += '='.repeat(50) + '\n\n';
    output += `📡 Dominio: ${results.host}\n`;
    output += `🔌 Puerto: ${results.port}\n`;
    output += `📋 Certificados en la cadena: ${results.chain.length}\n\n`;

    // Resumen de validación
    const validation = validateChain(results.chain);
    
    output += `🛡️ VALIDACIÓN DE LA CADENA:\n`;
    output += `   ${validation.valid ? '✅ Cadena válida' : '❌ Cadena inválida'}\n`;
    
    if (validation.issues.length > 0) {
        output += `\n❌ PROBLEMAS ENCONTRADOS:\n`;
        for (const issue of validation.issues) {
            output += `   • ${issue}\n`;
        }
    }
    
    if (validation.warnings.length > 0) {
        output += `\n⚠️ ADVERTENCIAS:\n`;
        for (const warning of validation.warnings) {
            output += `   • ${warning}\n`;
        }
    }

    // Detalles de cada certificado
    output += `\n📋 DETALLE DE CERTIFICADOS:\n`;
    for (let i = 0; i < results.chain.length; i++) {
        const cert = results.chain[i];
        const detail = validation.details[i] || {};
        
        output += `\n${i + 1}. ${cert.subject?.CN || 'Unknown'}\n`;
        output += `   📌 Emisor: ${cert.issuer?.CN || 'Unknown'}\n`;
        output += `   📅 Válido desde: ${new Date(cert.validFrom).toLocaleString()}\n`;
        output += `   ⏰ Expira: ${new Date(cert.validTo).toLocaleString()}\n`;
        output += `   🔑 Serial: ${cert.serialNumber || 'N/A'}\n`;
        output += `   🖥️ Fingerprint: ${cert.fingerprint?.substring(0, 20) || 'N/A'}...\n`;
        
        if (detail.issue) {
            output += `   ❌ ${detail.issue}\n`;
        }
        if (detail.warning) {
            output += `   ⚠️ ${detail.warning}\n`;
        }
        if (detail.note) {
            output += `   ℹ️ ${detail.note}\n`;
        }
    }

    return output;
}

// ==================== MAIN ====================
(async function main() {
    console.log(`🔍 SSL Certificate Chain Checker - MFH TOOLS PRO`);
    console.log('='.repeat(40));

    if (!domain) {
        console.error('❌ Debes especificar un dominio con --domain');
        console.log('   Usa --help para ver las opciones');
        process.exit(1);
    }

    try {
        console.log(`\n📡 Conectando a ${domain}:${CONFIG.port}...`);
        const results = await getCertificateChain(domain);
        
        if (verbose) {
            console.log(`✅ Conexión establecida`);
            console.log(`📋 Certificados encontrados: ${results.chain.length}`);
        }

        // Validar cadena
        const validation = validateChain(results.chain);
        results.validation = validation;

        // Mostrar resultados
        console.log(formatChain(results));

        // Guardar resultados
        if (outputFile) {
            const output = {
                timestamp: new Date().toISOString(),
                domain,
                port: CONFIG.port,
                chainCount: results.chain.length,
                validation,
                certificates: results.chain.map(cert => ({
                    subject: cert.subject,
                    issuer: cert.issuer,
                    validFrom: cert.validFrom,
                    validTo: cert.validTo,
                    serialNumber: cert.serialNumber,
                    fingerprint: cert.fingerprint
                }))
            };
            fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));
            console.log(`\n💾 Resultados guardados en: ${outputFile}`);
        }

        // Recomendaciones
        if (!validation.valid) {
            console.log('\n💡 RECOMENDACIONES:');
            console.log('   • Revisar la cadena de certificados completa');
            console.log('   • Asegurarse de que todos los certificados intermedios estén instalados');
            console.log('   • Verificar que el certificado raíz sea de confianza');
        } else if (validation.warnings.length > 0) {
            console.log('\n💡 RECOMENDACIONES:');
            console.log('   • Renovar los certificados que expiran pronto');
        }

    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        if (verbose) {
            console.error(error.stack);
        }
        process.exit(1);
    }

    console.log('\n✅ Verificación completada');
})();
