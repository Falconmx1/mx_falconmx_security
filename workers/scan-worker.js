const { parentPort } = require('worker_threads');
const net = require('net');
const dns = require('dns').promises;

// Escanear puerto individual
async function scanPort(target, port, timeout = 2000) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let status = 'closed';
    
    socket.setTimeout(timeout);
    
    socket.on('connect', () => {
      status = 'open';
      socket.destroy();
      resolve({ port, status, service: getServiceName(port) });
    });
    
    socket.on('timeout', () => {
      socket.destroy();
      resolve({ port, status: 'filtered', service: null });
    });
    
    socket.on('error', () => {
      resolve({ port, status: 'closed', service: null });
    });
    
    socket.connect(port, target);
  });
}

// Identificar servicio por puerto
function getServiceName(port) {
  const services = {
    21: 'ftp', 22: 'ssh', 23: 'telnet', 25: 'smtp', 53: 'dns',
    80: 'http', 110: 'pop3', 111: 'rpcbind', 135: 'msrpc', 139: 'netbios',
    143: 'imap', 443: 'https', 445: 'microsoft-ds', 993: 'imaps', 995: 'pop3s',
    1723: 'pptp', 3306: 'mysql', 3389: 'rdp', 5432: 'postgresql', 5900: 'vnc',
    6379: 'redis', 8080: 'http-proxy', 27017: 'mongodb'
  };
  return services[port] || 'unknown';
}

// Parsear rango de puertos
function parsePortRange(portRange) {
  const ports = new Set();
  const parts = portRange.split(',');
  
  for (const part of parts) {
    if (part.includes('-')) {
      const [start, end] = part.split('-').map(Number);
      for (let i = start; i <= end; i++) ports.add(i);
    } else {
      ports.add(Number(part));
    }
  }
  
  return Array.from(ports).sort((a, b) => a - b);
}

// Escaneo principal
async function performScan(scanId, target, portRange, options = {}) {
  const ports = parsePortRange(portRange);
  const timeout = options.timeout || 2000;
  const results = [];
  
  // Resolver dominio a IP
  let ip = target;
  if (!/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(target)) {
    try {
      const resolved = await dns.lookup(target);
      ip = resolved.address;
      parentPort.postMessage({ type: 'progress', port: 0, status: `Resolviendo ${target} → ${ip}` });
    } catch (error) {
      parentPort.postMessage({ type: 'error', error: `No se pudo resolver ${target}` });
      return;
    }
  }
  
  // Escanear puertos
  for (const port of ports) {
    const result = await scanPort(ip, port, timeout);
    results.push(result);
    parentPort.postMessage({ type: 'progress', port: result.port, status: result.status });
    
    // Pequeña pausa para no saturar
    await new Promise(resolve => setTimeout(resolve, options.delay || 5));
  }
  
  // Enviar resultados completos
  parentPort.postMessage({
    type: 'completed',
    scanId,
    results,
    summary: {
      totalPorts: ports.length,
      openPorts: results.filter(r => r.status === 'open').length,
      filteredPorts: results.filter(r => r.status === 'filtered').length
    }
  });
}

// Monitorear uso de recursos
function reportResourceUsage() {
  const usage = process.cpuUsage();
  const mem = process.memoryUsage();
  parentPort.postMessage({
    type: 'status',
    cpu: (usage.user + usage.system) / 1000000,
    memory: Math.round(mem.rss / 1024 / 1024)
  });
}

// Escuchar mensajes del master
parentPort.on('message', async (data) => {
  switch(data.type) {
    case 'scan':
      await performScan(data.scanId, data.target, data.ports, data.options);
      break;
      
    case 'getStatus':
      reportResourceUsage();
      break;
  }
});

// Reportar uso cada 5 segundos
setInterval(reportResourceUsage, 5000);
