#!/usr/bin/env node

/**
 * Data Breach Checker - MFH TOOLS PRO
 * Verifica si un email ha sido comprometido en brechas
 * 
 * Uso: node breach-checker.js [opciones]
 * Ejemplo: node breach-checker.js --email usuario@email.com
 * Ejemplo: node breach-checker.js --list emails.txt
 * Ejemplo: node breach-checker.js --email usuario@email.com --output report.json
 * Ejemplo: node breach-checker.js --email usuario@email.com --hibp-key TU_API_KEY
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ==================== CONFIGURACIÓN ====================
const CONFIG = {
    timeout: 15000,
    userAgent: 'MFH-Breach-Checker/1.0',
    providers: {
        leakcheck: 'https://leakcheck.io/api/public',
        hibp: 'https://haveibeenpwned.com/api/v3'
    }
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let email = null;
let listFile = null;
let outputFile = null;
let hibpKey = null;
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
        case '--hibp-key':
        case '-k':
            hibpKey = args[i + 1];
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
  --hibp-key, -k <key>     API Key de Have I Been Pwned (opcional)
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
function makeRequest(url, headers = {}) {
    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(url);

        const options = {
            hostname: parsedUrl.hostname,
            path: parsedUrl.pathname + parsedUrl.search,
            method: 'GET',
            headers: {
                'User-Agent': CONFIG.userAgent,
                'Accept': 'application/json',
                ...headers
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
                        resolve({ error: 'Error parsing JSON', raw: data });
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

function checkLeakCheck(email) {
    return new Promise((resolve, reject) => {
        const url = `${CONFIG.providers.leakcheck}/?check=${encodeURIComponent(email)}`;
        
        makeRequest(url).then(data => {
            if (data && data.found === true) {
                resolve({
                    provider: 'leakcheck',
                    email,
                    found: true,
                    breaches: data.result || [],
                    total: data.result ? data.result.length : 0
                });
            } else {
                resolve({
                    provider: 'leakcheck',
                    email,
                    found: false,
                    breaches: [],
                    total: 0
                });
            }
        }).catch(error => {
            reject(error);
        });
    });
}

function checkHIBP(email, apiKey) {
    return new Promise((resolve, reject) => {
        const url = `${CONFIG.providers.hibp}/breachedaccount/${encodeURIComponent(email)}?truncateResponse=false`;
        const headers = apiKey ? { 'hibp-api-key': apiKey } : {};
        
        makeRequest(url, headers).then(data => {
            if (data === null) {
                resolve({
                    provider: 'hibp',
                    email,
                    found: false,
                    breaches: [],
                    total: 0
                });
            } else if (Array.isArray(data)) {
                resolve({
                    provider: 'hibp',
                    email,
                    found: data.length > 0,
                    breaches: data,
                    total: data.length
                });
            } else {
                resolve({
                    provider: 'hibp',
                    email,
                    found: false,
                    breaches: [],
                    total: 0
                });
            }
        }).catch(error => {
            reject(error);
        });
    });
}

async function checkEmail(email, hibpKey) {
    const normalizedEmail = email.toLowerCase().trim();
    let result = null;
    let errors = [];

    // Intentar con LeakCheck primero
    try {
        result = await checkLeakCheck(normalizedEmail);
        if (result && result.found !== undefined) {
            return result;
        }
    } catch (error) {
        errors.push(`leakcheck: ${error.message}`);
        if (verbose) console.log(`⚠️ leakcheck falló: ${error.message}`);
    }

    // Si hay API key de HIBP, intentar con HIBP
    if (hibpKey) {
        try {
            result = await checkHIBP(normalizedEmail, hibpKey);
            if (result && result.found !== undefined) {
                return result;
            }
        } catch (error) {
            errors.push(`hibp: ${error.message}`);
            if (verbose) console.log(`⚠️ HIBP falló: ${error.message}`);
        }
    }

    // Si todo falla
    if (errors.length > 0) {
        throw new Error(`No se pudo verificar ${email}. Errores: ${errors.join('; ')}`);
    }

    // Si no se pudo verificar pero no hubo error
    return {
        provider: 'unknown',
        email: normalizedEmail,
        found: false,
        breaches: [],
        total: 0,
        error: 'No se pudo verificar con ningún proveedor'
    };
}

function formatDate(dateString) {
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
    output += `📡 Proveedor: ${result.provider}\n`;
    
    if (!result.found || result.total === 0) {
        output += `   ✅ No encontrado en ninguna brecha conocida\n`;
        output += `   🛡️ Seguro (por ahora)\n`;
    } else {
        output += `   🔴 ¡COMPROMETIDO! Encontrado en ${result.total} brecha(s)\n\n`;
        
        const breaches = result.breaches;
        for (const breach of breaches) {
            const name = breach.name || breach.title || 'Unknown';
            const date = breach.breachDate || breach.date || 'N/A';
            const description = breach.description || '';
            const dataClasses = breach.dataClasses || breach.affected || [];
            
            output += `   📌 ${name}\n`;
            output += `      📅 Fecha: ${formatDate(date)}\n`;
            if (dataClasses.length > 0) {
                output += `      📊 Datos expuestos: ${dataClasses.join(', ')}\n`;
            }
            if (description) {
                const desc = description.replace(/<[^>]+>/g, '').substring(0, 100);
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

    if (hibpKey) {
        console.log(`🔑 API Key de HIBP configurada`);
    } else {
        console.log(`ℹ️ Usando leakcheck.io (gratuito, sin API key)`);
        console.log(`💡 Para usar HIBP: --hibp-key TU_API_KEY`);
    }

    const results = [];
    let processed = 0;

    for (const e of emails) {
        processed++;
        console.log(`\n[${processed}/${emails.length}] Verificando: ${e}`);
        
        try {
            const result = await checkEmail(e, hibpKey);
            results.push(result);
            
            if (result.found) {
                console.log(`   🔴 ¡COMPROMETIDO! ${result.total} brecha(s)`);
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

        // Esperar 1 segundo entre requests para no saturar
        if (processed < emails.length) {
            await new Promise(r => setTimeout(r, 1000));
        }
    }

    // Mostrar resultados
    console.log(formatResults(results));

    // Estadísticas
    const compromised = results.filter(r => r.found);
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
