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
/**
 * App.js - Main application skeleton
 *
 * This is the SKELETON - structure only, no implementation
 * Shows how controllers connect to DOM elements in index2.html
 */

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
         *   stepStateBtn: HTMLButtonElement|null
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
            stepStateBtn: null
        };

        this.isInitialized = false;
    }

    async init() {
        // Setup DOM references
        this.setupDOMReferences();
        // Setup memory visualization
        this.setupMemoryVisualization();
        // Setup DOM event listeners
        this.setupDOMEventListeners();
        // Setup controller event listeners
        this.setupControllerEventListeners();
        // Load available files (triggers availableFilesLoaded event)
        await this.codeController.loadAvailableFiles();
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
        // ...add other elements as needed for the rest of the app...
    }

    setupMemoryVisualization() {
        // TODO: Create canvas, add to viz container
        // TODO: Initialize CanvasMemoryVizController
    }

    // === Event Listener Setup ===
    setupDOMEventListeners() {
        // TODO: Button clicks -> controller methods
        // this.elements.resetBtn.addEventListener('click', () => this.simulationController.reset());
        // this.elements.stepBtn.addEventListener('click', () => this.simulationController.step());
        // etc.
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
        // TODO: Controller events -> UI updates
        // this.simulationController.addEventListener('frameExecuted', (event) => this.updateUI(event.detail));
        // this.codeController.addEventListener('assemblyCompleted', (event) => this.loadIntoMemory(event.detail));
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
            if (this.elements.output) {
                const lines = this.codeController.getAssemblyAsm();
                this.elements.output.textContent = lines.join("\n");
            }
        });
    }

    // === UI Update Methods ===
    updateSimulationState() {
        // TODO: Update running/stopped status, flow states
    }

    updateMachineState() {
        // TODO: Update registers, PC, WP, instruction display
    }

    updateStatusBits() {
        // TODO: Update status register bit display
    }

    /**
     * Update FPS/IPS and instruction count display
     * @param {number} fps
     * @param {number} ips
     * @param {number} instructionCount
     */
    updatePerformanceMetrics(fps, ips, instructionCount) {
        // TODO: Update FPS/IPS display
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
        // TODO: Show errors in error area
    }

    /**
     * Show error message
     * @param {string} message
     */
    showError(message) {
        // TODO: Show error message in error area
    }

    /**
     * Format a value as hex
     * @param {number} value
     * @param {number} [digits=4]
     * @returns {string}
     */
    formatHex(value, digits = 4) {
        // TODO: Format value as hex string
        return value.toString(16).padStart(digits, '0');
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
