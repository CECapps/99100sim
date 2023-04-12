// @ts-check
"use strict";

import { Instruction } from "./Instruction";
import { InstructionDecode, EncodedInstruction } from "./InstructionDecode";

export class Asm {

    /** @type string[] */
    #lines = [];

    /**
     * @type {AsmParseLineResult[]}
     **/
    #parsed_lines = [];


    /** @param {string} lines */
    setLines(lines) {
        this.reset();
        this.#lines = lines.split(/[\r\n]/);
    }

    reset() {
        this.#lines = [];
        this.#parsed_lines = [];
    }

    process() {
        this.#parsed_lines = [];
        for (let line of this.#lines) {
            this.#parseLine(line);
        }
        // From our parsed lines, we can now build operations.
        /** @TODO PI support, label support */
        for (let line of this.#parsed_lines) {
            if (line.line_type == 'instruction') {
                const inst = this.#getInstructionFromLine(line);
                if (inst === null) {
                    throw new Error('No.  Just no.');
                }
                const dec = InstructionDecode.getEncodedInstruction(inst);
                line.dec = dec;
            }
        }
        return this.#parsed_lines;
    }

    toWords() {
        /** @type number[] */
        const words = [];
        for (let line of this.#parsed_lines) {
            const is_instruction = line.line_type == 'instruction';
            const is_pi_data = ((line.line_type == 'pi') && (line.instruction == 'data'));
            if (is_instruction || is_pi_data) {
                if (line.dec !== null) {
                    for (let word of line.dec.words) {
                        words.push(word);
                    }
                } else {
                    words.push(line.word);
                }
            }
        }
        return words;
    }

    toAsm() {
        /** @type string[] */
        const asm = [];
        for (let line of this.#parsed_lines) {
            const is_pi_data = ((line.line_type == 'pi') && (line.instruction == 'data'));
            if (is_pi_data) {
                const f_word = line.word.toString(16).toUpperCase().padStart(4, '0');
                const f_comments = line.comments.length ? ' ; ' + line.comments : '';
                const f_string = '.data   0x' + f_word;
                asm.push(f_string.padEnd(18, ' ') + f_comments);
            }

            const is_instruction = line.line_type == 'instruction';
            if (line.line_type == 'comment' && line.comments.length > 0) {
                asm.push('; ' + line.comments);
                continue;
            }
            if (!is_instruction) {
                continue;
            }

            //console.debug(line);
            if (line.dec === null) {
                throw new Error('Can not reconstuct asm line without an EncodedInstruction');
            }
            const instr = InstructionDecode.getInstructionFromEncoded(line.dec);

            const f_instr = instr.opcode_info.name.padEnd(8, ' ');
            const f_params = [];
            for (let param_name of instr.opcode_info.format_info.asm_param_order) {
                if (param_name == '_immediate_word_') {
                    f_params.push('0x' + instr.getImmediateValue().toString(16).toUpperCase());
                    continue;
                }

                const param_value = instr.getParam(param_name);
                if (param_value === undefined) {
                    throw new Error('hey look another params check failed');
                }

                if (param_name == 'S' && Object.hasOwn(instr.opcode_info.format_info.opcode_params, 'Ts')) {
                    f_params.push(this.#addressingModeHelper(line, instr.getParam('Ts'), instr.getParam('S')));
                    continue;
                }
                if (param_name == 'D' && Object.hasOwn(instr.opcode_info.format_info.opcode_params, 'Td')) {
                    f_params.push(this.#addressingModeHelper(line, instr.getParam('Td'), instr.getParam('D')));
                    continue;
                }
                if (param_name == 'disp' && param_value > 127) {
                    f_params.push(param_value - 256);
                    continue;
                }
                const is_register_number = [ 'reg' ].includes(param_name);
                f_params.push((is_register_number ? 'R' : '') + param_value);
            }
            const f_comments = line.comments.length ? ' ; ' + line.comments : '';
            asm.push('    ' + f_instr + f_params.join(',').padEnd(10, ' ') + f_comments);
        }
        return asm;
    }

    /** @param {string} line */
    #parseLine(line) {

        const result = new AsmParseLineResult();

        result.line_type = 'pending';
        result.instruction = '';
        result.instruction_argument = '';

        // Step 1: No whitespace.
        line = line.trim();
        line = line.replaceAll(/[\s\t\r\n]+/g, "\x20").trim();
        // Step 2: Snip off comments.
        result.comments = '';
        const semicolon_index = line.indexOf(';');
        if (semicolon_index !== -1) {
            result.comments = line.substring(semicolon_index + 1).trim();
            line = line.substring(0, semicolon_index).trim();
        }
        if (line.length == 0) {
            result.line_type = 'comment';
        }
        // Step 3: Filter out instructions
        const instruction_match = line.match(/^([A-Z]{1,4})([\b\s]|$)/);
        if (instruction_match) {
            result.line_type = 'instruction';
            result.instruction = instruction_match[1];
            // All remaining things in the line must be arguments for the instruction
            result.instruction_argument = line.substring(result.instruction.length).trim();
        }
        // Step 4: Processing instructions.
        const pi_match = line.match(/^\.([a-zA-Z_0-9]+)([\b\s]|$)/);
        if (result.line_type == 'pending' && pi_match) {
            result.line_type = 'pi';
            result.instruction = pi_match[1].toLowerCase();
            // All remaining things in the line must be arguments to the PI
            result.instruction_argument = line.substring(result.instruction.length + 1).trim();
        }
        // Step 5: Labels.
        const label_match = line.match(/^([a-zA-Z_0-9]+):?([\b\s]|$)/);
        if (result.line_type == 'pending' && label_match) {
            result.line_type = 'label';
            result.instruction = label_match[1].toLowerCase();
            // Nope, no arguments.
        }
        // Step 6: Fallthrough.
        if (result.line_type == 'pending') {
            result.line_type = 'fallthrough';
        }
        result.line = line;

        this.#parsed_lines.push(result);
    }

    /** @param {AsmParseLineResult} line */
    #getInstructionFromLine(line) {
        const inst = Instruction.newFromString(line.instruction);

        if (!inst.isLegal()) {
            console.error('illegal op??', line, inst);
            return null;
        }
        const param_list = inst.getParamList();
        // These are the ones we see in the assembly
        const asm_param_list = inst.opcode_info.format_info.asm_param_order;
        // These are the ones we put into the opcode
        const opcode_param_list = Object.keys(inst.opcode_info.args);
        // We're dealing with assembly-side things.
        const split_params = line.instruction_argument.split(',');

        //console.debug(param_list, asm_param_list, opcode_param_list, split_params);

        let offset = 0;
        for (let param_name of asm_param_list) {
            const this_param = split_params[offset++];
            if (param_name == 'S' && opcode_param_list.includes('Ts')) {
                //console.debug(' => S+Ts => ', split_params[offset]);
                const res = this.#registerStringToAddressingModeData(this_param);
                //console.debug(split_params[offset - 1], ' = Ts,S = ', res);
                inst.setParam('Ts', res[0]);
                inst.setParam('S', res[1]);
                if (res[0] == 2 && res[1] == 0 && inst.opcode_info.has_possible_immediate_source) {
                    inst.setImmediateSourceValue(res[2]);
                }
                continue;
            }
            if (param_name == 'D' && opcode_param_list.includes('Td')) {
                //console.debug(' => D+Td ', split_params[offset]);
                const res = this.#registerStringToAddressingModeData(this_param);
                //console.debug(split_params[offset - 1], ' = Td,D,immed = ', res);
                inst.setParam('Td', res[0]);
                inst.setParam('D', res[1]);
                if (res[0] == 2 && res[1] == 0 && inst.opcode_info.has_possible_immediate_dest) {
                    inst.setImmediateDestValue(res[2]);
                }
                continue;
            }
            if (param_name == '_immediate_word_') {
                inst.setImmediateValue(number_format_helper(this_param));
                continue;
            }
            inst.setParam(param_name, number_format_helper(this_param));
        }
        inst.finalize();

        if (!inst.isLegal()) {
            console.error('illegal op (2)', line, inst);
            return null;
        }
        return inst;
    }

    /**
     * @param {AsmParseLineResult} line
     * @param {number} type
     * @param {number} value
     **/
    #addressingModeHelper(line, type, value) {
        let string = '';
        if (type == 0) {
            // S is the number of the workspace register containing the value
            string = `R${value}`;
        } else if (type == 1 || type == 3) {
            // S is the workspace register containing the address with the value
            string = `*R${value}`;
            if (type == 3) {
                string += '+';
            }
        } else if (type == 2) {
            // We must be in symbolic or indexed memory mode.  In both cases,
            // a word will follow with our actual value.
            string = `@0x${line.word.toString(16).toUpperCase().padStart(4, '0')}`;
            if (value > 0) {
                // S is not zero, so we're in indexed mode.  The first word
                // after the instruction is our base value.
                string += `(R${value})`;
            }
        }
        return string;
    }

    /**
     * @param {string} register_string
     * @returns {number[]}
     **/
    #registerStringToAddressingModeData(register_string) {
        let mode = 0;
        let register = 0;
        let immediate_word = 0;

        if (register_string.startsWith('*')) {
            mode = 1;
            register_string = register_string.substring(1);
            //console.debug('* => mode 1, regstring=', register_string);
            if (register_string.endsWith('+')) {
                mode = 3
                register_string = register_string.substring(0, register_string.length - 1);
                //console.debug('+ => mode 3, regstring=', register_string);
            }
        }
        if (register_string.startsWith('@')) {
            console.debug('mode = 2');
            mode = 2;
            if (register_string.endsWith(')')) {
                const reg_extract_regex = /\((WR|R)?(\d{1,2})\)$/;
                const register_match = register_string.match(reg_extract_regex);
                if (register_match) {
                    console.debug('(Rx) => mode 2, Indexed');
                    register = parseInt(register_match[2]);
                    register_string = register_string.replace(reg_extract_regex, '');
                } else {
                    throw new Error('Parse error finding indexed register');
                }
            }
            console.debug('mode 2 regstring=', register_string);
            const value_regex = /^\@(0x|0b|>)?([0-9A-F]+)/;
            const value_test = register_string.match(value_regex);
            if (value_test) {
                immediate_word = number_format_helper(value_test[2]);
            } else {
                throw new Error('Parse error extracting a Symbolic or Indexed (mode=2) immediate value');
            }
        }
        if (mode != 2) {
            if (mode == 0) {
                //console.debug('mode = 0');
            }
            const regstring_format_test = register_string.match(/^(WR|R)?(\d{1,2})$/);
            if (regstring_format_test) {
                register = parseInt(regstring_format_test[2]);
            } else {
                throw new Error('Parse error extracting register value from mode=0,1,3 arg string');
            }
        }
        return [mode, register, immediate_word];
    }

}

class AsmParseLineResult {
    line_type =             'ERROR';
    line =                  'ERROR';
    instruction =           'ERROR';
    instruction_argument =  'ERROR';
    comments =              'ERROR';
    word =                  0;
    /** @type {EncodedInstruction|null} */
    dec =                   null;
}


/**
 * @param {string} string
 * @returns {number}
 **/
function number_format_helper(string) {
    let is_hex = false;
    let is_binary = false;
    let is_decimal = false;

    if (string.startsWith('R')) {
        string = string.substring(1);
    }
    if (string.startsWith('WR')) {
        string = string.substring(2);
    }

    if (string.startsWith('>')) {
        is_hex = true;
        string = string.substring(1);
    }
    if (string.startsWith('0x')) {
        is_hex = true;
        string = string.substring(2);
    }
    if (string.startsWith('0b')) {
        is_binary = true;
        string = string.substring(2);
    }
    if (!is_hex && !is_binary && string.match(/^-?\d+$/)) {
        is_decimal = true;
    }
    if (!is_hex && !is_binary && !is_decimal) {
        throw new Error('unparsable value');
    }
    const num = parseInt(string, is_decimal ? 10 : (is_hex ? 16 : 2));
    return num;
}
