// MFH TOOLS PRO - Frontend con API real
// Conecta automáticamente a backend en localhost:3000 o variable de entorno

const API_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:3000/api'
  : 'https://mfh-backend.onrender.com/api'; // Cambia después por tu URL real

const WS_URL = window.location.hostname === 'localhost'
  ? 'ws://localhost:3000/ws'
  : 'wss://mfh-backend.onrender.com/ws';

// Estado global
let currentScanId = null;
let ws = null;

// Elementos del DOM
const scanBtn = document.getElementById('scanBtn');
const targetInput = document.getElementById('targetInput');
const portRangeInput = document.getElementById('portRange');
const resultsDiv = document.getElementById('results');
const progressBar = document.getElementById('progressBar');
const exportJsonBtn = document.getElementById('exportJson');
const exportCsvBtn = document.getElementById('exportCsv');
const exportPdfBtn = document.getElementById('exportPdf');

// Inicializar WebSocket
function initWebSocket() {
  ws = new WebSocket(WS_URL);
  
  ws.onopen = () => console.log('🔌 WebSocket conectado');
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    handleWebSocketMessage(data);
  };
  ws.onerror = (error) => console.error('WS Error:', error);
  ws.onclose = () => setTimeout(initWebSocket, 3000); // Reconectar automático
}

// Manejar mensajes del backend
function handleWebSocketMessage(data) {
  switch(data.type) {
    case 'scan_progress':
      updateProgress(data.port, data.status);
      break;
    case 'scan_complete':
      showResults(data.results);
      enableExportButtons(data.results);
      break;
    case 'scan_error':
      showError(data.message);
      break;
  }
}

// Escaneo de puertos con API REST + WebSocket
async function startScan(target, ports) {
  try {
    const token = localStorage.getItem('jwt_token');
    const response = await fetch(`${API_URL}/scan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      },
      body: JSON.stringify({ target, ports, useWorkers: true })
    });
    
    if (!response.ok) throw new Error(`Error ${response.status}: ${await response.text()}`);
    
    const { scanId } = await response.json();
    currentScanId = scanId;
    return scanId;
  } catch (error) {
    console.error('Error iniciando escaneo:', error);
    showError(`No se pudo iniciar escaneo: ${error.message}. ¿Backend corriendo?`);
    return null;
  }
}

// Exportar resultados
async function exportResults(format, results) {
  const token = localStorage.getItem('jwt_token');
  const response = await fetch(`${API_URL}/export/${format}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    },
    body: JSON.stringify({ results, scanId: currentScanId })
  });
  
  if (!response.ok) throw new Error(`Error exportando a ${format}`);
  
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `scan_results_${currentScanId}.${format === 'pdf' ? 'pdf' : format}`;
  a.click();
  URL.revokeObjectURL(url);
}

// UI Helpers
function updateProgress(port, status) {
  const statusText = status === 'open' ? '🟢 Abierto' : '🔴 Cerrado';
  const logLine = document.createElement('div');
  logLine.textContent = `Puerto ${port}: ${statusText}`;
  resultsDiv.appendChild(logLine);
  resultsDiv.scrollTop = resultsDiv.scrollHeight;
}

function showResults(results) {
  const resume = document.createElement('div');
  resume.className = 'alert alert-success mt-3';
  const openPorts = results.filter(p => p.status === 'open').length;
  resume.innerHTML = `<strong>✅ Escaneo completado</strong><br>Puertos abiertos: ${openPorts}/${results.length}`;
  resultsDiv.appendChild(resume);
}

function enableExportButtons(results) {
  exportJsonBtn.disabled = false;
  exportCsvBtn.disabled = false;
  exportPdfBtn.disabled = false;
  
  exportJsonBtn.onclick = () => exportResults('json', results);
  exportCsvBtn.onclick = () => exportResults('csv', results);
  exportPdfBtn.onclick = () => exportResults('pdf', results);
}

function showError(message) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'alert alert-danger mt-3';
  errorDiv.textContent = `❌ ${message}`;
  resultsDiv.appendChild(errorDiv);
}

// Event Listeners
scanBtn?.addEventListener('click', async () => {
  const target = targetInput?.value;
  const ports = portRangeInput?.value || '1-1000';
  
  if (!target) {
    showError('Ingresa una IP o dominio objetivo');
    return;
  }
  
  resultsDiv.innerHTML = '<div class="spinner-border text-primary" role="status"></div> Escaneando...';
  progressBar.style.width = '0%';
  
  const scanId = await startScan(target, ports);
  if (scanId) {
    progressBar.style.width = '100%';
  }
});

// Modo offline / simulación si no hay backend
async function checkBackendHealth() {
  try {
    const response = await fetch(`${API_URL}/health`, { timeout: 2000 });
    if (response.ok) return true;
  } catch (error) {
    console.warn('Backend no disponible, usando modo simulación');
    enableSimulationMode();
    return false;
  }
}

function enableSimulationMode() {
  const simBtn = document.createElement('button');
  simBtn.textContent = '🎮 Modo Simulación Activo (Demo Local)';
  simBtn.className = 'btn btn-warning w-100 mb-3';
  simBtn.disabled = true;
  document.querySelector('.card-body').prepend(simBtn);
  
  // Override startScan con simulación
  window.startScan = async (target, ports) => {
    showError('⚠️ Backend no disponible. Modo simulación: muestra datos de prueba.');
    setTimeout(() => {
      const mockResults = [
        { port: 22, status: 'open', service: 'ssh' },
        { port: 80, status: 'open', service: 'http' },
        { port: 443, status: 'open', service: 'https' }
      ];
      showResults(mockResults);
      enableExportButtons(mockResults);
    }, 1500);
    return 'sim_123';
  };
}

// Inicializar
initWebSocket();
checkBackendHealth();
