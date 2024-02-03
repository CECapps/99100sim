// @ts-check

import { OpInfo } from "./OpInfo.js";
import { Instruction } from "./Instruction.js";

export { InstructionDecode, EncodedInstruction };

class InstructionDecode {

    /** @param {Instruction} inst */
    static getEncodedInstruction(inst) {
        const enc = new EncodedInstruction(inst.getEffectiveOpcode());

        if (inst.hasSecondOpcodeWord()) {
            const sow = new ImmediateWord(true);
            sow.value = inst.getSecondOpcodeWord();
            enc.second_word = sow;
        }

        if (inst.hasImmediateValue()) {
            const imv = new ImmediateWord(true);
            imv.value = inst.getImmediateValue();
            enc.immediate_word = imv;
        }

        if (inst.hasImmediateSourceValue()) {
            const ims = new ImmediateWord(true);
            ims.value = inst.getImmediateSourceValue();
            enc.immediate_source_word = ims;
        }

        if (inst.hasImmediateDestValue()) {
            const imd = new ImmediateWord(true);
            imd.value = inst.getImmediateDestValue();
            enc.immediate_source_word = imd;
        }

        /** @TODO This should be unnecessary, make sure of that and then nuke it. */
        const params = new ParamsList();
        for (const key of Object.keys(inst.opcode_info.format_info.opcode_params)) {
            params.set(key, inst.getParam(key));
        }
        enc.opcode_params = params;

        return enc;
    }

    /** @param {EncodedInstruction} ei */
    static getInstructionFromEncoded(ei) {
        const inst = Instruction.newFromOpcode(ei.opcode);
        if (ei.second_word.is_needed) {
            inst.setSecondOpcodeWord(ei.second_word.value);
        }

        /** @TODO This should be unnecessary, make sure of that and then nuke it. */
        for (const kv of ei.opcode_params) {
            inst.setParam(kv[0], kv[1]);
        }

        if (ei.immediate_word.is_needed) {
            inst.setImmediateValue(ei.immediate_word.value);
        }
        if (ei.immediate_source_word.is_needed) {
            inst.setImmediateSourceValue(ei.immediate_source_word.value);
        }
        if (ei.immediate_dest_word.is_needed) {
            inst.setImmediateDestValue(ei.immediate_dest_word.value);
        }

        inst.finalize();
        return inst;
    }

}


class ParamsList extends Map {}

class ImmediateWord {

    #is_needed = false;
    #has_been_set = false;
    #value = 0;

    /** @returns {number} */
    get value() {
        return this.#value;
    }

    /** @param {number} new_value */
    set value(new_value) {
        this.#value = new_value;
        this.#has_been_set = true;
    }

    get is_needed() { return this.#is_needed; }
    get has_value() { return this.#has_been_set; }

    /**
     * @param {boolean} is_needed
     **/
    constructor(is_needed = false) {
        this.#is_needed = is_needed;
    }

}

class EncodedInstruction {

    /** @type {OpInfo} */
    opcode_info;

    opcode = 0;
    second_word = new ImmediateWord(false);
    immediate_word = new ImmediateWord(false);
    immediate_source_word = new ImmediateWord(false);
    immediate_dest_word = new ImmediateWord(false);

    opcode_params = new ParamsList();

    get words() {
        const res = [this.opcode];
        if (this.second_word.is_needed && this.second_word.has_value) {
            res.push(this.second_word.value);
        }
        if (this.immediate_word.is_needed && this.immediate_word.has_value) {
            res.push(this.immediate_word.value);
        }
        if (this.immediate_source_word.is_needed && this.immediate_source_word.has_value) {
            res.push(this.immediate_source_word.value);
        }
        if (this.immediate_dest_word.is_needed && this.immediate_dest_word.has_value) {
            res.push(this.immediate_dest_word.value);
        }
        return res;
    }

    /** @param {number} opcode */
    constructor(opcode) {
        this.opcode = opcode;
        this.opcode_info = OpInfo.getFromOpcode(opcode);
    }

}
