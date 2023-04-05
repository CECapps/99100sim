// @ts-check

import { Instruction } from "./Instruction";
import { SimulationState } from "./SimulationState";

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
        const class_for_instruction = Units.getClassForOpName(inst.op.op);
        if (!class_for_instruction) {
            /** @FIXME This should not happen because validateOpcode will include this check, RIGHT!? */
            console.error('impossible error 6 I think');
            console.debug('op=', inst.op.op, inst);
            throw new Error('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA');
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
    validateParams() { return false; }
    doParamsNeedPrivilege() { return false; }
    fetchOperands() { return false; }
    execute() { return false; }
    writeResults() { return false; }

    /**
     * @param {number} mode
     * @param {number} register_or_index
     **/
    resolveAddressingModeAndGet(mode, register_or_index) {
        if (mode === 0) {
            const x = this.simstate.getRegisterWord(register_or_index);
            //console.log('resolveAddressingModeAndGet:', mode, register_or_index, x);
            return x;
        }
        if (mode === 1) {
            const x = this.simstate.getWord(this.simstate.getRegisterWord(register_or_index));
            //console.log('resolveAddressingModeAndGet:', mode, register_or_index, x);
            return x;
        }
        if (mode === 2) {
            if (register_or_index === 0) {
                throw new Error('resolveAddressingModeAndGet does not yet support Symbolic mode');
            }
            throw new Error('resolveAddressingModeAndGet does not yet support Indexed mode');
        }
        if (mode === 3) {
            throw new Error('resolveAddressingModeAndGet does not yet support WR Indirect Autoinc');
        }
        throw new Error('resolveAddressingModeAndGet: fell through!');
    }

    /**
     * @param {number} mode
     * @param {number} register_or_index
     * @param {number} new_value
     **/
    resolveAddressingModeAndSet(mode, register_or_index, new_value) {
        if (mode === 0) {
            const x = this.simstate.setRegisterWord(register_or_index, new_value);
            //console.log('resolveAddressingModeAndSet:', mode, register_or_index, new_value);
            return x;
        }
        if (mode === 1) {
            const x = this.simstate.setWord(this.simstate.getRegisterWord(register_or_index), new_value);
            //console.log('resolveAddressingModeAndSet:', mode, register_or_index, new_value);
            return x;
        }
        if (mode === 2) {
            if (register_or_index === 0) {
                throw new Error('resolveAddressingModeAndSet does not yet support Symbolic mode');
            }
            throw new Error('resolveAddressingModeAndSet does not yet support Indexed mode');
        }
        if (mode === 3) {
            throw new Error('resolveAddressingModeAndSet does not yet support WR Indirect Autoinc');
        }
        throw new Error('resolveAddressingModeAndSet: fell through!');
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
                if (!disp) {
                    disp = 0;
                }
                if (disp > 127) {
                    disp -= 256;
                }
                //console.debug('disp=', disp);
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
        'LI': class extends ExecutionUnit {
            #register_num = 0;
            #next_word = 0;

            fetchOperands() {
                const reg = this.inst.getParam('reg');
                this.#register_num = 0;
                if (reg) {
                    this.#register_num = reg;
                }
                this.#next_word = this.simstate.getWord(this.simstate.getPc());
                this.simstate.advancePc();
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
                if (ts === undefined || s === undefined) {
                    throw new Error('Missing Ts/S');
                }
                this.source_value = this.resolveAddressingModeAndGet(ts, s);
                return true;
            }
            execute() {
                //console.debug('MOV execute()');
                return true;
            }
            writeResults() {
                const td = this.inst.getParam('Td');
                const d = this.inst.getParam('D');
                if (td === undefined || d === undefined) {
                    throw new Error('Missing Td/D');
                }
                this.resolveAddressingModeAndSet(td, d, this.source_value);

                return true;
            }
        },
        'INCT': class extends ExecutionUnit {
            register = 0;
            nv = 0;
            fetchOperands() {
                const ts = this.inst.getParam('Ts');
                let s = this.inst.getParam('S');
                if (!s || s < 0 || s > 15) {
                    s = 0;
                }
                if (ts == 0) {
                    this.nv = this.simstate.getRegisterWord(s);
                }
                return true;
            }
            execute() {
                //console.debug('INCT execute()');
                this.nv += 2;
                return true;
            }
            writeResults() {
                const ts = this.inst.getParam('Ts');
                let s = this.inst.getParam('S');
                if (!s || s < 0 || s > 15) {
                    s = 0;
                }
                if (ts == 0) {
                    this.simstate.setRegisterWord(s, 0xFFFF & this.nv);
                }
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
