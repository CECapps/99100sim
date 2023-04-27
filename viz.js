// @ts-check
"use strict";

/* * /
import { Simulation } from "./classes/Simulation";
/* */

var viz_needs_redraw = false;
function viz_redraw_init() {
    window.requestAnimationFrame(viz_redraw);
}

function viz_request_redraw() {
    viz_needs_redraw = true;
}

function viz_redraw () {
    if (viz_needs_redraw) {
        const vizel = window.document.getElementById('viz');
        if ( !(vizel instanceof HTMLDivElement)) {
            throw new Error();
        }
        update_viz(vizel);
        viz_needs_redraw = false;
    }
    window.requestAnimationFrame(viz_redraw);
}


/** @param {HTMLDivElement} vizel */
function update_viz(vizel) {
    /*
    const word_count = 32768;
    const start_word_count_inclusive = 0;
    const end_word_count_inclusive = 0x7FFF;
    const words_per_row = 64;
    const total_rows = 512;
    const pixel_size = 6;
    */

    const word_count = 0x0900; // That means it'll STOP here.
    const words_per_row = 32;
    const pixel_size = 12;
    const start_word_count_inclusive = 0;
    // Calculated, leave alone.
    const end_word_count_inclusive = word_count;
    const total_rows = Math.ceil((word_count - start_word_count_inclusive) / words_per_row);

    /** @type {Simulation} */
    const sim = Reflect.get(window, 'sim'); // TIHI

    vizel.innerHTML = '';
    vizel.appendChild(
        create_memory_visualizer(
            sim.state.getMemoryDataView(),
            start_word_count_inclusive,
            end_word_count_inclusive,
            words_per_row,
            total_rows,
            pixel_size
        )
    );
}

/**
 * create_memory_visualizer:
 * Returns a canvas element that visualizes a section of memory as 16x16 pixel blocks
 *
 * This function was created by ChatGPT.  The above text was how it answered
 * when I asked it how to give credit.  I used ChatGPT because I keep forgetting
 * how <canvas> works and I was lazy (a good trait, says Larry Wall).  The
 * code is the result of the following prompt, with later edits to generalize
 * the results slightly. Excluding variable naming changes, this is almost
 * exactly as-provided.
 *
 ** 1:
 * I'm building a vintage computer emulator in Javascript.  I want to provide a
 * visualization of memory in the running emulator.  The memory is interfaced
 * with through a DataView to a 65536-byte ArrayBuffer that is logically divided
 * into 32768 16-bit words.  I want to see each of those 16-bit words transformed
 * into a color using RGB565.
 ** 2:
 * Please write a Javascript function that takes a DataView as an argument,
 * creates a <canvas> element, draws the DataView into the <canvas> as described
 * above, then returns the <canvas>.
 ** 3:
 * I'd like each word in the DataView to be represented by a 2x2 box on the
 * canvas instead of a single pixel.  Please adjust the code to make the canvas
 * large enough to hold all 32768 words at that drawing size.
 ** 4:
 * I'd like each row in the canvas to represent 64 16-bit words.  This means that
 * we'll end up with 512 rows of 64 columns.  Please adjust the code to take the
 * DataView and render it into a <canvas> so that each 16-bit word takes up a 2x2
 * spot on the canvas.
 ** 5:
 * Let's define some constants.  Use these constants to create a new version of
 * the DataView visualization:
 *
 * const WORDS_IN_DATAVIEW = 32768; // (pretend this exists - ed)
 * const WORDS_PER_VISUAL_ROW = 64;
 * const TOTAL_VISUAL_ROWS = 512; // 32768 words total, divided into rows
 *                                // of 64 words each = 512 rows
 * Given these constants and the desire to render each word as a square of 2x2
 * pixels, calculate the correct size of the <canvas>, and then process all of
 * the words in the DataView onto the canvas using RGB565.
 **
 *
 * This function does what it says on the tin.
 *
 * @param {DataView} memory
 * @param {number} start_word_count_inclusive
 * @param {number} end_word_count_inclusive
 * @param {number} words_per_row
 * @param {number} total_rows
 * @param {number} pixel_size
 **/
function create_memory_visualizer(
    memory,
    start_word_count_inclusive,
    end_word_count_inclusive,
    words_per_row,
    total_rows,
    pixel_size
) {
    const WORDS_PER_VISUAL_ROW = words_per_row;
    const TOTAL_VISUAL_ROWS = total_rows;
    const BLOCK_SIZE = pixel_size;

    const canvas = document.createElement('canvas');
    canvas.width = WORDS_PER_VISUAL_ROW * BLOCK_SIZE;
    canvas.height = TOTAL_VISUAL_ROWS * BLOCK_SIZE;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
        throw new Error();
    }
    const image_data = ctx.createImageData(canvas.width, canvas.height);

    for (let i = start_word_count_inclusive; i <= end_word_count_inclusive; i++) {
        const word = memory.getUint16(i * 2);
        const red = (word >> 11) << 3;
        const green = ((word >> 5) & 0x3f) << 2;
        const blue = (word & 0x1f) << 3;

        const row = Math.floor(i / WORDS_PER_VISUAL_ROW);
        const col = i % WORDS_PER_VISUAL_ROW;
        const blockX = col * BLOCK_SIZE;
        const blockY = row * BLOCK_SIZE;

        for (let j = 0; j < BLOCK_SIZE; j++) {
            for (let k = 0; k < BLOCK_SIZE; k++) {
                const pixelX = blockX + k;
                const pixelY = blockY + j;
                const pixel_offset = ((pixelY * canvas.width) + pixelX) * 4;
                image_data.data[pixel_offset] = red;
                image_data.data[pixel_offset + 1] = green;
                image_data.data[pixel_offset + 2] = blue;
                image_data.data[pixel_offset + 3] = 255;
            }
        }
    }

    ctx.putImageData(image_data, 0, 0);
    return canvas;
}
