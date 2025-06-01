/*

# Introduction

## Preface and Important Instructions

This is the main application file.  It does the thing.
It's 2025, use ES$YEAR techniques that work in all browsers.
Keep it readable and broken down logically.  When adding comments,
they're for the "why", not the "what" or the "how" (unless the how
is weird).  Avoid excessive functional patterns and callback hell.

# TMS99105 Simulator Refactoring Plan: Side-by-Side Rewrite

## Project Context

The TMS99105 simulator is a web-based CPU emulation application that currently
suffers from scattered global state, direct DOM manipulation, and tightly coupled
architecture. The existing codebase includes:

- **Core simulation logic**: CPU emulation, memory management, instruction execution
- **UI management**: Register displays, memory visualization, execution controls
- **Assembly tooling**: Text-to-assembly conversion, code loading, error reporting
- **Visualization**: Canvas-based memory state rendering

The current implementation uses global variables, inline event handlers, and
direct DOM access patterns that make testing, maintenance, and feature expansion
difficult.

## Strategic Approach: Bottom-Up Construction

### Rationale for Side-by-Side Rewrite

Rather than attempting to refactor the existing codebase in place, this plan
adopts a bottom-up reconstruction approach. This strategy eliminates the complexity
of maintaining compatibility with legacy code during transition while ensuring
each component is built with clear separation of concerns from the ground up.

The approach builds the application interface-first, then implements the logic
to support each interface element. This ensures that the user experience remains
the primary driver of the architecture rather than being constrained by legacy
technical decisions.

## Implementation Phases

### Phase 1: Foundation Infrastructure

**Objective**: Create the new HTML structure and basic application shell

**What**: Design and implement a new HTML file that represents the complete user
interface without any functional logic. This includes all display areas, control
elements, and interactive components needed for the full simulator experience.

**Why**: Establishing the complete interface first provides a clear target for
functionality implementation and ensures that architectural decisions support the
user experience rather than constraining it.

### Phase 2: Simulation State Display

**Objective**: Implement the core simulation status indicators

**What**: Build the logic and data flow to populate simulation state information
including execution status, performance metrics, timing information, and overall
simulator health indicators.

**Why**: The simulation state display provides the foundation for understanding
what the simulator is doing and forms the basis for all other interactive elements.

### Phase 3: CPU Internal State Display

**Objective**: Implement register and status visualization

**What**: Create the systems to display CPU register contents, status register
flags, program counter, workspace pointer, and other internal CPU state information
with real-time updates.

**Why**: CPU state visibility is essential for debugging and understanding program
execution, and this display represents one of the most frequently accessed areas
of the interface.

### Phase 4: Execution Control System

**Objective**: Implement program execution controls

**What**: Build the logic for starting, stopping, stepping, and controlling the
pace of program execution, including single-step, run-until-break, and speed
control mechanisms.

**Why**: Execution control is the primary way users interact with the simulation
and must be reliable and responsive to provide a good user experience.

### Phase 5: Memory Visualization

**Objective**: Implement memory state visualization

**What**: Create the systems to render memory contents as visual patterns,
including configuration options for display format, zoom levels, and highlighting
of active memory regions.

**Why**: Memory visualization provides insight into program data usage and memory
access patterns that are difficult to understand through text-based displays alone.

### Phase 6: Code Input and Management

**Objective**: Implement assembly code editing and file management

**What**: Build the text editing environment for assembly code, including syntax
support, file loading, and integration with the assembly process.

**Why**: Code input is the primary way users create and modify programs for the
simulator, and the editing experience directly impacts productivity and usability.

### Phase 7: Assembly Output and Error Reporting

**Objective**: Implement decompiled code display and diagnostic information

**What**: Create systems to display assembled code output, compilation errors,
warnings, and other diagnostic information that helps users understand the assembly
process.

**Why**: Assembly feedback is essential for debugging code issues and understanding
how source code translates to executable instructions.

*/

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
        this.memoryVizController = null; // Created in setup

        /**
         * DOM element references (populated in setup)
         * @type {{
         *   filePicker: HTMLSelectElement|null,
         *   loadFileBtn: HTMLButtonElement|null,
         *   editor: HTMLTextAreaElement|null,
         *   output: HTMLElement|null,
         *   assembleBtn: HTMLButtonElement|null,
         *   resetBtn: HTMLButtonElement|null,
         *   stopBtn: HTMLButtonElement|null,
         *   runSlowBtn: HTMLButtonElement|null,
         *   runBtn: HTMLButtonElement|null,
         *   runFastBtn: HTMLButtonElement|null,
         *   stepInstructionBtn: HTMLButtonElement|null,
         *   stepStateBtn: HTMLButtonElement|null,
         *   runningEl: HTMLElement|null,
         *   prevStateEl: HTMLElement|null,
         *   nextStateEl: HTMLElement|null,
         *   fpsEl: HTMLElement|null,
         *   ipsEl: HTMLElement|null,
         *   registerRow: HTMLElement|null,
         *   wpEl: HTMLElement|null,
         *   pcEl: HTMLElement|null,
         *   instructionEl: HTMLElement|null,
         *   bitLgtEl: HTMLElement|null,
         *   bitAgtEl: HTMLElement|null,
         *   bitEqEl: HTMLElement|null,
         *   bitCarryEl: HTMLElement|null,
         *   bitOverEl: HTMLElement|null,
         *   bitParityEl: HTMLElement|null,
         *   bitXopEl: HTMLElement|null,
         *   bitPrivEl: HTMLElement|null,
         *   bitMapEl: HTMLElement|null,
         *   bitMmEl: HTMLElement|null,
         *   bitOvintEl: HTMLElement|null,
         *   bitWcsEl: HTMLElement|null
         * }}
         */
        this.elements = {
            filePicker: null,
            loadFileBtn: null,
            editor: null,
            output: null,
            assembleBtn: null,
            resetBtn: null,
            stopBtn: null,
            runSlowBtn: null,
            runBtn: null,
            runFastBtn: null,
            stepInstructionBtn: null,
            stepStateBtn: null,
            runningEl: null,
            prevStateEl: null,
            nextStateEl: null,
            fpsEl: null,
            ipsEl: null,
            registerRow: null,
            wpEl: null,
            pcEl: null,
            instructionEl: null,
            bitLgtEl: null,
            bitAgtEl: null,
            bitEqEl: null,
            bitCarryEl: null,
            bitOverEl: null,
            bitParityEl: null,
            bitXopEl: null,
            bitPrivEl: null,
            bitMapEl: null,
            bitMmEl: null,
            bitOvintEl: null,
            bitWcsEl: null
        };

        this.isInitialized = false;
    }

    async init() {
        // Setup DOM references
        this.setupDOMReferences();
        // Setup memory visualization
        this.setupMemoryVisualization(); // Controller is created here
        // Setup DOM event listeners
        this.setupDOMEventListeners();
        // Setup controller event listeners
        this.setupControllerEventListeners();
        // Load available files (triggers availableFilesLoaded event)
        await this.codeController.loadAvailableFiles();

        // Initialize simulation state and update UI
        this.simulationController.reset();
        this.updateAllSimulationDisplays(); // This will call render for the first time
    }

    // === DOM Setup ===
    setupDOMReferences() {
        // Get all required DOM elements by ID and store in this.elements
        this.elements.filePicker = /** @type {HTMLSelectElement} */ (document.getElementById('file_picker'));
        this.elements.loadFileBtn = /** @type {HTMLButtonElement} */ (document.getElementById('load_file'));
        this.elements.editor = /** @type {HTMLTextAreaElement} */ (document.getElementById('editor'));
        this.elements.output = /** @type {HTMLElement} */ (document.getElementById('output'));
        this.elements.assembleBtn = /** @type {HTMLButtonElement} */ (document.getElementById('assemble'));
        this.elements.resetBtn = /** @type {HTMLButtonElement} */ (document.getElementById('reset'));
        this.elements.stopBtn = /** @type {HTMLButtonElement} */ (document.getElementById('stop'));
        this.elements.runSlowBtn = /** @type {HTMLButtonElement} */ (document.getElementById('run_slow'));
        this.elements.runBtn = /** @type {HTMLButtonElement} */ (document.getElementById('run'));
        this.elements.runFastBtn = /** @type {HTMLButtonElement} */ (document.getElementById('run_fast'));
        this.elements.stepInstructionBtn = /** @type {HTMLButtonElement} */ (document.getElementById('step_instruction'));
        this.elements.stepStateBtn = /** @type {HTMLButtonElement} */ (document.getElementById('step_state'));

        // Simulation state elements
        this.elements.runningEl = document.getElementById('running');
        this.elements.prevStateEl = document.getElementById('prev_state');
        this.elements.nextStateEl = document.getElementById('next_state');
        this.elements.fpsEl = document.getElementById('fps');
        this.elements.ipsEl = document.getElementById('ips');

        // Machine state elements
        this.elements.registerRow = document.getElementById('register_row');
        this.elements.wpEl = document.getElementById('wp');
        this.elements.pcEl = document.getElementById('pc');
        this.elements.instructionEl = document.getElementById('instruction');

        // Status bit elements
        this.elements.bitLgtEl = document.getElementById('bit_lgt');
        this.elements.bitAgtEl = document.getElementById('bit_agt');
        this.elements.bitEqEl = document.getElementById('bit_eq');
        this.elements.bitCarryEl = document.getElementById('bit_carry');
        this.elements.bitOverEl = document.getElementById('bit_over');
        this.elements.bitParityEl = document.getElementById('bit_parity');
        this.elements.bitXopEl = document.getElementById('bit_xop');
        this.elements.bitPrivEl = document.getElementById('bit_priv');
        this.elements.bitMapEl = document.getElementById('bit_map');
        this.elements.bitMmEl = document.getElementById('bit_mm');
        this.elements.bitOvintEl = document.getElementById('bit_ovint');
        this.elements.bitWcsEl = document.getElementById('bit_wcs');
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
        if(this.elements.loadFileBtn) {
            this.elements.loadFileBtn.addEventListener('click', () => {
                const picker = this.elements.filePicker;
                if (picker && picker.value) {
                    this.codeController.loadFile(picker.value);
                }
            });
        }
        if(this.elements.assembleBtn) {
            this.elements.assembleBtn.addEventListener('click', () => {
                if (this.elements.editor) {
                    this.codeController.setSourceCode(this.elements.editor.value, this.codeController.filename);
                }
            });
        }

        // Simulation control buttons
        if (this.elements.resetBtn) {
            this.elements.resetBtn.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                this.simulationController.reset();
                // Load assembled code into simulation memory after reset
                this.loadAssemblyIntoMemory();
                // Update UI immediately after manual reset
                this.updateAllSimulationDisplays();
            });
        }

        if (this.elements.stopBtn) {
            this.elements.stopBtn.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                this.simulationController.stop();
            });
        }

        if (this.elements.runBtn) {
            this.elements.runBtn.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                this.simulationController.setSlowMode(false);
                this.simulationController.setFastMode(false);
                this.simulationController.start();
            });
        }

        if (this.elements.runSlowBtn) {
            this.elements.runSlowBtn.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                this.simulationController.setSlowMode(true);
                this.simulationController.start();
            });
        }

        if (this.elements.runFastBtn) {
            this.elements.runFastBtn.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                this.simulationController.setFastMode(true);
                this.simulationController.start();
            });
        }

        if (this.elements.stepInstructionBtn) {
            this.elements.stepInstructionBtn.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                this.simulationController.stepInstruction();
                // Update UI immediately after manual step
                this.updateAllSimulationDisplays();
            });
        }

        if (this.elements.stepStateBtn) {
            this.elements.stepStateBtn.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                this.simulationController.step();
                // Update UI immediately after manual step
                this.updateAllSimulationDisplays();
            });
        }
        if (this.elements.editor) {
            // Resize on input, focus, and blur
            const resizeHandler = () => {
                if (this.elements.editor) this.resizeEditorTextarea(this.elements.editor);
            };
            this.elements.editor.addEventListener('input', resizeHandler);
            this.elements.editor.addEventListener('focus', resizeHandler);
            this.elements.editor.addEventListener('blur', resizeHandler);
            // Initial resize
            this.resizeEditorTextarea(this.elements.editor);
            // Tab key handler for soft tabs
            this.elements.editor.addEventListener('keydown', (event) => {
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
    }

    setupControllerEventListeners() {
        // Listen for availableFilesLoaded from CodeController
        this.codeController.addEventListener('availableFilesLoaded', (event) => {
            const customEvent = /** @type {CustomEvent} */ (event);
            this.populateFilePicker(customEvent.detail.files);
        });

        this.codeController.addEventListener('fileLoaded', (event) => {
            const customEvent = /** @type {CustomEvent} */ (event);
            if (this.elements.editor && customEvent.detail && customEvent.detail.content) {
                this.elements.editor.value = customEvent.detail.content;
            }
        });

        this.codeController.addEventListener('assemblyCompleted', (event) => {
            const customEvent = /** @type {CustomEvent} */ (event);
            if (this.elements.output) {
                const lines = this.codeController.getAssemblyAsm();
                this.elements.output.textContent = lines.join("\n");
            }

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
        const metrics = this.simulationController.getPerformanceMetrics();
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
        if (this.elements.runningEl) {
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
            this.elements.runningEl.textContent = runningText;
        }

        // Update flow states
        if (this.elements.prevStateEl) {
            this.elements.prevStateEl.textContent = simulation.flow.prev_flow_state || '--';
        }
        if (this.elements.nextStateEl) {
            this.elements.nextStateEl.textContent = simulation.flow.flow_state || '--';
        }

        // Update performance metrics
        const metrics = /** @type {{instructionCount: number, frameCount: number, fps: number, ips: number, runStartTime: number, elapsedTime: number}} */ (this.simulationController.getPerformanceMetrics());
        if (this.elements.fpsEl) {
            this.elements.fpsEl.textContent = metrics.fps ? metrics.fps.toFixed(1) : '--';
        }
        if (this.elements.ipsEl) {
            this.elements.ipsEl.textContent = metrics.ips ? metrics.ips.toFixed(0) : '--';
        }
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
            if (this.elements.registerRow) {
                const cells = this.elements.registerRow.children;
                for (let i = 0; i < 16 && i < cells.length; i++) {
                    const registerValue = state.getRegisterWord(i);
                    cells[i].textContent = this.formatHex(registerValue);
                }
            }

            // Update workspace pointer
            if (this.elements.wpEl) {
                this.elements.wpEl.textContent = '0x' + this.formatHex(state.workspace_pointer);
            }

            // Update program counter
            if (this.elements.pcEl) {
                this.elements.pcEl.textContent = '0x' + this.formatHex(state.getPc());
            }

            // Update current instruction display
            if (this.elements.instructionEl) {
                try {
                    const instruction = simulation.ep.getCurrentInstruction();
                    if (instruction && instruction.opcode_def && instruction.opcode_def.name) {
                        this.elements.instructionEl.textContent = instruction.opcode_def.name;
                    } else {
                        this.elements.instructionEl.textContent = '--';
                    }
                } catch (e) {
                    this.elements.instructionEl.textContent = '--';
                }
            }
        } catch (error) {
            console.error('Error updating machine state:', error);
            // Clear displays on error
            if (this.elements.registerRow) {
                const cells = this.elements.registerRow.children;
                for (let i = 0; i < cells.length; i++) {
                    cells[i].textContent = '----';
                }
            }
            if (this.elements.wpEl) this.elements.wpEl.textContent = '----';
            if (this.elements.pcEl) this.elements.pcEl.textContent = '----';
            if (this.elements.instructionEl) this.elements.instructionEl.textContent = '--';
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
                bit_lgt: this.elements.bitLgtEl,
                bit_agt: this.elements.bitAgtEl,
                bit_eq: this.elements.bitEqEl,
                bit_carry: this.elements.bitCarryEl,
                bit_over: this.elements.bitOverEl,
                bit_parity: this.elements.bitParityEl,
                bit_xop: this.elements.bitXopEl,
                bit_priv: this.elements.bitPrivEl,
                bit_map: this.elements.bitMapEl,
                bit_mm: this.elements.bitMmEl,
                bit_ovint: this.elements.bitOvintEl,
                bit_wcs: this.elements.bitWcsEl
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
                    element.textContent = bitValue ? '1' : '0';
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
                lgt: this.elements.bitLgtEl,
                agt: this.elements.bitAgtEl,
                eq: this.elements.bitEqEl,
                car: this.elements.bitCarryEl,
                ov: this.elements.bitOverEl,
                par: this.elements.bitParityEl,
                xop: this.elements.bitXopEl,
                priv: this.elements.bitPrivEl,
                mf: this.elements.bitMapEl,
                mm: this.elements.bitMmEl,
                oint: this.elements.bitOvintEl,
                wcs: this.elements.bitWcsEl
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
        if (this.elements.fpsEl) {
            this.elements.fpsEl.textContent = fps ? fps.toFixed(1) : '--';
        }
        if (this.elements.ipsEl) {
            this.elements.ipsEl.textContent = ips ? ips.toFixed(0) : '--';
        }
    }

    /**
     * Load assembled code into simulation memory
     */
    loadAssemblyIntoMemory() {
        if (this.codeController.hasValidAssembly()) {
            const bytes = this.codeController.getAssemblyBytes();
            if (bytes) {
                this.simulation.loadMemory(bytes);
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
        const picker = this.elements.filePicker;
        if (!picker) return;
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
        if (this.elements.output) {
            const errorText = errors.length > 0 ?
                `Assembly errors:\n${errors.join('\n')}` :
                'Assembly completed successfully';
            this.elements.output.textContent = errorText;
        }
    }

    /**
     * Show error message
     * @param {string} message
     */
    showError(message) {
        // Display error in output area and console
        console.error('App Error:', message);
        if (this.elements.output) {
            this.elements.output.textContent = `Error: ${message}`;
        }
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
