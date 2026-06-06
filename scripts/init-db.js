#!/usr/bin/env node

/**
 * Script para inicializar la base de datos de MFH TOOLS PRO
 */

const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DATABASE_URL || './data/mfh.db';
const dbDir = path.dirname(dbPath);

// Crear directorio si no existe
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
  console.log(`📁 Directorio creado: ${dbDir}`);
}

// Eliminar base de datos existente si existe
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
  console.log(`🗑️  Base de datos anterior eliminada: ${dbPath}`);
}

const db = new sqlite3.Database(dbPath);

console.log('🔧 Inicializando base de datos MFH TOOLS PRO...');

db.serialize(() => {
  // Tabla de usuarios
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      is_active INTEGER DEFAULT 1,
      last_login DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) console.error('❌ Error creando tabla users:', err);
    else console.log('✅ Tabla users creada');
  });

  // Tabla de escaneos
  db.run(`
    CREATE TABLE IF NOT EXISTS scans (
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
    )
  `, (err) => {
    if (err) console.error('❌ Error creando tabla scans:', err);
    else console.log('✅ Tabla scans creada');
  });

  // Tabla de logs
  db.run(`
    CREATE TABLE IF NOT EXISTS system_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      level TEXT NOT NULL,
      message TEXT NOT NULL,
      user_id INTEGER,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) console.error('❌ Error creando tabla system_logs:', err);
    else console.log('✅ Tabla system_logs creada');
  });

  // Tabla de configuración
  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) console.error('❌ Error creando tabla settings:', err);
    else console.log('✅ Tabla settings creada');
  });

  // Tabla de sesiones
  db.run(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id INTEGER,
      token TEXT NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) console.error('❌ Error creando tabla sessions:', err);
    else console.log('✅ Tabla sessions creada');
  });

  // Tabla de reportes
  db.run(`
    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_id TEXT UNIQUE NOT NULL,
      user_id INTEGER,
      scan_id INTEGER,
      format TEXT,
      file_path TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(scan_id) REFERENCES scans(id)
    )
  `, (err) => {
    if (err) console.error('❌ Error creando tabla reports:', err);
    else console.log('✅ Tabla reports creada');
  });

  // Insertar usuario administrador por defecto
  const createAdmin = async () => {
    const hashedPassword = await bcrypt.hash('Admin123!', 10);
    db.run(`
      INSERT OR IGNORE INTO users (name, email, password, role, is_active)
      VALUES (?, ?, ?, ?, ?)
    `, ['Administrador MFH', 'admin@falconmx.security', hashedPassword, 'admin', 1], (err) => {
      if (err) console.error('❌ Error creando admin:', err);
      else console.log('✅ Usuario administrador creado: admin@falconmx.security / Admin123!');
    });
  };

  // Insertar usuario demo
  const createDemoUser = async () => {
    const hashedPassword = await bcrypt.hash('Demo123!', 10);
    db.run(`
      INSERT OR IGNORE INTO users (name, email, password, role, is_active)
      VALUES (?, ?, ?, ?, ?)
    `, ['Usuario Demo', 'demo@falconmx.security', hashedPassword, 'user', 1], (err) => {
      if (err) console.error('❌ Error creando usuario demo:', err);
      else console.log('✅ Usuario demo creado: demo@falconmx.security / Demo123!');
    });
  };

  // Insertar configuración por defecto
  const insertDefaultSettings = () => {
    const settings = [
      ['max_scans_per_day', '100'],
      ['max_scan_timeout', '300'],
      ['maintenance_mode', 'false'],
      ['rate_limit_per_ip', '100'],
      ['enable_ai_assistant', 'true'],
      ['enable_websocket', 'true'],
      ['max_workers', '4'],
      ['scan_batch_size', '100'],
      ['default_port_range', '1-1000'],
      ['default_scan_timeout', '30']
    ];

    const stmt = db.prepare(`
      INSERT OR IGNORE INTO settings (key, value)
      VALUES (?, ?)
    `);

    settings.forEach(([key, value]) => {
      stmt.run(key, value);
    });

    stmt.finalize();
    console.log('✅ Configuración por defecto insertada');
  };

  // Ejecutar todas las inserciones
  createAdmin();
  setTimeout(() => createDemoUser(), 100);
  setTimeout(() => insertDefaultSettings(), 200);
});

// Cerrar la base de datos después de un tiempo
setTimeout(() => {
  db.close((err) => {
    if (err) {
      console.error('❌ Error cerrando base de datos:', err);
    } else {
      console.log('\n🎉 Base de datos inicializada exitosamente!');
      console.log('📍 Ubicación:', dbPath);
      console.log('\n📝 Credenciales de acceso:');
      console.log('   Admin: admin@falconmx.security / Admin123!');
      console.log('   Demo:  demo@falconmx.security / Demo123!');
    }
  });
}, 1000);
