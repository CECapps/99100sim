/*

# Introduction

## Preface

This is the main application file.  It does the thing.
It's 2025, use ES$YEAR techniques that work in all browsers.
Keep it readable and broken down logically.  When adding comments,
they're for the "why", not the "what" or the "how" (unless the how
is weird).  Avoid excessive functional patterns and callback hell.

# Outline

## Purpose
This app.js will serve as the central coordination point for the TMS99105 simulator, replacing all inline JavaScript currently embedded within index.html. It will provide a clean separation between:
- Core simulation logic (CPU emulation, memory management)
- Application control logic (execution control, code assembly, visualization)
- UI presentation (HTML DOM updates, event handling)

This separation will enable multiple interface types (web, CLI, TUI) to use the same underlying simulation and control logic.

## What app.js Replaces
Based on the current implementation in index.html and related files, this refactoring will:
- Consolidate global state variables currently scattered across multiple files
- Replace direct DOM event listeners with proper controller-based event delegation
- Move simulation control logic from UI-specific files into controller classes
- Eliminate global references to the Simulation object and other classes
- Replace `window.dispatchEvent` custom events with proper observer patterns
- Centralize initialization that's currently spread across multiple DOMContentLoaded handlers

## App.js Structure Requirements

### Initialization
- **Module Import Structure**: Proper ES module imports without attaching to global window
- **Controller Initialization**: Set up the SimulationController, CodeController, and VisualizationController
- **UI Binding**: Connect UI components to controllers through event listeners
- **Feature Detection**: Check for required browser APIs before initialization

### Controller Layer
- **SimulationController**: Manages the Simulation instance and execution state (running, modes, metrics)
- **CodeController**: Manages assembly source code, compilation, and error reporting
- **VisualizationController**: Manages memory visualization configuration and rendering requests

### Event System
- **Controller Events**: Controllers emit events when their state changes
- **UI Subscriptions**: UI components subscribe to controller events to update the display
- **Command Pattern**: UI interactions trigger controller methods rather than directly modifying state

### DOM Interaction Layer
- **UI Component Modules**: Separate modules for different UI sections (registers, memory, controls)
- **Element Selection**: Cached DOM references to avoid repeated queries
- **Content Updates**: UI components update DOM based on controller state, not direct simulation access

### API/Data Layer
- **Fetch Wrappers**: Consistent handling of external file loading (ASM examples)
- **Error Handling**: Centralized error processing through the controllers

## Migration Approach
1. **Create Controllers**: Implement controller classes to encapsulate related state and logic
2. **Convert to ES Modules**: Refactor all files to use proper import/export syntax
3. **Remove Global State**: Replace window.sim and other globals with controller instances
4. **Implement UI Components**: Create UI modules that interact only with controllers
5. **Centralize Initialization**: Move all setup code into app.js module initialization

## Integration Points
- **HTML Data Attributes**: Use data attributes for UI component identification instead of IDs
- **Controller References**: Pass controller instances to UI components that need them
- **Event Subscriptions**: UI components subscribe to specific controller events
- **Module Structure**: Clear dependencies between modules with no circular references

This architecture ensures a clean separation between simulation logic, control logic, and UI presentation, enabling multiple interface implementations with shared core functionality.

# Impact on Other Files

The refactoring of `app.js` to centralize application logic and adopt ES modules will significantly impact other JavaScript files and inline scripts in `index.html`.

### `simui.js` (Simulator UI)
- **Current State**: Manages simulator state variables (e.g., `running`, `slow_mode`), directly manipulates numerous DOM elements for displaying registers, status, PC, WP, etc. (via `gebid_stfu`), handles button click events for simulator controls, contains the main simulation loop (`run_frame_callback`), and calculates FPS/IPS. It also directly instantiates and uses the global `Simulation` object (`sim`) and `Asm` for code assembly. It calls `viz_request_redraw` from `viz.js`.
- **Impact**:
    - **State Management**: Global variables like `sim`, `running`, `slow_mode`, `fast_mode`, `inst_execution_count` will be managed by `app.js`.
    - **DOM Manipulation**: Functions like `update_simui` will be refactored. `app.js` will manage state, and `simui.js` (or new UI components) will receive data/events from `app.js` to update the DOM. Direct DOM access via `gebid_stfu` will be minimized or localized to specific view components.
    - **Event Handling**: Button event listeners (e.g., `step_state_button_onclick`, `run_button_onclick`) will be registered and handled by `app.js`, which will then call appropriate logic (potentially still residing in refactored `simui.js` modules) or update the central state.
    - **Simulation Loop**: The `run_frame_callback` and its associated `requestAnimationFrame` logic will likely move to `app.js` or be controlled by it. `app.js` will manage the simulation stepping (`sim.step()`, `sim.stepInstruction()`).
    - **Assembly Logic**: `assemble_codebox` will be orchestrated by `app.js`. The `Asm` class will be imported and used within `app.js` or a dedicated assembler module.
    - **Modularity**: `simui.js` will be broken into smaller, focused ES modules. For example, UI update logic, control handlers, and FPS/IPS display could become separate modules imported by `app.js`.
    - **Dependencies**: Direct use of global `Simulation` and `Asm` instances will be replaced by instances managed by `app.js` and passed as needed, or by importing these classes directly where appropriate. Calls to `viz_request_redraw` will be replaced by `app.js` coordinating updates between simulation state and visualization.

### `viz.js` (Visualization)
- **Current State**: Handles rendering the memory visualization on a canvas. It uses a global `viz_needs_redraw` flag, a `requestAnimationFrame` loop (`viz_redraw`), and directly accesses the global `sim` object (`Reflect.get(window, 'sim')`) to get memory data. `update_viz` and `create_memory_visualizer` are key functions.
- **Impact**:
    - **Data Flow**: `viz.js` will become an ES module. `app.js` will import it and call a rendering function, passing the necessary data (e.g., `DataView` from the `Simulation` instance's state) and the target DOM element. The global `sim` access will be removed.
    - **Control Flow**: The `viz_needs_redraw` flag and `requestAnimationFrame` loop might be managed by `app.js`, or `viz.js` could expose an update function that `app.js` calls when the memory state changes.
    - **DOM Interaction**: `viz.js` will still be responsible for creating and updating its canvas, but `app.js` will likely provide the container element.
    - **Modularity**: `create_memory_visualizer` will remain the core rendering logic, but its invocation will be controlled by `app.js`.

### `txt2asm.js` (Text Area Enhancements)
- **Current State**: Provides tab-to-space conversion and automatic resizing for the `#codebox` textarea. It attaches event listeners (`keydown`, `focus`, `blur`) directly.
- **Impact**:
    - **Modularity**: `txt2asm.js` will become an ES module. Its functions (`tab_fixer_onload`, `txt2asm_init`, `resize_textarea`) will be exported.
    - **Initialization**: `app.js` will import this module and call an initialization function to set up the event listeners on the relevant textarea, or `app.js` will manage the event listeners and delegate to functions from this module.
    - **Scope**: Its functionality is specific to UI interaction with the code editor and will likely remain self-contained but invoked/managed by `app.js`.

### `utils.js`
- **Current State**: Included via `<script>` tag in `index.html` but its content is not provided. Assumed to contain utility functions.
- **Impact**:
    - **Modularity**: Will be converted into an ES module. Functions will be exported and imported by `app.js` or other modules as needed. This will eliminate any global utility functions.

### Inline Scripts in `index.html`
- **Current State**:
    - A `<script type="module">` block imports classes (`OpInfo`, `Simulation`, `Instruction`, `Asm`, `InstructionDecode`) and assigns them to the global `window` object. It also instantiates `window.sim = new Simulation()`.
    - Multiple `window.addEventListener('DOMContentLoaded', ...)` calls set up initializers for `tab_fixer`, `txt2asm`, `viz_redraw`, button listeners, fetching ASM files, and `simui` setup.
    - Event listeners like `window.addEventListener('memory_updated', viz_request_redraw)` are set up.
- **Impact**:
    - **Module Imports**: `app.js` will become the primary ES module. It will directly import `OpInfo`, `Simulation`, etc., from their respective `.js` files. Stashing classes on `window` will be eliminated. The `Simulation` instance will be created and managed within `app.js`.
    - **Initialization**: All `DOMContentLoaded` logic will be consolidated into `app.js`. `app.js` will handle feature detection, configuration, setting up UI components, event listeners, and fetching initial data.
    - **Event Management**: Custom events like `'memory_updated'` will be dispatched and listened to within the `app.js` ecosystem or replaced by direct function calls/state updates.
    - **File Loading**: The `fetch` logic for `asmfiles.php` and loading selected ASM files into the `codebox` will be moved into the API/Data Layer of `app.js`.

### General Implications
- **ES Modules**: All JavaScript files (`simui.js`, `viz.js`, `txt2asm.js`, `utils.js`, and class files like `Simulation.js`) will be converted to use ES module syntax (`import`/`export`). `index.html` will load `app.js` as a module: `<script type="module" src="./js/app.js"></script>`.
- **Centralized Control**: `app.js` will be responsible for initializing the application, managing the main `Simulation` instance, orchestrating UI updates, handling user interactions, and coordinating between different modules.
- **Elimination of Globals**: Reliance on global variables (especially `window.sim` and globally scoped functions from `simui.js`, `viz.js`) will be removed in favor of module imports, dependency injection (passing instances/data), and a centralized state managed by `app.js`.

This restructuring aims to create a more modular, maintainable, and testable codebase where `app.js` acts as the central coordinator, and other files become focused, reusable modules.

## Global State Analysis and Encapsulation Plan

To achieve proper separation of concerns and enable multiple UI interfaces (HTML/DOM, CLI, TUI), all global state must be categorized and encapsulated into appropriate logical components. This analysis identifies current global variables and their proper ownership.

### Simulation Core State
These variables represent the fundamental state of the emulated machine and belong in the `Simulation` class or related core simulation modules:

- **`window.sim`** (Simulation instance): The primary simulation object containing CPU state, memory, registers, etc. This is core simulation state and should be managed by `app.js` as the primary simulation instance.
- **Memory contents**: Currently managed within the `Simulation` class via `DataView`, this remains in the simulation core.
- **Register values**: CPU registers (R0-R15) are part of the simulation core state.
- **Status register**: CPU status flags are simulation core state.
- **Program Counter (PC) and Workspace Pointer (WP)**: Core CPU state registers.
- **Execution flow state**: Current instruction execution state managed by `ExecutionProcess`.

### Simulation Control State
These variables control the execution behavior of the simulation and represent the interface between UI commands and simulation operation:

- **`running`** (boolean): Whether the simulation is currently executing. This is simulation control state, not UI state - it affects simulation behavior regardless of UI type.
- **`slow_mode`** (boolean): Execution speed mode affecting simulation stepping behavior. This is simulation control state.
- **`fast_mode`** (boolean): High-speed execution mode for simulation. This is simulation control state.
- **`fast_mode_steps`** (number): Instructions per frame in fast mode. This is simulation configuration/control state.

### Simulation Metrics State
These variables track simulation performance and execution statistics:

- **`inst_execution_count`** (number): Total instructions executed. This is simulation metrics state.
- **`frame_count`** (number): Total animation frames processed. This is simulation metrics state.
- **`run_start_time`** (number|null): Timestamp when execution began. This is simulation metrics state.
- **FPS/IPS tracking variables** (`last_fps_update_ts`, `last_execution_count`, `last_frame_count`, `running_fps_avg`, `running_ips_avg`): These are simulation performance metrics.

### Code/Assembly State
These variables manage the source code and assembly process:

- **Codebox content**: The assembly source code. This is application state (not simulation state) - it's the source that gets assembled into the simulation.
- **Assembly errors**: Results from the assembly process. This is application state.
- **Available ASM files**: List of loadable assembly files from the server. This is application state.

### Visualization State
These variables control the memory visualization rendering:

- **`viz_needs_redraw`** (boolean): Flag indicating visualization needs updating. This is visualization subsystem state.
- **Visualization configuration** (word_count, words_per_row, pixel_size, etc.): These are visualization configuration parameters.

### HTML/DOM-Specific State
These variables are purely related to HTML/DOM interface and should not exist in other UI implementations:

- **Cached DOM element references**: Elements retrieved via `gebid_stfu` and similar functions. These are HTML UI implementation details.
- **Animation frame IDs**: RequestAnimationFrame handles for the HTML rendering loop. These are HTML UI implementation details.
- **Event listener references**: For cleanup purposes in the HTML UI.

### Mixed/Border State
These variables span multiple concerns and need careful consideration:

- **Error display state**: Currently errors are shown in HTML elements, but error tracking itself is application logic that should be available to all UI types.
- **Configuration/preferences**: Settings that affect both simulation behavior and UI presentation.

### Encapsulation Strategy

#### Simulation Controller
Create a centralized `SimulationController` class that encapsulates:
- Management of the core `Simulation` instance (which already contains `SimulationState`)
- Execution control (running, speed modes, stepping)
- Performance metrics tracking
- Execution statistics

This class should provide:
- Methods to start/stop/step simulation
- Methods to query execution state and metrics
- Events for state changes that UI can listen to
- No direct DOM dependencies

Note: This builds upon the existing `Simulation` and `SimulationState` classes rather than replacing them. The `SimulationState` class already handles core CPU state (registers, memory, PC, WP, etc.), while this controller will manage the execution aspects.

#### Code Management Controller
Create a `CodeController` class that encapsulates:
- Current assembly source code management
- Assembly process orchestration using the existing `Asm` class
- Assembly results and error reporting
- Available file list management
- Source code loading/saving operations

This class should provide:
- Methods for code management (load, save, assemble)
- Methods for file operations and listings
- Events for assembly state changes
- No direct DOM dependencies

#### Visualization Controller
Create a `VisualizationController` class that encapsulates:
- Redraw flags and rendering timing
- Visualization configuration
- Coordinating memory data access for visualization
- Visualization parameter management

This class should provide:
- Methods to request updates
- Methods to configure visualization parameters
- Access to memory data for rendering via the `Simulation` instance
- No direct DOM dependencies

Note: This controller will work with the existing `create_memory_visualizer` function but manage when and how it's invoked.

#### UI Implementation Layer
The HTML/DOM UI implementation will be separated into modules that:
- Listen to events from the controllers
- Update DOM elements based on controller state
- Translate user interactions into controller method calls
- Manage DOM-specific concerns (element caching, animation frames)

This separation allows for:
- **CLI Interface**: Direct interaction with controllers without DOM concerns
- **TUI Interface**: Terminal-based UI using the same controllers
- **Web Interface**: Current HTML/DOM implementation refactored to use controllers
- **Testing**: Logic can be tested independently of UI implementation

### Utility Functions
The existing utility functions in `utils.js` will be:
- Converted to proper ES module exports
- No longer attached to the global window object
- Imported directly by modules that need them
- Potentially grouped into logical categories (binary operations, string formatting, etc.)

### State Flow Architecture
1. **User Input** → UI Layer → Controller methods
2. **State Changes** → Controller events → UI Layer updates
3. **Simulation Data** → Controllers → UI Layer rendering
4. **Cross-Component Communication** → Through controllers and events, never direct UI-to-UI communication

This architecture ensures that simulation logic, application logic, and UI presentation are cleanly separated, enabling multiple interface implementations while maintaining a single source of truth for application state.

---

# State at Interruption

Time has passed, and it's time to continue with this project here is a summary
of where we last were, according to an LLM assistant:

> **Overall Goal:** Transform the existing TMS99105 simulator codebase into a modular, maintainable application with a clear separation of concerns, driven by a central coordinator (app.js) and leveraging ES modules.
>
> **1. Establish Core Application Structure (app.js):**
>
> *   **What:** Implement the `TMS99105App` class in app.js to serve as the central control point.
> *   **Why:** To consolidate application logic, manage controllers, and orchestrate UI updates, replacing scattered global state and direct DOM manipulation.
>
> **2. Convert Existing Code to ES Modules:**
>
> *   **What:** Refactor utils.js, viz.js, and txt2asm.js to use ES module syntax (`import`/`export`).
> *   **Why:** To eliminate global variables and dependencies, enabling modularity and reusability.
>
> **3. Define UI Component Contracts:**
>
> *   **What:** Create basic UI component classes (`SimulationUIComponent`, `CodeEditorUIComponent`, `VisualizationUIComponent`) that define the interface for UI updates and event handling.
> *   **Why:** To abstract UI-specific logic and enable a clear separation between the application core and the presentation layer.
>
> **4. Wire Up the Application:**
>
> *   **What:** Implement methods in app.js to:
>     *   Acquire references to DOM elements.
>     *   Instantiate controllers and UI components, passing necessary dependencies.
>     *   Bind UI events to controller methods.
>     *   Subscribe UI components to controller events for state updates.
> *   **Why:** To establish the data flow and interaction patterns between the UI, controllers, and the simulation core.
>
> **5. Migrate Functionality and Decommission Old Files:**
>
> *   **What:** Systematically move functionality from simui.js, viz.js, and txt2asm.js into the new controller-based architecture.
> *   **Why:** To eliminate reliance on the old global state and direct DOM manipulation, fully embracing the new modular design.
>
> **6. Finalize the HTML Structure:**
>
> *   **What:** Modify index.html to load app.js as a module and remove all inline scripts and direct script includes for the old files.
> *   **Why:** To ensure the application is driven by the new architecture and to eliminate any remnants of the old implementation.
>
> **7. Ensure Feature Parity and Polish:**
>
> *   **What:** Verify that all features of the original application are replicated in the new architecture, and then clean up, optimize, and document the code.
> *   **Why:** To maintain the existing functionality while improving the codebase's structure, maintainability, and testability.
>
> **8. Implement Memory Loading Post-Assembly:**
>
> *   **What:** Establish a mechanism for transferring the assembled code from the `CodeController` to the `Simulation`'s memory.
> *   **Why:** To complete the assembly and execution pipeline.
>
> This high-level plan outlines the key steps and their rationale, providing a roadmap for the refactoring process without specifying the detailed implementation steps.

# Going Forward

We are going to deviate from the specifics of the plan.  We're going to wire it
up backwards.  That is, we're first going to create a new HTML file, then we're
going to pull together the logic to make each individual interface element work,
one group at a time.


*/

// ============================================================================
// IMPLEMENTATION
// ============================================================================

// ES Module Imports
import { Simulation } from './classes/Simulation.js';
import { Asm } from './classes/Asm.js';
import { SimulationController } from './controllers/SimulationController.js';
import { CodeController } from './controllers/CodeController.js';
import { VisualizationController } from './controllers/VisualizationController.js';

// Application State
class TMS99105App {
    constructor() {
        // Controller instances
        this.simulationController = null;
        this.codeController = null;
        this.visualizationController = null;

        // UI component references
        this.uiComponents = new Map();

        // Application state
        this.isInitialized = false;
    }

    // ========================================================================
    // Initialization Methods
    // ========================================================================

    async init() {
        // Feature detection and browser compatibility checks
        // Create and configure controller instances
        // Set up UI component bindings
        // Register event listeners
        // Load initial state and configuration
    }

    createControllers() {
        // Instantiate Simulation and pass to SimulationController
        // Create CodeController with Asm class
        // Create VisualizationController
        // Wire up controller event listeners
    }

    setupUIComponents() {
        // Cache DOM element references
        // Create UI component modules for different sections
        // Register UI event listeners that delegate to controllers
    }

    bindControllerEvents() {
        // Subscribe to simulation state changes
        // Subscribe to code assembly events
        // Subscribe to visualization update events
        // Handle cross-controller communication
    }

    // ========================================================================
    // UI Event Delegation Methods
    // ========================================================================

    handleSimulationControls(event) {
        // Route simulation control button clicks to SimulationController
        // (step, run, stop, reset, speed mode changes)
    }

    handleCodeEditorEvents(event) {
        // Route code editor interactions to CodeController
        // (assembly, file loading, error display)
    }

    handleVisualizationEvents(event) {
        // Route visualization interactions to VisualizationController
        // (configuration changes, manual refresh)
    }

    // ========================================================================
    // API/Data Layer Methods
    // ========================================================================

    async fetchAvailableFiles() {
        // Load available ASM files from server
        // Update CodeController with file list
    }

    async loadAssemblyFile(filename) {
        // Fetch assembly file content
        // Update CodeController with loaded content
    }

    // ========================================================================
    // Error Handling
    // ========================================================================

    handleError(error, context) {
        // Centralized error processing
        // Emit error events for UI components to display
    }

    // ========================================================================
    // Cleanup Methods
    // ========================================================================

    destroy() {
        // Clean up event listeners
        // Dispose of animation frames
        // Clear controller references
    }
}

// ============================================================================
// UI Component Modules
// ============================================================================

class SimulationUIComponent {
    constructor(controller, elements) {
        // Store controller reference and cached DOM elements
    }

    update(state) {
        // Update DOM elements based on simulation state
        // (registers, PC, WP, status, performance metrics)
    }

    setupEventListeners() {
        // Register DOM event listeners for simulation controls
    }
}

class CodeEditorUIComponent {
    constructor(controller, elements) {
        // Store controller reference and cached DOM elements
    }

    update(state) {
        // Update DOM elements based on code state
        // (assembly errors, file list, editor enhancements)
    }

    setupEventListeners() {
        // Register DOM event listeners for code editor
    }
}

class VisualizationUIComponent {
    constructor(controller, elements) {
        // Store controller reference and cached DOM elements
    }

    update(state) {
        // Update visualization canvas based on memory state
    }

    setupEventListeners() {
        // Register DOM event listeners for visualization controls
    }
}

// ============================================================================
// Application Entry Point
// ============================================================================

async function initializeApp() {
    // Create main application instance
    // Initialize and start the application
    // Handle initialization errors
}

// DOM Content Loaded Handler
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

// Export for potential module usage
export { TMS99105App };
