#!/usr/bin/env node

/**
 * JWT Token Analyzer - MFH TOOLS PRO
 * Analiza y decodifica tokens JWT, verifica firma y validez
 * 
 * Uso: node jwt-analyzer.js [opciones]
 * Ejemplo: node jwt-analyzer.js --token eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 * Ejemplo: node jwt-analyzer.js --token token.txt
 * Ejemplo: node jwt-analyzer.js --token token.txt --secret mi-clave-secreta
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// ==================== CONFIGURACIÓN ====================
const CONFIG = {
    algorithms: ['HS256', 'HS384', 'HS512', 'RS256', 'RS384', 'RS512', 'ES256', 'ES384', 'ES512', 'none']
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let token = null;
let tokenFile = null;
let secret = null;
let outputFile = null;
let verbose = false;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--token':
        case '-t':
            token = args[i + 1];
            i++;
            break;
        case '--file':
        case '-f':
            tokenFile = args[i + 1];
            i++;
            break;
        case '--secret':
        case '-s':
            secret = args[i + 1];
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
🔍 JWT Token Analyzer - MFH TOOLS PRO
======================================
Analiza y decodifica tokens JWT.

Uso:
  node jwt-analyzer.js [opciones]

Opciones:
  --token, -t <token>      Token JWT a analizar
  --file, -f <archivo>     Archivo con el token
  --secret, -s <secreto>   Clave secreta para verificar firma
  --output, -o <archivo>   Guardar resultados en JSON
  --verbose, -v            Mostrar más detalles
  --help, -h               Mostrar esta ayuda

Ejemplos:
  node jwt-analyzer.js --token eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  node jwt-analyzer.js --file token.txt
  node jwt-analyzer.js --token token.txt --secret mi-clave-secreta
`);
            process.exit(0);
    }
}

// ==================== FUNCIONES ====================
function decodeBase64Url(str) {
    // Reemplazar caracteres URL-safe
    str = str.replace(/-/g, '+').replace(/_/g, '/');
    // Añadir padding si es necesario
    while (str.length % 4) {
        str += '=';
    }
    return Buffer.from(str, 'base64').toString('utf8');
}

function encodeBase64Url(str) {
    return Buffer.from(str)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

function verifySignature(header, payload, signature, secret) {
    try {
        const data = `${encodeBase64Url(JSON.stringify(header))}.${encodeBase64Url(JSON.stringify(payload))}`;
        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(data)
            .digest('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');

        return signature === expectedSignature;
    } catch (error) {
        return false;
    }
}

function analyzeJWT(token, secret) {
    const parts = token.split('.');

    if (parts.length !== 3) {
        return {
            valid: false,
            error: 'Invalid JWT format - Expected 3 parts (header.payload.signature)',
            parts: parts.length
        };
    }

    const [headerB64, payloadB64, signature] = parts;

    try {
        const header = JSON.parse(decodeBase64Url(headerB64));
        const payload = JSON.parse(decodeBase64Url(payloadB64));

        const result = {
            valid: true,
            header,
            payload,
            signature,
            signatureLength: signature.length,
            algorithm: header.alg || 'unknown',
            type: header.typ || 'JWT'
        };

        // Verificar fecha de expiración
        if (payload.exp) {
            const expDate = new Date(payload.exp * 1000);
            result.expiration = {
                timestamp: payload.exp,
                date: expDate.toISOString(),
                expired: Date.now() > payload.exp * 1000
            };
        }

        // Verificar fecha de emisión
        if (payload.iat) {
            const iatDate = new Date(payload.iat * 1000);
            result.issuedAt = {
                timestamp: payload.iat,
                date: iatDate.toISOString()
            };
        }

        // Verificar "not before"
        if (payload.nbf) {
            const nbfDate = new Date(payload.nbf * 1000);
            result.notBefore = {
                timestamp: payload.nbf,
                date: nbfDate.toISOString(),
                active: Date.now() > payload.nbf * 1000
            };
        }

        // Análisis de seguridad
        result.security = {
            algorithm: header.alg || 'unknown',
            algorithmStrength: getAlgorithmStrength(header.alg),
            hasExpiration: !!payload.exp,
            hasIssuedAt: !!payload.iat
        };

        // Verificar algoritmo "none" (inseguro)
        if (header.alg === 'none') {
            result.security.issue = 'ALGORITHM_NONE - El token usa algoritmo "none" que es inseguro';
            result.security.strength = 'CRITICAL';
        }

        // Verificar firma si se proporciona secreto
        if (secret) {
            const isValid = verifySignature(header, payload, signature, secret);
            result.signatureValid = isValid;
            if (!isValid) {
                result.security.issue = 'INVALID_SIGNATURE - La firma no coincide con el secreto proporcionado';
            }
        } else {
            result.signatureValid = null;
            result.security.note = 'No se verificó la firma - Proporciona --secret para verificarla';
        }

        // Verificar si hay información sensible en el payload
        const sensitiveFields = ['password', 'secret', 'key', 'token', 'auth', 'credential'];
        const foundSensitive = [];
        for (const field of sensitiveFields) {
            if (payload[field]) {
                foundSensitive.push(field);
            }
        }
        if (foundSensitive.length > 0) {
            result.security.sensitiveData = foundSensitive;
            result.security.warning = `Contiene datos sensibles: ${foundSensitive.join(', ')}`;
        }

        return result;

    } catch (error) {
        return {
            valid: false,
            error: `Error decoding JWT: ${error.message}`,
            parts: parts.length
        };
    }
}

function getAlgorithmStrength(alg) {
    const strengths = {
        'HS256': 'MEDIUM - Simétrico',
        'HS384': 'MEDIUM - Simétrico',
        'HS512': 'MEDIUM - Simétrico',
        'RS256': 'HIGH - Asimétrico',
        'RS384': 'HIGH - Asimétrico',
        'RS512': 'HIGH - Asimétrico',
        'ES256': 'HIGH - Asimétrico',
        'ES384': 'HIGH - Asimétrico',
        'ES512': 'HIGH - Asimétrico',
        'none': 'CRITICAL - Sin firma',
        'unknown': 'UNKNOWN'
    };
    return strengths[alg] || 'UNKNOWN';
}

function formatJWTResult(result) {
    if (!result.valid) {
        return `❌ JWT Inválido: ${result.error}`;
    }

    let output = '';
    output += `✅ JWT Válido\n`;
    output += `📋 Algoritmo: ${result.algorithm}\n`;
    output += `📋 Tipo: ${result.type}\n`;
    output += `📋 Firma: ${result.signature.substring(0, 20)}... (${result.signatureLength} chars)\n`;

    if (result.signatureValid !== null) {
        output += `🔐 Firma: ${result.signatureValid ? '✅ Válida' : '❌ Inválida'}\n`;
    }

    if (result.expiration) {
        output += `⏰ Expiración: ${result.expiration.date} ${result.expiration.expired ? '⚠️ EXPIRADO' : '✅ Válido'}\n`;
    }

    if (result.issuedAt) {
        output += `📅 Emitido: ${result.issuedAt.date}\n`;
    }

    if (result.notBefore) {
        output += `⏳ No antes de: ${result.notBefore.date} ${result.notBefore.active ? '✅ Activo' : '⏳ Inactivo'}\n`;
    }

    output += `\n📦 HEADER:\n${JSON.stringify(result.header, null, 2)}\n`;
    output += `\n📦 PAYLOAD:\n${JSON.stringify(result.payload, null, 2)}\n`;

    if (result.security) {
        output += `\n🛡️ ANÁLISIS DE SEGURIDAD:\n`;
        output += `   Algoritmo: ${result.security.algorithm} (${result.security.algorithmStrength})\n`;
        if (result.security.issue) {
            output += `   ⚠️ ${result.security.issue}\n`;
        }
        if (result.security.warning) {
            output += `   ⚠️ ${result.security.warning}\n`;
        }
        if (result.security.sensitiveData) {
            output += `   🔒 Datos sensibles encontrados: ${result.security.sensitiveData.join(', ')}\n`;
        }
    }

    return output;
}

// ==================== MAIN ====================
(async function main() {
    console.log(`🔍 JWT Token Analyzer - MFH TOOLS PRO`);
    console.log('='.repeat(40));

    // Cargar token
    if (tokenFile) {
        try {
            token = fs.readFileSync(tokenFile, 'utf8').trim();
            console.log(`📋 Token cargado desde: ${tokenFile}`);
        } catch (error) {
            console.error(`❌ Error cargando token: ${error.message}`);
            process.exit(1);
        }
    }

    if (!token) {
        console.error('❌ Debes especificar un token con --token o --file');
        console.log('   Usa --help para ver las opciones');
        process.exit(1);
    }

    // Analizar token
    console.log(`\n🔍 Analizando token...\n`);
    const result = analyzeJWT(token, secret);

    // Mostrar resultados
    console.log(formatJWTResult(result));

    // Guardar resultados
    if (outputFile) {
        const output = {
            timestamp: new Date().toISOString(),
            token: token,
            secretProvided: !!secret,
            result: result
        };
        fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));
        console.log(`\n💾 Resultados guardados en: ${outputFile}`);
    }

    console.log('\n✅ Análisis completado');
})();
