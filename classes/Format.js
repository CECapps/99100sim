// @ts-check

import { Instruction } from "./Instruction";
import { OpInfo } from "./OpInfo";

export { FormatInfo, FormatParamConverter };

class FormatInfo {

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

    /**
     * @param {string} op_name
     * @param {string} params
     * @returns {FormatParamResult}
     **/
    static fromAsmString(op_name, params) {
        const result = new FormatParamResult;
        result.unparsed_param_string = params;

        const op_info = OpInfo.newFromString(op_name);
        if ( !(op_info instanceof OpInfo)) {
            throw new Error('Impossible broken opcode "${op_name}"');
        }

        result.opcode = op_info.opcode;

        const format_info = FormatInfo.newFromNumber(op_info.format);

        /** @type Object<string,string> */
        const asm_params = {};
        /** @type Object<string,number> */
        const parsed_params = {};

        const param_list = params.split(',');

        var i = 0;
        for (let param_name of format_info.asm_param_order) {
            asm_params[param_name] = param_list[i++];
            console.log(param_name, '=', asm_params[param_name]);
        }
        result.unparsed_params = asm_params;

        if (Object.hasOwn(format_info.opcode_params, 'Ts') && Object.hasOwn(asm_params, 'S')) {
            /** @type number[] */
            const type_and_value = this.#convertAddressingModeSyntax(asm_params['S']);
            console.log(type_and_value);
            parsed_params['Ts'] = type_and_value[0];
            parsed_params['S'] = type_and_value[1];
        }

        if (Object.hasOwn(format_info.opcode_params, 'Td') && Object.hasOwn(asm_params, 'D')) {
            /** @type number[] */
            const type_and_value = this.#convertAddressingModeSyntax(asm_params['D']);
            console.log(type_and_value);
            parsed_params['Td'] = type_and_value[0];
            parsed_params['D'] = type_and_value[1];
        }

        // All params are unsigned, except disp, which is a signed 8-bit integer.
        // We get it signed, but we need to convert it to unsigned.
        if (Object.hasOwn(asm_params, 'disp')) {
            const disp = parseInt(asm_params['disp']);
            parsed_params['disp'] = disp > 127 ? disp - 256 : disp;
        }
        if (Object.hasOwn(asm_params, '_immediate_word_')) {
            let processed_iw = asm_params['_immediate_word_'];
            if (processed_iw.startsWith('>') || processed_iw.startsWith('0x')) {
                processed_iw = parseInt(processed_iw.replace(/^(0x|>)/, ''), 16).toString();
            } else if (processed_iw.startsWith('0b')) {
                processed_iw = parseInt(processed_iw.replace(/^(0b)/, ''), 2).toString();
            }
            asm_params['_immediate_word_'] = processed_iw;
        }

        const skip_these = [ 'Td', 'D', 'Ts', 'S', 'disp' ];
        for (let param_name in format_info.opcode_params) {
            if (!skip_these.includes(param_name)) {
                parsed_params[param_name] = parseInt(asm_params[param_name]);
            }
            //console.log(param_name, parsed_params[param_name]);
            result.parsed_params[param_name] = parsed_params[param_name];
        }

        result.parsed_param_string = Object.values(result.parsed_params).join(',');

        return result;
    }


    /**
     * @param {Instruction} instr
     * @returns {FormatParamResult}
     **/
    static fromInstruction(instr) {
        const result = new FormatParamResult;

        if (!instr.isFinalized()) {
            throw new Error('Can not extract data from an unfinalized Instruction');
        }
        result.opcode = instr.opcode_info.opcode;

        const format_info = FormatInfo.newFromNumber(instr.opcode_info.format);
        console.debug(format_info);

        /** @type Object<string,string|number> */
        let assembled_params = {};

        if (Object.hasOwn(format_info.opcode_params, 'Ts') && Object.hasOwn(format_info.opcode_params, 'S')) {
            const type = instr.getParam('Ts');
            const value = instr.getParam('S');

            let register_syntax = 'R' + value;
            let symindex_syntax = '';
            if (type == 1 || type == 3) {
                register_syntax = '*' + register_syntax;
            }
            if (type == 3) {
                register_syntax = register_syntax + '+';
            }
            if (type == 2) {
                symindex_syntax = '@' + instr.getImmediateSourceValue().toString(10);
                if (value && value > 0 && value < 16) {
                    /** @FIXME whoops need to store value separately from following word */
                    symindex_syntax = symindex_syntax + `(${register_syntax})`;
                }
                register_syntax = '';
            }
            assembled_params['Ts'] = type;
            assembled_params['S'] = symindex_syntax + register_syntax;
        }

        /** @FIXME resync/merge with above */
        if (Object.hasOwn(format_info.opcode_params, 'Td') && Object.hasOwn(format_info.opcode_params, 'D')) {
            const type = instr.getParam('Td');
            const value = instr.getParam('D');

            let register_syntax = 'R' + value.toString();
            let symindex_syntax = '';
            if (type == 1 || type == 3) {
                register_syntax = '*' + register_syntax;
            }
            if (type == 3) {
                register_syntax = register_syntax + '+';
            }
            if (type == 2) {
                symindex_syntax = '@' + instr.getImmediateSourceValue().toString(10);
                if (value && value > 0) {
                    symindex_syntax = symindex_syntax + `(${register_syntax})`;
                }
                register_syntax = '';
            }
            assembled_params['Td'] = type;
            assembled_params['D'] = symindex_syntax + register_syntax;
            console.log(assembled_params['D']);
        }

        for (let param_name of format_info.asm_param_order) {
            if (param_name != 'S' && param_name != 'D') {
                assembled_params[param_name] = instr.getParam(param_name);
            }
        }
        for (let param_name of format_info.asm_param_order) {
            result.unparsed_params[param_name] = assembled_params[param_name].toString();
        }
        result.unparsed_param_string = Object.values(result.unparsed_params).join(',');

        for (let param_name of format_info.asm_param_order) {
            const pn = instr.getParam(param_name);
            console.debug(param_name, pn);
            if (param_name == 'S' || param_name == 'D') {
                assembled_params[param_name] = result.unparsed_params[param_name];
                continue;
            }
            assembled_params[param_name] = pn;
            result.unparsed_params[param_name] = pn.toString(10);
        }

        result.parsed_param_string = Object.values(assembled_params).join(',');
        for (let param_name in format_info.opcode_params) {
            const gp = instr.getParam(param_name);
            result.parsed_params[param_name] = gp;
        }

        return result;
    }

    /**
     * @param {string} value
     * @returns number[]
     **/
    static #convertAddressingModeSyntax(value) {
        let type = 0;
        let new_value = 0;
        const register_extract_regex = /(^|WR|R)(\d{1,2})([^\d]|$)/;
        if (value.startsWith('*') && value.endsWith('+')) {
            type = 3;
        }
        if (type == 0 && value.startsWith('*')) {
            type = 1;
        }
        if (type == 0 && value.startsWith('@')) {
            type = 2;
            // Type 2 means there's a following word that's the actual data.
            // We'll only get a positive integer value here for an index register.
            // Thus the fallthrough is just fine.
            /** @FIXME this is wrong */
            const extract = value.match(/^\@(0x|0b|>)?(\d+)\((WR|R)?(\d{1,2})\)/);
            if (extract) {
                new_value = parseInt(extract[3]);
            } else {
                if (value.startsWith('@')) {
                    value = value.substring(1);
                }
                if (value.startsWith('>')) {
                    value = parseInt(value.substring(1), 16).toString();
                }
                if (value.startsWith('0x')) {
                    value = parseInt(value.substring(2), 16).toString();
                }
                if (value.startsWith('0b')) {
                    value = parseInt(value.substring(2), 2).toString();
                }
                if (value.match(/^\d+$/)) {
                    new_value = parseInt(value);
                } else {
                    throw new Error('Probably impossible or a bug');
                }
            }
        }

        if (type != 2) {
            const extract = value.match(register_extract_regex);
            new_value = extract ? parseInt(extract[2]) : 0;
        }

        return [type, new_value];
    }

}

class FormatParamResult {
    opcode = 0;
    unparsed_param_string = '';
    parsed_param_string = '';

    /**
     * @type Object<string,string>
     **/
    unparsed_params = {};

    /**
     * @type Object<string,number>
     */
    parsed_params = {};

    /** @type {number|null} */
    immediate_operand = null;
    /** @type {number|null} */
    immediate_source_operand = null;
    /** @type {number|null} */
    immediate_dest_operand = null;

}
