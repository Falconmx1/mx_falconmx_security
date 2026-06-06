#!/usr/bin/env node

/**
 * MFH TOOLS PRO - Backend Server
 * Suite de Ciberseguridad Mexicana
 * @version 4.0.0
 * @author FalconMX Security
 */

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// Importar Worker Manager
const WorkerManager = require('./workers/worker-manager');

// ==================== CONFIGURACIÓN ====================
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: '/ws' });

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'mfh_super_secret_key_change_me_2026';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'mfh_refresh_secret_change_me';
const NODE_ENV = process.env.NODE_ENV || 'development';

// ==================== BASE DE DATOS ====================
const dbPath = process.env.DATABASE_URL || './data/mfh.db';
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const db = new sqlite3.Database(dbPath);

// Inicializar tablas
db.serialize(() => {
  // Usuarios
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    is_active INTEGER DEFAULT 1,
    last_login DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  
  // Escaneos
  db.run(`CREATE TABLE IF NOT EXISTS scans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scan_id TEXT UNIQUE NOT NULL,
    user_id INTEGER,
    target TEXT NOT NULL,
    ports TEXT NOT NULL,
    results TEXT,
    open_ports INTEGER,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);
  
  // Logs del sistema
  db.run(`CREATE TABLE IF NOT EXISTS system_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    level TEXT NOT NULL,
    message TEXT NOT NULL,
    user_id INTEGER,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  
  // Configuración
  db.run(`CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  
  // Insertar admin por defecto si no existe
  db.get("SELECT * FROM users WHERE email = 'admin@falconmx.security'", async (err, user) => {
    if (!err && !user) {
      const hashedPassword = await bcrypt.hash('Admin123!', 10);
      db.run("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)", 
        ['Administrador', 'admin@falconmx.security', hashedPassword, 'admin']);
      console.log('✅ Usuario admin creado: admin@falconmx.security / Admin123!');
    }
  });
});

// ==================== MIDDLEWARE ====================
app.use(helmet({
  contentSecurityPolicy: false, // Para permitir scripts de TensorFlow.js
  crossOriginEmbedderPolicy: false
}));
app.use(cors({
  origin: NODE_ENV === 'production' ? ['https://falconmx1.github.io', 'https://mfh-backend.onrender.com'] : '*',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // 100 peticiones por ventana
  message: { error: 'Demasiadas peticiones, intenta de nuevo más tarde' }
});
app.use('/api/', limiter);

// Logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
    if (req.user) {
      logSystem('info', `${req.method} ${req.path} por usuario ${req.user.id}`, req.user.id);
    }
  });
  next();
});

// ==================== FUNCIONES AUXILIARES ====================
function logSystem(level, message, userId = null) {
  db.run("INSERT INTO system_logs (level, message, user_id) VALUES (?, ?, ?)", [level, message, userId]);
  console.log(`[${level.toUpperCase()}] ${message}`);
}

function generateToken(userId, email, role) {
  return jwt.sign({ id: userId, email, role }, JWT_SECRET, { expiresIn: '24h' });
}

function generateRefreshToken(userId) {
  return jwt.sign({ id: userId }, JWT_REFRESH_SECRET, { expiresIn: '7d' });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

// Middleware de autenticación
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }
  
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(403).json({ error: 'Token inválido o expirado' });
  }
  
  req.user = decoded;
  next();
}

// Middleware de admin
function adminOnly(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de administrador' });
  }
  next();
}

// Parsear rango de puertos
function parsePortRange(portRange) {
  const ports = new Set();
  const parts = portRange.split(',');
  
  for (const part of parts) {
    if (part.includes('-')) {
      const [start, end] = part.split('-').map(Number);
      for (let i = start; i <= end; i++) ports.add(i);
    } else if (part.trim()) {
      ports.add(Number(part));
    }
  }
  
  return Array.from(ports).sort((a, b) => a - b);
}

// ==================== WORKER MANAGER ====================
const workerManager = new WorkerManager();

// Inicializar workers al arrancar
workerManager.initWorkers(parseInt(process.env.MAX_WORKERS) || 4);

// Escuchar eventos de workers
workerManager.on('progress', (data) => {
  broadcastToWebSockets({
    type: 'scan_progress',
    scanId: data.scanId,
    port: data.port,
    status: data.status
  });
});

workerManager.on('completed', (data) => {
  broadcastToWebSockets({
    type: 'scan_complete',
    scanId: data.scanId,
    results: data.results
  });
  
  // Guardar en BD
  db.run(
    "UPDATE scans SET results = ?, open_ports = ?, status = 'completed', completed_at = CURRENT_TIMESTAMP WHERE scan_id = ?",
    [JSON.stringify(data.results), data.results.filter(r => r.status === 'open').length, data.scanId]
  );
});

// ==================== WEBSOCKETS ====================
const clients = new Map(); // userId -> WebSocket

wss.on('connection', (ws, req) => {
  console.log('🔌 Nuevo cliente WebSocket conectado');
  
  let userId = null;
  
  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      
      if (data.type === 'auth') {
        const decoded = verifyToken(data.token);
        if (decoded) {
          userId = decoded.id;
          clients.set(userId, ws);
          ws.send(JSON.stringify({ type: 'auth_success', message: 'Autenticado correctamente' }));
          console.log(`WebSocket autenticado para usuario ${userId}`);
        } else {
          ws.send(JSON.stringify({ type: 'auth_error', error: 'Token inválido' }));
        }
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
    }
  });
  
  ws.on('close', () => {
    if (userId) clients.delete(userId);
    console.log('🔌 WebSocket desconectado');
  });
});

function broadcastToWebSockets(data, excludeUserId = null) {
  const message = JSON.stringify(data);
  for (const [userId, client] of clients) {
    if (client.readyState === WebSocket.OPEN && userId !== excludeUserId) {
      client.send(message);
    }
  }
}

// ==================== API ENDPOINTS ====================

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date(),
    uptime: process.uptime(),
    version: '4.0.0',
    workers: workerManager.getStats()
  });
});

// ==================== AUTENTICACIÓN ====================

// Registro
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    db.run(
      "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
      [name, email.toLowerCase(), hashedPassword],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE')) {
            return res.status(409).json({ error: 'El email ya está registrado' });
          }
          return res.status(500).json({ error: 'Error al registrar usuario' });
        }
        
        const token = generateToken(this.lastID, email, 'user');
        const refreshToken = generateRefreshToken(this.lastID);
        
        logSystem('info', `Nuevo usuario registrado: ${email}`);
        res.status(201).json({ token, refreshToken, user: { id: this.lastID, name, email } });
      }
    );
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña requeridos' });
  }
  
  db.get("SELECT * FROM users WHERE email = ?", [email.toLowerCase()], async (err, user) => {
    if (err || !user) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    
    const token = generateToken(user.id, user.email, user.role);
    const refreshToken = generateRefreshToken(user.id);
    
    db.run("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?", [user.id]);
    logSystem('info', `Usuario logueado: ${email}`, user.id);
    
    res.json({
      token,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  });
});

// Refresh token
app.post('/api/auth/refresh', (req, res) => {
  const { refreshToken } = req.body;
  
  if (!refreshToken) {
    return res.status(401).json({ error: 'Refresh token requerido' });
  }
  
  try {
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    db.get("SELECT * FROM users WHERE id = ?", [decoded.id], (err, user) => {
      if (err || !user) {
        return res.status(401).json({ error: 'Usuario no encontrado' });
      }
      
      const newToken = generateToken(user.id, user.email, user.role);
      res.json({ token: newToken });
    });
  } catch (error) {
    res.status(403).json({ error: 'Refresh token inválido' });
  }
});

// Logout (cliente-side, solo invalidar token localmente)
app.post('/api/auth/logout', authenticateToken, (req, res) => {
  logSystem('info', `Usuario cerró sesión: ${req.user.email}`, req.user.id);
  res.json({ message: 'Sesión cerrada correctamente' });
});

// ==================== ESCÁNER DE PUERTOS ====================

// Escaneo con workers distribuidos
app.post('/api/scan', authenticateToken, async (req, res) => {
  try {
    const { target, ports, useWorkers = true, options = {} } = req.body;
    
    if (!target) {
      return res.status(400).json({ error: 'Target requerido (IP o dominio)' });
    }
    
    const portList = ports ? parsePortRange(ports) : Array.from({ length: 1000 }, (_, i) => i + 1);
    const scanId = uuidv4();
    
    // Guardar en BD
    db.run(
      "INSERT INTO scans (scan_id, user_id, target, ports, status) VALUES (?, ?, ?, ?, ?)",
      [scanId, req.user.id, target, ports || '1-1000', 'pending']
    );
    
    if (useWorkers && workerManager) {
      // Escaneo distribuido con workers
      logSystem('info', `Iniciando escaneo distribuido: ${target} (${portList.length} puertos) por usuario ${req.user.id}`, req.user.id);
      
      // Ejecutar en segundo plano
      workerManager.assignScan(scanId, target, ports || '1-1000', { ...options, timeout: 300000 })
        .then(results => {
          broadcastToWebSockets({
            type: 'scan_complete',
            scanId,
            results,
            summary: {
              totalPorts: portList.length,
              openPorts: results.filter(r => r.status === 'open').length
            }
          });
        })
        .catch(error => {
          console.error('Scan error:', error);
          broadcastToWebSockets({ type: 'scan_error', scanId, error: error.message });
          db.run("UPDATE scans SET status = 'failed' WHERE scan_id = ?", [scanId]);
        });
      
      res.json({ scanId, message: 'Escaneo distribuido iniciado', totalPorts: portList.length, workersActive: true });
    } else {
      // Escaneo simple (sin workers)
      res.json({ scanId, message: 'Escaneo iniciado (modo simple)', totalPorts: portList.length });
      // Implementar escaneo simple aquí si es necesario
    }
  } catch (error) {
    console.error('Scan endpoint error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener estado de un escaneo
app.get('/api/scan/:scanId', authenticateToken, (req, res) => {
  db.get(
    "SELECT * FROM scans WHERE scan_id = ? AND user_id = ?",
    [req.params.scanId, req.user.id],
    (err, scan) => {
      if (err || !scan) {
        return res.status(404).json({ error: 'Escaneo no encontrado' });
      }
      
      res.json({
        ...scan,
        results: scan.results ? JSON.parse(scan.results) : null
      });
    }
  );
});

// Historial de escaneos del usuario
app.get('/api/scans/history', authenticateToken, (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  db.all(
    "SELECT * FROM scans WHERE user_id = ? ORDER BY created_at DESC LIMIT ?",
    [req.user.id, limit],
    (err, scans) => {
      if (err) {
        return res.status(500).json({ error: 'Error al obtener historial' });
      }
      
      res.json(scans.map(scan => ({
        ...scan,
        results: scan.results ? JSON.parse(scan.results) : null
      })));
    }
  );
});

// ==================== EXPORTACIONES ====================

// Exportar resultados
app.post('/api/export/:format', authenticateToken, async (req, res) => {
  const { format } = req.params;
  const { results, scanId } = req.body;
  
  if (!results || !Array.isArray(results)) {
    return res.status(400).json({ error: 'Resultados inválidos' });
  }
  
  const filename = `scan_${scanId || Date.now()}`;
  
  switch(format) {
    case 'json':
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=${filename}.json`);
      res.json(results);
      break;
      
    case 'csv':
      let csv = 'Port,Status,Service\n';
      results.forEach(r => {
        csv += `${r.port},${r.status},${r.service || ''}\n`;
      });
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=${filename}.csv`);
      res.send(csv);
      break;
      
    case 'pdf':
      try {
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}.pdf`);
        doc.pipe(res);
        
        // Header
        doc.fontSize(24).font('Helvetica-Bold').text('MFH TOOLS PRO', { align: 'center' });
        doc.fontSize(16).text('Reporte de Escaneo de Puertos', { align: 'center' });
        doc.moveDown();
        
        // Metadata
        doc.fontSize(10).font('Helvetica');
        doc.text(`Fecha: ${new Date().toLocaleString()}`, { align: 'right' });
        doc.text(`Scan ID: ${scanId || 'N/A'}`, { align: 'right' });
        doc.moveDown();
        
        // Resumen
        const openPorts = results.filter(r => r.status === 'open');
        doc.fontSize(14).font('Helvetica-Bold').text('Resumen', { underline: true });
        doc.fontSize(12).font('Helvetica');
        doc.text(`Total puertos escaneados: ${results.length}`);
        doc.text(`Puertos abiertos: ${openPorts.length}`);
        doc.text(`Puertos cerrados/filtrados: ${results.length - openPorts.length}`);
        doc.moveDown();
        
        // Tabla de resultados
        doc.fontSize(14).font('Helvetica-Bold').text('Resultados Detallados', { underline: true });
        doc.moveDown(0.5);
        
        // Cabecera de tabla
        let y = doc.y;
        doc.fontSize(10).font('Helvetica-Bold');
        doc.text('Puerto', 50, y);
        doc.text('Estado', 150, y);
        doc.text('Servicio', 250, y);
        doc.moveDown();
        
        // Filas
        doc.fontSize(9).font('Helvetica');
        results.slice(0, 100).forEach(r => {
          y = doc.y;
          doc.text(r.port.toString(), 50, y);
          doc.text(r.status, 150, y);
          doc.text(r.service || '-', 250, y);
          doc.moveDown(0.5);
        });
        
        if (results.length > 100) {
          doc.text(`... y ${results.length - 100} resultados más`);
        }
        
        doc.end();
      } catch (error) {
        console.error('PDF generation error:', error);
        res.status(500).json({ error: 'Error generando PDF' });
      }
      break;
      
    default:
      res.status(400).json({ error: 'Formato no soportado' });
  }
  
  logSystem('info', `Exportación ${format} realizada por usuario ${req.user.id}`, req.user.id);
});

// ==================== ADMIN PANEL ENDPOINTS ====================

// Estadísticas del dashboard
app.get('/api/admin/stats', authenticateToken, adminOnly, (req, res) => {
  db.get("SELECT COUNT(*) as totalUsers FROM users WHERE role = 'user'", (err, userCount) => {
    db.get("SELECT COUNT(*) as totalScans FROM scans", (err, scanCount) => {
      db.get("SELECT COUNT(*) as scansToday FROM scans WHERE date(created_at) = date('now')", (err, todayScans) => {
        const workersStats = workerManager.getStats();
        
        // Datos para gráficas (últimos 7 días)
        db.all(`
          SELECT date(created_at) as date, COUNT(*) as count 
          FROM scans 
          WHERE created_at >= date('now', '-7 days')
          GROUP BY date(created_at)
        `, (err, scansData) => {
          const scansLabels = [];
          const scansValues = [];
          for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            scansLabels.push(dateStr.slice(5));
            const found = scansData.find(d => d.date === dateStr);
            scansValues.push(found ? found.count : 0);
          }
          
          res.json({
            totalUsers: userCount?.totalUsers || 0,
            totalScans: scanCount?.totalScans || 0,
            scansToday: todayScans?.scansToday || 0,
            activeWorkers: workersStats.activeWorkers || 0,
            scansLabels,
            scansData: scansValues,
            portsDistribution: [35, 28, 22, 15] // HTTP, HTTPS, SSH, Otros
          });
        });
      });
    });
  });
});

// Listar usuarios
app.get('/api/admin/users', authenticateToken, adminOnly, (req, res) => {
  db.all("SELECT id, name, email, role, is_active, last_login, created_at FROM users", (err, users) => {
    if (err) return res.status(500).json({ error: 'Error al obtener usuarios' });
    res.json(users);
  });
});

// Eliminar usuario
app.delete('/api/admin/users/:id', authenticateToken, adminOnly, (req, res) => {
  const userId = req.params.id;
  if (userId == req.user.id) {
    return res.status(400).json({ error: 'No puedes eliminarte a ti mismo' });
  }
  
  db.run("DELETE FROM users WHERE id = ? AND role != 'admin'", [userId], function(err) {
    if (err) return res.status(500).json({ error: 'Error al eliminar usuario' });
    if (this.changes === 0) return res.status(404).json({ error: 'Usuario no encontrado o es administrador' });
    
    logSystem('info', `Usuario ${userId} eliminado por admin ${req.user.id}`, req.user.id);
    res.json({ message: 'Usuario eliminado correctamente' });
  });
});

// Listar escaneos (admin)
app.get('/api/admin/scans', authenticateToken, adminOnly, (req, res) => {
  db.all(`
    SELECT s.*, u.email as userEmail 
    FROM scans s 
    LEFT JOIN users u ON s.user_id = u.id 
    ORDER BY s.created_at DESC 
    LIMIT 200
  `, (err, scans) => {
    if (err) return res.status(500).json({ error: 'Error al obtener escaneos' });
    res.json(scans.map(scan => ({
      ...scan,
      openPorts: scan.open_ports,
      results: scan.results ? JSON.parse(scan.results).slice(0, 10) : null
    })));
  });
});

// Logs del sistema
app.get('/api/admin/logs', authenticateToken, adminOnly, (req, res) => {
  const limit = parseInt(req.query.limit) || 200;
  db.all(
    "SELECT * FROM system_logs ORDER BY timestamp DESC LIMIT ?",
    [limit],
    (err, logs) => {
      if (err) return res.status(500).json({ error: 'Error al obtener logs' });
      res.json(logs);
    }
  );
});

// Configuración
app.get('/api/admin/settings', authenticateToken, adminOnly, (req, res) => {
  db.all("SELECT * FROM settings", (err, settings) => {
    const settingsObj = {};
    if (settings) {
      settings.forEach(s => { settingsObj[s.key] = s.value; });
    }
    res.json(settingsObj);
  });
});

app.post('/api/admin/settings', authenticateToken, adminOnly, (req, res) => {
  const { settings } = req.body;
  const stmt = db.prepare("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)");
  
  for (const [key, value] of Object.entries(settings)) {
    stmt.run(key, String(value));
  }
  stmt.finalize();
  
  logSystem('info', `Configuración actualizada por admin ${req.user.id}`, req.user.id);
  res.json({ message: 'Configuración guardada' });
});

// ==================== IA ASSISTANT ENDPOINTS ====================

// Endpoint para análisis de logs con IA (opcional, el cliente usa TensorFlow.js local)
app.post('/api/ai/analyze-log', authenticateToken, async (req, res) => {
  const { logText } = req.body;
  
  if (!logText) {
    return res.status(400).json({ error: 'Log text required' });
  }
  
  // Palabras clave para clasificación básica (fallback si TF no está disponible)
  const maliciousKeywords = ['failed password', 'brute force', 'attack', 'exploit', 'malware', 'intrusion', 'unauthorized', 'sql injection', 'xss', 'buffer overflow'];
  const suspiciousKeywords = ['multiple', 'repeated', 'unusual', 'anomaly', 'timeout', 'denied'];
  
  const textLower = logText.toLowerCase();
  let maliciousScore = 0;
  let suspiciousScore = 0;
  
  maliciousKeywords.forEach(kw => { if (textLower.includes(kw)) maliciousScore += 0.2; });
  suspiciousKeywords.forEach(kw => { if (textLower.includes(kw)) suspiciousScore += 0.1; });
  
  let classification = 'benign';
  let confidence = 0.9 - (maliciousScore + suspiciousScore);
  
  if (maliciousScore > 0.4) {
    classification = 'malicious';
    confidence = maliciousScore;
  } else if (suspiciousScore > 0.2) {
    classification = 'suspicious';
    confidence = suspiciousScore;
  }
  
  res.json({
    classification,
    confidence,
    maliciousScore,
    suspiciousScore,
    recommendations: classification === 'malicious' ? ['Bloquear IP origen', 'Revisar logs relacionados', 'Alertar al equipo de seguridad'] :
                    classification === 'suspicious' ? ['Monitorear más de cerca', 'Revisar configuración'] :
                    ['No se requiere acción inmediata']
  });
});

// ==================== WHOIS API ====================

app.get('/api/whois/:domain', authenticateToken, async (req, res) => {
  const { domain } = req.params;
  
  try {
    // Usar whois-cli o API externa
    const { stdout } = await execPromise(`whois ${domain}`);
    
    // Parsear información básica
    const whoisData = {
      domain,
      registrar: extractWhoisField(stdout, 'Registrar:') || extractWhoisField(stdout, 'Registrar:'),
      creationDate: extractWhoisField(stdout, 'Creation Date:'),
      expiryDate: extractWhoisField(stdout, 'Registry Expiry Date:'),
      nameServers: extractWhoisField(stdout, 'Name Server:'),
      status: extractWhoisField(stdout, 'Domain Status:'),
      raw: stdout.substring(0, 2000)
    };
    
    res.json(whoisData);
  } catch (error) {
    res.status(500).json({ error: 'Error consulting WHOIS', details: error.message });
  }
});

function extractWhoisField(text, field) {
  const lines = text.split('\n');
  for (const line of lines) {
    if (line.startsWith(field)) {
      return line.substring(field.length).trim();
    }
  }
  return null;
}

// ==================== SISTEMA DE ARCHIVOS PARA ESCANEOS OFFLINE ====================
// Servir archivos estáticos
app.get('/manifest.json', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'manifest.json'));
});

app.get('/sw.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.sendFile(path.join(__dirname, 'public', 'sw.js'));
});

// ==================== INICIO DEL SERVIDOR ====================
server.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════════════════════════╗
  ║                                                              ║
  ║   🔥 MFH TOOLS PRO - Suite de Ciberseguridad Mexicana       ║
  ║                                                              ║
  ║   🚀 Servidor corriendo en http://localhost:${PORT}            ║
  ║   🌍 API Endpoint: http://localhost:${PORT}/api               ║
  ║   🔌 WebSocket: ws://localhost:${PORT}/ws                     ║
  ║                                                              ║
  ║   📊 Admin Access: http://localhost:${PORT}/admin.html        ║
  ║   🤖 AI Assistant: http://localhost:${PORT}/ai-assistant.html ║
  ║                                                              ║
  ║   ⚙️  Workers activos: ${workerManager?.getStats()?.totalWorkers || 4}                      ║
  ║   📝 Modo: ${NODE_ENV}                                      ║
  ║                                                              ║
  ║   🇲🇽 Hecho en México - Con 🌮 y 🧉                          ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
  `);
});

// ==================== MANEJO DE ERRORES GLOBAL ====================
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  logSystem('error', `Uncaught Exception: ${error.message}`);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
  logSystem('error', `Unhandled Rejection: ${reason}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM recibido, cerrando servidor...');
  server.close(() => {
    console.log('Servidor cerrado');
    db.close();
    process.exit(0);
  });
});

module.exports = { app, server, wss };
