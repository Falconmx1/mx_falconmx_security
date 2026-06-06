#!/usr/bin/env node

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const dbPath = process.env.DATABASE_URL || './data/mfh_tools.db';
const dbDir = path.dirname(dbPath);

// Crear directorio si no existe
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    // Tabla de escaneos
    db.run(`CREATE TABLE IF NOT EXISTS scans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        target TEXT NOT NULL,
        result TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        user_ip TEXT
    )`);

    // Tabla de logs de API
    db.run(`CREATE TABLE IF NOT EXISTS api_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        endpoint TEXT NOT NULL,
        ip TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Tabla de usuarios (para futura autenticación)
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Índices para mejorar rendimiento
    db.run(`CREATE INDEX IF NOT EXISTS idx_scans_type ON scans(type)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_scans_created ON scans(created_at)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_api_logs_endpoint ON api_logs(endpoint)`);

    console.log('✅ Base de datos inicializada correctamente');
    console.log(`📍 Ubicación: ${dbPath}`);
});

db.close();
