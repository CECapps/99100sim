// @ts-check

/*global number_to_hex */

/**
 * Memory: Byte and Word access simulation in Big Endian format.
 *
 * Nothing fancy here.  Update events are dispatched for UI update purposes.
 **/
export class Memory {
    #buffer;

    constructor() {
        this.#buffer = new DataView(new ArrayBuffer(2 ** 16));
    }

    reset() {
        this.#buffer = new DataView(new ArrayBuffer(2 ** 16));
    }

    getDV() { return this.#buffer; }

    /** @param {number} offset */
    getByte(offset) {
        const val = this.#buffer.getUint8(offset);
        return val;
    }

    /** @param {number} offset */
    getWord(offset) {
        if (offset % 2 == 1) {
            offset--;
        }
        const val = this.#buffer.getUint16(offset, /* force BE */ false);
        return val;
    }

    /**
     * @param {number} offset
     * @param {number} value
     **/
    setByte(offset, value) {
        this.#buffer.setUint8(offset, value);
        //window.dispatchEvent(new CustomEvent('memory_updated'));
    }

    /**
     * @param {number} offset
     * @param {number} value
     **/
    setWord(offset, value) {
        if (offset % 2 == 1) {
            offset--;
        }

        const clamped_value = value > 0xFFFF ? value - 0xFFFF : (value < 0 ? value + 0xFFFF : value);
        if (value != clamped_value) {
            if (value !== undefined) {
                console.error(`setWord out of range value >${number_to_hex(value)}, value clamped to 0x${number_to_hex(clamped_value)}`, value, clamped_value);
                throw new Error(`setWord out of range value.  Uncaught overflow?`);
            } else {
                throw new Error(`setWord got undefined value somehow.  There be bugs!`);
            }
        }

        const clamped_offset = offset > 0xFFFF ? offset - 0xFFFF : (offset < 0 ? offset + 0xFFFF : offset);
        if (offset != clamped_offset) {
            if (offset !== undefined) {
                console.error(`setWord out of range OFFSET 0x${number_to_hex(value)}, clamped to 0x${number_to_hex(clamped_offset)}`, offset, clamped_offset);
                throw new Error(`setWord out of range OFFSET.  Uncaught overflow?`);
            } else {
                throw new Error(`setWord got undefined OFFSET somehow.  There be bugs!`);
            }
        }

        this.#buffer.setUint16(clamped_offset, clamped_value, /* force BE */ false);
        //window.dispatchEvent(new CustomEvent('memory_updated'));
    }
}
