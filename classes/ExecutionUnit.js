// @ts-check

import { Instruction } from "./Instruction";
import { SimulationState } from "./SimulationState";
import { StatusRegister } from "./StatusRegister";

import "../utils";

/**
 * ExecutionUnit: An interface between ExecutionProcess and Instructions
 *
 * tl;dr:
 **/
export class ExecutionUnit {

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
    static newFromInstruction(inst, simstate) {
        const class_for_instruction = Units.getClassForOpName(inst.opcode_info.name);
        if (!class_for_instruction) {
            /** @FIXME This should not happen because validateOpcode will include this check, RIGHT!? */
            console.debug('failed finding op=', inst.opcode_info.name, inst);
            const opstr = inst.getEffectiveOpcode().toString(16).toUpperCase().padStart(4, '0');
            throw new Error(`Found no Execution impl "${inst.opcode_info.name}" opcode=${opstr}.  @FIXME this should become ILLOP`);
        }
        return new class_for_instruction(inst, simstate);
    }

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
    execute() { return false; }
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
        const is_direct_mode = !is_symbolic_mode && !is_indexed_mode && !is_indirect_mode

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
        const is_direct_mode = !is_symbolic_mode && !is_indexed_mode && !is_indirect_mode

        let target_memory_word = 0;

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

}

class Units {

    /** @typedef {typeof ExecutionUnit} AnonymousExecutionUnit */
    /** @type Object<string,AnonymousExecutionUnit> */
    static #units = {
        'NOP': class extends ExecutionUnit {
            fetchOperands() { return false; }
            execute() {
                console.warn('NOP execute()');
                return true;
            }
            writeResults() { return false; }
        },
        'JMP': class extends ExecutionUnit {
            displacement = 0;
            fetchOperands() {
                let disp = this.inst.getParam('disp');
                if (disp > 127) {
                    disp -= 256;
                }
                this.displacement = disp;

                return true;
            }
            execute() {
                const new_pc = this.simstate.getPc() + this.displacement;
                //console.debug('JMP execute(): pc=', this.simstate.getPc(), 'disp=', this.displacement, 'new_pc=', new_pc);
                this.simstate.setPc(new_pc);
                return true;
            }
            writeResults() { return false; }
        },
        'JNC': class extends ExecutionUnit {
            run = false;
            fetchOperands() {
                if (!this.simstate.status_register.getBit(StatusRegister.CARRY)) {
                    this.run = true;
                }
                return true;
            }
            execute() {
                if (this.run) {
                    let disp = this.inst.getParam('disp');
                    if (disp > 127) {
                        disp -= 256;
                    }
                    const new_pc = this.simstate.getPc() + disp;
                    //console.debug(new_pc.toString(16), this.simstate.getPc().toString(16), disp.toString(16));
                    this.simstate.setPc(new_pc);
                } else {
                    // We were bumped back, so if we aren't jumping, undo the bump
                    this.simstate.advancePc();
                }
                return true;
            }
            writeResults() {
                /** @FIXME This op does not actually clear the flag.  This is a hack. */
                this.simstate.status_register.resetBit(StatusRegister.CARRY)
                return false;
            }
        },
        'JNO': class extends ExecutionUnit {
            run = false;
            fetchOperands() {
                if (!this.simstate.status_register.getBit(StatusRegister.OVERFLOW)) {
                    this.run = true;
                }
                return true;
            }
            execute() {
                if (this.run) {
                    let disp = this.inst.getParam('disp');
                    if (disp > 127) {
                        disp -= 256;
                    }
                    const new_pc = this.simstate.getPc() + disp;
                    //console.debug(new_pc.toString(16), this.simstate.getPc().toString(16), disp.toString(16));
                    this.simstate.setPc(new_pc);
                } else {
                    // We were bumped back, so if we aren't jumping, undo the bump
                    this.simstate.advancePc();
                }
                return true;
            }
            writeResults() {
                /** @FIXME This op does not actually clear the flag.  This is a hack. */
                this.simstate.status_register.resetBit(StatusRegister.OVERFLOW)
                return false;
            }
        },
        'LI': class extends ExecutionUnit {
            #register_num = 0;
            #next_word = 0;
            fetchOperands() {
                this.#register_num = this.inst.getParam('reg');
                this.#next_word = this.inst.getImmediateValue();
                return true;
            }
            execute() {
                //console.debug('LI execute()');
                return true;
            }
            writeResults() {
                this.simstate.setRegisterWord(this.#register_num, this.#next_word);
                return true;
            }
        },
        'MOV': class extends ExecutionUnit {
            source_value = 0;
            fetchOperands() {
                const ts = this.inst.getParam('Ts');
                const s = this.inst.getParam('S');
                //console.debug([ts, s]);
                this.source_value = this.resolveAddressingModeAndGet(ts, s);

                if (ts == 3) {
                    /** @TODO when copying this, don't forget to set this to 1 instead of 2 for byte instructions instead of word! */
                    this.simstate.setRegisterWord(s, 2 + this.simstate.getRegisterWord(s));
                }
                return true;
            }
            execute() {
                //console.debug('MOV execute()');
                return true;
            }
            writeResults() {
                const td = this.inst.getParam('Td');
                const d = this.inst.getParam('D');
                //console.debug([td, d]);
                this.resolveAddressingModeAndSet(td, d, this.source_value);

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
        },
        'INC': class extends ExecutionUnit {
            nv = 0;
            fetchOperands() {
                const ts = this.inst.getParam('Ts');
                let s = this.inst.getParam('S');
                this.nv = this.resolveAddressingModeAndGet(ts, s);
                return true;
            }
            execute() {
                //console.debug('INCT execute()');
                this.nv += 1;
                this.simstate.status_register.resetBit(StatusRegister.OVERFLOW);
                if (this.nv > 0xFFFF) {
                    this.nv -= 0xFFFF;
                    //console.warn('INC: Overflow!');
                    this.simstate.status_register.setBit(StatusRegister.OVERFLOW);
                }
                return true;
            }
            writeResults() {
                const ts = this.inst.getParam('Ts');
                let s = this.inst.getParam('S');
                this.resolveAddressingModeAndSet(ts, s, this.nv);
                return true;
            }
        },
        'INCT': class extends ExecutionUnit {
            nv = 0;
            fetchOperands() {
                const ts = this.inst.getParam('Ts');
                let s = this.inst.getParam('S');
                this.nv = this.resolveAddressingModeAndGet(ts, s);
                return true;
            }
            execute() {
                //console.debug('INCT execute()');
                this.nv += 2;
                this.simstate.status_register.resetBit(StatusRegister.OVERFLOW);
                if (this.nv > 0xFFFF) {
                    this.nv -= 0xFFFF;
                    //console.warn('INCT: Overflow!');
                    this.simstate.status_register.setBit(StatusRegister.OVERFLOW);
                }
                return true;
            }
            writeResults() {
                const ts = this.inst.getParam('Ts');
                let s = this.inst.getParam('S');
                this.resolveAddressingModeAndSet(ts, s, this.nv);
                return true;
            }
        },
        'DEC': class extends ExecutionUnit {
            nv = 0;
            fetchOperands() {
                const ts = this.inst.getParam('Ts');
                let s = this.inst.getParam('S');
                this.nv = this.resolveAddressingModeAndGet(ts, s);
                return true;
            }
            execute() {
                //console.debug('DECT execute()');
                this.nv -= 1;
                this.simstate.status_register.resetBit(StatusRegister.CARRY);
                if (this.nv < 0) {
                    this.nv += 0xFFFF;
                    //console.warn('DEC: Underflow!');
                    this.simstate.status_register.setBit(StatusRegister.CARRY);
                }
                return true;
            }
            writeResults() {
                const ts = this.inst.getParam('Ts');
                let s = this.inst.getParam('S');
                this.resolveAddressingModeAndSet(ts, s, this.nv);
                return true;
            }
        },
        'DECT': class extends ExecutionUnit {
            nv = 0;
            fetchOperands() {
                const ts = this.inst.getParam('Ts');
                let s = this.inst.getParam('S');
                this.nv = this.resolveAddressingModeAndGet(ts, s);
                return true;
            }
            execute() {
                //console.debug('DECT execute()');
                this.nv -= 2;
                this.simstate.status_register.resetBit(StatusRegister.CARRY);
                if (this.nv < 0) {
                    this.nv += 0xFFFF;
                    //console.warn('DECT: Underflow!');
                    this.simstate.status_register.setBit(StatusRegister.CARRY);
                }
                return true;
            }
            writeResults() {
                const ts = this.inst.getParam('Ts');
                let s = this.inst.getParam('S');
                this.resolveAddressingModeAndSet(ts, s, this.nv);
                return true;
            }
        },
    }

    /**
     * @param {string|false} op_name
     * @returns AnonymousExecutionUnit
     **/
    static getClassForOpName(op_name) {
        const processed_name = op_name.toString().toUpperCase()
        if ( !(processed_name in this.#units)) {
            return false;
        }
        return this.#units[processed_name];
    }


}
