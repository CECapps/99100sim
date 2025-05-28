/**
 * CodeController - Manages assembly source code and compilation process
 *
 * Encapsulates:
 * - Current assembly source code management
 * - Assembly process orchestration using the existing Asm class
 * - Assembly results and error reporting
 * - Available file list management
 * - Source code loading/saving operations
 */
export class CodeController extends EventTarget {
    /**
     * @param {new() => any} asmClass - The Asm class constructor
     */
    constructor(asmClass) {
        super();

        // Assembly processor instance
        this.asm = new asmClass();

        // Source code state
        this.sourceCode = '';
        /** @type {string|null} */
        this.filename = null;
        this.isDirty = false;

        // Assembly state
        this.assemblyResult = null;
        /** @type {Array<{message: string, line: number}>} */
        this.assemblyErrors = [];
        this.isAssembled = false;

        // Available files
        /** @type {string[]} */
        this.availableFiles = [];
        this.filesLoaded = false;

        // Assembly configuration
        this.autoAssemble = true;
        this.assemblyOptions = {};
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
        this.isDirty = true;

        this.dispatchEvent(new CustomEvent('sourceCodeChanged', {
            detail: {
                code: this.sourceCode,
                filename: this.filename,
                oldCode,
                isDirty: this.isDirty
            }
        }));

        // Auto-assemble if enabled
        if (this.autoAssemble) {
            this.assemble();
        }
    }

    /**
     * Get current source code
     * @returns {Object} Object containing code, filename, and isDirty properties
     */
    getSourceCode() {
        return {
            code: this.sourceCode,
            filename: this.filename,
            isDirty: this.isDirty
        };
    }

    /**
     * Clear source code
     * @returns {void}
     */
    clearSourceCode() {
        this.setSourceCode('', null);
    }

    /**
     * Mark source as clean (saved)
     * @returns {void}
     */
    markClean() {
        this.isDirty = false;

        this.dispatchEvent(new CustomEvent('sourceStateChanged', {
            detail: { isDirty: this.isDirty }
        }));
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
     * @returns {string|null} The assembled ASM format string or null if not available
     */
    getAssemblyAsm() {
        if (!this.isAssembled || !this.assemblyResult) {
            return null;
        }

        try {
            return this.asm.toAsm();
        } catch (error) {
            this.dispatchEvent(new CustomEvent('assemblyError', {
                detail: { error }
            }));
            return null;
        }
    }

    // === File Management ===

    /**
     * Load list of available assembly files
     * @returns {Promise<string[]>} Promise that resolves to array of available filenames
     */
    async loadAvailableFiles() {
        try {
            const response = await fetch('./asmfiles.php');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const files = await response.json();
            this.availableFiles = Array.isArray(files) ? files : [];
            this.filesLoaded = true;

            this.dispatchEvent(new CustomEvent('availableFilesLoaded', {
                detail: { files: this.availableFiles }
            }));

            return this.availableFiles;

        } catch (error) {
            this.dispatchEvent(new CustomEvent('fileLoadError', {
                detail: { error, operation: 'loadAvailableFiles' }
            }));
            throw error;
        }
    }

    /**
     * Load a specific assembly file
     * @param {string} filename - Name of the file to load
     * @returns {Promise<string>} Promise that resolves to the file content
     */
    async loadFile(filename) {
        try {
            const response = await fetch(`./asm/${filename}`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const content = await response.text();
            this.setSourceCode(content, filename);
            this.markClean(); // File just loaded, not dirty

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

    /**
     * Save current source code to a file (placeholder for future implementation)
     * @param {string|null} filename - Optional filename to save as
     * @returns {Promise<void>} Promise that resolves when save is complete
     */
    async saveFile(filename = null) {
        // This would require server-side implementation
        // For now, just mark as clean and dispatch event
        /** @type {string|null} */
        const saveFilename = filename || this.filename;

        // TODO: Implement actual file saving when server endpoint exists
        this.filename = saveFilename;
        this.markClean();

        this.dispatchEvent(new CustomEvent('fileSaved', {
            detail: { filename: saveFilename, content: this.sourceCode }
        }));
    }

    // === Configuration ===

    /**
     * Set auto-assembly mode
     * @param {boolean} enabled - Whether to enable auto-assembly
     * @returns {void}
     */
    setAutoAssemble(enabled) {
        this.autoAssemble = enabled;

        this.dispatchEvent(new CustomEvent('autoAssembleChanged', {
            detail: { enabled: this.autoAssemble }
        }));
    }

    /**
     * Set assembly options
     * @param {Object} options - Assembly configuration options
     * @returns {void}
     */
    setAssemblyOptions(options) {
        this.assemblyOptions = { ...this.assemblyOptions, ...options };

        this.dispatchEvent(new CustomEvent('assemblyOptionsChanged', {
            detail: { options: this.assemblyOptions }
        }));
    }

    // === State Query Methods ===

    /**
     * Get current assembly state
     * @returns {Object} Object containing isAssembled, hasErrors, errors, and result properties
     */
    getAssemblyState() {
        return {
            isAssembled: this.isAssembled,
            hasErrors: this.assemblyErrors.length > 0,
            errors: [...this.assemblyErrors],
            result: this.assemblyResult
        };
    }

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

    /**
     * Get file state
     * @returns {Object} Object containing filename, isDirty, and hasContent properties
     */
    getFileState() {
        return {
            filename: this.filename,
            isDirty: this.isDirty,
            hasContent: this.sourceCode.length > 0
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

    /**
     * Get assembly size in bytes
     * @returns {number} Size of assembled code in bytes, or 0 if not available
     */
    getAssemblySize() {
        if (!this.hasValidAssembly()) {
            return 0;
        }

        try {
            const bytes = this.getAssemblyBytes();
            return bytes ? bytes.byteLength : 0;
        } catch {
            return 0;
        }
    }
}