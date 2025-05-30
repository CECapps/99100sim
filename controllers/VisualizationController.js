/**
 * VisualizationController - Manages memory visualization configuration and rendering
 *
 * Encapsulates:
 * - Redraw flags and rendering timing
 * - Visualization configuration
 * - Coordinating memory data access for visualization
 * - Visualization parameter management
 *
 * Works with existing create_memory_visualizer function but manages when and how it's invoked.

*   **`VisualizationController` Events Emitted:**
    *   `visualizationInitialized`: `detail: { hasCanvas: boolean, hasVisualizer: boolean, hasSimulation: boolean }`
        *   *Purpose:* Signals the visualization components (canvas, renderer, data source) are set up.
        *   *Expected Listener(s):* app.js or `VisualizationUIComponent` (for logging or UI status update).
    *   `redrawRequested`: `detail: { timestamp: number }`
        *   *Purpose:* Signals a redraw has been internally requested (often for throttling).
        *   *Expected Listener(s):* Primarily for internal controller logic or debugging.
    *   `visualizationUpdated`: `detail: { timestamp: number, frameCount: number, config: Object }`
        *   *Purpose:* Signals the visualization has been redrawn on the canvas.
        *   *Expected Listener(s):* `VisualizationUIComponent` (if it needs to display any metadata like rendering FPS or current config).
    *   `visualizationError`: `detail: { error: Error }`
        *   *Purpose:* Signals an error occurred during visualization rendering.
        *   *Expected Listener(s):* app.js or `VisualizationUIComponent` (for error display).
    *   `configurationChanged`: `detail: { newConfig: Object, oldConfig: Object, changedKeys: string[] }`
        *   *Purpose:* Signals one or more visualization configuration parameters have changed.
        *   *Expected Listener(s):* `VisualizationUIComponent` (if it displays or allows editing of these configurations).
    *   `memoryDataUpdated`: `detail: { hasData: boolean }`
        *   *Purpose:* Signals the internal reference to memory data has been updated.
        *   *Expected Listener(s):* Primarily for internal controller logic.
    *   `canvasUpdated`: `detail: { hasCanvas: boolean }`
        *   *Purpose:* Signals the canvas element reference has been updated.
        *   *Expected Listener(s):* Primarily for internal controller logic.
    *   `canvasResized`: `detail: { width: number, height: number }`
        *   *Purpose:* Signals the canvas element has been resized.
        *   *Expected Listener(s):* Primarily for internal controller logic (triggers redraw).
    *   `visualizationDisposed`: (no detail)
        *   *Purpose:* Signals the visualization controller has been cleaned up.
        *   *Expected Listener(s):* app.js (for any further cleanup if needed).

 */

// Import Simulation type for JSDoc references
// @ts-ignore - Will be properly imported when converting to ES modules
/** @typedef {import('../classes/Simulation').Simulation} Simulation */

// JSDoc for memory access method in Simulation
/**
 * @typedef {Object} SimulationMemoryAccess
 * @property {() => DataView} getMemoryDataView - Method to get memory data view
 */

export class VisualizationController extends EventTarget {
    constructor() {
        super();

        // Redraw state
        this.needsRedraw = false;
        this.isRedrawing = false;
        this.animationFrameId = null;

        // Visualization configuration
        this.config = {
            wordCount: 32768,        // Total words to visualize
            wordsPerRow: 256,        // Words per row
            pixelSize: 1,            // Size of each pixel
            showGrid: false,         // Show grid lines
            colorScheme: 'default',  // Color scheme name
            memoryOffset: 0,         // Starting memory offset
            autoUpdate: true,        // Auto-update on memory changes
            updateThrottle: 16       // Milliseconds between updates (60fps)
        };

        // Rendering state
        this.lastUpdateTime = 0;
        this.canvas = null;
        this.context = null;
        this.visualizerFunction = null;

        // Memory data source
        this.memoryDataView = null;
        /** @type {Simulation|null} */
        this.simulationInstance = null;

        // Performance tracking
        this.frameCount = 0;
        this.lastFrameTime = 0;
        this.renderingFps = 0;

        // Bind methods
        this.redrawCallback = this.redrawCallback.bind(this);
    }

    // === Initialization ===

    /**
     * Initialize visualization with canvas and visualizer function
     * @param {HTMLCanvasElement|null} canvas - The canvas element for rendering
     * @param {Function} visualizerFunction - Function to handle visualization rendering
     * @param {Simulation} simulationInstance - Simulation instance providing memory data
     * @returns {void}
     */
    initialize(canvas, visualizerFunction, simulationInstance) {
        this.canvas = canvas;
        this.context = canvas ? canvas.getContext('2d') : null;
        this.visualizerFunction = visualizerFunction;
        this.simulationInstance = simulationInstance;
        this.memoryDataView = simulationInstance.state.getMemoryDataView();

        this.dispatchEvent(new CustomEvent('visualizationInitialized', {
            detail: {
                hasCanvas: !!this.canvas,
                hasVisualizer: !!this.visualizerFunction,
                hasSimulation: !!this.simulationInstance
            }
        }));

        // Initial render if everything is ready
        if (this.isReady()) {
            this.requestRedraw();
        }
    }

    /**
     * Check if visualization is ready to render
     * @returns {boolean} True if all required components are available
     */
    isReady() {
        return !!(this.canvas && this.context && this.visualizerFunction && this.memoryDataView);
    }

    // === Redraw Management ===

    /**
     * Request a redraw of the visualization
     * @returns {void}
     */
    requestRedraw() {
        if (!this.isReady()) {
            return;
        }

        this.needsRedraw = true;

        // Throttle updates
        const now = performance.now();
        if (now - this.lastUpdateTime < this.config.updateThrottle) {
            return;
        }

        if (!this.animationFrameId && !this.isRedrawing) {
            this.animationFrameId = requestAnimationFrame(this.redrawCallback);
        }

        this.dispatchEvent(new CustomEvent('redrawRequested', {
            detail: { timestamp: now }
        }));
    }

    /**
     * Force immediate redraw
     * @returns {void}
     */
    forceRedraw() {
        if (!this.isReady()) {
            return;
        }

        this.cancelPendingRedraw();
        this.performRedraw();
    }

    /**
     * Cancel pending redraw
     * @returns {void}
     */
    cancelPendingRedraw() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        this.needsRedraw = false;
    }

    /**
     * Animation frame callback for redraw
     * @param {number} timestamp - High resolution timestamp from requestAnimationFrame
     * @returns {void}
     */
    redrawCallback(timestamp) {
        this.animationFrameId = null;

        if (this.needsRedraw && this.isReady()) {
            this.performRedraw();
            this.updatePerformanceMetrics(timestamp);
        }
    }

    /**
     * Perform the actual redraw
     */
    performRedraw() {
        if (this.isRedrawing || !this.isReady()) {
            return;
        }

        try {
            this.isRedrawing = true;
            this.needsRedraw = false;
            this.lastUpdateTime = performance.now();

            // Call the visualizer function with current configuration
            if (this.visualizerFunction) {
                this.visualizerFunction(
                    this.context,
                    this.memoryDataView,
                    this.config
                );
            }

            this.frameCount++;

            this.dispatchEvent(new CustomEvent('visualizationUpdated', {
                detail: {
                    timestamp: this.lastUpdateTime,
                    frameCount: this.frameCount,
                    config: { ...this.config }
                }
            }));

        } catch (error) {
            this.dispatchEvent(new CustomEvent('visualizationError', {
                detail: { error }
            }));
        } finally {
            this.isRedrawing = false;
        }
    }

    /**
     * Update rendering performance metrics
     * @param {number} timestamp - High resolution timestamp
     * @returns {void}
     */
    updatePerformanceMetrics(timestamp) {
        if (this.lastFrameTime > 0) {
            const deltaTime = timestamp - this.lastFrameTime;
            if (deltaTime > 0) {
                const currentFps = 1000 / deltaTime;
                this.renderingFps = this.renderingFps * 0.8 + currentFps * 0.2;
            }
        }
        this.lastFrameTime = timestamp;
    }

    // === Configuration Management ===

    /**
     * Update visualization configuration
     * @param {Object} newConfig - Configuration object with properties to update
     * @returns {void}
     */
    updateConfig(newConfig) {
        const oldConfig = { ...this.config };
        this.config = { ...this.config, ...newConfig };

        this.dispatchEvent(new CustomEvent('configurationChanged', {
            detail: {
                newConfig: { ...this.config },
                oldConfig,
                changedKeys: Object.keys(newConfig)
            }
        }));

        // Request redraw if auto-update is enabled
        if (this.config.autoUpdate) {
            this.requestRedraw();
        }
    }

    /**
     * Get current configuration
     * @returns {Object} Copy of current visualization configuration
     */
    getConfig() {
        return { ...this.config };
    }

    /**
     * Reset configuration to defaults
     * @returns {void}
     */
    resetConfig() {
        const defaultConfig = {
            wordCount: 32768,
            wordsPerRow: 256,
            pixelSize: 1,
            showGrid: false,
            colorScheme: 'default',
            memoryOffset: 0,
            autoUpdate: true,
            updateThrottle: 16
        };

        this.updateConfig(defaultConfig);
    }

    // === Specific Configuration Methods ===

    /**
     * Set word count to visualize
     * @param {number} count - Number of words to visualize
     * @returns {void}
     */
    setWordCount(count) {
        this.updateConfig({ wordCount: Math.max(1, Math.floor(count)) });
    }

    /**
     * Set words per row
     * @param {number} wordsPerRow - Number of words to display per row
     * @returns {void}
     */
    setWordsPerRow(wordsPerRow) {
        this.updateConfig({ wordsPerRow: Math.max(1, Math.floor(wordsPerRow)) });
    }

    /**
     * Set pixel size
     * @param {number} size - Size of each pixel in the visualization
     * @returns {void}
     */
    setPixelSize(size) {
        this.updateConfig({ pixelSize: Math.max(1, Math.floor(size)) });
    }

    /**
     * Set memory offset
     * @param {number} offset - Starting memory offset for visualization
     * @returns {void}
     */
    setMemoryOffset(offset) {
        this.updateConfig({ memoryOffset: Math.max(0, Math.floor(offset)) });
    }

    /**
     * Set color scheme
     * @param {string} scheme - Name of the color scheme to use
     * @returns {void}
     */
    setColorScheme(scheme) {
        this.updateConfig({ colorScheme: scheme });
    }

    /**
     * Toggle grid display
     * @returns {void}
     */
    toggleGrid() {
        this.updateConfig({ showGrid: !this.config.showGrid });
    }

    /**
     * Set auto-update mode
     * @param {boolean} enabled - Whether to enable automatic updates
     * @returns {void}
     */
    setAutoUpdate(enabled) {
        this.updateConfig({ autoUpdate: enabled });
    }

    /**
     * Set update throttle (milliseconds)
     * @param {number} ms - Milliseconds between updates
     * @returns {void}
     */
    setUpdateThrottle(ms) {
        this.updateConfig({ updateThrottle: Math.max(1, Math.floor(ms)) });
    }

    // === Memory Data Management ===

    /**
     * Update memory data source
     * @param {DataView|null} dataView - Data view for accessing memory
     * @returns {void}
     */
    updateMemoryDataView(dataView) {
        this.memoryDataView = dataView;

        this.dispatchEvent(new CustomEvent('memoryDataUpdated', {
            detail: { hasData: !!dataView }
        }));

        if (this.config.autoUpdate) {
            this.requestRedraw();
        }
    }

    /**
     * Update simulation instance
     * @param {Simulation|null} simulationInstance - Simulation instance providing memory data
     * @returns {void}
     */
    updateSimulation(simulationInstance) {
        this.simulationInstance = simulationInstance;

        if (simulationInstance && simulationInstance.state) {
            this.updateMemoryDataView(simulationInstance.state.getMemoryDataView());
        } else {
            this.updateMemoryDataView(null);
        }
    }

    // === Canvas Management ===

    /**
     * Update canvas element
     * @param {HTMLCanvasElement|null} canvas - Canvas element for rendering
     * @returns {void}
     */
    updateCanvas(canvas) {
        this.canvas = canvas;
        this.context = canvas ? canvas.getContext('2d') : null;

        this.dispatchEvent(new CustomEvent('canvasUpdated', {
            detail: { hasCanvas: !!this.canvas }
        }));

        if (this.isReady() && this.config.autoUpdate) {
            this.requestRedraw();
        }
    }

    /**
     * Resize canvas to fit configuration
     * @returns {void}
     */
    resizeCanvas() {
        if (!this.canvas) return;

        const width = this.config.wordsPerRow * this.config.pixelSize;
        const height = Math.ceil(this.config.wordCount / this.config.wordsPerRow) * this.config.pixelSize;

        if (this.canvas.width !== width || this.canvas.height !== height) {
            this.canvas.width = width;
            this.canvas.height = height;

            this.dispatchEvent(new CustomEvent('canvasResized', {
                detail: { width, height }
            }));

            if (this.config.autoUpdate) {
                this.requestRedraw();
            }
        }
    }

    // === State Query Methods ===

    /**
     * Get current visualization state
     * @returns {Object} Object containing visualization state properties
     */
    getState() {
        return {
            needsRedraw: this.needsRedraw,
            isRedrawing: this.isRedrawing,
            isReady: this.isReady(),
            frameCount: this.frameCount,
            fps: this.renderingFps,
            config: { ...this.config }
        };
    }

    /**
     * Get performance metrics
     * @returns {Object} Object containing performance metrics
     */
    getPerformanceMetrics() {
        return {
            frameCount: this.frameCount,
            fps: this.renderingFps,
            lastUpdateTime: this.lastUpdateTime,
            isActive: this.needsRedraw || this.isRedrawing
        };
    }

    // === Utility Methods ===

    /**
     * Calculate canvas dimensions for current configuration
     * @returns {Object} Object with width and height properties
     */
    calculateCanvasDimensions() {
        const width = this.config.wordsPerRow * this.config.pixelSize;
        const height = Math.ceil(this.config.wordCount / this.config.wordsPerRow) * this.config.pixelSize;
        return { width, height };
    }

    /**
     * Check if redraw is needed
     * @returns {boolean} True if a redraw is pending
     */
    isRedrawNeeded() {
        return this.needsRedraw;
    }

    /**
     * Get memory word at specific position
     * @param {number} wordIndex - Index of the word to retrieve
     * @returns {number} The memory word value at the specified position
     */
    getMemoryWordAt(wordIndex) {
        if (!this.memoryDataView || wordIndex < 0) {
            return 0;
        }

        const byteOffset = (this.config.memoryOffset + wordIndex) * 2;
        if (byteOffset >= this.memoryDataView.byteLength - 1) {
            return 0;
        }

        return this.memoryDataView.getUint16(byteOffset, false); // Big-endian
    }

    /**
     * Cleanup resources
     * @returns {void}
     */
    dispose() {
        this.cancelPendingRedraw();
        this.canvas = null;
        this.context = null;
        this.visualizerFunction = null;
        this.memoryDataView = null;
        this.simulationInstance = null;

        this.dispatchEvent(new CustomEvent('visualizationDisposed'));
    }
}