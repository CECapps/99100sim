// @ts-check
"use strict";

import { Instruction } from "./Instruction";
import { InstructionDecode, EncodedInstruction } from "./InstructionDecode";

export { Asm, AsmParseLineResult };

class Asm {

    static #pi_list = [
        'IDT','BYTE','CKPT','DATA','EQU','TEXT','WPNT','AORG','BES','BSS',
        'DEND','DORG','DSEG','EVEN','PEND','PSEG','DFOP','DXOP','END','NOP',
        'RT','XVEC'
    ];

    /** @type string[] */
    #lines = [];

    /**
     * @type {AsmParseLineResult[]}
     **/
    #parsed_lines = [];

    /** @type {Object<string,AsmSymbol>} */
    #symbol_table = {};


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
        let i = 0;
        for (let line of this.#lines) {
            this.#parsed_lines[i] = this.#parseLine(line, i++);
        }

        this.#buildSymbolTable();
        this.#applySymbolTable();

        // With parsed_lines now populated, we can proceed
        /** @TODO PI support, label support */
        for (let line of this.#parsed_lines) {
            if (line.line_type == 'instruction') {
                const inst = this.#getInstructionFromLine(line);
                if (inst === null) {
                    throw new Error('No.  Just no.');
                }
                const dec = InstructionDecode.getEncodedInstruction(inst);
                line.encoded_instruction = dec;
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
                if (line.encoded_instruction !== null) {
                    for (let word of line.encoded_instruction.words) {
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
            if (line.encoded_instruction === null) {
                throw new Error('Can not reconstuct asm line without an EncodedInstruction');
            }
            const instr = InstructionDecode.getInstructionFromEncoded(line.encoded_instruction);

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

    /**
     * TI assembler syntax sucks, but there's only so much I can do to make it
     * suck less without making it harder to use other people's unmodified code.
     *
     * The core syntax is built on the assumption of a 60-character wide grid.
     * You know.  PUNCHCARDS.
     *
     * The nature of the line is driven by the first character.  An asterisk
     * means that it's a comment.  Whitespace means it's an instruction.  Anything
     * else becomes a label/identifier, and then the rest of the line is treated
     * as an instruction.
     *
     * Instructions come in the form of a 1-4 character long capitalized string.
     * Most instructions have operands that immediately follow after whitespace.
     * Parameters are divided by commas.  No whitespace is permitted within.
     * Any whitespace signals the end of the operand.  Anything following is
     * treated as comment.
     *
     * Some instructions are processing instructions, like DATA, EQU, and TEXT.
     * Instructions and parameters are processed to replace labels with their
     * associated values before any instructions are actually processed.  Some
     * other instructions are treated as macros, like "RT" becoming "B *R11"
     *
     * @param {string} line
     * @param {number} line_number
     **/
    #parseLine(line, line_number) {
        const result = new AsmParseLineResult();

        result.line = line;
        result.line_number = line_number
        result.line_type = 'pending';
        result.label = '';
        result.instruction = '';
        result.instruction_argument = '';
        result.comments = '';

        // Collapse all whitespace.
        line = line.replaceAll(/[\s\t\r\n]+/g, "\x20");

        // Comment lines start with asterisk by spec but I prefer semicolon.
        if (line.startsWith('*') || line.startsWith(';')) {
            result.line_type = 'comment';
            result.comments += line.substring(1).trim();
        }

        // Labels will always be at the start of the line.  The spec says that
        // they have a cap of six characters, to which I say "lol".  I also allow
        // a trailing colon because it looks nicer.
        const label_extract_regex = /^([a-zA-Z][a-zA-Z0-9_]+):?(\b|\s|$)/;
        const label_extract_matches = line.match(label_extract_regex);
        if (result.line_type == 'pending' && label_extract_matches) {
            result.label = label_extract_matches[1];
            line = line.substring(result.label.length);
            if (line.startsWith(':')) {
                line = line.substring(1);
            }
        }

        // With the label stripped off the front, it's time to strip known
        // comments from the end.  Whatever remains must be instruction-ish.
        // All of my comments will start with a semicolon.
        const inline_comment_regex = /;(.*)$/;
        const inline_comment_matches = line.match(inline_comment_regex);
        if (result.line_type == 'pending' && inline_comment_matches) {
            result.comments += inline_comment_matches[1];
            const inline_len = inline_comment_matches[1].length + 1;
            line = line.substring(0, line.length - inline_len);
        }

        line = line.trim();

        // All instructions are one to four all-capital letters.
        const instruction_regex = /^([A-Z]{1,4})(\s|$)/;
        const instruction_matches = line.match(instruction_regex);
        if (result.line_type == 'pending' && instruction_matches) {
            result.instruction = instruction_matches[1];
            result.line_type = Asm.#pi_list.includes(result.instruction) ? 'pi' : 'instruction';
            line = line.substring(result.instruction.length).trim();

            // The next chunk, if present, must be parameters.  Glom up everything
            // until we find whitespace.
            const params_regex = /^([^\s]+)/;
            const params_matches = line.match(params_regex);
            if (params_matches) {
                result.instruction_argument = params_matches[1];
                line = line.substring(result.instruction_argument.length);
                result.instruction_params = result.instruction_argument.split(',');
            }

            // Whatever remains must be a comment.
            result.comments += line.trim();
        }

        // A label with no corresponding instruction is just a label.
        if (result.line_type == 'pending' && result.label.length) {
            result.line_type = 'label';
        }

        // We've either processed everything away or are dealing with a blank.
        // Treat it as a comment.
        if (result.line_type == 'pending' && line.length == 0) {
            result.line_type = 'comment';
        }

        // Whoops!
        if (result.line_type == 'pending') {
            result.line_type = 'fallthrough';
        }

        //console.debug(result);
        return result;
    }

    #buildSymbolTable() {
        const pi_offset_instructions = [ 'BYTE', 'DATA', 'TEXT' ];
        const pi_assign_instructions = [ 'EQU' ];

        this.#symbol_table = {};
        let has_offsets = false;
        for (let line of this.#parsed_lines) {
            // Symbols are labels, so if there's no label, there can be no symbol.
            if (!line.label) {
                continue;
            }

            const is_pi = line.line_type == 'pi';
            const is_offset = is_pi && pi_offset_instructions.includes(line.instruction);
            const is_assign = is_pi && pi_assign_instructions.includes(line.instruction);

            // Labels on non-PI or offset PI lines get turned into the value of
            // the location counter during later processing.
            if (!is_pi || is_offset) {
                has_offsets = true;
                const sym = new AsmSymbol();
                sym.symbol_type = 'offset';
                sym.symbol_name = line.label;
                sym.line_number = line.line_number;
                this.#symbol_table[sym.symbol_name] = sym;
            }

            // Labels on assign PIs take on the value of the first param, but
            // that can also be a symbol, so defer resolving for now.
            if (is_assign) {
                const sym = new AsmSymbol();
                sym.symbol_type = 'assign';
                sym.line_number = line.line_number;
                sym.symbol_name = line.label;
                sym.symbol_params = line.instruction_params;
                this.#symbol_table[sym.symbol_name] = sym;
            }
        }

        // Now that we have a "complete" list of symbols, let's start resolving
        // them into usable values when we can.
        /** @type {string[]} */
        let needed_symbols = [];
        for (let sym_name in this.#symbol_table) {
            if (this.#symbol_table[sym_name].symbol_type != 'assign') {
                continue;
            }
            if (this.#symbol_table[sym_name].symbol_params.length) {
                if (looks_like_number(this.#symbol_table[sym_name].symbol_params[0])) {
                    this.#symbol_table[sym_name].symbol_value = number_format_helper(this.#symbol_table[sym_name].symbol_params[0]);
                    this.#symbol_table[sym_name].value_assigned = true;
                } else {
                    needed_symbols.push(this.#symbol_table[sym_name].symbol_params[0]);
                }
            }
        }

        // At least one of the assign symbols didn't resolve into a number, but
        // all others did.  Let's see if we can resolve them.
        if (needed_symbols.length) {
            for (let sym_name of needed_symbols) {
                if (!Object.hasOwn(this.#symbol_table, sym_name)) {
                    throw new Error('Assign PI refs unknown symbol(1): ' + sym_name);
                }
            }
            for (let sym_name in this.#symbol_table) {
                if (
                    this.#symbol_table[sym_name].symbol_type != 'assign'
                    || this.#symbol_table[sym_name].value_assigned
                    || !this.#symbol_table[sym_name].symbol_params.length
                ) {
                    continue;
                }
                const ref = this.#symbol_table[sym_name].symbol_params[0];
                if (!Object.hasOwn(this.#symbol_table, ref)) {
                    throw new Error('Assign PI refs unknown symbol(2): ' + ref);
                }
                this.#symbol_table[sym_name].symbol_value = this.#symbol_table[ref].symbol_value
                this.#symbol_table[sym_name].value_assigned = true;
            }
        }

        // We should now have resolved all assign-type symbols.  Swap them in!
        this.#applySymbolTable();

        // At this point, all assign-type symbols have been substituted.  We now
        // need to think about offset-type symbols.  This is a real problem.
        // Offsets can be used anywhere, including before the symbol is declared.
        // Additionally, jump instructions do not take an absolute value of the
        // desired offset, but a relative offset instead.  The major complicating
        // factor is that instructions can vary between one and four words, with
        // some instructions having a word count that varies based on the params.
        // We can find ourself in a situation where the offset value we need to
        // put into the params can actually change the word count!

        // We'll start by scanning for all occurrences of offset symbols in params.
        // The line and param location of each will be taken down.  While doing
        // this, we'll also create a guesstimated word count for each instruction.

        // With knowledge of where the offset symbols need to be swapped in, and
        // approximate knowledge of how many words each instruction takes, we
        // can now substitute in temporary values for the offsets.

        // With temporary values for all offsets in place, we can now go through
        // the instructions *again* and get a working EncodedInstruction for each.
        // The EI will give us a "real" word count for each instruction.

        // With a more confident word count, we now get to go through all the
        // offset symbol replacements, update their values, and regenerate EIs.

        // With final, "real" EIs, we can now give correct values to the offsets.

        // All symbols should now be assigned.  Nuke all the temporary changes
        // we've made to the params and then substitute the symbols cleanly.

        this.#applySymbolTable();

        console.debug(this.#symbol_table);
    }

    #applySymbolTable() {
        const indirect_regex = /^(\*)?(.+)(\+)?$/;
        const indexed_regex = /^@?(.+)\((.+)\)$/;
        for (let line of this.#parsed_lines) {
            if (line.line_type != 'instruction') {
                continue;
            }
            for (let i in line.instruction_params) {
                for (let sym_name in this.#symbol_table) {
                    if (!this.#symbol_table[sym_name].value_assigned) {
                        continue;
                    }
                    const symbol_value = this.#symbol_table[sym_name].symbol_value.toString()
                    // Is the param exactly one of our symbols?
                    if (line.instruction_params[i] == sym_name) {
                        line.instruction_params[i] = symbol_value;
                        //console.log('=> exact match', line.instruction_params[i], line);
                        continue;
                    }
                    // Is the param inside indirect or indirect autoinc mode syntax?
                    const indirect_matches = line.instruction_params[i].match(indirect_regex);
                    if (indirect_matches && indirect_matches[2] == sym_name && (indirect_matches[1] || indirect_matches[3])) {
                        const star = indirect_matches[1] == '*' ? '*' : '';
                        const plus = indirect_matches[3] == '+' ? '+' : '';
                        line.instruction_params[i] = star + symbol_value + plus;
                        //console.log('=> indirect/autoinc match', line.instruction_params[i], line);
                        continue;
                    }

                    // What about indexed mode?
                    const indexed_matches = line.instruction_params[i].match(indexed_regex);
                    if (indexed_matches) {
                        let addr = indexed_matches[1];
                        let index = indexed_matches[2];
                        if (addr == sym_name) {
                            addr = symbol_value;
                        }
                        if (index == sym_name) {
                            index = symbol_value;
                        }
                        line.instruction_params[i] = `@${addr}(${index})`;
                        //console.log('=> indexed match', line.instruction_params[i], line);
                        continue;
                    }

                    // Perhaps we're in symbolic mode?  If the @ was excluded,
                    // then the initial direct match should have worked.
                    if (line.instruction_params[i].startsWith('@')) {
                        line.instruction_params[i] = '@' + symbol_value;
                        //console.log('=> symbolic match', line.instruction_params[i], line);
                    }
                }
            }
        }
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
        const split_params = line.instruction_params;

        //console.debug(param_list, asm_param_list, opcode_param_list, split_params);

        let offset = 0;
        for (let param_name of asm_param_list) {
            const this_param = split_params[offset++];
            //console.debug(param_name, this_param, line);
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
    line_number =           0;
    line_type =             'ERROR';
    line =                  'ERROR';
    label =                 'ERROR';
    instruction =           'ERROR';
    instruction_argument =  'ERROR';
    /** @type {string[]} */
    instruction_params =    [];
    comments =              'ERROR';
    word =                  0;
    /** @type {EncodedInstruction|null} */
    encoded_instruction =   null;
}

class AsmSymbol {
    line_number = 0;
    symbol_name = '';
    symbol_type = 'ERROR';
    value_assigned = false;
    symbol_value = 0;
    /** @type {string[]} */
    symbol_params = [];
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
        is_decimal = true;
        string = string.substring(1);
    }
    if (string.startsWith('WR')) {
        is_decimal = true;
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

/**
 * @param {string} string
 * @returns {boolean}
 **/
function looks_like_register(string) {
    const matches = string.match(/^\*?(WR|R)?(\d{1,2})\+?$/);
    if (matches) {
        return parseInt(matches[2]) < 16;
    }
    return false;
}

/**
 * @param {string} string
 * @returns {boolean}
 **/
function looks_like_number(string) {
    return !!string.match(/^\-?(WR|R|>|0x|0b)?[a-fA-F0-9]+$/);
}
