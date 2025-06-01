// @ts-check

// Import required classes
import { Simulation } from './classes/Simulation.js';
import { SimulationController } from './controllers/SimulationController.js';
import { CodeController } from './controllers/CodeController.js';
import { CanvasMemoryVizController } from './controllers/CanvasMemoryVizController.js';

export class App {
    constructor() {
        // Core instances
        this.simulation = new Simulation();
        this.simulationController = new SimulationController(this.simulation);
        this.codeController = new CodeController();

        // DOM element map - guaranteed to exist or will throw
        /** @type {Map<string, HTMLElement>} */
        this.elements = new Map(/** @type {[string, HTMLElement][]} */ ([
            ['filePicker', document.getElementById('file_picker')],
            ['loadFileBtn', document.getElementById('load_file')],
            ['editor', document.getElementById('editor')],
            ['output', document.getElementById('output')],
            ['assembleBtn', document.getElementById('assemble')],
            ['resetBtn', document.getElementById('reset')],
            ['stopBtn', document.getElementById('stop')],
            ['runSlowBtn', document.getElementById('run_slow')],
            ['runBtn', document.getElementById('run')],
            ['runFastBtn', document.getElementById('run_fast')],
            ['stepInstructionBtn', document.getElementById('step_instruction')],
            ['stepStateBtn', document.getElementById('step_state')],
            ['runningEl', document.getElementById('running')],
            ['prevStateEl', document.getElementById('prev_state')],
            ['nextStateEl', document.getElementById('next_state')],
            ['fpsEl', document.getElementById('fps')],
            ['ipsEl', document.getElementById('ips')],
            ['registerRow', document.getElementById('register_row')],
            ['wpEl', document.getElementById('wp')],
            ['pcEl', document.getElementById('pc')],
            ['instructionEl', document.getElementById('instruction')],
            ['bitLgtEl', document.getElementById('bit_lgt')],
            ['bitAgtEl', document.getElementById('bit_agt')],
            ['bitEqEl', document.getElementById('bit_eq')],
            ['bitCarryEl', document.getElementById('bit_carry')],
            ['bitOverEl', document.getElementById('bit_over')],
            ['bitParityEl', document.getElementById('bit_parity')],
            ['bitXopEl', document.getElementById('bit_xop')],
            ['bitPrivEl', document.getElementById('bit_priv')],
            ['bitMapEl', document.getElementById('bit_map')],
            ['bitMmEl', document.getElementById('bit_mm')],
            ['bitOvintEl', document.getElementById('bit_ovint')],
            ['bitWcsEl', document.getElementById('bit_wcs')]
        ]));

        // Verify all elements exist - after this check, all elements are guaranteed non-null
        for (const [name, element] of this.elements) {
            if (!element) {
                throw new Error(`Required DOM element not found: ${name}`);
            }
        }

        // Setup memory visualization and event listeners
        this.setupMemoryVisualization();
        this.setupDOMEventListeners();
        this.setupControllerEventListeners();
    }

    /**
     * Get a DOM element from the elements map with guaranteed non-null return
     * @param {string} key - The element key
     * @returns {HTMLElement} The DOM element (guaranteed to exist)
     */
    getElement(key) {
        const element = this.elements.get(key);
        if (!element) {
            throw new Error(`DOM element not found: ${key}`);
        }
        return element;
    }

    async init() {
        // Load available files (triggers availableFilesLoaded event)
        await this.codeController.loadAvailableFiles();

        // Initialize simulation state and update UI
        this.simulationController.reset();
        this.updateAllSimulationDisplays(); // This will call render for the first time
    }



    setupMemoryVisualization() {
        // Create canvas and add to viz container
        const vizContainer = document.getElementById('viz');
        if (vizContainer) {
            const canvas = document.createElement('canvas');
            canvas.id = 'memory_canvas';
            // Default dimensions, can be made configurable later
            canvas.width = 512;
            canvas.height = 512;
            vizContainer.appendChild(canvas);

            // Initialize CanvasMemoryVizController
            try {
                this.memoryVizController = new CanvasMemoryVizController(this.simulation, canvas);
                // Initial render after controller is ready
                // this.memoryVizController.render(); // Moved to updateAllSimulationDisplays via init
            } catch (error) {
                console.warn('Memory visualization controller failed to initialize:', error);
                // Create a placeholder if the controller fails
                canvas.remove();
                const placeholder = document.createElement('div');
                placeholder.textContent = 'Memory visualization not available';
                placeholder.style.padding = '20px';
                placeholder.style.textAlign = 'center';
                placeholder.style.border = '1px solid #ccc';
                vizContainer.appendChild(placeholder);
            }
        }
    }

    // === Event Listener Setup ===
    setupDOMEventListeners() {
        // File management controls
        this.getElement('loadFileBtn').addEventListener('click', () => {
            const picker = /** @type {HTMLSelectElement} */ (this.getElement('filePicker'));
            if (picker.value) {
                this.codeController.loadFile(picker.value);
            }
        });

        this.getElement('assembleBtn').addEventListener('click', () => {
            const editor = /** @type {HTMLTextAreaElement} */ (this.getElement('editor'));
            this.codeController.setSourceCode(editor.value, this.codeController.filename);
        });

        // Simulation control buttons
        this.getElement('resetBtn').addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            this.simulationController.reset();
            // Assemble the current editor content and load into memory (triggers assemblyCompleted event)
            const editor = /** @type {HTMLTextAreaElement} */ (this.getElement('editor'));
            this.codeController.setSourceCode(editor.value, this.codeController.filename);
            // UI will update via assemblyCompleted event
        });

        this.getElement('stopBtn').addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            this.simulationController.stop();
        });

        this.getElement('runBtn').addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            this.simulationController.setSlowMode(false);
            this.simulationController.setFastMode(false);
            this.simulationController.start();
        });

        this.getElement('runSlowBtn').addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            this.simulationController.setSlowMode(true);
            this.simulationController.start();
        });

        this.getElement('runFastBtn').addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            this.simulationController.setFastMode(true);
            this.simulationController.start();
        });

        this.getElement('stepInstructionBtn').addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            this.simulationController.stepInstruction();
            // Update UI immediately after manual step
            this.updateAllSimulationDisplays();
        });

        this.getElement('stepStateBtn').addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            this.simulationController.step();
            // Update UI immediately after manual step
            this.updateAllSimulationDisplays();
        });

        const editor = /** @type {HTMLTextAreaElement} */ (this.getElement('editor'));
        // Resize on input, focus, and blur
        const resizeHandler = () => {
            this.resizeEditorTextarea(editor);
        };
        editor.addEventListener('input', resizeHandler);
        editor.addEventListener('focus', resizeHandler);
        editor.addEventListener('blur', resizeHandler);
        // Initial resize
        this.resizeEditorTextarea(editor);
        // Tab key handler for soft tabs
        editor.addEventListener('keydown', (event) => {
            if (event.key !== 'Tab') return true;
            event.preventDefault();
            event.stopPropagation();
            const el = event.target;
            if (!(el instanceof HTMLTextAreaElement)) return;
            const start_point = el.selectionStart;
            const end_point = el.selectionEnd;
            const previous_newline = el.value.lastIndexOf("\x0a", start_point);
            const chars_in = start_point - previous_newline - 1;

            const Tab_Width = 4;
            let insert_count = 0;
            if (chars_in > 0) {
                const tabstops = Math.floor(chars_in / Tab_Width);
                const remainder = chars_in - (tabstops * Tab_Width);
                insert_count = Tab_Width - remainder;
            }
            if (insert_count === 0) {
                insert_count = Tab_Width;
            }
            const left = el.value.substring(0, start_point);
            const right = el.value.substring(start_point);
            el.value = left + ' '.repeat(insert_count) + right;
            el.setSelectionRange(start_point + insert_count, end_point + insert_count);
            // Also resize after tab insert
            this.resizeEditorTextarea(el);
        });
    }

    setupControllerEventListeners() {
        // Listen for availableFilesLoaded from CodeController
        this.codeController.addEventListener('availableFilesLoaded', (event) => {
            const customEvent = /** @type {CustomEvent} */ (event);
            this.populateFilePicker(customEvent.detail.files);
        });

        this.codeController.addEventListener('fileLoaded', (event) => {
            const customEvent = /** @type {CustomEvent} */ (event);
            if (customEvent.detail && customEvent.detail.content) {
                const editor = /** @type {HTMLTextAreaElement} */ (this.getElement('editor'));
                editor.value = customEvent.detail.content;
            }
        });

        this.codeController.addEventListener('assemblyCompleted', (event) => {
            const customEvent = /** @type {CustomEvent} */ (event);
            const lines = this.codeController.getAssemblyAsm();
            this.getElement('output').textContent = lines.join("\n");

            // Load assembled code into simulation memory if assembly was successful
            if (customEvent.detail && customEvent.detail.success) {
                this.loadAssemblyIntoMemory();
            }
        });

        // Listen for simulation controller events to update UI
        const updateEvents = [
            'frameExecuted',
            'instructionExecuted',
            'executionStarted',
            'executionStopped',
            'simulationReset',
            'executionModeChanged'
        ];
        updateEvents.forEach(eventName => {
            this.simulationController.addEventListener(eventName, () => {
                this.updateAllSimulationDisplays();
            });
        });

        this.simulationController.addEventListener('executionError', (event) => {
            const customEvent = /** @type {CustomEvent} */ (event);
            console.error('Simulation execution error:', customEvent.detail.error);
            this.showError(`Execution error: ${customEvent.detail.error.message || customEvent.detail.error}`);
            this.updateAllSimulationDisplays();
        });

        // Removed setupPeriodicUpdates as updates are now centralized
        // in the frameCompleted event.
    }

    /**
     * Update all simulation-related displays
     */
    updateAllSimulationDisplays() {
        this.updateSimulationState();
        this.updateMachineState();
        this.updateStatusBits();
        // Update performance metrics with latest from controller
        const metrics = /** @type {{instructionCount: number, frameCount: number, fps: number, ips: number, runStartTime: number, elapsedTime: number}} */ (this.simulationController.getPerformanceMetrics());
        this.updatePerformanceMetrics(metrics.fps, metrics.ips, metrics.instructionCount);

        if (this.memoryVizController) {
            this.memoryVizController.render();
        }
    }

    // === UI Update Methods ===
    updateSimulationState() {
        // Update running/stopped status, flow states
        const executionState = /** @type {{running: boolean, slowMode: boolean, fastMode: boolean, fastModeSteps: number}} */ (this.simulationController.getExecutionState());
        const simulation = this.simulationController.getSimulation();

        // Update running status
        const runningEl = this.getElement('runningEl');
        let runningText = 'No';
        if (executionState.running) {
            if (executionState.fastMode) {
                runningText = 'Yes (fast)';
            } else if (executionState.slowMode) {
                runningText = 'Yes (slow)';
            } else {
                runningText = 'Yes';
            }
        }
        runningEl.textContent = runningText;

        // Update flow states
        const prevStateEl = this.getElement('prevStateEl');
        prevStateEl.textContent = simulation.flow.prev_flow_state || '--';

        const nextStateEl = this.getElement('nextStateEl');
        nextStateEl.textContent = simulation.flow.flow_state || '--';

        // Update performance metrics
        const metrics = /** @type {{instructionCount: number, frameCount: number, fps: number, ips: number, runStartTime: number, elapsedTime: number}} */ (this.simulationController.getPerformanceMetrics());
        const fpsEl = this.getElement('fpsEl');
        fpsEl.textContent = metrics.fps ? metrics.fps.toFixed(1) : '--';

        const ipsEl = this.getElement('ipsEl');
        ipsEl.textContent = metrics.ips ? metrics.ips.toFixed(0) : '--';
    }

    /**
     * Update machine state including registers, PC, WP, and instruction display
     */
    updateMachineState() {
        if (!this.simulationController || !this.elements) return;

        try {
            const simulation = this.simulationController.getSimulation();
            const state = simulation.state;

            // Update all 16 general purpose registers by referencing the static <td>s
            const registerRow = this.elements.get('registerRow');
            if (registerRow) {
                const cells = registerRow.children;
                for (let i = 0; i < 16 && i < cells.length; i++) {
                    const registerValue = state.getRegisterWord(i);
                    cells[i].textContent = this.formatHex(registerValue);
                }
            }

            // Update workspace pointer
            const wpEl = this.elements.get('wpEl');
            if (wpEl) {
                wpEl.textContent = '0x' + this.formatHex(state.workspace_pointer);
            }

            // Update program counter
            const pcEl = this.elements.get('pcEl');
            if (pcEl) {
                pcEl.textContent = '0x' + this.formatHex(state.getPc());
            }

            // Update current instruction display
            const instructionEl = this.elements.get('instructionEl');
            if (instructionEl) {
                try {
                    const instruction = simulation.ep.getCurrentInstruction();
                    if (instruction && instruction.opcode_def && instruction.opcode_def.name) {
                        instructionEl.textContent = instruction.opcode_def.name;
                    } else {
                        instructionEl.textContent = '--';
                    }
                } catch (e) {
                    instructionEl.textContent = '--';
                }
            }
        } catch (error) {
            console.error('Error updating machine state:', error);
            // Clear displays on error
            const registerRow = this.elements.get('registerRow');
            if (registerRow) {
                const cells = registerRow.children;
                for (let i = 0; i < cells.length; i++) {
                    cells[i].textContent = '----';
                }
            }
            const wpEl = this.elements.get('wpEl');
            const pcEl = this.elements.get('pcEl');
            const instructionEl = this.elements.get('instructionEl');
            if (wpEl) wpEl.textContent = '----';
            if (pcEl) pcEl.textContent = '----';
            if (instructionEl) instructionEl.textContent = '--';
        }
    }

    /**
     * Update status register bit display
     */
    updateStatusBits() {
        if (!this.simulationController || !this.elements) return;

        try {
            const simulation = this.simulationController.getSimulation();
            const statusRegister = simulation.state.status_register;

            // Update each status bit with proper styling
            const bitElements = {
                bit_lgt: this.elements.get('bitLgtEl'),
                bit_agt: this.elements.get('bitAgtEl'),
                bit_eq: this.elements.get('bitEqEl'),
                bit_carry: this.elements.get('bitCarryEl'),
                bit_over: this.elements.get('bitOverEl'),
                bit_parity: this.elements.get('bitParityEl'),
                bit_xop: this.elements.get('bitXopEl'),
                bit_priv: this.elements.get('bitPrivEl'),
                bit_map: this.elements.get('bitMapEl'),
                bit_mm: this.elements.get('bitMmEl'),
                bit_ovint: this.elements.get('bitOvintEl'),
                bit_wcs: this.elements.get('bitWcsEl')
            };

            // Import StatusRegister constants
            import('./classes/StatusRegister.js').then(({ StatusRegister }) => {
                /** @type {{ [key: string]: number }} */
                const bitMappings = {
                    bit_lgt: StatusRegister.LGT,
                    bit_agt: StatusRegister.AGT,
                    bit_eq: StatusRegister.EQUAL,
                    bit_carry: StatusRegister.CARRY,
                    bit_over: StatusRegister.OVERFLOW,
                    bit_parity: StatusRegister.PARITY,
                    bit_xop: StatusRegister.XOP,
                    bit_priv: StatusRegister.PRIVILEGED,
                    bit_map: StatusRegister.MAPFILE_ENABLED,
                    bit_mm: StatusRegister.MEMORY_MAPPED,
                    bit_ovint: StatusRegister.OVERFLOW_INTERRUPT_ENABLED,
                    bit_wcs: StatusRegister.WCS_ENABLED
                };

                // Update each bit display
                Object.entries(bitElements).forEach(([bitName, element]) => {
                    if (!element) return;
                    const bitIndex = bitMappings[bitName];
                    const bitValue = statusRegister.getBit(bitIndex);
                    element.classList.toggle('status-bit-set', bitValue === 1);
                    element.classList.toggle('status-bit-clear', bitValue === 0);
                });
            }).catch(error => {
                console.error('Error importing StatusRegister:', error);
            });

        } catch (error) {
            console.error('Error updating status bits:', error);
            // Clear all status bit displays on error
            const bitElements = {
                lgt: this.elements.get('bitLgtEl'),
                agt: this.elements.get('bitAgtEl'),
                eq: this.elements.get('bitEqEl'),
                car: this.elements.get('bitCarryEl'),
                ov: this.elements.get('bitOverEl'),
                par: this.elements.get('bitParityEl'),
                xop: this.elements.get('bitXopEl'),
                priv: this.elements.get('bitPrivEl'),
                mf: this.elements.get('bitMapEl'),
                mm: this.elements.get('bitMmEl'),
                oint: this.elements.get('bitOvintEl'),
                wcs: this.elements.get('bitWcsEl')
            };

            Object.values(bitElements).forEach(element => {
                if (element) {
                    element.textContent = '?';
                    element.classList.remove('status-bit-set', 'status-bit-clear');
                }
            });
        }
    }

    /**
     * Update FPS/IPS and instruction count display
     * @param {number} fps
     * @param {number} ips
     * @param {number} instructionCount
     */
    updatePerformanceMetrics(fps, ips, instructionCount) {
        const fpsEl = this.getElement('fpsEl');
        fpsEl.textContent = fps ? fps.toFixed(1) : '--';

        const ipsEl = this.getElement('ipsEl');
        ipsEl.textContent = ips ? ips.toFixed(0) : '--';
    }

    /**
     * Load assembled code into simulation memory
     */
    loadAssemblyIntoMemory() {
        if (this.codeController.hasValidAssembly()) {
            const bytes = this.codeController.getAssemblyBytes();
            if (bytes) {
                this.simulation.loadBytes(bytes);
                this.updateAllSimulationDisplays(); // Update UI after loading memory
                if (this.memoryVizController) {
                    this.memoryVizController.render();
                }
                // Optionally, reset PC to start of loaded code or a default address
                // this.simulationController.resetPC(); // Assuming such a method exists or is added
            }
        }
    }

    /**
     * Populate file picker with available files
     * @param {string[]} files
     */
    populateFilePicker(files) {
        // Clear and repopulate the file picker dropdown
        const picker = /** @type {HTMLSelectElement} */ (this.getElement('filePicker'));
        picker.innerHTML = '';
        // Optionally add a default/empty option
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = '-- Select a file --';
        picker.appendChild(defaultOption);
        // Add each file as an option
        files.forEach((filename) => {
            const option = document.createElement('option');
            option.value = filename;
            option.textContent = filename;
            picker.appendChild(option);
        });
    }

    /**
     * Display assembly errors
     * @param {string[]} errors
     */
    displayAssemblyErrors(errors) {
        const output = this.getElement('output');
        const errorText = errors.length > 0 ?
            `Assembly errors:\n${errors.join('\n')}` :
            'Assembly completed successfully';
        output.textContent = errorText;
    }

    /**
     * Show error message
     * @param {string} message
     */
    showError(message) {
        // Display error in output area and console
        console.error('App Error:', message);
        const output = this.getElement('output');
        output.textContent = `Error: ${message}`;
    }

    /**
     * Format a value as hex
     * @param {number} value
     * @param {number} [digits=4]
     * @returns {string}
     */
    formatHex(value, digits = 4) {
        return value.toString(16).padStart(digits, '0').toUpperCase();
    }

    /**
     * Resize the editor textarea to fit its content
     * @param {HTMLTextAreaElement} textarea
     */
    resizeEditorTextarea(textarea) {
        const rawlines = textarea.value.replaceAll(/\r\n/g, "\n").split(/\n/);
        textarea.rows = rawlines.length + 2;
    }

}

// Initialize when DOM ready
document.addEventListener('DOMContentLoaded', async () => {
    // @ts-ignore: Add app to window for global access in browser
    window.app = new App();
    // @ts-ignore: Add app to window for global access in browser
    await window.app.init();
});
