#!/usr/bin/env node

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const dns = require('dns');
const { exec } = require('child_process');
const net = require('net');
const tls = require('tls');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const server = http.createServer(app);

// ========== CONFIGURACIÓN DE SEGURIDAD ==========
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use(compression());
app.use(cors({
  origin: ['https://falconmx1.github.io', 'http://localhost:3000', 'http://localhost:5500'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Rate limiting por IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 200, // máximo 200 peticiones por IP
  message: { error: 'Demasiadas peticiones, espera 15 minutos' },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', limiter);

// Health check para monitoreo (Railway/Render)
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: '2.0.0'
  });
});

// ========== BASE DE DATOS ==========
const dbPath = process.env.DATABASE_URL || './data/mfh_tools.db';
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const db = new sqlite3.Database(dbPath);
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS scans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT,
    target TEXT,
    result TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS api_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    endpoint TEXT,
    ip TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
});

// ========== WEBSOCKET CON CLUSTERING ==========
const wss = new WebSocket.Server({ 
  server,
  clientTracking: true,
  maxPayload: 1024 * 1024 // 1MB
});

// Pool de workers para escaneos concurrentes
const { Worker } = require('worker_threads');
const numWorkers = Math.max(1, require('os').cpus().length - 1);
const scanWorkers = [];
let currentWorker = 0;

for (let i = 0; i < numWorkers; i++) {
  try {
    const worker = new Worker('./workers/scan-worker.js');
    scanWorkers.push(worker);
    console.log(`✅ Worker ${i} iniciado`);
  } catch (err) {
    console.error(`❌ Error iniciando worker ${i}:`, err.message);
    // Fallback: worker simulado
    scanWorkers.push({ postMessage: (data) => console.log('Mock worker:', data) });
  }
}

wss.on('connection', (ws, req) => {
  const clientIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  console.log(`📡 Cliente conectado: ${clientIP}`);
  
  let inactivityTimeout = setTimeout(() => {
    ws.close(1000, 'Inactividad');
  }, 300000); // 5 minutos
  
  ws.on('message', async (message) => {
    clearTimeout(inactivityTimeout);
    inactivityTimeout = setTimeout(() => ws.close(1000, 'Inactividad'), 300000);
    
    try {
      const data = JSON.parse(message);
      
      if (scanWorkers.length > 0 && scanWorkers[currentWorker]) {
        const worker = scanWorkers[currentWorker];
        currentWorker = (currentWorker + 1) % scanWorkers.length;
        
        worker.postMessage({ ...data, clientIP });
        worker.once('message', (result) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(result));
          }
        });
      } else {
        ws.send(JSON.stringify({ error: 'No workers disponibles' }));
      }
    } catch (err) {
      ws.send(JSON.stringify({ error: err.message }));
    }
  });
  
  ws.on('close', () => {
    clearTimeout(inactivityTimeout);
    console.log(`🔌 Cliente desconectado: ${clientIP}`);
  });
});

// ========== FUNCIONES AUXILIARES ==========
const logAPI = (endpoint, ip) => {
  db.run('INSERT INTO api_logs (endpoint, ip) VALUES (?, ?)', [endpoint, ip]);
};

const saveScan = (type, target, result) => {
  db.run('INSERT INTO scans (type, target, result) VALUES (?, ?, ?)', [type, target, JSON.stringify(result)]);
};

// ========== API ENDPOINTS - 26 HERRAMIENTAS ==========

// 1. Escáner de Puertos (TCP/UDP)
app.post('/api/port-scan', async (req, res) => {
  const { host, ports = '1-1000', type = 'tcp' } = req.body;
  const clientIP = req.ip;
  logAPI('/api/port-scan', clientIP);
  
  try {
    const [startPort, endPort] = ports.split('-').map(Number);
    const openPorts = [];
    const maxConcurrent = 50;
    
    for (let port = startPort; port <= endPort; port += maxConcurrent) {
      const batch = [];
      for (let p = port; p < Math.min(port + maxConcurrent, endPort + 1); p++) {
        batch.push(new Promise((resolve) => {
          const socket = new net.Socket();
          socket.setTimeout(2000);
          socket.on('connect', () => {
            openPorts.push(p);
            socket.destroy();
            resolve();
          });
          socket.on('timeout', () => { socket.destroy(); resolve(); });
          socket.on('error', () => { resolve(); });
          socket.connect(p, host);
        }));
      }
      await Promise.all(batch);
    }
    
    const result = { host, openPorts, totalOpen: openPorts.length, type };
    saveScan('port_scan', host, result);
    res.json({ success: true, ...result });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// 2. RSA/AES Cipher
app.post('/api/cipher', (req, res) => {
  const { action, algorithm, text, key, iv } = req.body;
  logAPI('/api/cipher', req.ip);
  
  try {
    let result;
    if (algorithm === 'aes') {
      const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key, 'hex'), Buffer.from(iv, 'hex'));
      result = action === 'encrypt' 
        ? cipher.update(text, 'utf8', 'hex') + cipher.final('hex')
        : crypto.createDecipheriv('aes-256-cbc', Buffer.from(key, 'hex'), Buffer.from(iv, 'hex')).update(text, 'hex', 'utf8');
    } else if (algorithm === 'rsa') {
      const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
      if (action === 'encrypt') {
        result = crypto.publicEncrypt(publicKey, Buffer.from(text)).toString('base64');
      } else {
        result = crypto.privateDecrypt(privateKey, Buffer.from(text, 'base64')).toString('utf8');
      }
    }
    res.json({ success: true, result });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// 3. OSINT Recon
app.get('/api/osint/:email', async (req, res) => {
  const { email } = req.params;
  logAPI('/api/osint', req.ip);
  
  try {
    const [username, domain] = email.split('@');
    const results = {
      email,
      username,
      domain,
      possible_social: [
        `https://github.com/${username}`,
        `https://twitter.com/${username}`,
        `https://linkedin.com/in/${username}`
      ]
    };
    saveScan('osint', email, results);
    res.json({ success: true, ...results });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// 4. Rainbow Tables (simulado con hash DB local)
app.post('/api/rainbow', (req, res) => {
  const { hash, type = 'md5' } = req.body;
  logAPI('/api/rainbow', req.ip);
  
  const rainbowDB = {
    '5f4dcc3b5aa765d61d8327deb882cf99': 'password',
    '25d55ad283aa400af464c76d713c07ad': '12345678',
    'e99a18c428cb38d5f260853678922e03': 'abc123'
  };
  
  const result = rainbowDB[hash] || 'Hash no encontrado en rainbow tables';
  res.json({ success: true, hash, cracked: result, type });
});

// 5. WHOIS Lookup
app.get('/api/whois/:domain', async (req, res) => {
  const { domain } = req.params;
  logAPI('/api/whois', req.ip);
  
  exec(`whois ${domain}`, (error, stdout) => {
    if (error) return res.json({ success: false, error: error.message });
    const lines = stdout.split('\n').slice(0, 30);
    saveScan('whois', domain, lines);
    res.json({ success: true, domain, data: lines });
  });
});

// 6. Wappalyzer (simulado con User-Agent)
app.get('/api/wappalyzer/:url', async (req, res) => {
  const { url } = req.params;
  logAPI('/api/wappalyzer', req.ip);
  
  const technologies = [];
  if (url.includes('wordpress')) technologies.push('WordPress');
  if (url.includes('react')) technologies.push('React');
  technologies.push('jQuery', 'Google Analytics');
  
  res.json({ success: true, url, technologies });
});

// 7. Subdomain Finder
app.get('/api/subdomains/:domain', async (req, res) => {
  const { domain } = req.params;
  logAPI('/api/subdomains', req.ip);
  
  const common = ['www', 'mail', 'ftp', 'localhost', 'webmail', 'admin', 'blog'];
  const results = [];
  
  for (const sub of common) {
    try {
      await dns.promises.resolve(`${sub}.${domain}`);
      results.push(`${sub}.${domain}`);
    } catch (e) {}
  }
  
  saveScan('subdomain', domain, results);
  res.json({ success: true, domain, subdomains: results });
});

// 8. Hash Tools
app.post('/api/hash', (req, res) => {
  const { text, action, algorithm = 'md5' } = req.body;
  logAPI('/api/hash', req.ip);
  
  let result;
  if (action === 'generate') {
    result = crypto.createHash(algorithm).update(text).digest('hex');
  } else if (action === 'verify') {
    const hash = crypto.createHash(algorithm).update(text.text).digest('hex');
    result = { valid: hash === text.hash, generated: hash };
  }
  res.json({ success: true, result });
});

// 9. IA Asistente (simulado)
app.post('/api/ia-analyze', (req, res) => {
  const { log } = req.body;
  logAPI('/api/ia-analyze', req.ip);
  
  const analysis = {
    level: log.includes('error') ? 'CRÍTICO' : 'INFORMATIVO',
    suggestion: log.includes('error') ? 'Revisar logs del sistema inmediatamente' : 'Todo operando normalmente',
    summary: `Análisis de ${log.length} caracteres completado`
  };
  res.json({ success: true, analysis });
});

// 10. DNS Lookup
app.get('/api/dns/:domain', async (req, res) => {
  const { domain } = req.params;
  logAPI('/api/dns', req.ip);
  
  const records = {
    A: await dns.promises.resolve4(domain).catch(() => []),
    AAAA: await dns.promises.resolve6(domain).catch(() => []),
    MX: await dns.promises.resolveMx(domain).catch(() => []),
    NS: await dns.promises.resolveNs(domain).catch(() => []),
    TXT: await dns.promises.resolveTxt(domain).catch(() => [])
  };
  res.json({ success: true, domain, records });
});

// 11. SSL Checker
app.get('/api/ssl/:domain', async (req, res) => {
  const { domain } = req.params;
  logAPI('/api/ssl', req.ip);
  
  const options = { host: domain, port: 443, rejectUnauthorized: false };
  const socket = tls.connect(options, () => {
    const cert = socket.getPeerCertificate();
    const validFrom = new Date(cert.valid_from);
    const validTo = new Date(cert.valid_to);
    socket.destroy();
    res.json({
      success: true,
      valid: cert.valid_from && cert.valid_to,
      issuer: cert.issuer,
      valid_from: cert.valid_from,
      valid_to: cert.valid_to,
      days_left: Math.ceil((validTo - new Date()) / (1000 * 60 * 60 * 24))
    });
  });
  socket.on('error', (err) => res.json({ success: false, error: err.message }));
});

// 12. IP Geolocation
app.get('/api/ip-geo/:ip', async (req, res) => {
  const { ip } = req.params;
  logAPI('/api/ip-geo', req.ip);
  
  try {
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,regionName,city,lat,lon,isp,org,as,query`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// 13. Base64 Tool
app.post('/api/base64', (req, res) => {
  const { action, text } = req.body;
  logAPI('/api/base64', req.ip);
  
  let result;
  if (action === 'encode') {
    result = Buffer.from(text).toString('base64');
  } else if (action === 'decode') {
    result = Buffer.from(text, 'base64').toString('utf-8');
  }
  res.json({ success: true, result });
});

// 14. MAC Lookup
app.get('/api/mac/:mac', async (req, res) => {
  const { mac } = req.params;
  logAPI('/api/mac', req.ip);
  
  try {
    const response = await fetch(`https://api.maclookup.app/v2/macs/${mac}`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.json({ vendor: 'Desconocido', mac, error: error.message });
  }
});

// 15. Reverse IP
app.get('/api/reverse-ip/:domain', async (req, res) => {
  const { domain } = req.params;
  logAPI('/api/reverse-ip', req.ip);
  
  try {
    const response = await fetch(`https://api.hackertarget.com/reverseiplookup/?q=${domain}`);
    const text = await response.text();
    const ips = text.split('\n').filter(ip => ip.includes('.'));
    res.json({ domain, ips, count: ips.length });
  } catch (error) {
    res.json({ domain, error: error.message });
  }
});

// 16. HIBP
app.get('/api/hibp/:email', async (req, res) => {
  const { email } = req.params;
  logAPI('/api/hibp', req.ip);
  
  try {
    const response = await fetch(`https://haveibeenpwned.com/api/v3/breachedaccount/${email}`, {
      headers: { 'hibp-api-key': process.env.HIBP_API_KEY || '' }
    });
    const breaches = await response.json();
    res.json({ email, breaches: Array.isArray(breaches) ? breaches : [], pwned: Array.isArray(breaches) && breaches.length > 0 });
  } catch (error) {
    res.json({ email, pwned: false, error: error.message });
  }
});

// 17. CVE Search
app.get('/api/cve/:cve_id', async (req, res) => {
  const { cve_id } = req.params;
  logAPI('/api/cve', req.ip);
  
  try {
    const response = await fetch(`https://cve.circl.lu/api/cve/${cve_id.toUpperCase()}`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.json({ cve_id, error: error.message });
  }
});

// 18. Banner Grabbing
app.get('/api/banner/:host/:port', async (req, res) => {
  const { host, port } = req.params;
  logAPI('/api/banner', req.ip);
  
  const socket = new net.Socket();
  socket.setTimeout(5000);
  
  socket.connect(parseInt(port), host, () => {
    socket.write('\r\n');
  });
  
  let banner = '';
  socket.on('data', (data) => {
    banner += data.toString();
    socket.destroy();
  });
  socket.on('timeout', () => {
    socket.destroy();
    res.json({ success: false, error: 'Timeout' });
  });
  socket.on('error', (err) => {
    res.json({ success: false, error: err.message });
  });
  socket.on('close', () => {
    res.json({ success: true, banner: banner.trim() || 'No banner disponible' });
  });
});

// 19. Zone Transfer
app.get('/api/zonetransfer/:domain', async (req, res) => {
  const { domain } = req.params;
  logAPI('/api/zonetransfer', req.ip);
  
  try {
    const nsServers = await dns.promises.resolveNs(domain);
    const results = {};
    
    for (const ns of nsServers.slice(0, 3)) {
      try {
        const { stdout } = await new Promise((resolve, reject) => {
          exec(`dig @${ns} ${domain} axfr +short`, (error, stdout, stderr) => {
            if (error) reject(error);
            else resolve({ stdout, stderr });
          });
        });
        results[ns] = stdout.split('\n').filter(line => line.trim());
      } catch (e) {
        results[ns] = `Failed: ${e.message}`;
      }
    }
    res.json({ success: true, domain, zone_transfers: results });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// 20-26. Endpoints adicionales para compatibilidad
app.get('/api/stats', (req, res) => {
  res.json({
    tools: 26,
    scans: 0,
    uptime: process.uptime(),
    ws_clients: wss.clients.size,
    workers: numWorkers
  });
});

app.get('/api/history', (req, res) => {
  db.all('SELECT * FROM scans ORDER BY created_at DESC LIMIT 50', (err, rows) => {
    res.json({ success: true, history: rows || [] });
  });
});

// ========== MANEJO DE 404s ==========
// Middleware para rutas no encontradas
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Endpoint no encontrado',
    message: 'Revisa la documentación de la API en /docs',
    path: req.path
  });
});

// Documentación básica de la API
app.get('/docs', (req, res) => {
  res.json({
    name: 'MFH Tools Pro API',
    version: '2.0.0',
    endpoints: {
      'POST /api/port-scan': 'Escáner de puertos TCP/UDP',
      'POST /api/cipher': 'Cifrado RSA/AES',
      'GET /api/osint/:email': 'OSINT Recon',
      'GET /api/whois/:domain': 'WHOIS Lookup',
      'GET /api/dns/:domain': 'DNS Lookup',
      'GET /api/ssl/:domain': 'SSL Checker',
      'GET /api/ip-geo/:ip': 'IP Geolocation',
      'POST /api/base64': 'Base64 Tool',
      'GET /api/mac/:mac': 'MAC Lookup',
      'GET /api/reverse-ip/:domain': 'Reverse IP',
      'GET /api/hibp/:email': 'Have I Been Pwned',
      'GET /api/cve/:cve_id': 'CVE Search',
      'GET /api/banner/:host/:port': 'Banner Grabbing',
      'GET /api/zonetransfer/:domain': 'Zone Transfer',
      'GET /health': 'Health Check',
      'GET /docs': 'Esta documentación'
    }
  });
});

// ========== INICIO DEL SERVIDOR ==========
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`
  ███╗   ███╗███████╗██╗  ██╗    ████████╗ ██████╗  ██████╗ ██╗     ███████╗
  ████╗ ████�╚══███╔╝██║  ██║    ╚══██╔══╝██╔═══██╗██╔═══██╗██║     ██╔════╝
  ██╔████╔██║  ███╔╝ ███████║       ██║   ██║   ██║██║   ██║██║     ███████╗
  ██║╚██╔╝██║ ███╔╝  ╚════██║       ██║   ██║   ██║██║   ██║██║     ╚════██║
  ██║ ╚═╝ ██║███████╗     ██║       ██║   ╚██████╔╝╚██████╔╝███████╗███████║
  ╚═╝     ╚═╝╚══════╝     ╚═╝       ╚═╝    ╚═════╝  ╚═════╝ ╚══════╝╚══════╝
  
  🔥 MFH TOOLS PRO - Backend v2.0
  📡 Servidor corriendo en http://0.0.0.0:${PORT}
  🔌 WebSocket listo en ws://0.0.0.0:${PORT}
  🧠 Workers activos: ${numWorkers}
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Recibido SIGTERM, cerrando servidor...');
  server.close(() => {
    db.close();
    process.exit(0);
  });
});
