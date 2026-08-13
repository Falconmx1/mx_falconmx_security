#!/usr/bin/env node

/**
 * Data Breach Checker - MFH TOOLS PRO
 * Verifica si un email ha sido comprometido en brechas
 * 
 * Uso: node breach-checker.js [opciones]
 * Ejemplo: node breach-checker.js --email usuario@email.com
 * Ejemplo: node breach-checker.js --list emails.txt
 * Ejemplo: node breach-checker.js --email usuario@email.com --output report.json
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// ==================== CONFIGURACIÓN ====================
const CONFIG = {
    baseUrl: 'https://haveibeenpwned.com/api/v3',
    timeout: 15000,
    userAgent: 'MFH-Breach-Checker/1.0'
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let email = null;
let listFile = null;
let outputFile = null;
let verbose = false;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--email':
        case '-e':
            email = args[i + 1];
            i++;
            break;
        case '--list':
        case '-l':
            listFile = args[i + 1];
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
🔍 Data Breach Checker - MFH TOOLS PRO
=======================================
Verifica si un email ha sido comprometido en brechas.

Uso:
  node breach-checker.js [opciones]

Opciones:
  --email, -e <email>      Email a verificar
  --list, -l <archivo>     Archivo con lista de emails
  --output, -o <archivo>   Guardar resultados en JSON
  --verbose, -v            Mostrar más detalles
  --help, -h               Mostrar esta ayuda

Ejemplos:
  node breach-checker.js --email usuario@email.com
  node breach-checker.js --list emails.txt
  node breach-checker.js --email usuario@email.com --output report.json
`);
            process.exit(0);
    }
}

// ==================== FUNCIONES ====================
function makeRequest(endpoint) {
    return new Promise((resolve, reject) => {
        const url = `${CONFIG.baseUrl}${endpoint}`;
        const parsedUrl = new URL(url);

        const options = {
            hostname: parsedUrl.hostname,
            path: parsedUrl.pathname + parsedUrl.search,
            method: 'GET',
            headers: {
                'User-Agent': CONFIG.userAgent,
                'Accept': 'application/json',
                'hibp-api-key': '' // API key opcional para mayor límite
            },
            timeout: CONFIG.timeout
        };

        if (verbose) {
            console.log(`📡 Request: ${url}`);
        }

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                if (res.statusCode === 404) {
                    resolve(null);
                } else if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        resolve(JSON.parse(data));
                    } catch (error) {
                        reject(new Error(`Error parsing JSON: ${error.message}`));
                    }
                } else {
                    reject(new Error(`HTTP Error ${res.statusCode}: ${data}`));
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.end();
    });
}

async function checkEmail(email) {
    const normalizedEmail = email.toLowerCase().trim();
    const endpoint = `/breachedaccount/${encodeURIComponent(normalizedEmail)}?truncateResponse=false`;
    const breaches = await makeRequest(endpoint);
    return breaches;
}

function formatBreachDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function formatResults(results) {
    let output = '';
    output += `🔍 Data Breach Checker - MFH TOOLS PRO\n`;
    output += '='.repeat(50) + '\n\n';

    if (Array.isArray(results)) {
        output += `📋 Total emails verificados: ${results.length}\n\n`;
        for (const result of results) {
            output += formatSingleResult(result);
        }
    } else {
        output += formatSingleResult(results);
    }

    return output;
}

function formatSingleResult(result) {
    let output = '';
    
    if (result.error) {
        output += `❌ ${result.email}: ${result.error}\n`;
        output += '-'.repeat(30) + '\n';
        return output;
    }

    output += `📧 ${result.email}\n`;
    
    if (!result.breaches || result.breaches.length === 0) {
        output += `   ✅ No encontrado en ninguna brecha conocida\n`;
        output += `   🛡️ Seguro (por ahora)\n`;
    } else {
        output += `   🔴 ¡COMPROMETIDO! Encontrado en ${result.breaches.length} brecha(s)\n\n`;
        
        // Agrupar por severidad
        const severityOrder = { 'high': 0, 'medium': 1, 'low': 2 };
        const sortedBreaches = [...result.breaches].sort((a, b) => {
            return (severityOrder[a.Severity?.toLowerCase()] || 9) - (severityOrder[b.Severity?.toLowerCase()] || 9);
        });

        for (const breach of sortedBreaches) {
            const severity = breach.Severity || 'unknown';
            const icon = severity === 'high' ? '🔴' : severity === 'medium' ? '🟡' : '🟢';
            
            output += `   ${icon} ${breach.Title || 'Unknown'}\n`;
            output += `      📅 Fecha: ${formatBreachDate(breach.BreachDate)}\n`;
            if (breach.Domain) {
                output += `      🌐 Dominio: ${breach.Domain}\n`;
            }
            if (breach.IsVerified) {
                output += `      ✅ Verificado\n`;
            }
            if (breach.IsSensitive) {
                output += `      🔒 Contiene datos sensibles\n`;
            }
            if (breach.DataClasses && breach.DataClasses.length > 0) {
                output += `      📊 Datos expuestos: ${breach.DataClasses.join(', ')}\n`;
            }
            if (breach.Description) {
                const desc = breach.Description.replace(/<[^>]+>/g, '').substring(0, 100);
                output += `      📝 ${desc}...\n`;
            }
            output += '\n';
        }

        // Recomendaciones
        output += `   💡 RECOMENDACIONES:\n`;
        output += `      • Cambiar la contraseña inmediatamente\n`;
        output += `      • Habilitar autenticación de dos factores (2FA)\n`;
        output += `      • Usar contraseñas únicas para cada servicio\n`;
        output += `      • Monitorear actividad sospechosa en las cuentas afectadas\n`;
    }

    output += '-'.repeat(30) + '\n';
    return output;
}

// ==================== MAIN ====================
(async function main() {
    console.log(`🔍 Data Breach Checker - MFH TOOLS PRO`);
    console.log('='.repeat(40));

    let emails = [];

    if (listFile) {
        try {
            const content = fs.readFileSync(listFile, 'utf8');
            emails = content.split('\n')
                .map(l => l.trim())
                .filter(l => l && l.includes('@'));
            console.log(`📋 Cargados ${emails.length} emails desde ${listFile}`);
        } catch (error) {
            console.error(`❌ Error cargando lista: ${error.message}`);
            process.exit(1);
        }
    } else if (email) {
        emails.push(email);
    } else {
        console.error('❌ Debes especificar --email o --list');
        console.log('   Usa --help para ver las opciones');
        process.exit(1);
    }

    const results = [];
    let processed = 0;

    for (const e of emails) {
        processed++;
        console.log(`\n[${processed}/${emails.length}] Verificando: ${e}`);
        
        try {
            const breaches = await checkEmail(e);
            results.push({
                email: e,
                breaches: breaches,
                compromised: breaches && breaches.length > 0
            });
            
            if (breaches && breaches.length > 0) {
                console.log(`   🔴 ¡COMPROMETIDO! ${breaches.length} brecha(s)`);
            } else {
                console.log(`   ✅ No encontrado en brechas`);
            }
        } catch (error) {
            console.error(`   ❌ Error: ${error.message}`);
            results.push({
                email: e,
                error: error.message
            });
        }

        // Esperar 1.5 segundos entre requests (política de rate limiting)
        if (processed < emails.length) {
            await new Promise(r => setTimeout(r, 1500));
        }
    }

    // Mostrar resultados
    console.log(formatResults(results));

    // Estadísticas
    const compromised = results.filter(r => r.compromised);
    const errors = results.filter(r => r.error);
    console.log(`\n📊 ESTADÍSTICAS:`);
    console.log(`   🔴 Comprometidos: ${compromised.length}`);
    console.log(`   ✅ Seguros: ${results.length - compromised.length - errors.length}`);
    console.log(`   ❌ Errores: ${errors.length}`);

    // Guardar resultados
    if (outputFile) {
        const output = {
            timestamp: new Date().toISOString(),
            total: results.length,
            compromised: compromised.length,
            results
        };
        fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));
        console.log(`\n💾 Resultados guardados en: ${outputFile}`);
    }

    console.log('\n✅ Verificación completada');
})();
