/**
 * WorkerManager handles web worker creation, communication, and lifecycle management
 * for performance-intensive tasks like layout calculations and data processing.
 */
export class WorkerManager {
    constructor() {
        this.workers = new Map();
        this.workerPools = new Map();
        this.taskQueue = [];
        this.activeJobs = new Map();
        this.jobIdCounter = 0;
        
        // Configuration
        this.config = {
            maxWorkers: navigator.hardwareConcurrency || 4,
            workerTimeout: 30000, // 30 seconds
            enableWorkers: this._checkWorkerSupport()
        };
        
        // console.log(`WorkerManager initialized with ${this.config.maxWorkers} max workers`);
    }

    /**
     * Check if web workers are supported
     */
    _checkWorkerSupport() {
        return typeof Worker !== 'undefined';
    }

    /**
     * Create a new worker for a specific task type
     */
    createWorker(workerType, workerScript) {
        if (!this.config.enableWorkers) {
            console.warn('Web Workers not supported, falling back to main thread');
            return null;
        }

        try {
            let worker;
            
            if (workerScript instanceof URL) {
                worker = new Worker(workerScript);
            } else if (typeof workerScript === 'string') {
                // Create worker from script string (for inline workers)
                const blob = new Blob([workerScript], { type: 'application/javascript' });
                const workerUrl = URL.createObjectURL(blob);
                worker = new Worker(workerUrl);
            } else {
                throw new Error('Invalid worker script type');
            }
            
            const workerInfo = {
                worker: worker,
                type: workerType,
                busy: false,
                created: Date.now(),
                lastUsed: Date.now(),
                jobsCompleted: 0
            };
            
            // Setup worker message handling
            worker.onmessage = (e) => this._handleWorkerMessage(workerType, e);
            worker.onerror = (e) => this._handleWorkerError(workerType, e);
            
            this.workers.set(workerType, workerInfo);
            
            // console.log(`Created worker for ${workerType}`);
            return worker;
            
        } catch (error) {
            console.error(`Failed to create worker for ${workerType}:`, error);
            return null;
        }
    }

    /**
     * Create a pool of workers for a specific task type
     */
    createWorkerPool(workerType, workerScript, poolSize = 2) {
        if (!this.config.enableWorkers) {
            return false;
        }

        poolSize = Math.min(poolSize, this.config.maxWorkers);
        const pool = [];
        
        for (let i = 0; i < poolSize; i++) {
            const worker = this.createWorker(`${workerType}_${i}`, workerScript);
            if (worker) {
                pool.push({
                    worker: worker,
                    busy: false,
                    workerId: `${workerType}_${i}`
                });
            }
        }
        
        if (pool.length > 0) {
            this.workerPools.set(workerType, pool);
            // console.log(`Created worker pool for ${workerType} with ${pool.length} workers`);
            return true;
        }
        
        return false;
    }

    /**
     * Get an available worker from a pool
     */
    _getAvailableWorker(workerType) {
        // Check if it's a pool
        if (this.workerPools.has(workerType)) {
            const pool = this.workerPools.get(workerType);
            const availableWorker = pool.find(w => !w.busy);
            
            if (availableWorker) {
                availableWorker.busy = true;
                return availableWorker;
            }
            return null; // All workers busy
        }
        
        // Check single worker
        if (this.workers.has(workerType)) {
            const workerInfo = this.workers.get(workerType);
            if (!workerInfo.busy) {
                workerInfo.busy = true;
                return workerInfo;
            }
        }
        
        return null;
    }

    /**
     * Release a worker back to the available pool
     */
    _releaseWorker(workerId) {
        // Check pools first
        for (const [poolType, pool] of this.workerPools) {
            const workerInfo = pool.find(w => w.workerId === workerId);
            if (workerInfo) {
                workerInfo.busy = false;
                this.workers.get(workerId).lastUsed = Date.now();
                this.workers.get(workerId).jobsCompleted++;
                return;
            }
        }
        
        // Check single workers
        if (this.workers.has(workerId)) {
            const workerInfo = this.workers.get(workerId);
            workerInfo.busy = false;
            workerInfo.lastUsed = Date.now();
            workerInfo.jobsCompleted++;
        }
    }

    /**
     * Execute a task on a worker
     */
    executeTask(workerType, taskData, timeout = this.config.workerTimeout) {
        return new Promise((resolve, reject) => {
            if (!this.config.enableWorkers) {
                reject(new Error('Web Workers not available'));
                return;
            }

            const jobId = this._generateJobId();
            const job = {
                id: jobId,
                workerType: workerType,
                taskData: taskData,
                resolve: resolve,
                reject: reject,
                timeout: timeout,
                startTime: Date.now()
            };
            
            // Try to execute immediately
            const workerInfo = this._getAvailableWorker(workerType);
            if (workerInfo) {
                this._executeJob(job, workerInfo);
            } else {
                // Queue the job
                this.taskQueue.push(job);
                // console.log(`Queued job ${jobId} for ${workerType} (queue length: ${this.taskQueue.length})`);
            }
        });
    }

    /**
     * Execute a job on a worker
     */
    _executeJob(job, workerInfo) {
        this.activeJobs.set(job.id, {
            ...job,
            workerId: workerInfo.workerId || workerInfo.type,
            worker: workerInfo.worker
        });
        
        // Set timeout
        const timeoutId = setTimeout(() => {
            this._handleJobTimeout(job.id);
        }, job.timeout);
        
        const activeJob = this.activeJobs.get(job.id);
        activeJob.timeoutId = timeoutId;
        
        // Send task to worker
        try {
            workerInfo.worker.postMessage({
                jobId: job.id,
                type: 'task',
                data: job.taskData
            });
            
            // console.log(`Executing job ${job.id} on worker ${activeJob.workerId}`);
            
        } catch (error) {
            this._handleJobError(job.id, error);
        }
    }

    /**
     * Handle worker messages
     */
    _handleWorkerMessage(workerType, event) {
        const { jobId, type, data, error } = event.data;
        
        if (!jobId) {
            // Handle non-job messages (like worker ready signals)
            // console.log(`Worker ${workerType} message:`, type, data);
            return;
        }
        
        const job = this.activeJobs.get(jobId);
        if (!job) {
            console.warn(`Received message for unknown job ${jobId}`);
            return;
        }
        
        if (error) {
            this._handleJobError(jobId, new Error(error));
        } else {
            this._handleJobSuccess(jobId, data);
        }
    }

    /**
     * Handle worker errors
     */
    _handleWorkerError(workerType, error) {
        console.error(`Worker ${workerType} error:`, error);
        
        // Find and fail all jobs on this worker
        this.activeJobs.forEach((job, jobId) => {
            if (job.workerId === workerType) {
                this._handleJobError(jobId, error);
            }
        });
    }

    /**
     * Handle job success
     */
    _handleJobSuccess(jobId, result) {
        const job = this.activeJobs.get(jobId);
        if (!job) return;
        
        // Clear timeout
        if (job.timeoutId) {
            clearTimeout(job.timeoutId);
        }
        
        // Release worker
        this._releaseWorker(job.workerId);
        
        // Remove from active jobs
        this.activeJobs.delete(jobId);
        
        // Resolve promise
        job.resolve(result);
        
        // Process next job in queue
        this._processQueue();
        
        // console.log(`Job ${jobId} completed successfully`);
    }

    /**
     * Handle job error
     */
    _handleJobError(jobId, error) {
        const job = this.activeJobs.get(jobId);
        if (!job) return;
        
        // Clear timeout
        if (job.timeoutId) {
            clearTimeout(job.timeoutId);
        }
        
        // Release worker
        this._releaseWorker(job.workerId);
        
        // Remove from active jobs
        this.activeJobs.delete(jobId);
        
        // Reject promise
        job.reject(error);
        
        // Process next job in queue
        this._processQueue();
        
        console.error(`Job ${jobId} failed:`, error);
    }

    /**
     * Handle job timeout
     */
    _handleJobTimeout(jobId) {
        const job = this.activeJobs.get(jobId);
        if (!job) return;
        
        console.warn(`Job ${jobId} timed out after ${job.timeout}ms`);
        this._handleJobError(jobId, new Error(`Job ${jobId} timed out`));
    }

    /**
     * Process queued jobs
     */
    _processQueue() {
        if (this.taskQueue.length === 0) return;
        
        // Find available workers and execute queued jobs
        const job = this.taskQueue.shift();
        const workerInfo = this._getAvailableWorker(job.workerType);
        
        if (workerInfo) {
            this._executeJob(job, workerInfo);
        } else {
            // Put job back at front of queue
            this.taskQueue.unshift(job);
        }
    }

    /**
     * Generate unique job ID
     */
    _generateJobId() {
        return `job_${++this.jobIdCounter}_${Date.now()}`;
    }

    /**
     * Get worker statistics
     */
    getStats() {
        const stats = {
            enableWorkers: this.config.enableWorkers,
            totalWorkers: this.workers.size,
            workerPools: this.workerPools.size,
            activeJobs: this.activeJobs.size,
            queuedJobs: this.taskQueue.length,
            workers: {}
        };
        
        // Individual worker stats
        this.workers.forEach((info, type) => {
            stats.workers[type] = {
                busy: info.busy,
                jobsCompleted: info.jobsCompleted,
                uptime: Date.now() - info.created,
                lastUsed: Date.now() - info.lastUsed
            };
        });
        
        return stats;
    }

    /**
     * Terminate a specific worker
     */
    terminateWorker(workerType) {
        const workerInfo = this.workers.get(workerType);
        if (workerInfo) {
            workerInfo.worker.terminate();
            this.workers.delete(workerType);
            // console.log(`Terminated worker ${workerType}`);
        }
        
        // Also check worker pools
        if (this.workerPools.has(workerType)) {
            const pool = this.workerPools.get(workerType);
            pool.forEach(workerInfo => {
                workerInfo.worker.terminate();
                this.workers.delete(workerInfo.workerId);
            });
            this.workerPools.delete(workerType);
            // console.log(`Terminated worker pool ${workerType}`);
        }
    }

    /**
     * Terminate all workers
     */
    terminateAll() {
        // Terminate individual workers
        this.workers.forEach((info, type) => {
            info.worker.terminate();
        });
        
        // Clear all active jobs with errors
        this.activeJobs.forEach((job, jobId) => {
            job.reject(new Error('Worker manager shutting down'));
        });
        
        this.workers.clear();
        this.workerPools.clear();
        this.activeJobs.clear();
        this.taskQueue = [];
        
        console.log('All workers terminated');
    }

    /**
     * Clean up idle workers
     */
    cleanupIdleWorkers(maxIdleTime = 300000) { // 5 minutes
        const now = Date.now();
        const workersToTerminate = [];
        
        this.workers.forEach((info, type) => {
            if (!info.busy && (now - info.lastUsed) > maxIdleTime) {
                workersToTerminate.push(type);
            }
        });
        
        workersToTerminate.forEach(workerType => {
            this.terminateWorker(workerType);
        });
        
        if (workersToTerminate.length > 0) {
            // console.log(`Cleaned up ${workersToTerminate.length} idle workers`);
        }
    }

    /**
     * Check if workers are supported and enabled
     */
    isEnabled() {
        return this.config.enableWorkers;
    }

    /**
     * Enable or disable workers
     */
    setEnabled(enabled) {
        this.config.enableWorkers = enabled && this._checkWorkerSupport();
        
        if (!this.config.enableWorkers) {
            this.terminateAll();
        }
    }

    /**
     * Update configuration
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
    }

    /**
     * Dispose of the worker manager
     */
    dispose() {
        this.terminateAll();
        // console.log('WorkerManager disposed');
    }
}

/**
 * Specialized layout worker manager
 */
export class LayoutWorkerManager extends WorkerManager {
    constructor() {
        super();
        this.layoutWorkerScript = null;
        this.initialized = false;
    }

    /**
     * Initialize layout workers
     */
    async init() {
        if (!this.config.enableWorkers) {
            console.log('Layout workers disabled - using main thread calculations');
            return false;
        }

        try {
            // Create layout worker script URL
            // Note: In a real implementation, this would load the actual worker file
            const workerUrl = new URL('../performance/workers/LayoutWorker.js', import.meta.url);
            
            // Create a pool of layout workers
            const success = this.createWorkerPool('layout', workerUrl, Math.min(2, this.config.maxWorkers));
            
            this.initialized = success;
            // console.log(`Layout worker manager initialized: ${success}`);
            return success;
            
        } catch (error) {
            console.error('Failed to initialize layout workers:', error);
            this.initialized = false;
            return false;
        }
    }

    /**
     * Calculate layout using workers
     */
    async calculateLayout(layoutType, nodes, edges, config = {}) {
        if (!this.initialized) {
            throw new Error('Layout worker manager not initialized');
        }

        const taskData = {
            type: 'calculate',
            layoutType: layoutType,
            nodes: nodes.map(n => ({
                id: n.id,
                x: n.position.x,
                y: n.position.y,
                z: n.position.z
            })),
            edges: edges.map(e => ({
                id: e.id,
                source: e.source.id,
                target: e.target.id
            })),
            config: config
        };

        return this.executeTask('layout', taskData);
    }

    /**
     * Start continuous layout calculation
     */
    async startContinuousLayout(layoutType, nodes, edges, config = {}) {
        if (!this.initialized) {
            throw new Error('Layout worker manager not initialized');
        }

        const taskData = {
            type: 'start_continuous',
            layoutType: layoutType,
            nodes: nodes,
            edges: edges,
            config: config
        };

        return this.executeTask('layout', taskData);
    }

    /**
     * Stop continuous layout calculation
     */
    async stopContinuousLayout() {
        if (!this.initialized) return;

        const taskData = { type: 'stop_continuous' };
        return this.executeTask('layout', taskData);
    }
}