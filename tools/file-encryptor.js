#!/usr/bin/env node

/**
 * File Encryptor/Decryptor - MFH TOOLS PRO
 * Cifra y descifra archivos con AES-256
 * 
 * Uso: node file-encryptor.js <archivo> [opciones]
 * Ejemplo: node file-encryptor.js encrypt documento.pdf
 * Ejemplo: node file-encryptor.js decrypt documento.pdf.enc
 * Ejemplo: node file-encryptor.js encrypt imagen.jpg --password MiClave123
 */

const crypto = require('crypto');
const fs = require('fs');

// ==================== CONFIGURACIÓN ====================
const CONFIG = {
    algorithm: 'aes-256-cbc',
    keyLength: 32,
    ivLength: 16,
    saltLength: 16,
    iterations: 100000,
    hash: 'sha256'
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let mode = 'encrypt';
let filePath = null;
let password = null;
let outputFile = null;
let verbose = false;

if (args.length < 2) {
    console.error(`
🔍 File Encryptor/Decryptor - MFH TOOLS PRO
===========================================
Cifra y descifra archivos con AES-256.

Uso:
  node file-encryptor.js encrypt <archivo> [opciones]
  node file-encryptor.js decrypt <archivo> [opciones]

Opciones:
  --password <texto>    Contraseña (si no se proporciona, se pedirá)
  --output <archivo>    Archivo de salida
  --verbose             Mostrar más detalles
  --help                Mostrar esta ayuda

Ejemplos:
  node file-encryptor.js encrypt documento.pdf
  node file-encryptor.js decrypt documento.pdf.enc
  node file-encryptor.js encrypt imagen.jpg --password MiClave123
`);
    process.exit(1);
}

mode = args[0].toLowerCase();

if (mode !== 'encrypt' && mode !== 'decrypt') {
    console.error('❌ Modo inválido. Usa encrypt o decrypt');
    process.exit(1);
}

filePath = args[1];

for (let i = 2; i < args.length; i++) {
    if (args[i] === '--password' && args[i + 1]) {
        password = args[i + 1];
        i++;
    } else if (args[i] === '--output' && args[i + 1]) {
        outputFile = args[i + 1];
        i++;
    } else if (args[i] === '--verbose') {
        verbose = true;
    } else if (args[i] === '--help') {
        console.error('Ayuda: revisa el mensaje de uso arriba.');
        process.exit(0);
    }
}

// ==================== FUNCIONES ====================
function getFileInfo(filePath) {
    try {
        const stats = fs.statSync(filePath);
        return {
            size: stats.size,
            sizeFormatted: formatFileSize(stats.size),
            modified: stats.mtime
        };
    } catch (error) {
        return null;
    }
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function deriveKey(password, salt) {
    return crypto.pbkdf2Sync(password, salt, CONFIG.iterations, CONFIG.keyLength, CONFIG.hash);
}

function encryptFile(inputFile, outputFile, password) {
    return new Promise((resolve, reject) => {
        const salt = crypto.randomBytes(CONFIG.saltLength);
        const key = deriveKey(password, salt);
        const iv = crypto.randomBytes(CONFIG.ivLength);
        const cipher = crypto.createCipheriv(CONFIG.algorithm, key, iv);
        
        const readStream = fs.createReadStream(inputFile);
        const writeStream = fs.createWriteStream(outputFile);
        
        // Escribir salt + iv al inicio del archivo cifrado
        writeStream.write(salt);
        writeStream.write(iv);
        
        let processed = 0;
        const totalSize = fs.statSync(inputFile).size;
        
        readStream.on('data', (chunk) => {
            processed += chunk.length;
            const progress = Math.round((processed / totalSize) * 100);
            process.stdout.write(`\r📊 Progreso: ${progress}%`);
        });
        
        readStream.pipe(cipher).pipe(writeStream);
        
        writeStream.on('finish', () => {
            process.stdout.write('\n');
            resolve({ success: true });
        });
        
        writeStream.on('error', (err) => {
            reject(err);
        });
        
        readStream.on('error', (err) => {
            reject(err);
        });
    });
}

function decryptFile(inputFile, outputFile, password) {
    return new Promise((resolve, reject) => {
        const readStream = fs.createReadStream(inputFile);
        let salt = Buffer.alloc(0);
        let iv = Buffer.alloc(0);
        let headerRead = false;
        let processed = 0;
        const totalSize = fs.statSync(inputFile).size;
        
        const writeStream = fs.createWriteStream(outputFile);
        
        readStream.on('data', (chunk) => {
            if (!headerRead) {
                // Leer salt (16 bytes)
                if (salt.length < CONFIG.saltLength) {
                    const remaining = CONFIG.saltLength - salt.length;
                    const toRead = Math.min(remaining, chunk.length);
                    salt = Buffer.concat([salt, chunk.slice(0, toRead)]);
                    if (salt.length === CONFIG.saltLength) {
                        // Leer iv (16 bytes)
                        const ivStart = toRead;
                        if (chunk.length > ivStart) {
                            const ivRemaining = CONFIG.ivLength;
                            const toReadIv = Math.min(ivRemaining, chunk.length - ivStart);
                            iv = Buffer.concat([iv, chunk.slice(ivStart, ivStart + toReadIv)]);
                        }
                        if (iv.length === CONFIG.ivLength) {
                            headerRead = true;
                            const remainingData = chunk.slice(ivStart + iv.length);
                            if (remainingData.length > 0) {
                                const key = deriveKey(password, salt);
                                const decipher = crypto.createDecipheriv(CONFIG.algorithm, key, iv);
                                const decrypted = decipher.update(remainingData);
                                writeStream.write(decrypted);
                                processed += remainingData.length;
                            }
                        }
                    }
                } else {
                    // Ya tenemos salt, leer iv
                    if (iv.length < CONFIG.ivLength) {
                        const remaining = CONFIG.ivLength - iv.length;
                        const toRead = Math.min(remaining, chunk.length);
                        iv = Buffer.concat([iv, chunk.slice(0, toRead)]);
                        if (iv.length === CONFIG.ivLength) {
                            headerRead = true;
                            const remainingData = chunk.slice(toRead);
                            if (remainingData.length > 0) {
                                const key = deriveKey(password, salt);
                                const decipher = crypto.createDecipheriv(CONFIG.algorithm, key, iv);
                                const decrypted = decipher.update(remainingData);
                                writeStream.write(decrypted);
                                processed += remainingData.length;
                            }
                        }
                    }
                }
            } else {
                // Ya tenemos header, procesar datos
                const key = deriveKey(password, salt);
                const decipher = crypto.createDecipheriv(CONFIG.algorithm, key, iv);
                const decrypted = decipher.update(chunk);
                writeStream.write(decrypted);
                processed += chunk.length;
                const progress = Math.round((processed / totalSize) * 100);
                process.stdout.write(`\r📊 Progreso: ${progress}%`);
            }
        });
        
        readStream.on('end', () => {
            // Finalizar decipher
            const key = deriveKey(password, salt);
            const decipher = crypto.createDecipheriv(CONFIG.algorithm, key, iv);
            const final = decipher.final();
            if (final.length > 0) {
                writeStream.write(final);
            }
            writeStream.end();
            process.stdout.write('\n');
            resolve({ success: true });
        });
        
        readStream.on('error', (err) => {
            reject(err);
        });
        
        writeStream.on('error', (err) => {
            reject(err);
        });
    });
}

// ==================== MAIN ====================
(async function main() {
    try {
        console.log(`🔍 File Encryptor/Decryptor - MFH TOOLS PRO`);
        console.log('='.repeat(60));
        console.log(`📝 Modo: ${mode}`);
        console.log(`📁 Archivo: ${filePath}`);
        
        // Verificar archivo
        if (!fs.existsSync(filePath)) {
            console.error(`❌ Archivo no encontrado: ${filePath}`);
            process.exit(1);
        }
        
        const fileInfo = getFileInfo(filePath);
        console.log(`📏 Tamaño: ${fileInfo.sizeFormatted}`);
        console.log('');
        
        // Contraseña
        if (!password) {
            const readline = require('readline').createInterface({
                input: process.stdin,
                output: process.stdout
            });
            password = await new Promise((resolve) => {
                readline.question('🔑 Ingresa la contraseña: ', (answer) => {
                    readline.close();
                    resolve(answer);
                });
            });
        }
        
        if (!password) {
            console.error('❌ Contraseña requerida');
            process.exit(1);
        }
        
        // Determinar archivo de salida
        if (!outputFile) {
            if (mode === 'encrypt') {
                outputFile = filePath + '.enc';
            } else {
                outputFile = filePath.replace(/\.enc$/, '') + '.dec';
                if (outputFile === filePath) {
                    outputFile = filePath + '.dec';
                }
            }
        }
        
        console.log(`📁 Archivo de salida: ${outputFile}`);
        console.log('');
        
        // Procesar
        console.log(`🔍 ${mode === 'encrypt' ? 'Cifrando' : 'Descifrando'} archivo...`);
        
        if (mode === 'encrypt') {
            await encryptFile(filePath, outputFile, password);
        } else {
            await decryptFile(filePath, outputFile, password);
        }
        
        // Verificar archivo generado
        if (fs.existsSync(outputFile)) {
            const info = getFileInfo(outputFile);
            console.log(`✅ Archivo ${mode === 'encrypt' ? 'cifrado' : 'descifrado'} exitosamente`);
            console.log(`   📁 Tamaño: ${info.sizeFormatted}`);
        }
        
        console.log('\n✅ File Encryptor/Decryptor completado exitosamente');
        
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        process.exit(1);
    }
})();
