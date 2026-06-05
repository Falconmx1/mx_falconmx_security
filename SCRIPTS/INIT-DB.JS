const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

async function initDatabase() {
    console.log('📂 Inicializando base de datos...');
    
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
            last_triggered DATETIME,
            is_active INTEGER DEFAULT 1
        );
        
        CREATE INDEX IF NOT EXISTS idx_scans_target ON scans(target);
        CREATE INDEX IF NOT EXISTS idx_scans_timestamp ON scans(timestamp);
    `);
    
    console.log('✅ Base de datos SQLite inicializada correctamente');
    
    const tables = await db.all("SELECT name FROM sqlite_master WHERE type='table'");
    console.log('📋 Tablas creadas:', tables.map(t => t.name).join(', '));
    
    await db.close();
}

initDatabase().catch(console.error);
