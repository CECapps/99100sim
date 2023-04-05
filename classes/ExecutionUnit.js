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
            console.debug(inst.op.op, inst);
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

}

class Units {

    /** @typedef {typeof ExecutionUnit} AnonymousExecutionUnit */
    /** @type Object<string,AnonymousExecutionUnit> */
    static #units = {
        'NOP': class extends ExecutionUnit {
            execute() {
                console.debug('NOP execute()');
                return true;
            }
        },
        'JMP': class extends ExecutionUnit {
            execute() {
                console.debug('JMP execute()');
                this.simstate.advancePc();
                return true;
            }
        }
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
