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
        console.warn('getEffectiveOpcode fallthrough');
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
            console.warn('getParam: Instruction is not yet Finalized.  The call may be bugged!');
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

    /**
     * @param {string} param_name
     * @param {string|number} value
     **/
    setParam(param_name, value) {
        if (this.#is_finalized) {
            console.error('setParam: Instruction is Finalized.  The call is bugged!');
            return false;
        }
        //console.debug(' => ', this.op.args, param_name, Reflect.get(this.op.args, param_name));
        if (!this.op.args[param_name]) {
            console.error('setParam: unknown param name', param_name);
            return false;
        }

        let running_offset = this.op.arg_start_bit;
        for (let k in this.op.args) {
            const arg_length = this.op.args[k];
            // We have to count up the total bits skipped, which means we have
            // to start at the beginning of the list.
            if (k.toLowerCase() !== param_name.toLowerCase()) {
                running_offset += arg_length;
                continue;
            }

            let opcode_binstring = this.#working_opcode.toString(2).padStart(16,'0');
            if (this.isTwoWordInstruction()) {
                opcode_binstring += this.#second_word.toString(2).padStart(16,'0');
            }
            const before = opcode_binstring.substring(0, running_offset);
            const middle = opcode_binstring.substring(running_offset, running_offset + arg_length);
            const after = opcode_binstring.substring(running_offset + arg_length);

            let bitmask = parseInt('1'.repeat(arg_length), 2);
            //console.debug('bitmask', bitmask.toString(2));
            const after_value = bitmask & parseInt(value.toString());
            //console.log('param=', k, 'before=', this.getParam(k), 'after=', after_value);
            //console.debug([middle, parseInt(middle, 2), value, after_value]);

            const new_bitstring = before + after_value.toString(2).padStart(arg_length, '0') + after;
            this.#working_opcode = parseInt(new_bitstring.substring(0, 16), 2);
            if (this.isTwoWordInstruction()) {
                this.#second_word = parseInt(new_bitstring.substring(16), 2);
            }
            //console.log('old=', opcode_binstring);
            //console.log('new=', new_bitstring);
            //console.log('param=', k, 'now=', this.getParam(k), 'expected=', after_value);

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

    getSecondWord() {
        return this.#second_word;
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
     * @TODO is there anything that can happen pre-finalization that makes us illegal?
     **/
    isLegal() {
        // an empty Op object will have opcode=0 and op=NOP
        const op_name_is_empty = this.#opcode_info.op == '';
        const op_name_is_NOP = this.#opcode_info.op == 'NOP'
        const op_code_is_zero = this.#opcode_info.opcode == 0;
        const is_illegal = op_name_is_empty || op_name_is_NOP || op_code_is_zero;
        return !is_illegal;
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
