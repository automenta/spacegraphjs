/**
 * WorkerManager handles web worker creation, communication, and lifecycle management
 * for performance-intensive tasks like layout calculations and data processing.
 */
export class WorkerManager {
    workers: Map<any, any>;
    workerPools: Map<any, any>;
    taskQueue: any[];
    activeJobs: Map<any, any>;
    jobIdCounter: number;
    config: {
        maxWorkers: number;
        workerTimeout: number;
        enableWorkers: boolean;
    };
    /**
     * Check if web workers are supported
     */
    _checkWorkerSupport(): boolean;
    /**
     * Create a new worker for a specific task type
     */
    createWorker(workerType: any, workerScript: any): Worker;
    /**
     * Create a pool of workers for a specific task type
     */
    createWorkerPool(workerType: any, workerScript: any, poolSize?: number): boolean;
    /**
     * Get an available worker from a pool
     */
    _getAvailableWorker(workerType: any): any;
    /**
     * Release a worker back to the available pool
     */
    _releaseWorker(workerId: any): void;
    /**
     * Execute a task on a worker
     */
    executeTask(workerType: any, taskData: any, timeout?: number): Promise<any>;
    /**
     * Execute a job on a worker
     */
    _executeJob(job: any, workerInfo: any): void;
    /**
     * Handle worker messages
     */
    _handleWorkerMessage(workerType: any, event: any): void;
    /**
     * Handle worker errors
     */
    _handleWorkerError(workerType: any, error: any): void;
    /**
     * Handle job success
     */
    _handleJobSuccess(jobId: any, result: any): void;
    /**
     * Handle job error
     */
    _handleJobError(jobId: any, error: any): void;
    /**
     * Handle job timeout
     */
    _handleJobTimeout(jobId: any): void;
    /**
     * Process queued jobs
     */
    _processQueue(): void;
    /**
     * Generate unique job ID
     */
    _generateJobId(): string;
    /**
     * Get worker statistics
     */
    getStats(): {
        enableWorkers: boolean;
        totalWorkers: number;
        workerPools: number;
        activeJobs: number;
        queuedJobs: number;
        workers: {};
    };
    /**
     * Terminate a specific worker
     */
    terminateWorker(workerType: any): void;
    /**
     * Terminate all workers
     */
    terminateAll(): void;
    /**
     * Clean up idle workers
     */
    cleanupIdleWorkers(maxIdleTime?: number): void;
    /**
     * Check if workers are supported and enabled
     */
    isEnabled(): boolean;
    /**
     * Enable or disable workers
     */
    setEnabled(enabled: any): void;
    /**
     * Update configuration
     */
    updateConfig(newConfig: any): void;
    /**
     * Dispose of the worker manager
     */
    dispose(): void;
}
/**
 * Specialized layout worker manager
 */
export class LayoutWorkerManager extends WorkerManager {
    layoutWorkerScript: any;
    initialized: boolean;
    /**
     * Initialize layout workers
     */
    init(): Promise<boolean>;
    /**
     * Calculate layout using workers
     */
    calculateLayout(layoutType: any, nodes: any, edges: any, config?: {}): Promise<any>;
    /**
     * Start continuous layout calculation
     */
    startContinuousLayout(layoutType: any, nodes: any, edges: any, config?: {}): Promise<any>;
    /**
     * Stop continuous layout calculation
     */
    stopContinuousLayout(): Promise<any>;
}
