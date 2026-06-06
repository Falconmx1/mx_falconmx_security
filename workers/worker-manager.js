const { Worker } = require('worker_threads');
const path = require('path');
const EventEmitter = require('events');

class WorkerManager extends EventEmitter {
  constructor() {
    super();
    this.workers = new Map(); // workerId -> { worker, status, currentTask, scansProcessed, cpu, memory }
    this.taskQueue = [];
    this.maxWorkers = parseInt(process.env.MAX_WORKERS) || 4;
    this.stats = { totalScans: 0, avgScanTime: 0 };
  }

  // Inicializar workers
  async initWorkers(count = this.maxWorkers) {
    for (let i = 0; i < count; i++) {
      await this.spawnWorker();
    }
    console.log(`✅ ${this.workers.size} workers inicializados`);
  }

  // Crear nuevo worker
  async spawnWorker() {
    const workerId = `worker_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const workerPath = path.join(__dirname, 'scan-worker.js');
    const worker = new Worker(workerPath);
    
    const workerInfo = {
      worker,
      status: 'idle',
      currentTask: null,
      scansProcessed: 0,
      cpu: 0,
      memory: 0,
      createdAt: new Date()
    };
    
    worker.on('message', (data) => this.handleWorkerMessage(workerId, data));
    worker.on('error', (error) => this.handleWorkerError(workerId, error));
    worker.on('exit', (code) => this.handleWorkerExit(workerId, code));
    
    this.workers.set(workerId, workerInfo);
    
    // Monitorear uso de recursos
    this.monitorWorkerResources(workerId);
    
    return workerId;
  }

  // Manejar mensajes del worker
  handleWorkerMessage(workerId, data) {
    const workerInfo = this.workers.get(workerId);
    
    switch(data.type) {
      case 'progress':
        this.emit('progress', { workerId, port: data.port, status: data.status });
        break;
        
      case 'completed':
        workerInfo.status = 'idle';
        workerInfo.scansProcessed++;
        workerInfo.currentTask = null;
        this.stats.totalScans++;
        this.emit('completed', { workerId, results: data.results, scanId: data.scanId });
        this.processQueue();
        break;
        
      case 'error':
        workerInfo.status = 'error';
        this.emit('error', { workerId, error: data.error });
        setTimeout(() => this.restartWorker(workerId), 5000);
        break;
        
      case 'status':
        workerInfo.cpu = data.cpu;
        workerInfo.memory = data.memory;
        break;
    }
  }

  // Monitorear recursos del worker
  monitorWorkerResources(workerId) {
    setInterval(() => {
      const workerInfo = this.workers.get(workerId);
      if (workerInfo && workerInfo.worker) {
        workerInfo.worker.postMessage({ type: 'getStatus' });
      }
    }, 5000);
  }

  // Manejar errores del worker
  handleWorkerError(workerId, error) {
    console.error(`❌ Worker ${workerId} error:`, error);
    this.restartWorker(workerId);
  }

  // Manejar salida del worker
  handleWorkerExit(workerId, code) {
    console.log(`Worker ${workerId} exited with code ${code}`);
    if (code !== 0) {
      this.restartWorker(workerId);
    }
  }

  // Reiniciar worker caído
  async restartWorker(workerId) {
    console.log(`🔄 Reiniciando worker ${workerId}...`);
    const oldWorker = this.workers.get(workerId);
    if (oldWorker && oldWorker.worker) {
      oldWorker.worker.terminate();
    }
    this.workers.delete(workerId);
    await this.spawnWorker();
  }

  // Asignar tarea de escaneo
  async assignScan(scanId, target, ports, options = {}) {
    return new Promise((resolve, reject) => {
      const task = {
        scanId,
        target,
        ports,
        options,
        resolve,
        reject,
        createdAt: Date.now()
      };
      
      const availableWorker = this.findAvailableWorker();
      if (availableWorker) {
        this.executeTask(availableWorker, task);
      } else {
        this.taskQueue.push(task);
      }
    });
  }

  // Buscar worker disponible
  findAvailableWorker() {
    for (const [id, info] of this.workers.entries()) {
      if (info.status === 'idle') {
        return id;
      }
    }
    return null;
  }

  // Ejecutar tarea en worker
  executeTask(workerId, task) {
    const workerInfo = this.workers.get(workerId);
    if (!workerInfo) return;
    
    workerInfo.status = 'busy';
    workerInfo.currentTask = task;
    
    const startTime = Date.now();
    
    workerInfo.worker.postMessage({
      type: 'scan',
      scanId: task.scanId,
      target: task.target,
      ports: task.ports,
      options: task.options
    });
    
    // Timeout para tareas muy largas
    const timeout = setTimeout(() => {
      if (workerInfo.status === 'busy') {
        console.log(`⚠️ Task timeout en worker ${workerId}`);
        this.restartWorker(workerId);
        task.reject(new Error('Scan timeout exceeded'));
      }
    }, task.options.timeout || 300000);
    
    // Escuchar completion
    const completionHandler = (completedWorkerId, results) => {
      if (completedWorkerId === workerId) {
        clearTimeout(timeout);
        const scanTime = Date.now() - startTime;
        this.stats.avgScanTime = (this.stats.avgScanTime + scanTime) / 2;
        task.resolve(results);
        this.removeListener('completed', completionHandler);
      }
    };
    
    this.once('completed', completionHandler);
  }

  // Procesar cola de tareas
  processQueue() {
    if (this.taskQueue.length === 0) return;
    
    const availableWorker = this.findAvailableWorker();
    if (availableWorker) {
      const nextTask = this.taskQueue.shift();
      this.executeTask(availableWorker, nextTask);
    }
  }

  // Obtener estadísticas
  getStats() {
    const workers = [];
    for (const [id, info] of this.workers.entries()) {
      workers.push({
        id,
        status: info.status,
        scansProcessed: info.scansProcessed,
        cpu: info.cpu,
        memory: info.memory,
        uptime: Date.now() - info.createdAt
      });
    }
    
    return {
      totalWorkers: this.workers.size,
      activeWorkers: Array.from(this.workers.values()).filter(w => w.status === 'busy').length,
      idleWorkers: Array.from(this.workers.values()).filter(w => w.status === 'idle').length,
      queueLength: this.taskQueue.length,
      totalScans: this.stats.totalScans,
      avgScanTimeMs: Math.round(this.stats.avgScanTime),
      workers
    };
  }

  // Eliminar worker específico
  async removeWorker(workerId) {
    const workerInfo = this.workers.get(workerId);
    if (workerInfo) {
      await workerInfo.worker.terminate();
      this.workers.delete(workerId);
      console.log(`Worker ${workerId} eliminado`);
      return true;
    }
    return false;
  }
}

module.exports = WorkerManager;
