// @ts-check
/**
 * StatusRegister: Record keeping and a few controls for the processor.
 *
 * Some of these can be set anywhere, some set only by certain things.  Some of
 * these have meaning only to certain ops, while some of these have meaning only
 * inside the flow state machine or on the memory bus.
 *
 * We have 12 total individual bit fields and a 4-bit interrupt limit ("mask").
 * These are all stored together in hardware, but for convenience and safety
 * reasons you can't bitwise manipulate the interrupt mask through this interface.
 *
 * Code documentation for each status bit can be found in the following locations:
 * - LGT: @TODO
 * - AGT: @TODO
 * - EQUAL: @TODO
 * - CARRY: @TODO
 * - OVERFLOW: @TODO
 * - PARITY: @TODO
 * - XOP: @TODO
 * - PRIVILEGED: @TODO
 * - MAPFILE_ENABLED: @TODO
 * - MEMORY_MAPPED: @TODO
 * - OVERFLOW_INTERRUPT_ENABLED: @TODO
 * - WCS_ENABLED: @TODO
 *
 * You can find discussion of the interrupt mask in InterruptList.
 *
 * The status register is a core component of the system and discussion of it
 * is spread throughout the official documentation. You can start with section
 * 2.4.2 on page 10, which also points to section 10.5.
 * "2250077-9701 990/12 Assembly Language Programmer's Guide"
 * <http://www.bitsavers.org/pdf/ti/990/assembler/2250077-9701A_-12asm_May79.pdf>
 **/
export class StatusRegister {
    #bitfield = 0;

    reset() {
        this.#bitfield = 0;
    }

    getRegisterString() { return this.#bitfield.toString(2).padStart(16, '0'); }

    /** @param {number} bit_index */
    getBit(bit_index) {
        if (bit_index > 12) { console.error('Do not touch the interrupt mask like that!'); return 0; }
        return (this.#bitfield & (1 << bit_index)) >>> bit_index;
    }

    /** @param {number} bit_index */
    setBit(bit_index) {
        if (bit_index > 12) { console.error('Do not touch the interrupt mask like that!'); return; }
        this.#bitfield = (this.#bitfield | (1 << bit_index));
    }

    /** @param {number} bit_index */
    resetBit(bit_index) {
        if (bit_index > 12) { console.error('Do not touch the interrupt mask like that!'); return; }
        this.#bitfield = (this.#bitfield & ~(1 << bit_index));
    }

    getInterruptMask() {
        return this.#bitfield >>> 12;
    }

    /** @param {number} new_mask */
    setInterruptMask(new_mask) {
        this.#bitfield &= (2 ** 12) - 1;
        this.#bitfield |= (new_mask & 15) << 12;
    }

    static get LGT()                        { return 0; }
    static get AGT()                        { return 1; }
    static get EQUAL()                      { return 2; }
    static get CARRY()                      { return 3; }
    static get OVERFLOW()                   { return 4; }
    static get PARITY()                     { return 5; }
    static get XOP()                        { return 6; }
    static get PRIVILEGED()                 { return 7; }
    static get MAPFILE_ENABLED()            { return 8; }
    static get MEMORY_MAPPED()              { return 9; }
    static get OVERFLOW_INTERRUPT_ENABLED() { return 10; }
    static get WCS_ENABLED()                { return 11; }

    /**
     * @param {string} bit_name
     * @returns {number|null}
    **/
    static getBitIndexFromOpBitName(bit_name) {
        // These are the string abbreviations I used in the master spreadsheet.
        // They made their way into the opcode data.
        /** @TODO I'm not actually sure if need this list ... yet ... if ever... */
        /** @type Object<string,number> */
        const names_to_consts = {
            // Lgt Agt Eq Car Ov Par XOP Priv Mf MM Oint WCS IntMask
            'lgt':  this.LGT,
            'agt':  this.AGT,
            'eq':   this.EQUAL,
            'car':  this.CARRY,
            'ov':   this.OVERFLOW,
            'par':  this.PARITY,
            'xop':  this.XOP,
            'priv': this.PRIVILEGED,
            'mf':   this.MAPFILE_ENABLED,
            'mm':   this.MEMORY_MAPPED,
            'oint': this.OVERFLOW_INTERRUPT_ENABLED,
            'wcs':  this.WCS_ENABLED
        };
        if (!names_to_consts[bit_name.toLowerCase()]) {
            return null;
        }
        return names_to_consts[bit_name.toLowerCase()];
    }
}
