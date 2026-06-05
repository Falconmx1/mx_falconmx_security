const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function initDatabase() {
    const db = await open({
        filename: './database/mfh.db',
        driver: sqlite3.Database
    });
    
    await db.exec(`
        CREATE TABLE IF NOT EXISTS scans (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            target TEXT NOT NULL,
            scan_type TEXT NOT NULL,
            results TEXT,
            open_ports TEXT,
            os_detected TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            user_ip TEXT
        );
        
        CREATE TABLE IF NOT EXISTS alerts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            target TEXT NOT NULL,
            alert_type TEXT NOT NULL,
            webhook_url TEXT,
            bot_token TEXT,
            chat_id TEXT,
            last_triggered DATETIME,
            is_active BOOLEAN DEFAULT 1
        );
        
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            points INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX IF NOT EXISTS idx_scans_target ON scans(target);
        CREATE INDEX IF NOT EXISTS idx_scans_timestamp ON scans(timestamp);
    `);
    
    console.log('✅ Base de datos inicializada correctamente');
    await db.close();
}

initDatabase().catch(console.error);
