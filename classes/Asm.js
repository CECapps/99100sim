// @ts-check
"use strict";

import { Instruction } from "./Instruction";
import { InstructionDecode, EncodedInstruction } from "./InstructionDecode";
import { OpInfo } from "./OpInfo";

export { Asm, AsmParseLineResult };

class Asm {

    static #pi_list = [
        'AORG', // Absolute Origin: Set Location Counter to value of argument
        'DORG', // Dummy Origin: Parse this section and add symbols but do not emit bytecode.
        'BSS',  // Block Starting with Symbol: Add argument to Location Counter.  Label is assigned previous (pre-add) Location Counter value.
        'BES',  // Block Ending with Symbol: Add argument to Location Counter.  Label is assigned new (post-add) Location Counter value.
        'EVEN', // Word Boundary:  Sets Location Counter to the following word boundary if odd.
        'END',  // Program End: Declare the end of the program and define the label in the argument as the entry point

        'IDT',  // Program Identifier: Assign printable program name, not placed in program.

        'BYTE', 'DATA', 'TEXT', // Initialize byte(s)/word(s)/ASCII text string
        'EQU',  // Define Assembly-time Constant: Assign the argument to the label.  May reference previously defined symbols.

        'CKPT', // Checkpoint Register: Define the default register to use for Format 12 checkpoint operations
        'DFOP', // Define Operation: Define an instruction alias
        'DXOP', // Define XOP: Define an instruction alias that points to a given XOP call

        'NOP',  // Becomes "JMP $+2"
        'RT'    // Becomes "B *R11"
    ];
    // These PIs can define symbols through the location counter and change the location counter when doing so.
    #pi_location_change_list = [ 'AORG', 'DORG', 'BSS', 'BES', 'EVEN', 'END' ];
    // These PIs can define symbols that reference the current value of the location counter
    #pi_location_list = [ 'BYTE', 'DATA', 'TEXT', 'DFOP', 'DXOP' ];
    // These PIs define symbols through their operands.
    #pi_assign_list = [ 'EQU', 'DFOP', 'DXOP' ];
    // These PIs declare data that will be included in the bytecode output.
    #pi_emitters_list = [ 'BYTE', 'DATA', 'TEXT', 'BSS', 'BES' ];
    // These PIs manipulate the contents of other lines.
    #pi_replace_list = [ 'CKPT', 'DFOP', 'DXOP' ];
    // These PIs are instantly replaced with another instruction.
    #pi_macro_list = [ 'NOP', 'RT' ];

    /** @type string[] */
    #lines = [];

    /** @type {Object.<string,string>} */
    #dfops = {};
    /** @type {Object.<string,number>} */
    #dxops = {};
    #current_ckpt_default = 10;

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
        this.#symbol_table = {};
    }

    process() {
        this.#parsed_lines = [];
        let i = 0;
        for (let line of this.#lines) {
            const line_processed = this.#parseLine(line, i);
            this.#preprocessLineSymbols(line_processed);
            const line_pid = this.#preprocessLinePIs(line_processed);
            this.#parsed_lines[i++] = line_pid;
        }
        console.debug(this.#symbol_table);

        this.#buildSymbolTable();
        this.#applySymbolTable();

        console.debug(this.#symbol_table);

        // Our lines have been processed and symbols replaced.  We can finally
        // build our bytecode.
        for (let line of this.#parsed_lines) {
            if (line.line_type == 'instruction') {
                line.encoded_instruction = InstructionDecode.getEncodedInstruction(this.#getInstructionFromLine(line));
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
                    f_params.push(this.#registerAddressingModeToStringHelper(line, instr.getParam('Ts'), instr.getParam('S')));
                    continue;
                }
                if (param_name == 'D' && Object.hasOwn(instr.opcode_info.format_info.opcode_params, 'Td')) {
                    f_params.push(this.#registerAddressingModeToStringHelper(line, instr.getParam('Td'), instr.getParam('D')));
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
     * Instructions come in the form of a 1-6 character long capitalized string.
     * Most instructions have operands that immediately follow after whitespace.
     * Parameters are divided by commas.  No whitespace is permitted within.
     * Any whitespace signals the end of the operand.  Anything following the
     * operands is treated as comment.  In general, instructions that take
     * optional operands only permit comments if an operand is given.
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

        // All instructions are one to four all-capital letters, but there are
        // a few PIs that extend up to six letters.
        const instruction_regex = /^([A-Z]{1,6})(\s|$)/;
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

    /**
     * @param {AsmParseLineResult} line
     **/
    #preprocessLineSymbols(line) {
        if (line.line_type != 'pi' && line.line_type != 'label') {
            return;
        }
        const sym = new AsmSymbol;
        sym.symbol_params = line.instruction_params;
        sym.line_number = line.line_number;

        // Pure labels become location symbols that we have to resolve later.
        if (line.line_type == 'label') {
            sym.symbol_name = line.label;
            sym.symbol_type = 'location';
            sym.symbol_value = 0;
            sym.value_assigned = false;

            if (Object.hasOwn(this.#symbol_table, sym.symbol_name)) {
                throw new Error(`Attempt to redefine symbol ${sym.symbol_name} on line ${line.line_number}`);
            }
            this.#symbol_table[sym.symbol_name] = sym;
            return;
        }

        // EQU creates a symbol and assigns it the value of the single operand
        if (line.instruction == 'EQU') {
            sym.symbol_type = 'assign';
            sym.symbol_name = line.label;
            sym.value_assigned = false;

            if (looks_like_number(line.instruction_params[0])) {
                sym.symbol_value = number_format_helper(line.instruction_params[0]);
            }

            if (Object.hasOwn(this.#symbol_table, sym.symbol_name)) {
                throw new Error(`Attempt to redefine symbol ${sym.symbol_name} on line ${line.line_number}`);
            }
            this.#symbol_table[sym.symbol_name] = sym;
            return;
        }

        // DFOP creates a string value symbol that is valid only in the context
        // of replacing an instruction.  This makes things ugly because the rest
        // of the code assumes that the symbol value is numeric.  Meh.
        if (line.instruction == 'DFOP') {
            sym.symbol_type = 'assign';
            sym.symbol_name = line.instruction_params[0];
            sym.symbol_value = 0;
            sym.value_assigned = false; // A lie to be corrected later.

            if (Object.hasOwn(this.#symbol_table, sym.symbol_name)) {
                throw new Error(`Attempt to redefine symbol ${sym.symbol_name} on line ${line.line_number}`);
            }
            this.#symbol_table[sym.symbol_name] = sym;

            this.#dfops[sym.symbol_name] = line.instruction_params[1];
            return;
        }

        // Like DFOP, DXOP works only in the context of replacing an instruction.
        // Unlike DFOP, DXOP gets the luxury of actually assigning a number.
        if (line.instruction == 'DXOP') {
            sym.symbol_type = 'assign';
            sym.symbol_name = line.instruction_params[0];
            sym.value_assigned = false;

            if (looks_like_number(line.instruction_params[0])) {
                sym.symbol_value = number_format_helper(line.instruction_params[1]);
                sym.value_assigned = true;
            }

            if (Object.hasOwn(this.#symbol_table, sym.symbol_name)) {
                throw new Error(`Attempt to redefine symbol ${sym.symbol_name} on line ${line.line_number}`);
            }
            this.#symbol_table[sym.symbol_name] = sym;

            this.#dxops[sym.symbol_name] = sym.symbol_value;
            return;
        }

        if (!this.#pi_location_change_list.includes(line.instruction) && !this.#pi_location_list.includes(line.instruction)) {
            return;
        }
        // If we got here, our PI creates a symbol using the label, assigning the
        // value of the location counter.  We're too early in the process to
        // actually have a location counter, so these don't get assigned a value.
        if (!line.label) {
            return;
        }
        sym.symbol_name = line.label;
        sym.symbol_type = 'location';
        sym.symbol_value = 0;
        sym.value_assigned = false;

        if (Object.hasOwn(this.#symbol_table, sym.symbol_name)) {
            throw new Error(`Attempt to redefine symbol ${sym.symbol_name} on line ${line.line_number}`);
        }
        this.#symbol_table[sym.symbol_name] = sym;
    }

    /**
     * @param {AsmParseLineResult} line
     * @returns {AsmParseLineResult}
     **/
    #preprocessLinePIs(line) {
        if (line.line_type != 'instruction' && line.line_type != 'pi') {
            return line;
        }

        // DFOPs get replaced with their real operation
        if (Object.hasOwn(this.#dfops, line.instruction)) {
            line.line_type = 'instruction';
            line.instruction = this.#dfops[line.instruction];
        }

        // RT becomes B *R11
        if (line.instruction == 'RT') {
            line.line_type = 'instruction';
            line.instruction = 'B';
            line.instruction_argument = '*R11';
            line.instruction_params = [ '*R11' ];
            // No further processing is possible or needed.
            return line;
        }

        // NOP becomes JMP 2
        if (line.instruction == 'NOP') {
            line.line_type = 'instruction';
            line.instruction = 'JMP';
            line.instruction_argument = '2';
            line.instruction_params = [ '2' ];
            // No further processing is possible or needed.
            return line;
        }

        // CKPT defines the current, running checkpoint value for Format 12,
        // which we process below.
        if (line.instruction == 'CKPT') {
            this.#current_ckpt_default = number_format_helper(line.instruction_params[0]);
            // No further processing is possible or needed.
            return line;
        }

        // DXOPs get replaced with the appropriate XOP call by prepending the
        // XOP number to the params.  The remaining param is Ts+S.
        if (Object.hasOwn(this.#dxops, line.instruction)) {
            line.line_type = 'instruction';
            line.instruction = 'XOP';
            line.instruction_params.unshift(this.#dxops[line.instruction].toString());
            line.instruction_argument = line.instruction_params.join(',');
            // No further processing is possible or needed.
            return line;
        }

        // Format 12 instructions are interruptable and store their state in a
        // specified register called the checkpoint register.  A default can be
        // be specified via the CKPT PI (done above).  Sub it in if needed.
        if (line.line_type == 'instruction' && OpInfo.opNameIsValid(line.instruction)) {
            const opcode_info = OpInfo.getFromOpName(line.instruction);
            if (opcode_info.format == 12 && !looks_like_register(line.instruction_params[2])) {
                line.instruction_params[2] = 'R' + this.#current_ckpt_default.toString();
                line.instruction_argument = line.instruction_params.join(',');
            }
        }

        return line;
    }

    #buildSymbolTable() {
        /** @type {Object.<string,AsmSymbol>} */
        const assign_instructions = {};
        /** @type {Object.<string,AsmSymbol>} */
        const location_instructions = {};

        // The location instructions are far more difficult to deal with than
        // the assign instructions.  Each of them represents a specific byte
        // offset into the eventual assembled list of words.  To calculate their
        // actual values, we need to generate the word(s) for each instruction.
        // But we can't actually do that until we've substituted all the symbols.
        // But to substitute all the symbols, we need to generate the word(s) for
        // each instruction.  Additionally, instructions in any Format that
        // includes Ts or Td can actually spring additional words depending on
        // the substitutions!  Oh, and the jump instructions of Formats 2 and 17
        // take a *RELATIVE* location instead of the absolute location, so we
        // need to calculate those.

        let estimated_word_count = 0;
        // Number of times we've iterated over parsed_lines: 2
        for (let line of this.#parsed_lines) {
            if (line.line_type == 'instruction') {
                if (!OpInfo.opNameIsValid(line.instruction)) {
                    throw new Error(`Invalid instruction "${line.instruction}" on line ${line.line_number}`);
                }
                estimated_word_count += OpInfo.getFromOpName(line.instruction).minimum_instruction_words;
                continue;
            }
            // Symbols are labels, so don't bother looking at label-less PIs.
            if (!line.label.length) {
                continue;
            }

            const is_assign = line.line_type == 'pi' && line.instruction && this.#pi_assign_list.includes(line.instruction);
            const is_location = line.line_type == 'label' || (line.line_type == 'pi' && line.instruction && this.#pi_location_list.includes(line.instruction));

            if (is_assign) {
                const sym = new AsmSymbol;
                sym.symbol_name = line.label;
                sym.symbol_value = number_format_helper(line.instruction_params[0]);
                sym.symbol_type = 'assign';

                sym.line_number = line.line_number;
                sym.symbol_params = line.instruction_params;
                sym.value_assigned = true;
                assign_instructions[line.label] = sym;
            } else if(is_location) {
                const sym = new AsmSymbol;
                sym.symbol_name = line.label;
                sym.symbol_value = estimated_word_count;
                sym.symbol_type = 'location';

                sym.line_number = line.line_number;
                sym.symbol_params = line.instruction_params;
                sym.value_assigned = false; // yes really
                location_instructions[line.label] = sym;
            }
        }

        // We now have correct values for our assign instructions, and reasonable
        // best guesses for our location instructions.  This should be enough to
        // substitute in values where needed.
        estimated_word_count = 0;
        // Number of times we've iterated over parsed_lines: 3
        for (let line of this.#parsed_lines) {
            // The word values in this iteration should be more correct.
            if (line.line_type == 'label' || (line.line_type == 'pi' && line.instruction && this.#pi_location_list.includes(line.instruction))) {
                location_instructions[line.label].symbol_value = estimated_word_count;
                location_instructions[line.label].value_assigned = true;
            }
            if (line.line_type != 'instruction') {
                continue;
            }
            const format = OpInfo.getFromOpName(line.instruction).format;

            for (let i in line.instruction_params) {
                for (let symbol_name in assign_instructions) {
                    line.instruction_params[i] = this.#symbolReplaceHelper(line.instruction_params[i], symbol_name, assign_instructions[symbol_name].symbol_value.toString());
                }
                for (let symbol_name in location_instructions) {
                    let nv = location_instructions[symbol_name].symbol_value;
                    // Jump instructions get the offset adjust thing.
                    if (format == 2 || format == 17) {
                        // We count words but jumps take bytes
                        nv = (nv - estimated_word_count) * 2;
                    }
                    line.instruction_params[i] = this.#symbolReplaceHelper(line.instruction_params[i], symbol_name, nv.toString());
                }
            }
            const ei = InstructionDecode.getEncodedInstruction(this.#getInstructionFromLine(line));
            estimated_word_count += ei.words.length;

            // All of this was a draft, so let's reset the params to process later.
            line.instruction_params = line.instruction_argument.split(',');
        }

        // We should now have correct location instruction values.  We can finally
        // build the symbol table!
        this.#symbol_table = {};
        for (let symbol_name in assign_instructions) {
            if (assign_instructions[symbol_name].value_assigned) {
                this.#symbol_table[symbol_name] = assign_instructions[symbol_name];
            }
        }
        for (let symbol_name in location_instructions) {
            if (location_instructions[symbol_name].value_assigned && !Object.hasOwn(this.#symbol_table, symbol_name)) {
                this.#symbol_table[symbol_name] = location_instructions[symbol_name];
            }
        }

    }

    /**
     * @param {string} param_value
     * @param {string} symbol_name
     * @param {string} symbol_value
     **/
    #symbolReplaceHelper(param_value, symbol_name, symbol_value) {
        // We can assume that symbols will never look like numbers, so if this
        // is a number, don't even try any of the replacement techniques.
        if (looks_like_number(param_value)) {
            return param_value;
        }

        const indirect_regex = /^(\*)?(.+)(\+)?$/;
        const indexed_regex = /^@?(.+)\((.+)\)$/;

        // Easy mode: the param is the symbol.
        if (param_value == symbol_name) {
            return symbol_value;
        }

        // Challenge mode: the param is a register in indirect/autoinc mode.
        const indirect_matches = param_value.match(indirect_regex);
        if (indirect_matches && indirect_matches[2] == symbol_name && (indirect_matches[1] || indirect_matches[3])) {
            const star = indirect_matches[1] == '*' ? '*' : '';
            const plus = indirect_matches[3] == '+' ? '+' : '';
            return star + symbol_value + plus;
        }

        // Hard mode: indexed
        const indexed_matches = param_value.match(indexed_regex);
        if (indexed_matches) {
            let addr = indexed_matches[1];
            let index = indexed_matches[2];
            if (addr == symbol_name) {
                addr = symbol_value;
            }
            if (index == symbol_name) {
                index = symbol_value;
            }
            return `@${addr}(${index})`;
        }

        // Perhaps we're in symbolic mode?  If the @ was excluded and there's no
        // following parens, the initial param==symbol check should catch it.
        if (param_value.startsWith('@')) {
            return '@' + symbol_value;
        }

        // Fallthrough!
        return param_value;
    }

    #applySymbolTable() {
        let word_count = 0;
        // Number of times we've iterated over parsed_lines: 4
        for (let line of this.#parsed_lines) {
            if (line.line_type != 'instruction') {
                continue;
            }
            // Clean up the mess from earlier processing.
            line.instruction_params = line.instruction_argument.split(',');

            // Yay yet another disposable Instruction!
            const inst = Instruction.newFromString(line.instruction);
            const format = inst.opcode_info.format;
            for (let i in line.instruction_params) {
                for (let sym_name in this.#symbol_table) {
                    if (!this.#symbol_table[sym_name].value_assigned) {
                        continue;
                    }
                    let symbol_value = this.#symbol_table[sym_name].symbol_value;
                    // Jump instructions get the offset adjust thing.  This SHOULD
                    // be as simple as subtracting the current word count from
                    // the word count (== value) of the location symbol and then
                    // doubling the value because that's how jumps work?
                    if (this.#symbol_table[sym_name].symbol_type == 'location' && (format == 2 || format == 17)) {
                        symbol_value = (symbol_value - word_count) * 2;
                        //console.debug(line, this.#symbol_table[sym_name].symbol_value, symbol_value);
                    }
                    line.instruction_params[i] = this.#symbolReplaceHelper(line.instruction_params[i], sym_name, symbol_value.toString());
                }
                inst.setParam(inst.opcode_info.format_info.asm_param_order[i], line.instruction_params[i]);
            }
            const ei = InstructionDecode.getEncodedInstruction(inst);
            word_count += ei.words.length;
        }
    }

    /** @param {AsmParseLineResult} line */
    #getInstructionFromLine(line) {
        const inst = Instruction.newFromString(line.instruction);

        if (!inst.isLegal()) {
            console.error('illegal op??', line, inst);
            throw new Error('Illegal instruction (1) while parsing line ' + line.line_number);
        }
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
                const res = this.#registerStringToAddressingModeHelper(this_param);
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
                const res = this.#registerStringToAddressingModeHelper(this_param);
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
            throw new Error('Illegal instruction (2) while parsing line ' + line.line_number);
        }
        return inst;
    }

    /**
     * @param {AsmParseLineResult} line
     * @param {number} type
     * @param {number} value
     **/
    #registerAddressingModeToStringHelper(line, type, value) {
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
    #registerStringToAddressingModeHelper(register_string) {
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
    let is_negative = false;

    if (string.startsWith('-')) {
        is_negative = true;
        string = string.substring(1);
    }

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

    if (!is_hex && !is_binary && string.match(/^\d+$/)) {
        is_decimal = true;
    }

    if (!is_hex && !is_binary && !is_decimal) {
        console.debug(string);
        throw new Error('number_format_helper: unparsable value');
    }

    let num = parseInt(string, is_decimal ? 10 : (is_hex ? 16 : (is_binary ? 2 : 10)));
    if (is_negative) {
        num *= -1;
    }
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
