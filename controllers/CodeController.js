import { Asm } from '../classes/Asm.js';

/**
 * CodeController - Manages assembly source code and compilation process
 *
 * Encapsulates:
 * - Current assembly source code management
 * - Assembly process orchestration using the existing Asm class
 * - Assembly results and error reporting
 * - Available file list management
 * - Source code loading operations

*   **`CodeController` Events Emitted:**
    *   `sourceCodeChanged`: `detail: { code: string, filename: string | null, oldCode: string }`
        *   *Purpose:* Signals the source code content or filename has changed.
        *   *Expected Listener(s):* `CodeEditorUIComponent` (to update the text area, filename display).
    *   `assemblyCompleted`: `detail: { success: boolean, result: any | null, errors: Array<{message: string, line: number}>, isEmpty?: boolean, sourceCode: string }`
        *   *Purpose:* Signals the assembly process has finished.
        *   *Expected Listener(s):* `CodeEditorUIComponent` (to display errors or the assembled output). app.js (to trigger loading of assembled bytes into the simulation memory if successful).
    *   `assemblyError`: `detail: { error: Error, sourceCode?: string }`
        *   *Purpose:* Signals an error occurred during the assembly process itself (not just assembly language errors).
        *   *Expected Listener(s):* app.js or `CodeEditorUIComponent` (for error display).
    *   `availableFilesLoaded`: `detail: { files: string[] }`
        *   *Purpose:* Signals the list of available assembly files has been fetched.
        *   *Expected Listener(s):* `CodeEditorUIComponent` (to populate the file picker).
    *   `fileLoadError`: `detail: { error: Error, operation: string, filename?: string }`
        *   *Purpose:* Signals an error occurred while trying to load a file list or a specific file.
        *   *Expected Listener(s):* app.js or `CodeEditorUIComponent` (for error display).
    *   `fileLoaded`: `detail: { filename: string, content: string }`
        *   *Purpose:* Signals a specific assembly file has been successfully loaded.
        *   *Expected Listener(s):* `CodeEditorUIComponent` (to update codebox and filename display; implicitly triggers `sourceCodeChanged`).

 */
export class CodeController extends EventTarget {
    /**
     * @constructor
     */
    constructor() {
        super();
        // Assembly processor instance
        this.asm = new Asm();

        // Source code state
        this.sourceCode = '';
        /** @type {string|null} */
        this.filename = null;

        // Assembly state
        this.assemblyResult = null;
        /** @type {Array<{message: string, line: number}>} */
        this.assemblyErrors = [];
        this.isAssembled = false;

        // Available files
        /** @type {string[]} */
        this.availableFiles = [];
        this.filesLoaded = false;

    }

    // === Source Code Management ===

    /**
     * Set the source code content
     * @param {string} code - The assembly source code
     * @param {string|null} filename - Optional filename for the source code
     * @returns {void}
     */
    setSourceCode(code, filename = null) {
        const oldCode = this.sourceCode;
        this.sourceCode = code;
        this.filename = filename;

        this.dispatchEvent(new CustomEvent('sourceCodeChanged', {
            detail: {
                code: this.sourceCode,
                filename: this.filename,
                oldCode
            }
        }));

        // Auto-assemble
        this.assemble();
    }

    /**
     * Get current source code
     * @returns {Object} Object containing code and filename properties
     */
    getSourceCode() {
        return {
            code: this.sourceCode,
            filename: this.filename
        };
    }

    /**
     * Clear source code
     * @returns {void}
     */
    clearSourceCode() {
        this.setSourceCode('', null);
    }

    // === Assembly Operations ===

    /**
     * Assemble the current source code
     * @returns {*} The assembly result or null if assembly failed
     */
    assemble() {
        try {
            // Clear previous results
            this.assemblyErrors = [];
            this.assemblyResult = null;
            this.isAssembled = false;

            if (!this.sourceCode.trim()) {
                this.dispatchEvent(new CustomEvent('assemblyCompleted', {
                    detail: {
                        success: true,
                        result: null,
                        errors: [],
                        isEmpty: true
                    }
                }));
                return null;
            }

            // Set source in assembler
            this.asm.setLines(this.sourceCode);

            // Process assembly
            const result = this.asm.process();

            // Get any errors
            this.assemblyErrors = this.asm.getErrors ? this.asm.getErrors() : [];

            if (this.assemblyErrors.length === 0) {
                this.assemblyResult = result;
                this.isAssembled = true;

                this.dispatchEvent(new CustomEvent('assemblyCompleted', {
                    detail: {
                        success: true,
                        result: this.assemblyResult,
                        errors: [],
                        sourceCode: this.sourceCode
                    }
                }));
            } else {
                this.dispatchEvent(new CustomEvent('assemblyCompleted', {
                    detail: {
                        success: false,
                        result: null,
                        errors: this.assemblyErrors,
                        sourceCode: this.sourceCode
                    }
                }));
            }

            return this.assemblyResult;

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.assemblyErrors = [{ message: errorMessage, line: 0 }];

            this.dispatchEvent(new CustomEvent('assemblyError', {
                detail: { error, sourceCode: this.sourceCode }
            }));

            throw error;
        }
    }

    /**
     * Get assembly result as bytes
     * @returns {ArrayBuffer|null} The assembled bytes or null if not available
     */
    getAssemblyBytes() {
        if (!this.isAssembled || !this.assemblyResult) {
            return null;
        }

        try {
            return this.asm.toBytes();
        } catch (error) {
            this.dispatchEvent(new CustomEvent('assemblyError', {
                detail: { error }
            }));
            return null;
        }
    }

    /**
     * Get assembly result as ASM format
     * @returns {string[]} The assembled ASM format as an array of lines (empty if not available)
     */
    getAssemblyAsm() {
        if (!this.isAssembled || !this.assemblyResult) {
            return [];
        }

        try {
            return this.asm.toAsm();
        } catch (error) {
            this.dispatchEvent(new CustomEvent('assemblyError', {
                detail: { error }
            }));
            return [];
        }
    }

    // === File Management ===

    /**
     * Load list of available assembly files
     * @returns {Promise<string[]>} Promise that resolves to array of available filenames
     */
    async loadAvailableFiles() {
        const DEFAULT_LIST = ["asm/default.asm"];
        let files = null;
        let error = null;
        try {
            const response = await fetch('./asmfiles.php');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            files = await response.json();
            if (!Array.isArray(files) || !files.includes("asm/default.asm")) {
                throw new Error("asmfiles.php did not return a valid file list including asm/default.asm");
            }
        } catch (err) {
            error = err;
            files = DEFAULT_LIST;
        }
        this.availableFiles = files;
        this.filesLoaded = true;
        this.dispatchEvent(new CustomEvent('availableFilesLoaded', {
            detail: { files: this.availableFiles }
        }));
        if (error) {
            this.dispatchEvent(new CustomEvent('fileLoadError', {
                detail: { error, operation: 'loadAvailableFiles' }
            }));
        }
        return this.availableFiles;
    }

    /**
     * Load a specific assembly file
     * @param {string} filename - Name of the file to load
     * @returns {Promise<string>} Promise that resolves to the file content
     */
    async loadFile(filename) {
        try {
            const response = await fetch(`./${filename}`); // @FIXME security lol
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const content = await response.text();
            this.setSourceCode(content, filename);

            this.dispatchEvent(new CustomEvent('fileLoaded', {
                detail: { filename, content }
            }));

            return content;

        } catch (error) {
            this.dispatchEvent(new CustomEvent('fileLoadError', {
                detail: { error, operation: 'loadFile', filename }
            }));
            throw error;
        }
    }

    // === State Query Methods ===

    /**
     * Get available files list
     * @returns {Object} Object containing files array and loaded boolean
     */
    getAvailableFiles() {
        return {
            files: [...this.availableFiles],
            loaded: this.filesLoaded
        };
    }

    // === Utility Methods ===

    /**
     * Check if code can be assembled
     * @returns {boolean} True if source code is available for assembly
     */
    canAssemble() {
        return this.sourceCode.trim().length > 0;
    }

    /**
     * Check if assembly result is available
     * @returns {boolean} True if assembly was successful and has no errors
     */
    hasValidAssembly() {
        return this.isAssembled && this.assemblyErrors.length === 0 && this.assemblyResult !== null;
    }

    /**
     * Get error count
     * @returns {number} Number of assembly errors
     */
    getErrorCount() {
        return this.assemblyErrors.length;
    }

}