// @ts-check

/*global insert_binary,extract_binary */

import { OpInfo } from "./OpInfo.js";

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

    #immediate_operand = 0;

    #has_immediate_source_operand = false;
    #immediate_source_operand = 0;

    #has_immediate_dest_operand = false;
    #immediate_dest_operand = 0;

    /** @type {OpInfo} */
    opcode_info;

    #is_finalized = false;

    /**
     * @param {string} op_name
     * @returns {Instruction}
     **/
    static newFromString(op_name) {
        return new Instruction(OpInfo.getFromOpName(op_name));
    }

    /**
     * @param {number} opcode
     * @returns {Instruction}
     **/
    static newFromOpcode(opcode) {
        const inst = new Instruction(OpInfo.getFromOpcode(opcode));
        // The Instruction has been created with a param-less opcode.  Fix that.
        inst.setEffectiveOpcode(opcode);
        return inst;
    }

    /** @param {OpInfo} op */
    constructor(op) {
        this.opcode_info = op;
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

    /** @param {number} opcode */
    setEffectiveOpcode(opcode) {
        if (this.#is_finalized) {
            console.error('setEffectiveOpcode: Instruction is Finalized.  The call is bugged!');
            return;
        }
        if (opcode < this.opcode_info.opcode || opcode > this.opcode_info.opcode_legal_max) {
            console.error('Op out of range (HOW!?)');
            return;
        }
        this.#working_opcode = opcode;
        this.#refreshImmediateOperandState();
    }

    getFullOpcode() {
        let opcode = this.getEffectiveOpcode();
        if (this.hasSecondOpcodeWord()) {
            opcode <<= 16;
            opcode |= this.getSecondOpcodeWord();
        }
        return opcode;
    }

    getParamList() {
        return Object.keys(this.opcode_info.args);
    }

    /**
     * @param {string} param_name
     * @return number
     **/
    getParam(param_name) {
        if (this.#working_opcode == 0) {
            throw new Error('getParam called before known good state: probable bug');
        }
        const opcode_params = this.opcode_info.format_info.opcode_params;
        if (!Object.hasOwn(opcode_params, param_name)) {
            throw new Error(`getParam with invalid param: "${param_name}" probable bug`);
        }

        const opcode = this.getFullOpcode();
        const offset = this.#paramBitOffsetHelper(param_name);
        const value = extract_binary(opcode, (this.hasSecondOpcodeWord() ? 32 : 16), offset, opcode_params[param_name]);
        return value;
    }

    /**
     * @param {string} param_name
     * @param {string|number} param_value
     **/
    setParam(param_name, param_value) {
        if (this.#is_finalized) {
            console.error('setParam: Instruction is Finalized.  The call is bugged!');
            return false;
        }

        if (param_name == '_immediate_word_') {
            this.setImmediateValue(parseInt(param_value.toString(), 10));
            this.#refreshImmediateOperandState();
            return;
        }

        const opcode_params = this.opcode_info.format_info.opcode_params;
        if (!Object.hasOwn(opcode_params, param_name)) {
            throw new Error(`setParam with invalid param: "${param_name}" probable bug`);
        }

        const opcode = this.getFullOpcode();
        const offset = this.#paramBitOffsetHelper(param_name);
        const new_opcode = insert_binary(
            opcode,
            (this.hasSecondOpcodeWord() ? 32 : 16),
            offset,
            opcode_params[param_name],
            parseInt(param_value.toString(), 10)
        );

        if (this.hasSecondOpcodeWord()) {
            // We've been given two 16-bit words in the form of a single 32-bit
            // unsigned integer.  The most significant word is our opcode.
            const msw = new_opcode >> 16;
            this.setEffectiveOpcode(msw);

            // The least significant word is the second word of our opcode.
            const lsw_mask = ((2 ** 32) - 1) & ((2 ** 16) - 1);
            this.setSecondOpcodeWord(new_opcode & lsw_mask);
        } else {
            this.setEffectiveOpcode(new_opcode);
        }
        this.#refreshImmediateOperandState();
    }

    /**
     * @param {string} param
     * @returns {number}
     **/
    #paramBitOffsetHelper(param) {
        let running_offset = this.opcode_info.format_info.opcode_param_start_bit;
        const opcode_params = this.opcode_info.format_info.opcode_params;
        for (const p in opcode_params) {
            if (param !== p) {
                running_offset += opcode_params[p];
                continue;
            }
            // Therefore, we've found ourselves and the offset has been found.
            break;
        }
        return running_offset;
    }

    #refreshImmediateOperandState() {
        if (this.opcode_info.has_possible_immediate_source && this.getParam('Ts') == 2) {
            this.#has_immediate_source_operand = true;
        }
        if (this.opcode_info.has_possible_immediate_dest && this.getParam('Td') == 2) {
            this.#has_immediate_dest_operand = true;
        }
    }

    finalize() {
        this.#is_finalized = true;
    }

    isFinalized() {
        return this.#is_finalized;
    }

    //#region Second Word
    hasSecondOpcodeWord() {
        return this.opcode_info.has_second_opcode_word;
    }

    /** @param {number} word */
    setSecondOpcodeWord(word) {
        this.#second_word = word;
    }

    getSecondOpcodeWord() {
        return this.#second_word;
    }
    //#endregion

    //#region Immediate Value
    hasImmediateValue() {
        return this.opcode_info.has_immediate_operand;
    }

    /** @param {number} word */
    setImmediateValue(word) {
        this.#immediate_operand = word;
    }

    getImmediateValue() {
        return this.#immediate_operand;
    }
    //#endregion

    //#region Immediate Source
    hasImmediateSourceValue() {
        return this.#has_immediate_source_operand;
    }

    /** @param {number} word */
    setImmediateSourceValue(word) {
        this.#immediate_source_operand = word;
        this.#refreshImmediateOperandState();
    }

    getImmediateSourceValue() {
        return this.#immediate_source_operand;
    }
    //#endregion

    //#region Immediate Dest
    hasImmediateDestValue() {
        return this.#has_immediate_dest_operand;
    }

    /** @param {number} word */
    setImmediateDestValue(word) {
        this.#immediate_dest_operand = word;
        this.#refreshImmediateOperandState();
    }

    getImmediateDestValue() {
        return this.#immediate_dest_operand;
    }
    //#endregion

    /**
     * @TODO check for other legality things
     * @TODO is there anything that can happen pre-finalization that makes us illegal?
     **/
    isLegal() {
        // an empty Op object will have opcode=0 and op=NOP
        const op_name_is_empty = this.opcode_info.name == '';
        const op_name_is_NOP = this.opcode_info.name == 'NOP';
        const op_code_is_zero = this.opcode_info.opcode == 0;
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

}
