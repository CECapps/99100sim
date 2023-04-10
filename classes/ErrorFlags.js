// @ts-check

/**
 * Error Flags: Extra Interrupt 2 error information accessed through the CRU
 *
 * tl;dr: The 99100 processors store extra information about certain exceptions
 *        in a "register" available at a specific CRU address.  This register
 *        can be read/written by anything.  We exist only in the context of a
 *        SimulationState.  All accesses should be through the SimulationState.
 *
 * Notes:
 *
 * I had to write all this stuff out to make sense of it, so now you have to
 * read all of it.  I don't make the rules, keep reading.
 *
 * On the 990/4, 990/10, and 990/12 minicomputers, the Error Flags are accessed
 * through the CRU bus.  The memory mapper and programmer panel are optional
 * hardware features that can impact the results.
 *
 * - The 990/4 and 990/10 programmer panel can be addressed at CRU base 0x1FE0.
 *   - A memory parity error can be cleared by set/resetting bit 12.
 * - The 990/4 and 990/10 memory mapper can be addressed at CRU base 0x1FA0.
 *   - If bit 0 is unset, it's a memory parity error
 *   - If bit 0 is set, it's a memory write-protection error.
 *     - Clear either of those errors by setting *ANY* bit after the base address.
 *     - This behavior is 990/4-specific but the 990/10 supports it.
 *     - Given that the 990/12 describes a very different memory mapper interface,
 *       I'm willing to be that this backwards compatibility was not implemented.
 * - With the 990/12 memory mapper, a memory map error sets bit 4.
 *   - Clear it by unsetting bit.
 *   - Also clears corresponding bit 11 in the actual error flags.
 * - The "real" error flag register can be addressed at CRU base 0x1FC0.
 *   Common to the 990/4, 990/10, and 990/12:
 *   - If bit 11 is set, there's a memory mapping error, "address beyond map."
 *   - If bit 12 is set, there's a memory error on the TILINE bus, "memory data error."
 *   - If bit 13 is set, the pending opcode is illegal.
 *   - If bit 14 is set, the pending opcode causes a privilege violation.
 *   - If bit 15 is set, there's been a timeout reading the TILINE bus, "unimplemented memory was addressed."
 *   Exclusive to the 990/12:
 *   - If bit 4 is set, there's been a math overflow.
 *   - If bit 5 is set, the 12ms hardware test clock is at fault.
 *     - See section 2.4.7.
 *   - If bit 6 is set, a breakpoint has been encountered.
 *     - See section 2.4.6.
 *   - If bit 7 is set, there's been a stack overflow.
 *     - Pretty impressive for a machine with no main stack.  The stack operations
 *       are set up in way that makes them difficult to overflow.
 *   - If bit 8 is set, there's been a write attempt to write-protected memory.
 *   - If bit 9 is set, there's been a execute attempt in execute-protected memory.
 *
 * Now, we don't actually care about most of that, because we're only simulating
 * the 99100 processor itself, not any of the other hardware.  The 99100 defines
 * only the following error flags:
 * - PRIVOP at 0x1FDC (0x1FDC - 0x1FC0 = 28 / 2 = error bit 14)
 * - ILLOP at 0x1FDA (0x1FDA - 0x1FC0 = 26 / 2 = error bit 13)
 * - AF at 0x1FC8 (0x1FC8 - 0x1FC0 = 8 / 2 = error bit 4)
 * The docs also say that these three are set when setting 0x1FC0 through 0x1FC7.
 * The docs also say that PRIVOP and ILLOP are set when setting 0x1FD3 or 0x1FD4.
 * We don't care about that either, for now.
 *
 * In the end we only care about the 99100 subset: 4, 13, and 14.
 *
 * See section 4.4 starting on page 27 of "TMS99105A and TMS99110A 16-Bit Microprocessors Preliminary Data Manual"
 * <https://archive.org/details/bitsavers_tiTMS9900TA16BitMicroprocessorsPreliminaryDataManu_7820978>
 *
 * See also section 3.89.5.4 on page 3-106 of "0943441-9701 990 9900 Assembly Language Programmer's Guide"
 * <https://archive.org/details/bitsavers_ti990tx990blyLanguageProgrammingGuideOct78_23407084>
 *
 * See also section 2.4.4 on page 2-5 of "2250077-9701 990/12 Assembly Language Programmer's Guide"
 * <http://www.bitsavers.org/pdf/ti/990/assembler/2250077-9701A_-12asm_May79.pdf>
 **/
export class ErrorFlags {
    /** @type {boolean[]} */
    #flags = [];

    reset() {
        this.#flags = [];
    }

    /**
     * @param {number} flag_id
     **/
    #isLegalBit(flag_id) {
        if (flag_id == 4) {
            return true;
        }
        if (flag_id == 13) {
            return true;
        }
        if (flag_id = 14) {
            return true;
        }
        return false;
    }

    /**
     * @param {number} flag_id
     **/
    getFlag(flag_id) {
        if (!this.#isLegalBit(flag_id)) {
            console.error(`getFlag called with illegal bit ${flag_id}.  Calling code has a bug!`);
            return false;
        }
        if (Object.hasOwn(this.#flags, flag_id)) {
            return this.#flags[flag_id];
        }
        return false;
    }

    /**
     * @param {number} flag_id
     **/
    setFlag(flag_id) {
        if (!this.#isLegalBit(flag_id)) {
            console.error(`setFlag called with illegal bit ${flag_id}.  Calling code has a bug!`);
            return;
        }
        this.#flags[flag_id] = true;
    }

    /**
     * @param {number} flag_id
     **/
    resetFlag(flag_id) {
        if (!this.#isLegalBit(flag_id)) {
            console.error(`resetFlag called with illegal bit ${flag_id}.  Calling code has a bug!`);
            return;
        }
        this.#flags[flag_id] = false;
    }

};
