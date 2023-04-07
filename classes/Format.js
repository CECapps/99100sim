// @ts-check

import { Instruction } from "./Instruction";

export class FormatInfo {

    // Generated
    get has_immediate_operand() {           return this.format_number == 8; }
    get has_possible_immediate_source() {   return this.asm_param_order.includes('Ts'); }
    get has_possible_immediate_dest() {     return this.asm_param_order.includes('Td'); }
    get has_second_opcode_word() {          return (this.format_number > 11) && (this.format_number != 18); }

    // Overridden
    get format_number() {                   return 0; }
    get opcode_param_start_bit() {          return 0; }

    /** @returns {Object.<string, number>} */
    get opcode_params() { return {}; }

    /** @returns {string[]} */
    get asm_param_order() { return []; }

    /** @protected Use the static newFrom... method below */
    constructor() {
    }

    /**
     * @type {Object.<number,FormatInfo>}
     **/
    static #formats = {
        1: new class Format1Info extends FormatInfo {
            get format_number() {                   return 1; }
            get opcode_param_start_bit() {          return 4; }
            get opcode_params() {                   return { 'Td': 2, 'D': 4, 'Ts': 2, 'S': 4 }; }
            get asm_param_order() {                 return [ 'S', 'D' ]; }
        },
        2: new class Format2Info extends FormatInfo {
            get format_number() {                   return 2; }
            get opcode_param_start_bit() {          return 8; }
            get opcode_params() {                   return { 'disp': 8 }; }
            get asm_param_order() {                 return [ 'disp' ]; }
        },
        3: new class Format3Info extends FormatInfo {
            get format_number() {                   return 3; }
            get opcode_param_start_bit() {          return 6; }
            get opcode_params() {                   return { 'D': 4, 'Ts': 2, 'S': 4 }; }
            get asm_param_order() {                 return [ 'S', 'D' ]; }
        },
        4: new class Format4Info extends FormatInfo {
            get format_number() {                   return 4; }
            get opcode_param_start_bit() {          return 6; }
            get opcode_params() {                   return { 'num': 4, 'Ts': 2, 'S': 4 }; }
            get asm_param_order() {                 return [ 'S', 'num' ]; }
        },
        5: new class Format5Info extends FormatInfo {
            get format_number() {                   return 5; }
            get opcode_param_start_bit() {          return 8; }
            get opcode_params() {                   return { 'count': 4, 'reg': 4 }; }
            get asm_param_order() {                 return [ 'count', 'reg' ]; }
        },
        6: new class Format6Info extends FormatInfo {
            get format_number() {                   return 6; }
            get opcode_param_start_bit() {          return 10; }
            get opcode_params() {                   return { 'Ts': 2, 'S': 4 }; }
            get asm_param_order() {                 return [ 'S' ]; }
        },
        7: new class Format7Info extends FormatInfo {
            get format_number() {                   return 7; }
            get opcode_param_start_bit() {          return 0; }
            get opcode_params() {                   return { }; }
            get asm_param_order() {                 return [ ]; }
        },
        8: new class Format8Info extends FormatInfo {
            get format_number() {                   return 8; }
            get opcode_param_start_bit() {          return 12; }
            get opcode_params() {                   return { 'reg': 4 }; }
            get asm_param_order() {                 return [ 'reg', '_immediate_word_' ]; }
        },
        9: new class Format9Info extends FormatInfo {
            get format_number() {                   return 9; }
            get opcode_param_start_bit() {          return 6; }
            // The docs call this field D but it is not the same D as the others
            // and marking it as D may result in confusion.  It's the operation
            // number in XOP, and thus I name it capital O.
            get opcode_params() {                   return { 'O': 4, 'Ts': 2, 'S': 4 }; }
            get asm_param_order() {                 return [ 'S', 'O' ]; }
        },
        10: new class Format10Info extends FormatInfo {
            get format_number() {                   return 10; }
            get opcode_param_start_bit() {          return 11; }
            get opcode_params() {                   return { 'm': 1, 'reg': 4 }; }
            get asm_param_order() {                 return [ 'reg', 'm' ]; }
        },
        11: new class Format11Info extends FormatInfo {
            get format_number() {                   return 11; }
            get opcode_param_start_bit() {          return 16; }
            get opcode_params() {                   return { 'bc': 4, 'Td': 2, 'D': 4, 'Ts': 2, 'S': 4 }; }
            get asm_param_order() {                 return [ 'S', 'D', 'bc' ]; }
        },
        12: new class Format12Info extends FormatInfo {
            get format_number() {                   return 12; }
            get opcode_param_start_bit() {          return 12; }
            get opcode_params() {                   return { 'ckpt': 4, 'bc': 4, 'Td': 2, 'D': 4, 'Ts': 2, 'S': 4 }; }
            get asm_param_order() {                 return [ 'S', 'D', 'bc', 'ckpt' ]; }
        },
        13: new class Format13Info extends FormatInfo {
            get format_number() {                   return 13; }
            get opcode_param_start_bit() {          return 16; }
            get opcode_params() {                   return { 's_len': 4, 'nu': 2, 'count': 4, 'Ts': 2, 'S': 4 }; }
            get asm_param_order() {                 return [ 'S', 's_len', 'count' ]; }
        },
        14: new class Format14Info extends FormatInfo {
            get format_number() {                   return 14; }
            get opcode_param_start_bit() {          return 16; }
            get opcode_params() {                   return { 'pos': 10, 'Ts': 2, 'S': 4 }; }
            get asm_param_order() {                 return [ 'S', 'pos' ]; }
        },
        15: new class Format15Info extends FormatInfo {
            get format_number() {                   return 15; }
            get opcode_param_start_bit() {          return 12; }
            get opcode_params() {                   return { 'width': 4, 'pos': 4, 'nu': 6, 'Ts': 2, 'S': 4 }; }
            get asm_param_order() {                 return [ 'S', 'pos', 'width' ]; }
        },
        16: new class Format16Info extends FormatInfo {
            get format_number() {                   return 16; }
            get opcode_param_start_bit() {          return 12; }
            get opcode_params() {                   return { 'width': 4, 'pos': 4, 'Td': 2, 'D': 4, 'Ts': 2, 'S': 4 }; }
            get asm_param_order() {                 return [ 'S', 'D', 'pos', 'width' ]; }
        },
        17: new class Format17Info extends FormatInfo {
            get format_number() {                   return 17; }
            get opcode_param_start_bit() {          return 16; }
            get opcode_params() {                   return { 'count': 4, 'reg': 4, 'disp': 8 }; }
            get asm_param_order() {                 return [ 'disp', 'count', 'reg' ]; }
        },
        18: new class Format18Info extends FormatInfo {
            get format_number() {                   return 18; }
            get opcode_param_start_bit() {          return 12; }
            get opcode_params() {                   return { 'reg': 4 }; }
            get asm_param_order() {                 return [ 'reg' ]; }
        },
        19: new class Format19Info extends FormatInfo {
            get format_number() {                   return 19; }
            get opcode_param_start_bit() {          return 16; }
            get opcode_params() {                   return { 'nu': 4, 'Td': 2, 'D': 4, 'Ts': 2, 'S': 4 }; }
            get asm_param_order() {                 return [ 'S', 'D' ]; }
        },
        20: new class Format20Info extends FormatInfo {
            get format_number() {                   return 20; }
            get opcode_param_start_bit() {          return 16; }
            get opcode_params() {                   return { 'cond': 4, 'Td': 2, 'D': 4, 'Ts': 2, 'S': 4 }; }
            get asm_param_order() {                 return [ 'cond', 'S', 'D' ]; }
        },
        21: new class Format21Info extends FormatInfo {
            get format_number() {                   return 21; }
            get opcode_param_start_bit() {          return 12; }
            get opcode_params() {                   return { 'd_len': 4, 's_len': 4, 'Td': 2, 'D': 4, 'Ts': 2, 'S': 4 }; }
            get asm_param_order() {                 return [ 'S', 'D', 's_len', 'd_len' ]; }
        },
    };

    /**
     * @param {number} num
     * @returns {FormatInfo}
     **/
    static newFromNumber(num) {
        if (num < 1 || num > 21) {
            throw new Error('Format out of range, how did you do that!?');
        }
        return this.#formats[num];
    }

}

class FormatParamConverter {

    static newFromOpcode() {}
    static newFromAsmString() {}
    static newFromInstruction() {}

    /**
     * @param {FormatParamResult} result
     **/
    static getAsmStringFromResult(result) {}

}

class FormatParamResult {
    opcode = 0;
    unparsed_param_string = '';
    parsed_param_string = '';

    /**
     * @type object<string,number>[]
     **/
    unparsed_params = [];

    /**
     * @type object<string,number>[]
     */
    parsed_params = [];
}
