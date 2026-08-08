#!/usr/bin/env node

/**
 * Port Knocking Client - MFH TOOLS PRO
 * Cliente para autenticación por port knocking
 * 
 * Uso: node port-knocking-client.js [opciones]
 * Ejemplo: node port-knocking-client.js --host 192.168.1.100 --ports 7000,8000,9000
 * Ejemplo: node port-knocking-client.js --host example.com --ports 1000,2000,3000,4000 --udp
 * Ejemplo: node port-knocking-client.js --host 10.0.0.1 --ports 1234,5678 --delay 500
 */

const net = require('net');
const dgram = require('dgram');
const fs = require('fs');
const path = require('path');

// ==================== CONFIGURACIÓN ====================
const CONFIG = {
    defaultPorts: [7000, 8000, 9000],
    defaultDelay: 200,
    timeout: 2000,
    maxRetries: 3
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let host = null;
let ports = null;
let useUdp = false;
let delay = CONFIG.defaultDelay;
let outputFile = null;
let verbose = false;
let retries = CONFIG.maxRetries;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--host':
        case '-h':
            host = args[i + 1];
            i++;
            break;
        case '--ports':
        case '-p':
            ports = args[i + 1].split(',').map(Number);
            i++;
            break;
        case '--udp':
        case '-u':
            useUdp = true;
            break;
        case '--tcp':
            useUdp = false;
            break;
        case '--delay':
        case '-d':
            delay = parseInt(args[i + 1]);
            i++;
            break;
        case '--retries':
        case '-r':
            retries = parseInt(args[i + 1]);
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
        case '--list':
        case '-l':
            const listFile = args[i + 1];
            try {
                const content = fs.readFileSync(listFile, 'utf8');
                const lines = content.split('\n').filter(l => l.trim() && !l.startsWith('#'));
                if (lines.length > 0) {
                    const parts = lines[0].split(' ');
                    host = parts[0];
                    if (parts[1]) {
                        ports = parts[1].split(',').map(Number);
                    }
                }
            } catch (error) {
                console.error(`❌ Error cargando lista: ${error.message}`);
            }
            i++;
            break;
        case '--help':
            console.log(`
🔍 Port Knocking Client - MFH TOOLS PRO
========================================
Cliente para autenticación por port knocking.

Uso:
  node port-knocking-client.js [opciones]

Opciones:
  --host, -h <host>        Host objetivo
  --ports, -p <puertos>    Puertos a golpear (ej: 7000,8000,9000)
  --udp, -u                Usar UDP (default: TCP)
  --tcp                    Usar TCP (default)
  --delay, -d <ms>         Delay entre golpes (default: 200ms)
  --retries, -r <n>        Número de reintentos (default: 3)
  --list, -l <archivo>     Cargar configuración desde archivo
  --output, -o <archivo>   Guardar resultados en JSON
  --verbose, -v            Mostrar más detalles
  --help                   Mostrar esta ayuda

Ejemplos:
  node port-knocking-client.js --host 192.168.1.100 --ports 7000,8000,9000
  node port-knocking-client.js --host example.com --ports 1000,2000,3000,4000 --udp
  node port-knocking-client.js --host 10.0.0.1 --ports 1234,5678 --delay 500
`);
            process.exit(0);
    }
}

// ==================== FUNCIONES ====================
function knockTCP(host, port, timeout) {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        let resolved = false;

        const timeoutId = setTimeout(() => {
            if (!resolved) {
                resolved = true;
                socket.destroy();
                resolve({ port, success: false, error: 'timeout' });
            }
        }, timeout);

        socket.on('connect', () => {
            if (!resolved) {
                resolved = true;
                clearTimeout(timeoutId);
                socket.destroy();
                resolve({ port, success: true, error: null });
            }
        });

        socket.on('error', (err) => {
            if (!resolved) {
                resolved = true;
                clearTimeout(timeoutId);
                socket.destroy();
                resolve({ port, success: false, error: err.message });
            }
        });

        socket.connect(port, host);
    });
}

function knockUDP(host, port, timeout) {
    return new Promise((resolve) => {
        const client = dgram.createSocket('udp4');
        let resolved = false;

        const timeoutId = setTimeout(() => {
            if (!resolved) {
                resolved = true;
                client.close();
                resolve({ port, success: false, error: 'timeout' });
            }
        }, timeout);

        client.on('message', (msg, info) => {
            if (!resolved) {
                resolved = true;
                clearTimeout(timeoutId);
                client.close();
                resolve({ port, success: true, error: null, message: msg.toString() });
            }
        });

        client.on('error', (err) => {
            if (!resolved) {
                resolved = true;
                clearTimeout(timeoutId);
                client.close();
                resolve({ port, success: false, error: err.message });
            }
        });

        // Enviar paquete de "knock"
        const message = Buffer.from('KNOCK');
        client.send(message, 0, message.length, port, host);
    });
}

function knockPort(host, port, protocol, timeout) {
    if (protocol === 'udp') {
        return knockUDP(host, port, timeout);
    } else {
        return knockTCP(host, port, timeout);
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function executeKnock(host, ports, protocol, delay, retries, timeout) {
    const results = [];
    const protocolName = protocol === 'udp' ? 'UDP' : 'TCP';

    console.log(`🔨 Iniciando port knocking a ${host} (${protocolName})`);
    console.log(`📋 Secuencia: ${ports.join(' → ')}`);
    console.log(`⏱️ Delay: ${delay}ms`);
    console.log(`🔄 Reintentos: ${retries}`);

    let attempt = 0;
    let success = false;

    while (attempt < retries && !success) {
        attempt++;
        console.log(`\n📦 Intento ${attempt}/${retries}`);

        let sequenceResults = [];
        let sequenceSuccess = true;

        for (let i = 0; i < ports.length; i++) {
            const port = ports[i];
            const result = await knockPort(host, port, protocol, timeout);

            sequenceResults.push(result);

            if (result.success) {
                if (verbose) {
                    console.log(`   ✅ Puerto ${port}: ABIERTO (${protocolName})`);
                }
            } else {
                console.log(`   ❌ Puerto ${port}: ${result.error || 'cerrado'}`);
                sequenceSuccess = false;
                break;
            }

            // Delay entre golpes (excepto el último)
            if (i < ports.length - 1) {
                await sleep(delay);
            }
        }

        results.push({
            attempt,
            success: sequenceSuccess,
            results: sequenceResults
        });

        if (sequenceSuccess) {
            success = true;
            console.log(`\n✅ ¡Secuencia completada exitosamente! (Intento ${attempt})`);
        } else if (attempt < retries) {
            console.log(`\n⏳ Esperando ${delay * 2}ms antes de reintentar...`);
            await sleep(delay * 2);
        }
    }

    return {
        host,
        protocol,
        ports,
        attempts: results,
        success,
        totalAttempts: attempt
    };
}

// ==================== MAIN ====================
(async function main() {
    console.log(`🔍 Port Knocking Client - MFH TOOLS PRO`);
    console.log('='.repeat(40));

    // Validar parámetros
    if (!host) {
        console.error('❌ Debes especificar un host con --host');
        console.log('   Usa --help para ver las opciones');
        process.exit(1);
    }

    if (!ports || ports.length === 0) {
        ports = CONFIG.defaultPorts;
        console.log(`ℹ️ Usando puertos por defecto: ${ports.join(', ')}`);
    }

    // Resolver host si es necesario
    const protocol = useUdp ? 'udp' : 'tcp';
    const timeout = CONFIG.timeout;

    try {
        const result = await executeKnock(host, ports, protocol, delay, retries, timeout);

        // Resumen
        console.log('\n📊 RESUMEN:');
        console.log(`   Host: ${host}`);
        console.log(`   Protocolo: ${protocol.toUpperCase()}`);
        console.log(`   Secuencia: ${ports.join(' → ')}`);
        console.log(`   Estado: ${result.success ? '✅ COMPLETADO' : '❌ FALLIDO'}`);
        console.log(`   Intentos: ${result.totalAttempts}`);

        // Guardar resultados
        if (outputFile) {
            const output = {
                timestamp: new Date().toISOString(),
                host,
                protocol,
                ports,
                delay,
                retries,
                success: result.success,
                totalAttempts: result.totalAttempts,
                attempts: result.attempts
            };
            fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));
            console.log(`\n💾 Resultados guardados en: ${outputFile}`);
        }

        // Sugerencia
        if (!result.success) {
            console.log('\n💡 Sugerencia:');
            console.log('   - Verifica que el firewall permita los puertos');
            console.log('   - La secuencia podría ser diferente');
            console.log('   - Intenta con UDP si TCP no funciona');
        }

    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        process.exit(1);
    }

    console.log('\n✅ Port Knocking Client finalizado');
})();
