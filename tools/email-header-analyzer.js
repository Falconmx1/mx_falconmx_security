#!/usr/bin/env node

/**
 * Email Header Analyzer - MFH TOOLS PRO
 * Analiza cabeceras de email para detectar spoofing y phishing
 * 
 * Uso: node email-header-analyzer.js [opciones]
 * Ejemplo: node email-header-analyzer.js --file email.txt
 * Ejemplo: node email-header-analyzer.js --header "From: test@example.com"
 * Ejemplo: node email-header-analyzer.js --file email.txt --output report.json
 */

const fs = require('fs');
const path = require('path');
const dns = require('dns');

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let headerFile = null;
let headerText = null;
let outputFile = null;
let verbose = false;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--file':
        case '-f':
            headerFile = args[i + 1];
            i++;
            break;
        case '--header':
        case '-h':
            headerText = args[i + 1];
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
            console.log(`
🔍 Email Header Analyzer - MFH TOOLS PRO
=========================================
Analiza cabeceras de email para detectar spoofing y phishing.

Uso:
  node email-header-analyzer.js [opciones]

Opciones:
  --file, -f <archivo>     Archivo con las cabeceras del email
  --header, -h <texto>     Cabecera directamente en texto
  --output, -o <archivo>   Guardar resultados en JSON
  --verbose, -v            Mostrar más detalles
  --help                   Mostrar esta ayuda

Ejemplos:
  node email-header-analyzer.js --file email.txt
  node email-header-analyzer.js --header "From: test@example.com"
  node email-header-analyzer.js --file email.txt --output report.json
`);
            process.exit(0);
    }
}

// ==================== FUNCIONES ====================
function parseEmailHeaders(raw) {
    const lines = raw.split('\n');
    const headers = {};
    let currentKey = null;
    let currentValue = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.match(/^\s/)) {
            // Línea continuada
            if (currentKey) {
                currentValue.push(line.trim());
            }
        } else if (line.includes(':')) {
            // Nueva cabecera
            if (currentKey) {
                headers[currentKey] = currentValue.join(' ');
            }
            const [key, ...valueParts] = line.split(':');
            currentKey = key.trim();
            currentValue = [valueParts.join(':').trim()];
        } else if (line.trim() === '') {
            // Línea vacía - fin de cabeceras
            if (currentKey) {
                headers[currentKey] = currentValue.join(' ');
                currentKey = null;
                currentValue = [];
            }
            // El resto es el cuerpo
            headers._body = lines.slice(i + 1).join('\n').trim();
            break;
        }
    }

    // Guardar última cabecera
    if (currentKey) {
        headers[currentKey] = currentValue.join(' ');
    }

    return headers;
}

function analyzeEmailHeaders(headers) {
    const results = {
        headers: headers,
        security: {
            spf: null,
            dkim: null,
            dmarc: null,
            spoofingRisk: 'unknown',
            phishingIndicators: []
        },
        sender: {
            from: null,
            replyTo: null,
            returnPath: null,
            envelopeFrom: null
        },
        route: [],
        warnings: [],
        recommendations: []
    };

    // Extraer información del remitente
    if (headers.From) {
        results.sender.from = parseEmailAddress(headers.From);
    }
    if (headers['Reply-To']) {
        results.sender.replyTo = parseEmailAddress(headers['Reply-To']);
    }
    if (headers['Return-Path']) {
        results.sender.returnPath = parseEmailAddress(headers['Return-Path']);
    }
    if (headers['Envelope-From'] || headers['X-Envelope-From']) {
        const envFrom = headers['Envelope-From'] || headers['X-Envelope-From'];
        results.sender.envelopeFrom = parseEmailAddress(envFrom);
    }

    // Verificar SPF
    if (headers['Received-SPF'] || headers['Authentication-Results']) {
        results.security.spf = checkSPF(headers);
    }

    // Verificar DKIM
    if (headers['DKIM-Signature'] || headers['Authentication-Results']) {
        results.security.dkim = checkDKIM(headers);
    }

    // Verificar DMARC
    if (headers['Authentication-Results']) {
        results.security.dmarc = checkDMARC(headers);
    }

    // Analizar ruta
    if (headers.Received) {
        results.route = parseReceivedHeaders(headers.Received);
    }

    // Detectar indicadores de phishing
    results.security.phishingIndicators = detectPhishingIndicators(headers, results);

    // Calcular riesgo de spoofing
    results.security.spoofingRisk = calculateSpoofingRisk(results);

    // Generar recomendaciones
    results.recommendations = generateRecommendations(results);

    return results;
}

function parseEmailAddress(raw) {
    if (!raw) return null;
    const match = raw.match(/(<?)([^<]*?)(>?)/);
    if (!match) return null;

    const name = match[2].trim();
    const emailMatch = raw.match(/<([^>]+)>/);
    const email = emailMatch ? emailMatch[1] : name;

    return {
        name: emailMatch ? name.replace(/<[^>]+>/, '').trim() : null,
        email: email.trim()
    };
}

function checkSPF(headers) {
    const authResults = headers['Authentication-Results'] || '';
    const spfReceived = headers['Received-SPF'] || '';

    if (spfReceived) {
        const spfResult = spfReceived.match(/\(([^)]+)\)/);
        if (spfResult) {
            return {
                status: spfResult[1].trim(),
                raw: spfReceived
            };
        }
    }

    if (authResults) {
        const spfMatch = authResults.match(/spf=(\w+)/i);
        if (spfMatch) {
            return {
                status: spfMatch[1],
                raw: authResults
            };
        }
    }

    return { status: 'unknown' };
}

function checkDKIM(headers) {
    const dkimSignature = headers['DKIM-Signature'];
    const authResults = headers['Authentication-Results'] || '';

    if (dkimSignature) {
        return {
            status: 'present',
            raw: dkimSignature
        };
    }

    if (authResults) {
        const dkimMatch = authResults.match(/dkim=(\w+)/i);
        if (dkimMatch) {
            return {
                status: dkimMatch[1],
                raw: authResults
            };
        }
    }

    return { status: 'unknown' };
}

function checkDMARC(headers) {
    const authResults = headers['Authentication-Results'] || '';

    if (authResults) {
        const dmarcMatch = authResults.match(/dmarc=(\w+)/i);
        if (dmarcMatch) {
            return {
                status: dmarcMatch[1],
                raw: authResults
            };
        }
    }

    return { status: 'unknown' };
}

function parseReceivedHeaders(received) {
    const entries = Array.isArray(received) ? received : [received];
    const parsed = [];

    for (const entry of entries) {
        const parts = {};
        // Extraer from
        const fromMatch = entry.match(/from\s+([^\s]+)/i);
        if (fromMatch) parts.from = fromMatch[1];

        // Extraer by
        const byMatch = entry.match(/by\s+([^\s]+)/i);
        if (byMatch) parts.by = byMatch[1];

        // Extraer with
        const withMatch = entry.match(/with\s+([^\s]+)/i);
        if (withMatch) parts.protocol = withMatch[1];

        // Extraer id
        const idMatch = entry.match(/id\s+([^\s]+)/i);
        if (idMatch) parts.id = idMatch[1];

        // Extraer fecha
        const dateMatch = entry.match(/;\s+(.+)$/);
        if (dateMatch) parts.date = dateMatch[1];

        parsed.push(parts);
    }

    return parsed;
}

function detectPhishingIndicators(headers, results) {
    const indicators = [];

    // 1. Verificar discrepancia entre From y Reply-To
    if (results.sender.from && results.sender.replyTo) {
        if (results.sender.from.email !== results.sender.replyTo.email) {
            indicators.push({
                type: 'PHISHING',
                severity: 'HIGH',
                description: `Reply-To (${results.sender.replyTo.email}) es diferente de From (${results.sender.from.email})`,
                cwe: 'CWE-346'
            });
        }
    }

    // 2. Verificar SPF fallido
    if (results.security.spf && results.security.spf.status === 'fail') {
        indicators.push({
            type: 'SPF_FAIL',
            severity: 'HIGH',
            description: 'SPF falló - El dominio no autoriza este servidor',
            cwe: 'CWE-345'
        });
    }

    // 3. Verificar DKIM fallido
    if (results.security.dkim && results.security.dkim.status === 'fail') {
        indicators.push({
            type: 'DKIM_FAIL',
            severity: 'HIGH',
            description: 'DKIM falló - La firma no es válida',
            cwe: 'CWE-345'
        });
    }

    // 4. Verificar DMARC fallido
    if (results.security.dmarc && results.security.dmarc.status === 'fail') {
        indicators.push({
            type: 'DMARC_FAIL',
            severity: 'CRITICAL',
            description: 'DMARC falló - El dominio no autoriza este email',
            cwe: 'CWE-345'
        });
    }

    // 5. Verificar from spoofing (dominio diferente en envelope vs from)
    if (results.sender.from && results.sender.envelopeFrom) {
        const fromDomain = results.sender.from.email.split('@')[1];
        const envDomain = results.sender.envelopeFrom.email.split('@')[1];
        if (fromDomain && envDomain && fromDomain !== envDomain) {
            indicators.push({
                type: 'ENVELOPE_FROM_MISMATCH',
                severity: 'MEDIUM',
                description: `Envelope-From (${envDomain}) es diferente de From (${fromDomain})`,
                cwe: 'CWE-346'
            });
        }
    }

    return indicators;
}

function calculateSpoofingRisk(results) {
    let riskScore = 0;

    // SPF
    if (results.security.spf) {
        if (results.security.spf.status === 'pass') riskScore -= 2;
        if (results.security.spf.status === 'fail') riskScore += 3;
        if (results.security.spf.status === 'softfail') riskScore += 1;
    }

    // DKIM
    if (results.security.dkim) {
        if (results.security.dkim.status === 'pass') riskScore -= 2;
        if (results.security.dkim.status === 'fail') riskScore += 3;
    }

    // DMARC
    if (results.security.dmarc) {
        if (results.security.dmarc.status === 'pass') riskScore -= 2;
        if (results.security.dmarc.status === 'fail') riskScore += 4;
    }

    // Reply-To
    if (results.sender.from && results.sender.replyTo) {
        if (results.sender.from.email !== results.sender.replyTo.email) {
            riskScore += 2;
        }
    }

    // Envelope mismatch
    if (results.sender.from && results.sender.envelopeFrom) {
        const fromDomain = results.sender.from.email.split('@')[1];
        const envDomain = results.sender.envelopeFrom.email.split('@')[1];
        if (fromDomain && envDomain && fromDomain !== envDomain) {
            riskScore += 2;
        }
    }

    // Clasificar riesgo
    if (riskScore >= 7) return 'CRITICAL';
    if (riskScore >= 4) return 'HIGH';
    if (riskScore >= 2) return 'MEDIUM';
    if (riskScore >= 0) return 'LOW';
    return 'SAFE';
}

function generateRecommendations(results) {
    const recommendations = [];

    if (results.security.spoofingRisk === 'CRITICAL') {
        recommendations.push('⚠️ No confiar en este email - Alto riesgo de spoofing');
    }

    if (results.security.spoofingRisk === 'HIGH') {
        recommendations.push('⚠️ Verificar manualmente antes de confiar');
    }

    if (results.security.spf && results.security.spf.status === 'fail') {
        recommendations.push('✅ Contactar al dominio para verificar su configuración SPF');
    }

    if (results.security.dkim && results.security.dkim.status === 'fail') {
        recommendations.push('✅ Verificar la firma DKIM con el dominio emisor');
    }

    if (results.security.dmarc && results.security.dmarc.status === 'fail') {
        recommendations.push('✅ El dominio tiene políticas DMARC estrictas - Este email no es auténtico');
    }

    if (results.sender.from && results.sender.replyTo) {
        if (results.sender.from.email !== results.sender.replyTo.email) {
            recommendations.push('✅ No responder si el Reply-To es diferente al remitente');
        }
    }

    return recommendations;
}

function formatResults(results) {
    let output = '';
    output += `📊 ANÁLISIS DE CABECERAS DE EMAIL\n`;
    output += '='.repeat(50) + '\n\n';

    // Remitente
    output += `📧 REMITENTE:\n`;
    if (results.sender.from) {
        output += `   From: ${results.sender.from.name ? results.sender.from.name + ' ' : ''}<${results.sender.from.email}>\n`;
    }
    if (results.sender.replyTo) {
        output += `   Reply-To: ${results.sender.replyTo.name ? results.sender.replyTo.name + ' ' : ''}<${results.sender.replyTo.email}>\n`;
    }
    if (results.sender.returnPath) {
        output += `   Return-Path: <${results.sender.returnPath.email}>\n`;
    }
    if (results.sender.envelopeFrom) {
        output += `   Envelope-From: <${results.sender.envelopeFrom.email}>\n`;
    }

    // Seguridad
    output += `\n🛡️ SEGURIDAD:\n`;
    if (results.security.spf) {
        output += `   SPF: ${results.security.spf.status.toUpperCase()}\n`;
    }
    if (results.security.dkim) {
        output += `   DKIM: ${results.security.dkim.status.toUpperCase()}\n`;
    }
    if (results.security.dmarc) {
        output += `   DMARC: ${results.security.dmarc.status.toUpperCase()}\n`;
    }

    // Riesgo de spoofing
    const riskEmojis = {
        'CRITICAL': '🔴',
        'HIGH': '🟠',
        'MEDIUM': '🟡',
        'LOW': '🟢',
        'SAFE': '✅'
    };
    output += `\n⚠️ RIESGO DE SPOOFING: ${riskEmojis[results.security.spoofingRisk] || ''} ${results.security.spoofingRisk}\n`;

    // Phishing indicators
    if (results.security.phishingIndicators.length > 0) {
        output += `\n⚠️ INDICADORES DE PHISHING:\n`;
        for (const indicator of results.security.phishingIndicators) {
            output += `   🔴 [${indicator.severity}] ${indicator.type}\n`;
            output += `      ${indicator.description}\n`;
        }
    }

    // Recomendaciones
    if (results.recommendations.length > 0) {
        output += `\n💡 RECOMENDACIONES:\n`;
        for (const rec of results.recommendations) {
            output += `   • ${rec}\n`;
        }
    }

    // Ruta
    if (results.route.length > 0) {
        output += `\n📡 RUTA DEL MENSAJE:\n`;
        for (let i = 0; i < results.route.length; i++) {
            const hop = results.route[i];
            output += `   ${i + 1}. ${hop.from || 'unknown'} → ${hop.by || 'unknown'}`;
            if (hop.protocol) output += ` (${hop.protocol})`;
            if (hop.date) output += ` - ${hop.date}`;
            output += '\n';
        }
    }

    return output;
}

// ==================== MAIN ====================
(async function main() {
    console.log(`🔍 Email Header Analyzer - MFH TOOLS PRO`);
    console.log('='.repeat(40));

    let rawHeaders = headerText;

    if (headerFile) {
        try {
            rawHeaders = fs.readFileSync(headerFile, 'utf8');
            console.log(`📋 Cabeceras cargadas desde: ${headerFile}`);
        } catch (error) {
            console.error(`❌ Error cargando archivo: ${error.message}`);
            process.exit(1);
        }
    }

    if (!rawHeaders) {
        console.error('❌ Debes especificar --file o --header');
        console.log('   Usa --help para ver las opciones');
        process.exit(1);
    }

    // Analizar cabeceras
    console.log(`\n🔍 Analizando cabeceras...\n`);
    const headers = parseEmailHeaders(rawHeaders);
    const results = analyzeEmailHeaders(headers);

    // Mostrar resultados
    console.log(formatResults(results));

    // Guardar resultados
    if (outputFile) {
        const output = {
            timestamp: new Date().toISOString(),
            headers: headers,
            analysis: results
        };
        fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));
        console.log(`\n💾 Resultados guardados en: ${outputFile}`);
    }

    console.log('\n✅ Análisis completado');
})();
