// @ts-check

import { Op } from "../ops.js";

/**
 * Instruction: An Op with defined Parameters.
 *
 * An Op is an immutable data object describing a specific instruction and the
 * specific numeric value range it can have.  Each Op also describes Parameters
 * embedded within the opcode.
 *
 * Instruction wraps the Op data (as "op info") and allows access to the
 * Parameters set by the actual numeric opcode.  Unfortunately this gets complicated.
 *
 * Most Ops fit in one 16-bit word, but some Ops use two words.  We are only ever
 * given the first word and must provide information when a second word is needed.
 * Only once we have that second word can we correctly extract the Parameters.
 *
 * Both words have separate legality checks, and those legality checks occur in
 * different places throughout the processor workflow.
 *
 * We have two possible states: unset, and set.  You can't ask for the set
 * Parameters of an unset Instruction, and you can't ask if an unset Instruction
 * is legal or not.
 *
 * Creating Instructions should be left to the Execution Unit.
 **/
export class Instruction {

    #base_opcode = 0;
    #working_opcode = 0;
    #second_word = 0;
    /** @type {Op} */
    #opcode_info;
    get op() { return this.#opcode_info; }

    #is_finalized = false;

    /**
     * @param {string} op_name
     * @returns {Instruction}
     **/
    static newFromString(op_name) {
        /** @value {Op} */
        const opcode_info = Op.getOpForString(op_name);
        if (opcode_info === false) {
            return new Instruction(new Op());
        }
        return new Instruction(opcode_info);
    }

    /**
     * @param {number} opcode
     * @returns {Instruction}
     **/
    static newFromOpcode(opcode) {
        const op_name = Op.getOpNameForOpcode(opcode);
        if (op_name === undefined) {
            return new Instruction(new Op());
        }
        const op_info = Op.getOpForString(op_name);
        if (op_info === false) {
            return new Instruction(new Op());
        }
        const inst = new Instruction(op_info);
        inst.setParamsFromOpcode(opcode);
        return inst;
    }

    /** @param {Op} op */
    constructor(op) {
        this.#opcode_info = op;
        this.#base_opcode = op.opcode;
        this.#working_opcode = op.opcode;
    }

    getEffectiveOpcode() {
        if (this.#working_opcode != 0) {
            return this.#working_opcode;
        }
        return this.#base_opcode;
    }

    getParamList() {
        return Object.keys(this.op.args);
    }

    /**
     * @param {string} param_name
     **/
    getParam(param_name) {
        if (!this.#is_finalized) {
            console.error('getParam: Instruction is not yet Finalized.  The call is bugged!');
            return;
        }
        if (this.#working_opcode == 0) {
            console.error('getParam called before known good state: probable bug');
            return 0;
        }
        if (!this.op.args[param_name]) {
            console.error('getParam with invalid param: probable bug');
            return 0;
        }
        let running_offset = this.op.arg_start_bit;
        /** @type Object<string,number> args */
        const args = this.op.args;
        for (let k in args) {
            // We have to count up the total bits skipped, which means we have
            // to start at the beginning of the list.
            if (k.toLowerCase() !== param_name.toLowerCase()) {
                running_offset += args[k];
                continue;
            }

            // To hell with bitwise manipulation I just want it working so strings it is!
            let opcode_binstring = this.#working_opcode.toString(2).padStart(16,'0');
            if (this.isTwoWordInstruction()) {
                // Yup, just tack it on the end, this works.
                opcode_binstring += this.#second_word.toString(2).padStart(16,'0');
            }
            const extracted = opcode_binstring.substring(running_offset, running_offset + args[k]);
            return parseInt(extracted, 2);
        }
    }

    /** @param {number} opcode */
    setParamsFromOpcode(opcode) {
        if (this.#is_finalized) {
            console.error('setParamsFromOpcode: Instruction is Finalized.  The call is bugged!');
            return;
        }
        if (opcode < this.op.opcode || opcode > this.op.opcode_legal_max) {
            return;
        }
        this.#working_opcode = opcode;
    }

    /** @param {number} word */
    setSecondWord(word) {
        if (!this.isTwoWordInstruction()) {
            console.error('Instruction received a second word when it does not need one, this is a bug.');
            return;
        }
        if (this.#is_finalized) {
            console.error('setSecondWord: Instruction is Finalized.  The call is bugged!');
            return;
        }
        this.#second_word = word;
    }

    finalize() {
        this.#is_finalized = true;
    }

    /**
     * @TODO check for other legality things
     **/
    isLegal() {
        if (!this.#is_finalized) {
            console.error('isLegal: Instruction is not yet Finalized.  The call is bugged!');
            return false;
        }
        // Everything else will fail during the path that gets us here, and
        // an empty Op object will have opcode=0 and op=NOP
        return this.op.op == '' || this.op.opcode == 0 || this.op.op == 'NOP';
    }

    /**
     * @TODO implement
     **/
    checkSecondWordLegality() {
        if (!this.#is_finalized) {
            console.error('checkSecondWordLegality: Instruction is not yet Finalized.  The call is bugged!');
            return false;
        }
        return true;
    }

    isTwoWordInstruction() {
        // Formats 11 and higher are all two-word instructions, except for 18.
        if (this.op.format >= 11 && this.op.format != 18) {
            return true;
        }
        return false;
    }

}
