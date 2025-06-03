/*

# CanvasMemoryVizController Specification

## Purpose
A simplified memory visualization controller that renders a caller-specified, fixed region of 16-bit machine memory to a canvas using RGB565 color encoding. The number of words displayed per row is fixed at 32. Canvas dimensions are determined automatically by the controller. Designed for direct, synchronous rendering without internal scheduling or animation frame management.

## Constructor Parameters
- `simulation`: Reference to the Simulation instance for memory access
- `canvas`: HTML Canvas element for rendering output
- `memoryStartWord`: Starting 16-bit word address (inclusive) for the visualization
- `memoryEndWord`: Ending 16-bit word address (inclusive) for the visualization

## Core Responsibilities

### Memory Access
- Access simulation memory through the provided Simulation instance
- Read 16-bit words from the memory region specified at construction
- Handle memory bounds checking and invalid addresses (clamping and alignment during construction)
  - Once constructed we don't need to worry about that

### Rendering Calculations
- Calculate total words in the memory region specified at construction
- Determine optimal pixel size to fit the memory region; the controller automatically sets canvas dimensions
- Ensure pixels remain square (same width and height)
- Calculate rows and columns needed for the memory layout (wordsPerRow is fixed at 32)
- Maintain 16-bit word alignment for row breaks (wordsPerRow is fixed at 32, a multiple of 16)

### Color Conversion
- Convert 16-bit memory words to RGB565 color values
- Map RGB565 to standard RGB for canvas pixel data
- Handle endianness considerations for 16-bit word reading
  - The hardware we are emulating is big-endian.
  - The most significant bit of the most significant byte is the leftmost, position 0
  - The least significant bit of the most significant byte is at position 7,
  - The most significant bit of the least significant byte is at position 8,
  - And the least significant bit of the least significant byte is at position 15.
  - Be sure our RGB565 algorithm considers how Javascript presents numbers to us
    in bitwise operations. We're running on a little-endian platform, does it matter?

### Canvas Operations
- Set canvas dimensions (width and height) automatically during construction based on the memory region and pixel size.
- Clear canvas before each render
- Create and populate ImageData for efficient pixel manipulation
- Write completed ImageData to canvas context
- Handle canvas context errors and invalid states context acquisition during construction
  - Again assume it will work correctly post-construction.

## Public Methods

### `render()`
- Perform complete memory visualization render to canvas
- Synchronous operation, no callbacks or promises
- Assumes external scheduling for when to call

## Error Handling
- Graceful handling of invalid memory addresses provided at construction (e.g., `memoryStartWord`, `memoryEndWord`) -> clamp to the 16-bit range and ensure 16-word alignment.
- Canvas context unavailable scenarios -> checked during construction; may throw an error.
- Validation of constructor parameters (`memoryStartWord`, `memoryEndWord` for range and 16-word alignment).
- Simulation instance availability checks (during construction).

## Performance Considerations
- Direct pixel manipulation using ImageData
- Minimal object allocation during render operations
- Minimal internal state (parameters set at construction are fixed)
- No automatic redraw scheduling or throttling

## Memory Layout Requirements
- All memory addressing in 16-bit words, not bytes
- Row breaks occur on 16-word boundaries (as `wordsPerRow` is fixed at 32).
- Memory region start/end (provided at construction) must be 16-word aligned.
- Visualization wrapping respects 16-bit word boundaries.

## Integration Expectations
- Controller instance created once and reused
- External code responsible for calling `render()` at appropriate times
- Initial parameters are set at construction and cannot be changed thereafter.
- No event emission or callback registration (Error handling during construction might throw exceptions).

# Refactoring Plan for CanvasMemoryVizController

### 1. Constructor Parameter Changes
- **Remove**: `canvasWidth` and `canvasHeight` optional parameters
- **Add**: `memoryStartWord` and `memoryEndWord` as required parameters
- **Update**: Constructor signature to `constructor(simulation, canvas, memoryStartWord, memoryEndWord)`

### 2. Canvas Sizing Logic Refactor
- **Remove**: Manual canvas dimension setting from constructor parameters
- **Add**: Automatic canvas dimension calculation during `_validateAndRecalculateConfiguration()`
- **Update**: Canvas sizing to be based on memory region size and optimal pixel size
- **Modify**: Pixel size calculation to determine canvas dimensions rather than fit within existing dimensions

### 3. Configuration Management Cleanup
- **Remove**: `setMemoryRegion()` method entirely
- **Remove**: `setWordsPerRow()` method entirely
- **Remove**: `getConfiguration()` method entirely
- **Fix**: `wordsPerRow` to be constant at 32 (remove variable assignment)
- **Remove**: Dynamic `wordsPerRow` validation and error handling

### 4. Internal State Simplification
- **Remove**: `wordsPerRow` as a configurable property (make it a constant)
- **Remove**: Event emission and error handling for configuration changes
- **Remove**: EventTarget inheritance (no longer needed without dynamic configuration)
- **Simplify**: `_validateAndRecalculateConfiguration()` to only handle memory bounds and canvas sizing

### 5. Validation Logic Updates
- **Update**: Memory region validation to use constructor parameters instead of default values
- **Remove**: `wordsPerRow` validation logic (since it's now fixed at 32)
- **Remove**: Configuration change event dispatching
- **Simplify**: Error handling to only cover construction-time validation

### 6. Canvas Dimension Calculation Logic
- **Reverse**: Current logic that fits content to canvas → Change to size canvas to fit content
- **Add**: Logic to calculate optimal canvas dimensions based on:
  - Total words to display
  - Fixed 32 words per row
  - Reasonable pixel size (likely starting with 1px and scaling up as needed)
- **Update**: Pixel size calculation to prioritize content fit rather than canvas fit

### 7. Method Cleanup
- **Verify**: `render()` method remains unchanged (should work with new sizing approach)
- **Remove**: All setter methods and their associated validation
- **Remove**: Getter methods for configuration

### 8. Documentation Updates
- **Update**: JSDoc comments to reflect new constructor signature
- **Remove**: Documentation for removed methods
- **Update**: Internal comments that reference dynamic configuration

### 9. Error Handling Simplification
- **Remove**: Runtime configuration error handling
- **Keep**: Construction-time validation errors
- **Remove**: Custom event dispatching entirely

### 10. Testing Considerations
- **Update**: Constructor calls throughout codebase to include memory region parameters
- **Remove**: Any code that calls removed setter/getter methods
- **Verify**: Canvas sizing works correctly with automatic dimension calculation

This refactoring will significantly simplify the class by removing all dynamic configuration capabilities and making it a pure construction-time configured, render-only controller.

*/

// @ts-check
/** @typedef {import('../classes/Simulation.js').Simulation} Simulation */

export class CanvasMemoryVizController extends EventTarget {
    /** @type {Simulation} */
    simulation;
    /** @type {HTMLCanvasElement} */
    canvas;
    /** @type {CanvasRenderingContext2D} */
    ctx;

    // Configuration
    /** @type {number} */
    memoryStartWord;
    /** @type {number} */
    memoryEndWord;
    /** @type {number} */
    wordsPerRow;

    // Calculated rendering parameters
    /** @type {number} */
    totalWordsToDisplay = 0;
    /** @type {number} */
    pixelSize = 1; // Size of each "word" block in pixels
    /** @type {number} */
    numCols = 0;
    /** @type {number} */
    numRows = 0;

    /**
     * @param {Simulation} simulation
     * @param {HTMLCanvasElement} canvas
     * @param {number} [canvasWidth=512]
     * @param {number} [canvasHeight=512]
     */
    constructor(simulation, canvas, canvasWidth = 512, canvasHeight = 512) {
        super();

        if (!simulation) {
            throw new Error("CanvasMemoryVizController: Simulation instance is required.");
        }
        if (!canvas) {
            throw new Error("CanvasMemoryVizController: Canvas element is required.");
        }
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            throw new Error("CanvasMemoryVizController: Could not get 2D context from canvas.");
        }

        this.simulation = simulation;
        this.canvas = canvas;
        this.ctx = ctx;

        this.canvas.width = canvasWidth;
        this.canvas.height = canvasHeight;

        this.memoryStartWord = 0x0000;
        this.memoryEndWord = 0x08ff;
        this.wordsPerRow = 32; // Default, must be a multiple of 16

        this._validateAndRecalculateConfiguration();
    }

    _validateAndRecalculateConfiguration() {
        // Validate and clamp memory region
        this.memoryStartWord = Math.max(0, Math.min(0xFFFF, Math.floor(this.memoryStartWord)));
        this.memoryEndWord = Math.max(this.memoryStartWord, Math.min(0xFFFF, Math.floor(this.memoryEndWord)));

        // Ensure start and end are 16-word aligned (0x10 words = 32 bytes)
        // The spec says "Row breaks must occur on 16-word boundaries" and "Memory region start/end must be 16-word aligned"
        this.memoryStartWord = Math.floor(this.memoryStartWord / 16) * 16;
        this.memoryEndWord = Math.ceil((this.memoryEndWord + 1) / 16) * 16 - 1;
        this.memoryEndWord = Math.min(0xFFFF, this.memoryEndWord); // Ensure it doesn't exceed max
         if (this.memoryEndWord < this.memoryStartWord) { // Handle edge case if initial end was small
            this.memoryEndWord = this.memoryStartWord + 15;
        }


        // Validate wordsPerRow
        if (this.wordsPerRow <= 0 || this.wordsPerRow % 16 !== 0) {
            const errorMsg = `CanvasMemoryVizController: wordsPerRow (${this.wordsPerRow}) must be a positive multiple of 16. Defaulting to 64.`;
            console.warn(errorMsg);
            this.dispatchEvent(new CustomEvent('vizConfigurationError', {
                detail: {
                    error: new Error(errorMsg),
                    operation: 'validateWordsPerRow',
                    fallbackUsed: true
                }
            }));
            this.wordsPerRow = 64;
        }
        this.wordsPerRow = Math.max(16, this.wordsPerRow); // Ensure at least 16

        this.totalWordsToDisplay = (this.memoryEndWord - this.memoryStartWord) + 1;

        if (this.totalWordsToDisplay <= 0) {
            this.pixelSize = 1;
            this.numCols = 0;
            this.numRows = 0;
            return;
        }

        this.numCols = this.wordsPerRow;
        this.numRows = Math.ceil(this.totalWordsToDisplay / this.wordsPerRow);

        // Calculate optimal pixel size to fit within canvas dimensions
        const availableWidth = this.canvas.width;
        const availableHeight = this.canvas.height;

        let pixelSizeX = 1;
        if (this.numCols > 0) {
            pixelSizeX = Math.floor(availableWidth / this.numCols);
        }

        let pixelSizeY = 1;
        if (this.numRows > 0) {
            pixelSizeY = Math.floor(availableHeight / this.numRows);
        }

        this.pixelSize = Math.max(1, Math.min(pixelSizeX, pixelSizeY)); // Ensure square pixels and at least 1x1
    }

    /**
     * Converts a 16-bit RGB565 color to an [R, G, B] array (0-255).
     * TMS99105 is big-endian. Javascript bitwise operations are on numbers,
     * which are effectively platform-endian for storage but consistent in operation.
     * DataView.getUint16(offset, false) gets big-endian.
     * RRRRR GGGGGG BBBBB
     * @param {number} rgb565Word - The 16-bit RGB565 color value.
     * @returns {[number, number, number]} [R, G, B]
     */
    _rgb565ToRgb888(rgb565Word) {
        const r5 = (rgb565Word & 0xF800) >> 11; // Top 5 bits for Red
        const g6 = (rgb565Word & 0x07E0) >> 5;  // Middle 6 bits for Green
        const b5 = rgb565Word & 0x001F;         // Bottom 5 bits for Blue

        // Scale to 0-255
        const r8 = (r5 * 255 + 15) / 31; // (r5 / 31) * 255
        const g8 = (g6 * 255 + 31) / 63; // (g6 / 63) * 255
        const b8 = (b5 * 255 + 15) / 31; // (b5 / 31) * 255

        return [Math.floor(r8), Math.floor(g8), Math.floor(b8)];
    }

    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        const memoryView = this.simulation.state.getMemoryDataView();

        // Calculate the actual drawing area based on numCols, numRows, and pixelSize
        const drawingWidth = this.numCols * this.pixelSize;
        const drawingHeight = this.numRows * this.pixelSize;

        // If drawing area is zero, no need to proceed further.
        // The canvas has already been cleared.
        if (drawingWidth === 0 || drawingHeight === 0) {
            return;
        }

        // Create ImageData for the exact drawing area
        const imageData = this.ctx.createImageData(drawingWidth, drawingHeight);
        const data = imageData.data; // Uint8ClampedArray: R,G,B,A, R,G,B,A, ...

        let currentWordAddress = this.memoryStartWord;
        const ps = this.pixelSize; // Cache pixelSize

        if (ps === 1) {
            // Optimized path for pixelSize = 1
            // In this case, drawingWidth is equivalent to this.numCols
            for (let row = 0; row < this.numRows; row++) {
                // Calculate starting index in imageData for the current row of words
                let pixelIndex = (row * drawingWidth) * 4; // drawingWidth is numCols here

                for (let col = 0; col < this.numCols; col++) {
                    if (currentWordAddress > this.memoryEndWord) {
                        break; // Stop if we've rendered all requested words
                    }

                    const byteAddress = currentWordAddress * 2;
                    const wordValue = memoryView.getUint16(byteAddress, false); // Big-endian
                    const [r, g, b] = this._rgb565ToRgb888(wordValue);

                    data[pixelIndex++] = r;
                    data[pixelIndex++] = g;
                    data[pixelIndex++] = b;
                    data[pixelIndex++] = 255; // Alpha

                    currentWordAddress++;
                }
                if (currentWordAddress > this.memoryEndWord) {
                    break;
                }
            }
        } else {
            // Optimized path for pixelSize > 1
            // Here, drawingWidth is this.numCols * ps
            for (let row = 0; row < this.numRows; row++) { // Iterates over rows of "word blocks"
                const blockTopActualPixelY = row * ps; // Top Y coordinate of the current block of words in imageData

                for (let col = 0; col < this.numCols; col++) { // Iterates over columns of "word blocks"
                    if (currentWordAddress > this.memoryEndWord) {
                        break; // Stop if we've rendered all requested words
                    }

                    const byteAddress = currentWordAddress * 2;
                    const wordValue = memoryView.getUint16(byteAddress, false); // Big-endian
                    const [r, g, b] = this._rgb565ToRgb888(wordValue);

                    const blockLeftActualPixelX = col * ps; // Left X coordinate of the current word block in imageData

                    // Fill the ps x ps pixel block for this word
                    for (let yOffset = 0; yOffset < ps; yOffset++) {
                        const currentActualPixelY = blockTopActualPixelY + yOffset; // Actual Y scanline in imageData
                        // Calculate starting byte index for the current scanline within the block
                        let currentScanlineByteIndex = (currentActualPixelY * drawingWidth + blockLeftActualPixelX) * 4;

                        for (let xOffset = 0; xOffset < ps; xOffset++) { // Fill ps pixels horizontally
                            data[currentScanlineByteIndex++] = r;
                            data[currentScanlineByteIndex++] = g;
                            data[currentScanlineByteIndex++] = b;
                            data[currentScanlineByteIndex++] = 255; // Alpha
                        }
                    }
                    currentWordAddress++;
                }
                if (currentWordAddress > this.memoryEndWord) {
                    break;
                }
            }
        }
        this.ctx.putImageData(imageData, 0, 0);
    }

    /**
     * @param {number} startWord
     * @param {number} endWord
     */
    setMemoryRegion(startWord, endWord) {
        const newStart = Math.max(0, Math.min(0xFFFF, Math.floor(startWord)));
        const newEnd = Math.max(newStart, Math.min(0xFFFF, Math.floor(endWord)));

        if (newStart === this.memoryStartWord && newEnd === this.memoryEndWord) {
            return; // No change
        }

        this.memoryStartWord = newStart;
        this.memoryEndWord = newEnd;
        this._validateAndRecalculateConfiguration();
    }

    /**
     * @param {number} wordsPerRow
     */
    setWordsPerRow(wordsPerRow) {
        const newWordsPerRow = Math.max(1, Math.floor(wordsPerRow));
        if (newWordsPerRow === this.wordsPerRow) {
            return; // No change
        }
        if (newWordsPerRow % 16 !== 0) {
            const errorMsg = `CanvasMemoryVizController: setWordsPerRow attempted with ${newWordsPerRow}, which is not a multiple of 16. Operation aborted.`;
            console.warn(errorMsg);
            this.dispatchEvent(new CustomEvent('vizConfigurationError', {
                detail: {
                    error: new Error(errorMsg),
                    operation: 'setWordsPerRow',
                    fallbackUsed: false
                }
            }));
            return;
        }
        this.wordsPerRow = newWordsPerRow;
        this._validateAndRecalculateConfiguration();
    }

    getConfiguration() {
        return {
            memoryStartWord: this.memoryStartWord,
            memoryEndWord: this.memoryEndWord,
            wordsPerRow: this.wordsPerRow,
            totalWordsToDisplay: this.totalWordsToDisplay,
            pixelSize: this.pixelSize,
            numCols: this.numCols,
            numRows: this.numRows,
            canvasWidth: this.canvas.width,
            canvasHeight: this.canvas.height,
        };
    }
}
