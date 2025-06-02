/*

# CanvasMemoryVizController Specification

## Purpose
A simplified memory visualization controller that renders a configurable region of 16-bit machine memory to a canvas using RGB565 color encoding. Designed for direct, synchronous rendering without internal scheduling or animation frame management.

## Constructor Parameters
- `simulation`: Reference to the Simulation instance for memory access
- `canvas`: HTML Canvas element for rendering output
- `canvasWidth`: Canvas width in pixels, 512 default
- `canvasHeight`: Canvas height in pixels, 512 default

## Configuration Properties
- `memoryStartWord`: Starting 16-bit word address (inclusive), 0x0 default
- `memoryEndWord`: Ending 16-bit word address (inclusive), 0xFFFF default
- `wordsPerRow`: Number of 16-bit words to display per row (must be multiple of 16)

## Core Responsibilities

### Memory Access
- Access simulation memory through the provided Simulation instance
- Read 16-bit words from the configured memory region
- Handle memory bounds checking and invalid addresses

### Rendering Calculations
- Calculate total words in the configured memory region
- Determine optimal pixel size to fit the memory region within canvas dimensions
- Ensure pixels remain square (same width and height)
- Calculate rows and columns needed for the memory layout
- Maintain 16-bit word alignment for row breaks and memory wrapping

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
    in bitwise operations.  We're running on a little-endian platform, does it matter?

### Canvas Operations
- Clear canvas before each render
- Create and populate ImageData for efficient pixel manipulation
- Write completed ImageData to canvas context
- Handle canvas context errors and invalid states

## Public Methods

### `render()`
- Perform complete memory visualization render to canvas
- Synchronous operation, no callbacks or promises
- Assumes external scheduling for when to call

### `setMemoryRegion(startWord, endWord)`
- Update the memory region to visualize
- Validate that region is properly aligned to 16-bit boundaries
- Recalculate rendering parameters for new region

### `setWordsPerRow(wordsPerRow)`
- Update the number of words displayed per row
- Enforce multiple-of-16 requirement
- Recalculate rendering layout

### `getConfiguration()`
- Return current configuration parameters
- Include calculated values like pixel size and total words

## Error Handling
- Graceful handling of invalid memory addresses -> clamp to the 16-bit range
- Canvas context unavailable scenarios -> on create, not on render; our Canvas never goes away
- Configuration validation (word alignment, positive dimensions)
- Simulation instance availability checks

## Performance Considerations
- Direct pixel manipulation using ImageData
- Minimal object allocation during render operations
- No internal state tracking beyond configuration
- No automatic redraw scheduling or throttling

## Memory Layout Requirements
- All memory addressing in 16-bit words, not bytes
- Row breaks must occur on 16-word boundaries
- Memory region start/end must be 16-word aligned
- Visualization wrapping respects 16-bit word boundaries

## Integration Expectations
- Controller instance created once and reused
- External code responsible for calling `render()` at appropriate times
- Configuration changes trigger immediate recalculation, not automatic redraw
- No event emission or callback registration

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

        // Create ImageData for the exact drawing area
        const imageData = this.ctx.createImageData(drawingWidth, drawingHeight);
        const data = imageData.data; // Uint8ClampedArray: R,G,B,A, R,G,B,A, ...

        let currentWordAddress = this.memoryStartWord;

        for (let row = 0; row < this.numRows; row++) {
            for (let col = 0; col < this.numCols; col++) {
                if (currentWordAddress > this.memoryEndWord) {
                    break; // Stop if we've rendered all requested words
                }

                const byteAddress = currentWordAddress * 2;
                let wordValue = 0;

                // Read the actual word value from memory
                if (byteAddress >= 0 && byteAddress + 1 < memoryView.byteLength) {
                    wordValue = memoryView.getUint16(byteAddress, false); // Big-endian
                }

                const [r, g, b] = this._rgb565ToRgb888(wordValue);

                // Fill the pixelSize x pixelSize block for this word
                for (let yOffset = 0; yOffset < this.pixelSize; yOffset++) {
                    for (let xOffset = 0; xOffset < this.pixelSize; xOffset++) {
                        const pixelX = col * this.pixelSize + xOffset;
                        const pixelY = row * this.pixelSize + yOffset;
                        const index = (pixelY * drawingWidth + pixelX) * 4;
                        data[index] = r;
                        data[index + 1] = g;
                        data[index + 2] = b;
                        data[index + 3] = 255; // Alpha
                    }
                }
                currentWordAddress++;
            }
            if (currentWordAddress > this.memoryEndWord) {
                break;
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
