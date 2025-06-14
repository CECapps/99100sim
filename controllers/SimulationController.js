/**
 * SimulationController - Manages simulation execution state and performance metrics
 *
 * Encapsulates:
 * - Management of the core Simulation instance
 * - Execution control (running, speed modes, stepping)
 * - Performance metrics tracking
 * - Execution statistics
 *
 * Works with existing Simulation and SimulationState classes rather than replacing them.
 *

*   **`SimulationController` Events Emitted:**
    *   `executionStarted`: `detail: { timestamp: number }`
        *   *Purpose:* Signals the simulation's continuous execution has begun.
        *   *Expected Listener(s):* app.js or `SimulationUIComponent` (to update UI state, e.g., "Running" status, disable run button, enable stop button).
    *   `executionStopped`: `detail: { totalInstructions: number, totalFrames: number }`
        *   *Purpose:* Signals continuous execution has stopped.
        *   *Expected Listener(s):* app.js or `SimulationUIComponent` (update UI state, e.g., "Stopped" status, enable run/step, disable stop).
    *   `instructionExecuted`: `detail: { instructionCount: number, result: string }` (where `result` is flow state)
        *   *Purpose:* Signals a single instruction has been executed (typically via manual step).
        *   *Expected Listener(s):* app.js or `SimulationUIComponent` (update relevant UI like instruction count, register display). `VisualizationController` (to potentially trigger a redraw if memory changed).
    *   `simulationReset`: (no detail)
        *   *Purpose:* Signals the simulation and its metrics have been reset.
        *   *Expected Listener(s):* app.js (to potentially re-load assembled code into memory), `SimulationUIComponent` (to reset all simulation-related displays), `VisualizationController` (to redraw with cleared/reset memory).
    *   `executionModeChanged`: `detail: { slowMode: boolean, fastMode: boolean }`
        *   *Purpose:* Signals a change in execution speed mode.
        *   *Expected Listener(s):* `SimulationUIComponent` (to update UI indicators for the current mode).
    *   `frameExecuted`: `detail: { running: boolean, slowMode: boolean, fastMode: boolean, totalInstructions: number, totalFrames: number, fps: number, ips: number, instructionsExecutedThisFrame: number, flowState: string | null }`
        *   *Purpose:* Signals a single animation frame has completed during continuous execution, containing comprehensive state and metrics.
        *   *Expected Listener(s):* `SimulationUIComponent` (for wholesale update of all simulation-related displays). `VisualizationController` (to trigger redraw due to potential memory changes).
    *   `executionError`: `detail: { error: Error }`
        *   *Purpose:* Signals an error occurred during simulation execution.
        *   *Expected Listener(s):* app.js or a dedicated error display UI component.

 */

// Import Simulation type for JSDoc references
// @ts-ignore - Will be properly imported when converting to ES modules
/** @typedef {import('../classes/Simulation').Simulation} Simulation */

export class SimulationController extends EventTarget {
    /**
     * @param {Simulation} simulationInstance - The simulation instance to control
     */
    constructor(simulationInstance) {
        super();

        // Core simulation instance (Simulation class)
        /** @type {Simulation} */
        this.simulation = simulationInstance;

        // Execution control state
        this.running = false;
        this.slowMode = false;
        this.fastMode = false;
        this.fastModeSteps = 631; // A prime number, chosen with intent

        // Performance metrics state
        this.instExecutionCount = 0;
        this.frameCount = 0;
        this.runStartTime = null;

        // FPS/IPS tracking
        this.lastFpsUpdateTs = 0;
        this.lastExecutionCount = 0;
        this.lastFrameCount = 0;
        this.runningFpsAvg = 0;
        this.runningIpsAvg = 0;
    }

    // === Execution Control Methods ===

    /**
     * Start continuous execution
     * @returns {void}
     */
    start() {
        if (this.running) return;

        this.running = true;
        this.runStartTime = performance.now();

        this.dispatchEvent(new CustomEvent('executionStarted', {
            detail: { timestamp: this.runStartTime }
        }));
    }

    /**
     * Stop execution
     * @returns {void}
     */
    stop() {
        if (!this.running) return;

        this.running = false;

        this.dispatchEvent(new CustomEvent('executionStopped', {
            detail: {
                totalInstructions: this.instExecutionCount,
                totalFrames: this.frameCount
            }
        }));
    }

    /**
     * Execute a single flow state step (slow mode)
     * @returns {string} The flow state result from the simulation
     */
    step() {
        if (this.running) return '';
        try {
            const result = this.simulation.step();
            // Only increment if an instruction was actually executed (legacy: 'B' state)
            if (result === 'B') {
                this.instExecutionCount++;
            }
            this.dispatchEvent(new CustomEvent('instructionExecuted', {
                detail: {
                    instructionCount: this.instExecutionCount,
                    result
                }
            }));
            return result || '';
        } catch (error) {
            this.dispatchEvent(new CustomEvent('executionError', {
                detail: { error }
            }));
            throw error;
        }
    }

    /**
     * Execute a single instruction step (normal mode)
     * @returns {string} The flow state result from the simulation
     */
    stepInstruction() {
        if (this.running) return '';
        try {
            const result = this.simulation.stepInstruction();
            this.instExecutionCount++;
            this.dispatchEvent(new CustomEvent('instructionExecuted', {
                detail: {
                    instructionCount: this.instExecutionCount,
                    result
                }
            }));
            return result || '';
        } catch (error) {
            this.dispatchEvent(new CustomEvent('executionError', {
                detail: { error }
            }));
            throw error;
        }
    }

    /**
     * Reset simulation to initial state
     * @returns {void}
     */
    reset() {
        this.stop();

        // Reset metrics
        this.instExecutionCount = 0;
        this.frameCount = 0;
        this.runStartTime = null;
        this.lastFpsUpdateTs = 0;
        this.lastExecutionCount = 0;
        this.lastFrameCount = 0;
        this.runningFpsAvg = 0;
        this.runningIpsAvg = 0;

        // Reset simulation
        this.simulation.reset();

        this.dispatchEvent(new CustomEvent('simulationReset'));
    }

    // === Execution Mode Control ===

    /**
     * Set slow execution mode
     * @param {boolean} enabled - Whether to enable slow mode
     * @returns {void}
     */
    setSlowMode(enabled) {
        this.slowMode = enabled;
        if (this.slowMode == true) {
            this.fastMode = false;
        }

        this.dispatchEvent(new CustomEvent('executionModeChanged', {
            detail: { slowMode: this.slowMode, fastMode: this.fastMode }
        }));
    }

    /**
     * Set fast execution mode
     * @param {boolean} enabled - Whether to enable fast mode
     * @returns {void}
     */
    setFastMode(enabled) {
        this.fastMode = enabled;
        if (this.fastMode == true) {
            this.slowMode = false;
        }

        this.dispatchEvent(new CustomEvent('executionModeChanged', {
            detail: { slowMode: this.slowMode, fastMode: this.fastMode }
        }));
    }

    /**
     * Main simulation tick logic, to be called externally (e.g., by App.js per animation frame)
     * @param {number} timestamp - High resolution timestamp from requestAnimationFrame
     * @returns {void}
     */
    processSimulationTick(timestamp) {
        if (!this.running) return;

        let instructionsExecutedThisFrame = 0;
        let currentFlowState = null;

        try {
            if (this.slowMode) {
                currentFlowState = this.simulation.step();
                if (currentFlowState === 'B') {
                    instructionsExecutedThisFrame = 1;
                    this.instExecutionCount++;
                }
            } else if (this.fastMode) {
                this.simulation.run(this.fastModeSteps);
                instructionsExecutedThisFrame = this.fastModeSteps;
                this.instExecutionCount += this.fastModeSteps;
            } else {
                this.simulation.stepInstruction();
                instructionsExecutedThisFrame = 1;
                this.instExecutionCount++;
            }

            this.frameCount++;
            this.updatePerformanceMetrics(timestamp);

            this.dispatchEvent(new CustomEvent('frameExecuted', {
                detail: {
                    running: this.running,
                    slowMode: this.slowMode,
                    fastMode: this.fastMode,
                    totalInstructions: this.instExecutionCount,
                    totalFrames: this.frameCount,
                    fps: this.runningFpsAvg,
                    ips: this.runningIpsAvg,
                    instructionsExecutedThisFrame: instructionsExecutedThisFrame,
                    flowState: currentFlowState
                }
            }));
        } catch (error) {
            this.stop();
            this.dispatchEvent(new CustomEvent('executionError', {
                detail: { error }
            }));
        }
    }

    /**
     * Update FPS and IPS calculations
     * @param {number} timestamp - High resolution timestamp from requestAnimationFrame
     * @returns {void}
     */
    updatePerformanceMetrics(timestamp) {
        const updateInterval = 1000; // Update every second

        if (timestamp - this.lastFpsUpdateTs >= updateInterval) {
            const deltaTime = timestamp - this.lastFpsUpdateTs;
            const deltaFrames = this.frameCount - this.lastFrameCount;
            const deltaInstructions = this.instExecutionCount - this.lastExecutionCount;

            if (deltaTime > 0) {
                const currentFps = (deltaFrames * 1000) / deltaTime;
                const currentIps = (deltaInstructions * 1000) / deltaTime;

                // Simple moving average
                this.runningFpsAvg = this.runningFpsAvg * 0.8 + currentFps * 0.2;
                this.runningIpsAvg = this.runningIpsAvg * 0.8 + currentIps * 0.2;
            }

            this.lastFpsUpdateTs = timestamp;
            this.lastFrameCount = this.frameCount;
            this.lastExecutionCount = this.instExecutionCount;
        }
    }

    // === State Query Methods ===

    /**
     * Get current execution state
     * @returns {Object} Object containing running, slowMode, fastMode, and fastModeSteps properties
     */
    getExecutionState() {
        return {
            running: this.running,
            slowMode: this.slowMode,
            fastMode: this.fastMode,
            fastModeSteps: this.fastModeSteps
        };
    }

    /**
     * Get performance metrics
     * @returns {Object} Object containing instructionCount, frameCount, fps, ips, runStartTime, and elapsedTime
     */
    getPerformanceMetrics() {
        return {
            instructionCount: this.instExecutionCount,
            frameCount: this.frameCount,
            fps: this.runningFpsAvg,
            ips: this.runningIpsAvg,
            runStartTime: this.runStartTime,
            elapsedTime: this.runStartTime ? performance.now() - this.runStartTime : 0
        };
    }

    /**
     * Get simulation instance for direct access
     * @returns {Simulation} The underlying simulation instance
     */
    getSimulation() {
        return this.simulation;
    }

    // === Utility Methods ===

    /**
     * Check if simulation can be stepped (not running)
     * @returns {boolean} True if simulation can be stepped
     */
    canStep() {
        return !this.running;
    }

    /**
     * Check if simulation can be started
     * @returns {boolean} True if simulation can be started
     */
    canStart() {
        return !this.running;
    }

    /**
     * Check if simulation can be stopped
     * @returns {boolean} True if simulation can be stopped
     */
    canStop() {
        return this.running;
    }
}