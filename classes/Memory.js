// @ts-check

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
        //console.debug(`getByte ${offset.toString(16).padStart(4,"0")} = ${val.toString(16).padStart(2,"0")}`);
        return val;
    }

    /** @param {number} offset */
    getWord(offset) {
        if (offset % 2 == 1) {
            offset--;
        }
        const val = this.#buffer.getUint16(offset, /* force BE */ false);
        //console.debug(`getWord ${offset.toString(16).padStart(4,"0")} = ${val.toString(16).padStart(4,"0")}`);
        return val;
    }

    /**
     * @param {number} offset
     * @param {number} value
     **/
    setByte(offset, value) {
        //console.debug(`setByte ${offset.toString(16).padStart(4,"0")} is now ${value.toString(16).padStart(2,"0")}`);
        this.#buffer.setUint8(offset, value);
        window.dispatchEvent(new CustomEvent('memory_updated'));
    }

    /**
     * @param {number} offset
     * @param {number} value
     **/
    setWord(offset, value) {
        //console.debug(`setWord ${offset.toString(16).padStart(4,"0")} is now ${value.toString(16).padStart(4,"0")}`);
        if (offset % 2 == 1) {
            offset--;
        }

        const clamped_value = value > 0xFFFF ? value - 0xFFFF : (value < 0 ? value + 0xFFFF : value);
        if (value != clamped_value) {
            if (value !== undefined) {
                /** @FIXME This should be an error, but until overflow stuff is in this is too noisy. */
                //console.error(`setWord out of range value 0x${value.toString(16).toUpperCase()}, value clamped to 0x${clamped_value.toString(16).toUpperCase()}`, value, clamped_value);
            } else {
                throw new Error(`setWord got undefined value somehow.  There be bugs!`)
            }
        }

        const clamped_offset = offset > 0xFFFF ? offset - 0xFFFF : (offset < 0 ? offset + 0xFFFF : offset);
        if (offset != clamped_offset) {
            if (offset !== undefined) {
                /** @FIXME This should be an error, but until overflow stuff is in this is too noisy. */
                // console.error(`setWord out of range OFFSET 0x${value.toString(16).toUpperCase()}, clamped to 0x${clamped_offset.toString(16).toUpperCase()}`, offset, clamped_offset);
            } else {
                throw new Error(`setWord got undefined OFFSET somehow.  There be bugs!`)
            }
        }

        this.#buffer.setUint16(clamped_offset, clamped_value, /* force BE */ false);
        window.dispatchEvent(new CustomEvent('memory_updated'));
    }
};
