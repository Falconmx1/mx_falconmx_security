const https = require('https');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const wordlists = [
    {
        name: 'rockyou.txt',
        url: 'https://github.com/brannondorsey/naive-hashcat/releases/download/data/rockyou.txt',
        gzipped: true
    },
    {
        name: 'common.txt',
        url: 'https://raw.githubusercontent.com/danielmiessler/SecLists/master/Discovery/Web-Content/common.txt',
        gzipped: false
    },
    {
        name: 'subdomains.txt',
        url: 'https://raw.githubusercontent.com/danielmiessler/SecLists/master/Discovery/DNS/subdomains-top1million-5000.txt',
        gzipped: false
    },
    {
        name: 'directories.txt',
        url: 'https://raw.githubusercontent.com/danielmiessler/SecLists/master/Discovery/Web-Content/directory-list-2.3-medium.txt',
        gzipped: false
    }
];

async function downloadFile(url, outputPath) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(outputPath);
        https.get(url, (response) => {
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve();
            });
        }).on('error', reject);
    });
}

async function downloadWordlists() {
    const wordlistDir = path.join(__dirname, '..', 'wordlists');
    if (!fs.existsSync(wordlistDir)) {
        fs.mkdirSync(wordlistDir, { recursive: true });
    }
    
    for (const wordlist of wordlists) {
        console.log(`📥 Descargando ${wordlist.name}...`);
        const outputPath = path.join(wordlistDir, wordlist.name);
        
        try {
            await downloadFile(wordlist.url, outputPath);
            console.log(`✅ ${wordlist.name} descargado`);
        } catch (error) {
            console.error(`❌ Error descargando ${wordlist.name}:`, error.message);
        }
    }
    
    console.log('🎉 Todas las wordlists descargadas');
}

downloadWordlists();
