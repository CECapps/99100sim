// @ts-check

import { Instruction } from "./Instruction.js";
import { SimulationState } from "./SimulationState.js";
import { StatusRegister } from "./StatusRegister.js";

export { ExecutionUnit, Format1Unit, Format2Unit };

/*global number_to_hex */

/**
 * ExecutionUnit: The part that actually does stuff.
 *
 * We're used by ExecutionProcess to actually run each Instruction.
 **/
class ExecutionUnit {

    /**
     * @type {Instruction}
     * @protected
     **/
    inst;

    /**
     * @type {SimulationState}
     * @protected
     **/
    simstate;

    /**
     * @param { Instruction } inst
     * @param { SimulationState } simstate
     **/
    constructor(inst, simstate) {
        this.inst = inst;
        this.simstate = simstate;
    }

    validateOpcode() { return false; }
    fetchOperands() { return false; }
    validateParams() { return false; }
    doParamsNeedPrivilege() { return false; }
    execute() { throw new Error('ExecutionUnit execute fallthrough'); }
    writeResults() { return false; }

    /**
     * @param {number} mode
     * @param {number} register_or_index
     **/
    resolveAddressingModeAndGet(mode, register_or_index) {
        //console.debug('resolveAddressingModeAndGet', mode, register_or_index);
        let register_value = 0;
        let operand_value = 0;

        const is_indirect_mode = mode == 1 || mode == 3;
        const is_symbolic_mode = mode == 2 && register_or_index == 0;
        const is_indexed_mode = mode == 2 && register_or_index > 0;
        const is_direct_mode = !is_symbolic_mode && !is_indexed_mode && !is_indirect_mode;

        if (!is_symbolic_mode) {
            register_value = this.simstate.getRegisterWord(register_or_index);
        }

        if (is_symbolic_mode) {
            // Our immediate source operand contains the memory address of our
            // actual value.
            operand_value = this.simstate.getWord(this.inst.getImmediateSourceValue());
        } else if (is_indexed_mode) {
            // Our immediate source operand contains a memory address.  We add
            // the value in our register to that memory address to get the real
            // pointer to the memory word that contains our source value.
            operand_value = this.simstate.getWord( this.inst.getImmediateSourceValue() + register_value );
        } else if (is_indirect_mode) {
            // Our register contains a pointer to the memory word that contains
            // our source value.
            operand_value = this.simstate.getWord(register_value);
            if (mode == 3) {
                // We're in autoinc mode, so autoinc here.  Yes, really, here.
                // If we need to care about the previous value of this register,
                // we're going to need to stash it away elsewhere.
                /** @FIXME per _F 3.2.3 this is supposed to inc by 1 if it's a byte op */
                let next_value = register_value + 2;
                while (next_value > 0xFFFF) {
                    // Nothing anywhere in the overflow register docs say that
                    // this operation triggers an overflow, so not doing that.
                    next_value -= 0xFFFF;
                }
                this.simstate.setRegisterWord(register_or_index, next_value);
            }
        } else if (is_direct_mode) {
            // Our register contains our source value.
            operand_value = register_value;
        } else {
            throw new Error('Impossible fallthrough');
        }

        return operand_value;
    }

    /**
     * @param {number} mode
     * @param {number} register_or_index
     * @param {number} new_value
     **/
    resolveAddressingModeAndSet(mode, register_or_index, new_value) {
        //console.debug('resolveAddressingModeAndSet', mode, register_or_index, new_value);
        const is_indirect_mode = mode == 1 || mode == 3;
        const is_symbolic_mode = mode == 2 && register_or_index == 0;
        const is_indexed_mode = mode == 2 && register_or_index > 0;
        const is_direct_mode = !is_symbolic_mode && !is_indexed_mode && !is_indirect_mode;

        if (is_direct_mode) {
            //console.debug('ramas: is_direct_mode, R', register_or_index, '=', new_value);
            this.simstate.setRegisterWord(register_or_index, new_value);
            return;
        }

        let register_value = this.simstate.getRegisterWord(register_or_index);

        if (is_indirect_mode) {
            // Our register contains a pointer to the memory word we need to set.

            // We'll already have autoinced at this point.  Unautoinc to get our
            // actual target address.
            /** @FIXME per _F 3.2.3 this is supposed to have been inc'd by 1 if it's a byte op */
            if (mode == 3) {
                register_value -= 2;
            }
            while (register_value < 0) {
                // Nothing anywhere in the overflow register docs say that
                // this operation triggers an overflow, so not doing that.
                register_value += 0xFFFF;
            }
            //console.debug('ramas: is_indirect_mode, R', register_or_index, ' (', register_value, ') =', new_value);
            this.simstate.setWord(register_value, new_value);
            return;
        }

        if (is_symbolic_mode || is_indexed_mode) {
            // Our immediate source operand contains the memory word that we
            // need to set.
            let target_word = this.inst.getImmediateSourceValue();
            if (is_indexed_mode) {
                // In indexed mode, we add the contents of our register to the
                // word to get our final target.
                target_word += register_value;
            }
            //console.debug('ramas: symbolic/indexed mode, word ', target_word, '=', new_value);
            this.simstate.setWord(target_word, new_value);
            return;
        }

        throw new Error('Hey, look, another impossible fallthrough!');

    }

    /**
     * @param {number} new_value
     * @param {number} bits
     * @returns {number}
     **/
    clampAndUpdateCarryAndOverflow(new_value, bits = 16) {
        new_value = this.clampAndUpdateCarry(new_value, bits);
        new_value = this.clampAndUpdateOverflow(new_value, bits);
        return new_value;
    }

    /**
     * @param {number} new_value
     * @param {number} bits
     * @returns {number}
     **/
    clampAndUpdateCarry(new_value, bits = 16) {
        /** @FIXME This is probably wrong. */
        this.simstate.status_register.resetBit(StatusRegister.CARRY);
        const maxval = ((1 << bits) - 1);
        if (new_value < 0) {
            new_value = new_value + maxval;
            this.simstate.status_register.setBit(StatusRegister.CARRY);
        }
        return new_value;
    }

    /**
     * @param {number} new_value
     * @param {number} bits
     * @returns {number}
     **/
    clampAndUpdateOverflow(new_value, bits = 16) {
        this.simstate.status_register.resetBit(StatusRegister.OVERFLOW);
        const maxval = ((1 << bits) - 1);
        if (new_value > maxval) {
            new_value = new_value - maxval;
            this.simstate.status_register.setBit(StatusRegister.OVERFLOW);
        }
        return new_value;
    }

    /**
     * @param {number} left_value
     * @param {number} right_value
     **/
    updateEq(left_value, right_value) {
        this.simstate.status_register.resetBit(StatusRegister.EQUAL);
        if (left_value == right_value) {
            /** @FIXME is == the right thing here? */
            this.simstate.status_register.setBit(StatusRegister.EQUAL);
        }
    }

    /**
     * @param {number} left_value
     * @param {number} right_value
     * @param {number} bits
     **/
    updateGt(left_value, right_value, bits = 16) {
        this.simstate.status_register.resetBit(StatusRegister.LGT);
        if (left_value > right_value) {
            this.simstate.status_register.setBit(StatusRegister.LGT);
        }

        const sign_mask = 1 << (bits - 1);
        const left_signed = left_value & sign_mask ? left_value - (1 << bits) : left_value;
        const right_signed = right_value & sign_mask ? right_value - (1 << bits) : right_value;

        this.simstate.status_register.resetBit(StatusRegister.AGT);
        if (left_signed > right_signed) {
            this.simstate.status_register.setBit(StatusRegister.AGT);
        }
    }

}


class Format1Unit extends ExecutionUnit {
    source_value = 0;
    target_value = 0;
    fetchOperands() {
        const ts = this.inst.getParam('Ts');
        const s = this.inst.getParam('S');
        //console.debug([ts, s]);
        this.source_value = this.resolveAddressingModeAndGet(ts, s);

        if (ts == 3) {
            /** @TODO when copying this, don't forget to set this to 1 instead of 2 for byte instructions instead of word! */
            let next_value = this.simstate.getRegisterWord(s) + 2;
            while (next_value > 0xFFFF) {
                // Nothing anywhere in the overflow register docs say that
                // this operation triggers an overflow, so not doing that.
                next_value -= 0xFFFF;
            }
            this.simstate.setRegisterWord(s, next_value);
        }
        return true;
    }

    doTheThing() { throw new Error('You are supposed to implement this.'); }

    execute() {
        this.doTheThing();
        return true;
    }

    writeResults() {
        const td = this.inst.getParam('Td');
        const d = this.inst.getParam('D');
        //console.debug([td, d]);
        this.resolveAddressingModeAndSet(td, d, this.target_value);

        if (td == 3) {
            /** @TODO when copying this, don't forget to set this to 1 instead of 2 for byte instructions instead of word! */
            let next_value = this.simstate.getRegisterWord(d) + 2;
            while (next_value > 0xFFFF) {
                // Nothing anywhere in the overflow register docs say that
                // this operation triggers an overflow, so not doing that.
                next_value -= 0xFFFF;
            }
            this.simstate.setRegisterWord(d, next_value);
        }
        return true;
    }
}


class Format2Unit extends ExecutionUnit {
    run = false;
    execute() {
        //console.debug(this.inst.opcode_def.name, 'run=', this.run, this);
        if (this.run) {
            let disp = this.inst.getParam('disp');
            if (disp > 127) {
                disp -= 256;
            }
            const new_pc = this.simstate.getPc() + disp;
            this.simstate.setPc(new_pc);
        } else {
            // We were bumped back, so if we aren't jumping, undo the bump
            this.simstate.advancePc();
        }
        return true;
    }
}
