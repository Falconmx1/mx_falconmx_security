#!/usr/bin/env node

/**
 * MFH TOOLS - Real WebSocket Port Scanner Backend
 * Hecho en México 🇲🇽 con huevos 🥚🔥
 * Versión: 3.0.0
 * 
 * Instalación:
 * npm install ws
 * node server.js
 * 
 * El servidor escucha en puerto 8080 por defecto
 * Para producción en Render/Railway: usa process.env.PORT
 */

const WebSocket = require('ws');
const net = require('net');
const dns = require('dns');
const { promisify } = require('util');
const lookupPromise = promisify(dns.lookup);

// ==================== CONFIGURACIÓN ====================
const WS_PORT = process.env.PORT || 8080;
const SCAN_TIMEOUT = 2000; // 2 segundos por puerto
const MAX_PORTS_PER_SCAN = 100;
const RATE_LIMIT = {
    windowMs: 60000,
    maxRequests: 10
};

// Rate limiting storage
const requestCounts = new Map();

// Puertos comunes con servicios
const COMMON_PORTS = [
    { port: 20, service: "FTP-data" }, { port: 21, service: "FTP" },
    { port: 22, service: "SSH" }, { port: 23, service: "Telnet" },
    { port: 25, service: "SMTP" }, { port: 53, service: "DNS" },
    { port: 80, service: "HTTP" }, { port: 110, service: "POP3" },
    { port: 111, service: "RPCbind" }, { port: 135, service: "RPC" },
    { port: 139, service: "NetBIOS" }, { port: 143, service: "IMAP" },
    { port: 443, service: "HTTPS" }, { port: 445, service: "SMB" },
    { port: 993, service: "IMAPS" }, { port: 995, service: "POP3S" },
    { port: 1433, service: "MSSQL" }, { port: 1723, service: "PPTP" },
    { port: 3306, service: "MySQL" }, { port: 3389, service: "RDP" },
    { port: 5432, service: "PostgreSQL" }, { port: 5900, service: "VNC" },
    { port: 6379, service: "Redis" }, { port: 8080, service: "HTTP-Alt" },
    { port: 8443, service: "HTTPS-Alt" }, { port: 27017, service: "MongoDB" }
];

function getClientIp(ws) {
    return ws._socket.remoteAddress.replace(/^::ffff:/, '');
}

function isRateLimited(ip) {
    const now = Date.now();
    const record = requestCounts.get(ip);
    
    if (!record) {
        requestCounts.set(ip, { count: 1, firstRequest: now });
        return false;
    }
    
    if (now - record.firstRequest > RATE_LIMIT.windowMs) {
        requestCounts.set(ip, { count: 1, firstRequest: now });
        return false;
    }
    
    if (record.count >= RATE_LIMIT.maxRequests) {
        return true;
    }
    
    record.count++;
    return false;
}

// Limpiar rate limiting
setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of requestCounts.entries()) {
        if (now - record.firstRequest > RATE_LIMIT.windowMs) {
            requestCounts.delete(ip);
        }
    }
}, RATE_LIMIT.windowMs);

async function isPortOpen(host, port, timeout = SCAN_TIMEOUT) {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        let resolved = false;
        
        const cleanup = () => {
            if (!resolved) {
                resolved = true;
                socket.destroy();
            }
        };
        
        socket.setTimeout(timeout);
        
        socket.on('connect', () => {
            cleanup();
            resolve({ port, service: getServiceName(port), open: true });
        });
        
        socket.on('timeout', () => {
            cleanup();
            resolve({ port, service: getServiceName(port), open: false });
        });
        
        socket.on('error', () => {
            cleanup();
            resolve({ port, service: getServiceName(port), open: false });
        });
        
        socket.connect(port, host);
    });
}

function getServiceName(port) {
    const found = COMMON_PORTS.find(p => p.port === port);
    return found ? found.service : "Unknown";
}

async function resolveHost(hostname) {
    try {
        const { address } = await lookupPromise(hostname);
        return address;
    } catch (error) {
        throw new Error(`DNS resolution failed for ${hostname}: ${error.message}`);
    }
}

async function scanPorts(host, ports) {
    const results = [];
    const totalPorts = Math.min(ports.length, MAX_PORTS_PER_SCAN);
    
    // Escanear con concurrencia de 10
    const concurrencyLimit = 10;
    const chunks = [];
    for (let i = 0; i < totalPorts; i += concurrencyLimit) {
        chunks.push(ports.slice(i, i + concurrencyLimit));
    }
    
    for (const chunk of chunks) {
        const chunkResults = await Promise.all(
            chunk.map(port => isPortOpen(host, port))
        );
        results.push(...chunkResults);
    }
    
    return results.filter(r => r.open === true);
}

// ==================== SERVIDOR WEBSOCKET ====================
const wss = new WebSocket.Server({ port: WS_PORT });

console.log(`
╔══════════════════════════════════════════════════════════════╗
║   🇲🇽 MFH TOOLS - REAL WEBSOCKET PORT SCANNER BACKEND 🥚🔥   ║
║                                                              ║
║   Servidor escuchando en puerto: ${WS_PORT}                         ║
║   WebSocket endpoint: ws://localhost:${WS_PORT}                  ║
║                                                              ║
║   Rate limit: ${RATE_LIMIT.maxRequests} escaneos/min por IP          ║
║   Timeout por puerto: ${SCAN_TIMEOUT}ms                           ║
║   Máx puertos por escaneo: ${MAX_PORTS_PER_SCAN}                       ║
╚══════════════════════════════════════════════════════════════╝
`);

wss.on('connection', (ws, req) => {
    const clientIp = getClientIp(ws);
    console.log(`✅ Nueva conexión desde: ${clientIp}`);
    
    ws.send(JSON.stringify({
        type: 'welcome',
        message: 'MFH TOOLS Port Scanner Backend v3.0 - Hecho en México 🇲🇽',
        maxPorts: MAX_PORTS_PER_SCAN,
        version: '3.0.0'
    }));
    
    ws.on('message', async (data) => {
        const startTime = Date.now();
        
        try {
            const parsed = JSON.parse(data.toString());
            console.log(`📡 [${clientIp}] Solicitud:`, parsed);
            
            if (isRateLimited(clientIp)) {
                ws.send(JSON.stringify({
                    type: 'error',
                    error: `Rate limit exceeded. Max ${RATE_LIMIT.maxRequests} scans per minute.`
                }));
                return;
            }
            
            const { action, host, ports } = parsed;
            
            if (action !== 'scan') {
                ws.send(JSON.stringify({
                    type: 'error',
                    error: 'Unknown action. Use "scan"'
                }));
                return;
            }
            
            if (!host) {
                ws.send(JSON.stringify({
                    type: 'error',
                    error: 'Missing "host" parameter'
                }));
                return;
            }
            
            let portsToScan = ports;
            if (!portsToScan || !Array.isArray(portsToScan) || portsToScan.length === 0) {
                portsToScan = COMMON_PORTS.map(p => p.port);
            }
            
            if (portsToScan.length > MAX_PORTS_PER_SCAN) {
                ws.send(JSON.stringify({
                    type: 'warning',
                    message: `Limiting scan to first ${MAX_PORTS_PER_SCAN} ports`
                }));
                portsToScan = portsToScan.slice(0, MAX_PORTS_PER_SCAN);
            }
            
            ws.send(JSON.stringify({
                type: 'status',
                message: `Resolving ${host}...`
            }));
            
            let ip;
            try {
                ip = await resolveHost(host);
            } catch (error) {
                ws.send(JSON.stringify({
                    type: 'error',
                    error: error.message
                }));
                return;
            }
            
            ws.send(JSON.stringify({
                type: 'status',
                message: `Scanning ${host} (${ip}) - ${portsToScan.length} ports...`
            }));
            
            const openPorts = await scanPorts(ip, portsToScan);
            const scanTime = Date.now() - startTime;
            
            ws.send(JSON.stringify({
                type: 'result',
                host: host,
                ip: ip,
                openPorts: openPorts,
                totalScanned: portsToScan.length,
                scanTimeMs: scanTime,
                timestamp: new Date().toISOString()
            }));
            
            console.log(`✅ [${clientIp}] Escaneo completado: ${host} -> ${openPorts.length} puertos abiertos en ${scanTime}ms`);
            
        } catch (error) {
            console.error(`❌ [${clientIp}] Error:`, error);
            ws.send(JSON.stringify({
                type: 'error',
                error: `Invalid request: ${error.message}`
            }));
        }
    });
    
    ws.on('close', () => {
        console.log(`🔌 Conexión cerrada: ${clientIp}`);
    });
    
    ws.on('error', (error) => {
        console.error(`⚠️ WebSocket error from ${clientIp}:`, error);
    });
});

process.on('SIGINT', () => {
    console.log('\n🛑 Cerrando servidor...');
    wss.close(() => {
        console.log('✅ Servidor cerrado');
        process.exit(0);
    });
});
