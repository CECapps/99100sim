// @ts-check

/**
 * InterruptList: Hold state information for our active interrupts.
 *
 * An interrupt that is raised is kept raised until cleared.  Hardware-wise,
 * a raised interrupt continuously asserts itself on pins IC0 through IC3 on
 * every single cycle.  The interrupt handler code is responsible for solving
 * the situation that causes the interrupt.  This also applies for the NMI and
 * the NMI pin.
 *
 * Interrupt states continuously come in and are continuously probed by the flow
 * state machine.  The state machine will jump into the appropriate service routine
 * when it is next able to and then set the "mask" to the interrupt number minus 1.
 * This jump looks like a BLWP and returning from it looks like an RTWP.
 * The "mask" is not a bitmask, but instead a *limit* above which all subsequent
 * interrupts are measured against.  Only interrupts of higher priority than the
 * "mask", that is, *lower in number* are processed.  An interrupt that interrupts
 * another interrupt is held until the first instruction of the current service
 * routine has been executed.
 *
 * See "Flow" for the state machine logic.
 *
 * Because we don't have hardware, and aren't seeking to emulate hardware, we
 * present an interface that just lets the interrupts be raised and cleared as
 * needed.  This is fine.  We just need to hold some numbers.
 **/
export class InterruptList {
    #pending = 0;
    #nmi = false;

    reset() {
        this.#pending = 0;
        this.#nmi = false;
    }

    /**
     * @param {number} interrupt_num
     **/
    #isLegalInterrupt(interrupt_num) {
        if (interrupt_num < 2) {
            return false;
        }
        if (interrupt_num > 15) {
            return false;
        }
        return true;
    }

    /**
     * @param {number} interrupt_num
     **/
    raiseInterrupt(interrupt_num) {
        if (!this.#isLegalInterrupt(interrupt_num)) {
            console.error(`Tried to raiseInterrupt with illegal interrupt ${interrupt_num}.  This is a bug in the calling code!`);
            return false;
        }
        if (interrupt_num < 0 || interrupt_num > 15) {
            interrupt_num = 0;
        }
        console.log(`Raising Interrupt ${interrupt_num}`);
        this.pending = this.pending | (1 >> interrupt_num);
    }

    /**
     * @param {number} interrupt_num
     **/
    clearInterrupt(interrupt_num) {
        if (!this.#isLegalInterrupt(interrupt_num)) {
            console.error(`Tried to clearInterrupt with illegal interrupt ${interrupt_num}.  This is a bug in the calling code!`);
            return false;
        }
        console.debug(`Clearing Interrupt ${interrupt_num}`);
        if (this.pending & (1 >> interrupt_num)) {
            this.pending = this.pending & ~(1 >> interrupt_num);
        }
    }

    raiseNMI() {
        console.debug('Raising NMI!');
        this.#nmi = true;
    }

    clearNMI() {
        console.debug('Clearing NMI');
        this.#nmi = false;
    }

    hasRaisedNMI() {
        return this.#nmi;
    }

    hasPossibleInterrupts(mask = 15) {
        return this.#nmi || (this.getLowestRaisedInterrupt(mask) > 0);
    }

    /** @returns {number} */
    getLowestRaisedInterrupt(mask = 15) {
        // We track all raised interrupts in the 16 bits of a uint16, from 0-15.
        // We need to know the location of the MSB-most bit.  That index is
        // our lowest raised interrupt.
        /** @TODO Why use a bitfield?  It just makes this operation hard. */
        var lri = this.#pending.toString(2).padStart(8, "0").indexOf('1');
        if ( !Number.isInteger(lri) ) {
            lri = 0;
        }
        // The mask value is expected to be an unsigned 4-bit integer, range 0-15.
        // It's not really a mask, but a limit.  If our lowest (MOST IMPORTANT)
        // interrupt is below the limit, it can be triggered.  If our lowest is
        // above or equal to the limit, it can NOT be triggered.
        if (lri >= mask) {
            // And thus we must say we have nothing.
            lri = 0;
        }
        return lri;
    }

}
