// @ts-check
"use strict";

import { Instruction } from "./Instruction";
import { InstructionDecode, EncodedInstruction } from "./InstructionDecode";
import { OpInfo } from "./OpInfo";

export { Asm, AsmParseLineResult };

/*global number_to_hex */

class Asm {

    static #pi_list = [
        'AORG', // Absolute Origin: Set Location Counter to value of argument
        'DORG', // Dummy Origin: Parse this section and add symbols but do not emit bytecode.
        'BSS',  // Block Starting with Symbol: Add argument to Location Counter.  Label is assigned previous (pre-add) Location Counter value.
        'BES',  // Block Ending with Symbol: Add argument to Location Counter.  Label is assigned new (post-add) Location Counter value.
        'EVEN', // Word Boundary:  Sets Location Counter to the following word boundary if odd.
        'END',  // Program End: Declare the end of the program and define the label in the argument as the entry point

        'PSEG', // Program Segment: A declared area of stuff considered the program.  Relocatable, but that's not implemented.
        'PEND', // End Program Segment
        'DSEG', // Data Segment: A declared area of stuff that contains only data, no code.  Relocatable, but that's not implemented.
        'DEND', // End Data Segment
        'CSEG', // Common Segment: A declared area of stuff that contains data to be shared between multiple programs.  Relocatable etc
        'CEND', // Common Segment End

        'BYTE', // Initialize byte(s)/word(s)/ASCII text string
        'DATA',
        'TEXT',
        'EQU',  // Define Assembly-time Constant: Assign the argument to the label.  May reference previously defined symbols.

        'CKPT', // Checkpoint Register: Define the default register to use for Format 12 checkpoint operations
        'DFOP', // Define Operation: Define an instruction alias
        'DXOP', // Define XOP: Define an instruction alias that points to a given XOP call

        'NOP',  // Becomes "JMP $+2"
        'RT'    // Becomes "B *R11"
    ];

    // These PIs can define symbols through the location counter and change the location counter when doing so.
    static #pi_location_change_list = ['AORG', 'DORG', 'BSS', 'BES', 'EVEN'];
    // These PIs declare segments of code or data
    static #pi_segment_list = ['PSEG', 'PEND', 'DSEG', 'DEND', 'CSEG', 'CEND'];
    // These PIs can define symbols that reference the current value of the location counter
    static #pi_location_list = ['BYTE', 'DATA', 'TEXT', 'DFOP', 'DXOP', 'PSEG', 'PEND', 'DSEG', 'DEND', 'CSEG', 'CEND'];
    // These PIs define symbols through their operands.
    static #pi_assign_list = ['EQU', 'DFOP', 'DXOP', 'END'];
    // These PIs declare data that will be included in the bytecode output.
    static #pi_emitters_list = ['BYTE', 'DATA', 'TEXT', 'BSS', 'BES'];
    // These PIs manipulate the contents of other lines.
    static #pi_replace_list = ['CKPT', 'DFOP', 'DXOP'];
    // These PIs are instantly replaced with another instruction.
    static #pi_macro_list = ['NOP', 'RT'];
    // These PIs are not supported.
    /*eslint-disable array-element-newline */
    static #pi_unsupported_list = [
        // Source code printing options
        'OPTION', 'IDT', 'TITL', 'LIST', 'UNL', 'PAGE', 'SETRM',
        // Complex replacement operations dealing with transfer vectors
        'WPNT', 'XVEC',
        // Relocatable segment and external reference instructions
        'RORG', 'DEF', 'REF', 'SREF', 'LOAD', 'COPY',
        // Conditional and macro instructions
        'ASMIF', 'ASMELS', 'ASMEND', 'SETMNL',
    ];
    /*eslint-enable array-element-newline */

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
        for (const line of this.#lines) {
            const line_processed = this.#parseLine(line, i);
            // Extract possible symbols, but don't alter the line
            this.#processLineSymbolsIntoSymbolTable(line_processed);
            // Now check for PIs that alter the line.  This relies on having a
            // completely defined (up until now) symbol table.
            const line_pid = this.#preProcessLinePIs(line_processed);
            this.#parsed_lines[i++] = line_pid;
        }

        // Estimate the location counter values and give location symbols values
        // that are good enough estimates to continue.
        this.#preProcessLocationCounterSymbols();
        // Symbols can be self-referential, so resolve those references.
        this.#preProcessUndefinedSymbols();
        // All symbols should be defined by this point, so go ahead and sub in
        // their values inside each candidate param.
        this.#preProcessParamSymbols();

        // Subbing in symbol values can change the word count for a whole bunch
        // of different instructions.  The values assigned should be good enough
        // to create an accurate location counter and thus more accurate locations.
        this.#processLocationCounterSymbols();
        // With location symbols resolved, it's time to go back through all
        // of the symbols and rebuild self-referential references.
        this.#processUndefinedSymbols();
        // With all symbols resolved we can perform the final param substitution.
        this.#processParamSymbols();

        // With all symbols substituted, we can now build our bytecode.
        this.#processLinesToBytecode();

        // And now ignore all of the above and do it the old way lol

        this.#buildSymbolTable();
        this.#applySymbolTable();

        // Our lines have been processed and symbols replaced.  We can finally
        // build our bytecode.
        for (const line of this.#parsed_lines) {
            if (line.line_type == 'instruction') {
                line.encoded_instruction = InstructionDecode.getEncodedInstruction(this.#getInstructionFromLine(line));
            }
        }
        return this.#parsed_lines;
    }

    /**
     * First generation parsing.  Works but insufficient, thinks only of the
     * program section and ignores actual data.
     *
     * Transform our parsed lines into bytecode.
     **/
    toWords() {
        /** @type number[] */
        const words = [];
        for (const line of this.#parsed_lines) {
            const is_instruction = line.line_type == 'instruction';
            const is_pi_data = ((line.line_type == 'pi') && (line.instruction == 'data'));
            if (is_instruction || is_pi_data) {
                if (line.encoded_instruction !== null) {
                    for (const word of line.encoded_instruction.words) {
                        words.push(word);
                    }
                } else {
                    words.push(line.fallback_word);
                }
            }
        }
        return words;
    }

    /**
     * First generation parsing.  Works but insufficient, thinks only of the
     * program section and ignores actual data.
     *
     * Transform our parsed lines back into assembly, with all symbols subbed.
     * This also returns the original comments.
     **/
    toAsm() {
        /** @type string[] */
        const asm = [];
        for (const line of this.#parsed_lines) {
            const is_pi_data = ((line.line_type == 'pi') && (line.instruction == 'data'));
            if (is_pi_data) {
                const f_word = number_to_hex(line.fallback_word);
                const f_comments = line.comments.length ? ` ; ${line.comments}` : '';
                const f_string = `DATA >${f_word}`;
                asm.push(f_string.padEnd(18, ' ') + f_comments);
            }

            const is_instruction = line.line_type == 'instruction';
            if (line.line_type == 'comment' && line.comments.length > 0) {
                asm.push(`; ${line.comments}`);
                continue;
            }
            if (!is_instruction) {
                continue;
            }

            if (line.encoded_instruction === null) {
                throw new Error('Can not reconstruct asm line without an EncodedInstruction');
            }
            const instr = InstructionDecode.getInstructionFromEncoded(line.encoded_instruction);

            const f_instr = instr.opcode_info.name.padEnd(8, ' ');
            const f_params = [];
            for (const param_name of instr.opcode_info.format_info.asm_param_order) {
                if (param_name == '_immediate_word_') {
                    const imword = number_to_hex(instr.getImmediateValue());
                    f_params.push(`>${imword}`);
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
                const is_register_number = ['reg'].includes(param_name);
                f_params.push((is_register_number ? 'R' : '') + param_value);
            }
            const f_comments = line.comments.length ? ` ; ${line.comments}` : '';
            asm.push(`    ${f_instr}${f_params.join(',').padEnd(10, ' ')}${f_comments}`);
        }
        return asm;
    }

    /**
     * First generation line parsing.  Correct but plays fast and loose with the spec.
     *
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
        result.line_number = line_number;
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
        // a few PIs that extend up to six letters.  Not all things that we see
        // in the instruction field are going to be instructions.  Let's tag
        // things we know are unsupported, that we know are PIs, and that we
        // know are instructions.
        let is_instruction = false;
        let is_pi = false;
        const instruction_regex = /^([A-Z]{1,6})(\s|$)/;
        const instruction_matches = line.match(instruction_regex);
        if (result.line_type == 'pending' && instruction_matches) {
            result.instruction = instruction_matches[1];
            if (Asm.#pi_list.includes(result.instruction)) {
                is_pi = true;
            } else if (OpInfo.opNameIsValid(result.instruction)) {
                is_instruction = true;
            } else if (Asm.#pi_unsupported_list.includes(result.instruction)) {
                console.error('Unsupported PI, ignoring', result, line);
                result.line_type = 'comment';
                result.comments += line;
                line = '';
            }
        }

        // We might still see an unknown instruction here, but that is fine.
        // Things like DFOP & DXOP may well convert it into a real instruction,
        // but that can't yet be dealt with here.
        if (is_instruction || is_pi || (result.line_type == 'pending' && instruction_matches)) {
            result.line_type = is_pi ? 'pi' : 'instruction';
            line = line.substring(result.instruction.length).trim();

            // Extract the likely params
            const ppres = this.#parseParams(line, line_number);
            result.parsed_params = ppres.params;
            line = ppres.remainder;

            // Old code relies on instruction_params being a normal array, so let's fake it.
            result.instruction_params = result.parsed_params.map( (pp) => { return pp.param_string; } );
            result.instruction_argument = result.instruction_params.join(',');

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

        return result;
    }

    /**
     * Third generation line parsing.  Seems correct.
     *
     * Given the asm string of parameters for a given line, parse it for params
     * and return them and any remaining content (== a comment).
     *
     * Parsing params is harder than it looks at first glance.  A param can
     * be a string, a normal base 10 number, a prefixed hex or binary number,
     * or a symbol.  The spec also allows for math operations, but that's a
     * real pain in the ass right now and I'm gonna ignore it. (@TODO)
     * Params are separated by a comma.  Params may not contain whitespace
     * or commas ... unless they're in a string.  Empty params are valid.
     *
     * @param {string} param_string
     * @param {number} line_number
     * @returns {AsmParamParseResult}
     **/
    #parseParams(param_string, line_number) {
        let remainder = '';
        const orig_param_string = param_string;

        /** @type {AsmParam[]} */
        const parsed_params = [];

        // This line noise captures single quoted strings that may contain
        // escaped single quotes, and then the same thing for double quotes.
        const quoted_string_regex = /^('((?:[^'\\]|\\.)+?)'|"((?:[^"\\]|\\.)+?)")/;

        const glom_until_comma_regex = /^([^\s,]+),?/;

        let limit = 100;

        while (param_string.length > 0 && limit-- > 0) {
            const new_param = new AsmParam;
            new_param.line_number = line_number;
            new_param.param_index = parsed_params.length;

            // We need to split this param from any that follow.  This can
            // normally be done by just grabbing everything up to the next comma
            // or until the end of the string, but string arguments make that hard
            // because they are allowed to contain commas.  It's regex time!
            const quoted_match = param_string.match(quoted_string_regex);
            if (quoted_match) {
                new_param.param_string = quoted_match[1];
                new_param.param_type = 'string';
                new_param.value_assigned = true;
                parsed_params.push(new_param);

                // Trim off what we just grabbed, including the comma.
                param_string = param_string.substring(quoted_match[1].length);
                if (param_string.startsWith(',')) {
                    param_string = param_string.substring(1);
                }

                continue;
            }

            let extracted_param = '';
            // We won't be dealing with a quoted string so we can safely glom up
            // everything until the next comma.
            const glommed_matches = param_string.match(glom_until_comma_regex);
            if (glommed_matches) {
                extracted_param = glommed_matches[1];

                // Trim off what we just grabbed, including the comma.
                param_string = param_string.substring(extracted_param.length);
                if (param_string.startsWith(',')) {
                    param_string = param_string.substring(1);
                }
            } else {
                // There wasn't anything left to glom up.  The most likely
                // situation is that we found whitespace. If so, that marks the
                // end of the parameters.  Let's make sure that's true.
                if (param_string.length == 0 || param_string.match(/^\s+/)) {
                    remainder = param_string;
                    break;
                }
                // This should be unreachable.
                console.debug(parsed_params, param_string);
                throw new Error('Parse error: can not make heads or tails of param');
            }

            // If we got this far, we have a parameter in extracted_param.
            new_param.param_string = extracted_param;
            // So, what exactly is it?
            new_param.param_type = this.#paramLooksLikeSymbolHelper(extracted_param);
            // An unknown return implies an unreplaced symbol
            new_param.value_assigned = new_param.param_type == 'unknown';

            if (new_param.param_type == 'number') {
                new_param.param_numeric = number_format_helper(extracted_param);
            } else if (new_param.param_type == 'symbolic') {
                // We'll only ever get symbolic back from the helper if there
                // was a preceding at sign, which we must strip.
                new_param.param_numeric = number_format_helper(extracted_param.substring(1));
            }
            parsed_params.push(new_param);
        }

        if (limit <= 0) {
            console.error(orig_param_string, param_string, parsed_params);
            throw new Error('parseParams loop limit exceeded, what a great bug!');
        }

        const res = new AsmParamParseResult;
        res.params = parsed_params;
        res.remainder = remainder;
        return res;
    }

    /**
     * Third generation symbol parsing.  Correct but very brittle.
     *
     * Given a line, scan it for things that might be symbols.  If the symbol
     * is also defined right here, assign it a value.
     *
     * @FIXME this has a whole lot of duplicate code, can it be sanely streamlined?
     *
     * @param {AsmParseLineResult} line
     **/
    #processLineSymbolsIntoSymbolTable(line) {
        if (
            // Expect instruction lines that have a label, or...
            (line.line_type == 'instruction' && !line.label)
            // ... lines that are PIs or known labels.
            || (line.line_type != 'pi' && line.line_type != 'label')
        ) {
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
                sym.value_assigned = true;
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

        // Skip irrelevant PIs.
        if (line.line_type == 'pi'
            && !Asm.#pi_location_change_list.includes(line.instruction)
            && !Asm.#pi_location_list.includes(line.instruction)
        ) {
            return;
        }
        // If we got here, our line creates a symbol using the label, assigning the
        // value of the location counter.  We're too early in the process to
        // actually have a location counter, so these don't get assigned a value.
        if (!line.label) {
            // This should actually be caught by the initial return check at the top.
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
     * Third generation line parsing.  Correct, except for the Format 12 replacement.
     *
     * Some PIs are effectively macros that should have immediate effect.
     * RT and NOP get replaced entirely.
     * Instructions that are DFOPs get transformed into the real thing.
     * Instructions that are DXOPs get replaced by their XOP call.
     * Format 12 instructions without a valid CKPT value get replaced immediately
     * as well, and then only with the then-current default CKPT value.  It is
     * up to the caller to make sure that #current_ckpt_default is kept up to
     * date and in sync with calls to this function.
     *
     * @FIXME instruction_argument being instruction_params joins is bogus?
     *
     * @param {AsmParseLineResult} line
     * @returns {AsmParseLineResult}
     **/
    #preProcessLinePIs(line) {
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
            line.instruction_params = ['*R11'];
            // No further processing is possible or needed.
            return line;
        }

        // NOP becomes JMP 2
        if (line.instruction == 'NOP') {
            line.line_type = 'instruction';
            line.instruction = 'JMP';
            line.instruction_argument = '2';
            line.instruction_params = ['2'];
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
                line.instruction_params[2] = `R${this.#current_ckpt_default.toString()}`;
                line.instruction_argument = line.instruction_params.join(',');
            }
        }
        return line;
    }

    /**
     * Third generation symbol preprocessing.  Incomplete.
     *
     * While value symbols can be assigned immediately, location symbols get their
     * value from the location counter.  Build a location counter and then fill
     * in *LIKELY* byte offset values.
     *
     * This directly updates the symbol table.
     *
     * @FIXME BSS, BES, AORG and DORG can all be symbols instead of numbers, so
     * the looks_like_number checks within could fail spectacularly.  Is there
     * a sane way to fix this without doing nasty recursive bullshit?
     **/
    #preProcessLocationCounterSymbols() {
        // Let's pre-locate all of the location symbols for rewrite
        const symbols_by_line = [];
        for (const symbol_name in this.#symbol_table) {
            if (this.#symbol_table[symbol_name].symbol_type != 'location') {
                continue;
            }
            symbols_by_line[this.#symbol_table[symbol_name].line_number] = symbol_name;
        }

        // The location counter operates in bytes, not words.
        let location_counter = 0;
        for (const line of this.#parsed_lines) {
            if (line.line_type == 'comment') {
                continue;
            }

            // Do we have a candidate symbol?  Now is the time to assign a location to it.
            if (symbols_by_line[line.line_number]) {
                this.#symbol_table[symbols_by_line[line.line_number]].symbol_value = location_counter;
                this.#symbol_table[symbols_by_line[line.line_number]].value_assigned = true;
            }

            // Three general classes of things can adjust the location counter:
            // a) Instructions
            // b) Emitter PIs, like BYTE, DATA, TEXT, BSS, and BES.
            // c) Location Change PIs, like AORG, DORG, BSS, BES, and EVEN.

            // All of these require an instruction field, so
            if (!line.instruction) {
                continue;
            }

            let adjustment = 0;
            let reassign_symbol = false;
            let reassign_counter = false;

            if (line.line_type == 'instruction' && OpInfo.opNameIsValid(line.instruction)) {
                const opcode_info = OpInfo.getFromOpName(line.instruction);
                // This is a lie, but it's a good enough lie for preprocessing.
                adjustment = opcode_info.minimum_instruction_words * 2;
            }

            if (line.line_type == 'pi') {
                switch (line.instruction) {
                    case 'BYTE': // The params are each single bytes.
                        adjustment = line.instruction_params.length;
                        break;
                    case 'WORD': // The params are each one word, so two bytes.
                        adjustment = line.instruction_params.length * 2;
                        break;
                    case 'TEXT': // The single param is a string of (7-bit (lol)) ASCII bytes, in quotes.
                        adjustment = line.instruction_argument.length - 2;
                        break;
                    case 'BSS': // The single param is a relative adjustment to the counter.
                        adjustment = number_format_helper(line.instruction_params[0]);
                        break;
                    case 'BES': // The single param is a relative adjustment, but that adjustment is given to the label!
                        adjustment = number_format_helper(line.instruction_params[0]);
                        reassign_symbol = true;
                        break;
                    case 'EVEN': // Move the location counter forward to the next word boundary (even byte), if needed.
                        if (location_counter % 2 !== 0) {
                            adjustment = 1;
                            reassign_symbol = true;
                        }
                        break;
                    case 'AORG': // The single param is assigned to the location counter and the label.
                    case 'DORG':
                        adjustment = number_format_helper(line.instruction_params[0]);
                        reassign_symbol = true;
                        reassign_counter = true;
                        break;
                    default: // Does nothing, goes nowhere.
                        break;
                }
            }

            if (reassign_counter) {
                location_counter = adjustment;
            } else {
                location_counter += adjustment;
            }
            if (reassign_symbol && symbols_by_line[line.line_number]) {
                this.#symbol_table[symbols_by_line[line.line_number]].symbol_value = location_counter;
                this.#symbol_table[symbols_by_line[line.line_number]].value_assigned = true;
            }

        }

        console.debug('preProcessLocationCounterSymbols:', this.#symbol_table);

    }

    /**
     * Given a single parameter string value, determine what it's most likely
     * to be.  This is intended to sniff out symbols.
     *
     * @param {string} param_value
     * @returns { 'number' | 'register' | 'indexed' | 'symbolic' | 'text' | 'unknown' }
     **/
    #paramLooksLikeSymbolHelper(param_value) {
        // First up, let's dismiss obvious numbers.
        if (looks_like_number(param_value)) {
            return 'number';
        }
        // Second, obvious registers in addressing modes 0, 1, and 3.
        if (looks_like_register(param_value)) {
            return 'register';
        }
        // Third, concrete values in obviously indexed mode.
        const indexed_matches = param_value.match(/^@?(.+)\((.+)\)$/);
        if (
            indexed_matches
            && looks_like_number(indexed_matches[1])
            && looks_like_register(indexed_matches[2])
        ) {
            return 'indexed';
        }
        // Fourth, concrete values in obviously symbolic mode.
        if (param_value.startsWith('@') && looks_like_number(param_value.substring(1))) {
            return 'symbolic';
        }
        // Fifth, some instructions allow quoted ASCII strings.  The spec uses single quotes only.
        const string_matches = param_value.match(/^(["'])(.+?)\1$/);
        if (string_matches) {
            return 'text';
        }
        return 'unknown';
    }

    #preProcessUndefinedSymbols() {}
    #preProcessParamSymbols() {}

    #processLocationCounterSymbols() {}
    #processUndefinedSymbols() {}
    #processParamSymbols() {}
    #processLinesToBytecode() {}

    /**
     * Second generation symbol table stuff.  Correct for common cases only.  To be retired.
     *
     * Reviews all lines and then does an immediate substitution before considering
     * the symbols to be valid.  This technique is flawed.
     **/
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
        for (const line of this.#parsed_lines) {
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

            const is_assign = line.line_type == 'pi' && line.instruction && Asm.#pi_assign_list.includes(line.instruction);
            const is_location = line.line_type == 'label' || (line.line_type == 'pi' && line.instruction && Asm.#pi_location_list.includes(line.instruction));

            if (is_assign) {
                const sym = new AsmSymbol;
                sym.symbol_name = line.label;
                sym.symbol_value = number_format_helper(line.instruction_params[0]);
                sym.symbol_type = 'assign';

                sym.line_number = line.line_number;
                sym.symbol_params = line.instruction_params;
                sym.value_assigned = true;
                assign_instructions[line.label] = sym;
            } else if (is_location) {
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
        for (const line of this.#parsed_lines) {
            // The word values in this iteration should be more correct.
            const is_pi_location = line.line_type == 'pi' && line.label && Asm.#pi_location_list.includes(line.instruction);
            if (line.line_type == 'label' || is_pi_location) {
                location_instructions[line.label].symbol_value = estimated_word_count;
                location_instructions[line.label].value_assigned = true;
            }

            if (line.line_type != 'instruction') {
                continue;
            }
            const format = OpInfo.getFromOpName(line.instruction).format;

            for (const i in line.instruction_params) {
                for (const symbol_name in assign_instructions) {
                    line.instruction_params[i] = this.#symbolReplaceHelper(
                        line.instruction_params[i],
                        symbol_name,
                        assign_instructions[symbol_name].symbol_params[0] // lol hack
                    );
                }
                for (const symbol_name in location_instructions) {
                    let nv = location_instructions[symbol_name].symbol_value;
                    // Jump instructions get the offset adjust thing.
                    if (format == 2 || format == 17) {
                        // We count words but jumps take bytes
                        nv = (nv - estimated_word_count) * 2;
                    }
                    line.instruction_params[i] = this.#symbolReplaceHelper(
                        line.instruction_params[i],
                        symbol_name,
                        nv.toString()
                    );
                }
            }
            const ei = InstructionDecode.getEncodedInstruction(this.#getInstructionFromLine(line));
            estimated_word_count += ei.words.length;

            // All of this was a draft, so let's reset the params to process later.
            //line.instruction_params = line.instruction_argument.split(',');
        }

        // We should now have correct location instruction values.  We can finally
        // build the symbol table!
        this.#symbol_table = {};
        for (const symbol_name in assign_instructions) {
            if (assign_instructions[symbol_name].value_assigned) {
                this.#symbol_table[symbol_name] = assign_instructions[symbol_name];
            }
        }
        for (const symbol_name in location_instructions) {
            if (location_instructions[symbol_name].value_assigned && !Object.hasOwn(this.#symbol_table, symbol_name)) {
                this.#symbol_table[symbol_name] = location_instructions[symbol_name];
            }
        }

        console.debug('buildSymbolTable:', this.#symbol_table);

    }

    /**
     * Second generation symbol stuff.  Seems correct.
     *
     * Look for a symbol name in a parameter value, and replace it with a given
     * symbol value.  This is only hard due to addressing mode 2.
     *
     * @param {string} param_value
     * @param {string} symbol_name
     * @param {string} symbol_value
     **/
    #symbolReplaceHelper(param_value, symbol_name, symbol_value) {
        // Easy mode: the param is the symbol.
        if (param_value == symbol_name) {
            return symbol_value;
        }

        // Easy mode: it's just a number, so it can't be a symbol.
        if (looks_like_number(param_value)) {
            return number_format_helper(param_value).toString();
        }

        // Easy mode: symbolic addressing mode.
        if (param_value.startsWith('@') && param_value.substring(1) == symbol_name) {
            return `@${symbol_value}`;
        }

        // Easy mode: it's just a register, so it can't be a symbol.  This check
        // does addressing modes 0, 1, and 3, but is only true if the register
        // reference itself is a normal register reference, which will not be
        // a symbol.
        if (looks_like_register(param_value)) {
            return param_value;
        }

        const indirect_regex = /^(\*)?(.+)(\+)?$/;
        const indexed_regex = /^@?(.+)\((.+)\)$/;

        // Challenge mode: the param is a register.  Check for modes 0, 1, and 3.
        const indirect_matches = param_value.match(indirect_regex);
        if (indirect_matches && indirect_matches[2] == symbol_name && (indirect_matches[1] || indirect_matches[3])) {
            const star = indirect_matches[1] == '*' ? '*' : '';
            const plus = indirect_matches[3] == '+' ? '+' : '';
            return star + symbol_value + plus;
        }

        // Hard mode: indexed.  Look in both the immediate value and the register reference.
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

        // Fallthrough!
        return param_value;
    }

    /**
     * Second generation symbol stuff.  To be retired.
     *
     * Given a filled and correct #symbol_table, crawl through all params and replace.
     **/
    #applySymbolTable() {
        let word_count = 0;
        // Number of times we've iterated over parsed_lines: 4
        for (const line of this.#parsed_lines) {
            if (line.line_type != 'instruction') {
                continue;
            }
            // Clean up the mess from earlier processing.
            line.instruction_params = line.instruction_argument.split(',');

            // Yay yet another disposable Instruction!
            const inst = Instruction.newFromString(line.instruction);
            const format = inst.opcode_info.format;
            for (const i in line.instruction_params) {
                for (const sym_name in this.#symbol_table) {
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
                    }
                    line.instruction_params[i] = this.#symbolReplaceHelper(
                        line.instruction_params[i],
                        sym_name,
                        symbol_value.toString()
                    );
                }
                inst.setParam(inst.opcode_info.format_info.asm_param_order[i], line.instruction_params[i]);
            }
            const ei = InstructionDecode.getEncodedInstruction(inst);
            word_count += ei.words.length;
        }
    }

    /**
     * First generation parsing stuff.  Seems correct, to be kept.
     *
     * Given an AsmParseLineResult, create and return an Instruction with populated Params.
     *
     * @param {AsmParseLineResult} line
     **/
    #getInstructionFromLine(line) {
        const inst = Instruction.newFromString(line.instruction);

        if (!inst.isLegal()) {
            console.error('illegal op??', line, inst);
            throw new Error(`Illegal instruction (1) while parsing line ${line.line_number}`);
        }
        // These are the ones we see in the assembly
        const asm_param_list = inst.opcode_info.format_info.asm_param_order;
        // These are the ones we put into the opcode
        const opcode_param_list = Object.keys(inst.opcode_info.args);
        // We're dealing with assembly-side things.
        const split_params = line.instruction_params;

        let offset = 0;
        for (const param_name of asm_param_list) {
            const this_param = split_params[offset++];
            if (param_name == 'S' && opcode_param_list.includes('Ts')) {
                const res = this.#registerStringToAddressingModeHelper(this_param);
                inst.setParam('Ts', res[0]);
                inst.setParam('S', res[1]);
                if (res[0] == 2 && res[1] == 0 && inst.opcode_info.has_possible_immediate_source) {
                    inst.setImmediateSourceValue(res[2]);
                }
                continue;
            }
            if (param_name == 'D' && opcode_param_list.includes('Td')) {
                const res = this.#registerStringToAddressingModeHelper(this_param);
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
            throw new Error(`Illegal instruction (2) while parsing line ${line.line_number}`);
        }
        return inst;
    }

    /**
     * Second generation parsing stuff.  Seems mostly correct, except for type 2...
     *
     * Given an AsmParseLineResult and addressing mode information, return a working register string.
     *
     * @param {AsmParseLineResult} line
     * @param {number} type
     * @param {number} value
     **/
    #registerAddressingModeToStringHelper(line, type, value) {
        let string = '';
        if (type == 0) {
            // Register direct mode
            string = `R${value}`;
        } else if (type == 1 || type == 3) {
            // Register indirect mode
            string = `*R${value}`;
            if (type == 3) {
                // Register indirect with autoinc
                string += '+';
            }
        } else if (type == 2) {
            // We must be in symbolic or indexed memory mode.  In both cases,
            // a word will follow with our actual value.
            /** @FIXME this may be bogus */
            const imword = number_to_hex(line.fallback_word);
            string = `@>${imword}`;
            if (value > 0) {
                // S is not zero, so we're in indexed mode.  The first word
                // after the instruction is our base value.
                string += `(R${value})`;
            }
        }
        return string;
    }

    /**
     * Second generation parsing stuff.  Seems mostly correct.
     *
     * Given a register string, decode and return addressing mode information.
     *
     * @param {string} register_string
     * @returns {number[]}
     **/
    #registerStringToAddressingModeHelper(register_string) {
        let mode = 0;
        let register = 0;
        let immediate_word = 0;

        if (register_string.startsWith('*')) {
            // Register indirect mode
            mode = 1;
            register_string = register_string.substring(1);
            if (register_string.endsWith('+')) {
                // Register indirect autoinc
                mode = 3;
                register_string = register_string.substring(0, register_string.length - 1);
            }
        }

        if (register_string.startsWith('@')) {
            // Symbolic (explicit)
            console.debug('mode = 2');
            mode = 2;
            if (register_string.endsWith(')')) {
                const reg_extract_regex = /\((WR|R)?(\d{1,2})\)$/;
                const register_match = register_string.match(reg_extract_regex);
                if (register_match) {
                    console.debug('(Rx) => mode 2, Indexed');
                    register = parseInt(register_match[2], 10);
                    register_string = register_string.replace(reg_extract_regex, '');
                } else {
                    throw new Error('Parse error finding indexed register');
                }
            }
            console.debug('mode 2 regstring=', register_string);
            const value_regex = /^@(0x|0b|>)?([0-9A-F]+)/;
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
            // Not using looks_like_register here because we don't want to match
            // modes 1 or 3, and we want to extract the numeric value
            const regstring_format_test = register_string.match(/^(WR|R)?(\d{1,2})$/);
            if (regstring_format_test) {
                register = parseInt(regstring_format_test[2], 10);
                if (register > 16) {
                    throw new Error('Parse error trying to rectify register string, value greater than 16');
                }
            } else {
                // It's probably symbolic, but we can't deal with that yet
                /** @FIXME figure out how to make non-@ symbolic work here? */
                throw new Error('Parse error extracting register value from mode=0,1,3 arg string');
            }
        }
        return [mode, register, immediate_word];
    }

}

class AsmParseLineResult {
    line_number =           0;
    /** @type { 'ERROR' | 'pending' | 'label' | 'comment' | 'instruction' | 'pi' | 'fallthrough' } */
    line_type =             'ERROR';
    line =                  'ERROR';
    label =                 'ERROR';
    instruction =           'ERROR';
    instruction_argument =  'ERROR';
    /** @type {string[]} */
    instruction_params =    [];
    /** @type {AsmParam[]} */
    parsed_params =         [];
    comments =              'ERROR';
    fallback_word =         0;
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

class AsmParamParseResult {
    /** @type {AsmParam[]} */
    params = [];
    remainder = '';
}

class AsmParam {
    line_number = 0;
    param_type = 'ERROR';
    param_index = 0;
    param_string = '';
    param_numeric = 0;
    value_assigned = false;
}


/**
 * Given an asm-approved numeric string, returns the actual numeric value.
 * This code accepts addressing mode 0 register syntax and will return just the number.
 *
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
    } else if (string.startsWith('WR')) {
        is_decimal = true;
        string = string.substring(2);
    } else if (string.startsWith('>')) {
        is_hex = true;
        string = string.substring(1);
    } else if (string.startsWith('0x')) {
        is_hex = true;
        string = string.substring(2);
    } else if (string.startsWith('0b')) {
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
 * Given something that might be a register string, determine if it could be one.
 * Accepts addressing modes 0, 1, and 3.
 *
 * @param {string} string
 * @returns {boolean}
 **/
function looks_like_register(string) {
    const matches = string.match(/^\*?(WR|R)?(\d{1,2})\+?$/);
    if (matches) {
        return parseInt(matches[2], 10) < 16;
    }
    return false;
}

/**
 * Given something that might be numeric, determine if it could be a number.
 * Assumes asm-approved numeric syntax, similar to that of number_format_helper.
 * Does *NOT* accept addressing mode 0 register syntax as a valid number.
 *
 * @param {string} string
 * @returns {boolean}
 **/
function looks_like_number(string) {
    return !!string.match(/^-?(0b[01]+|(>|0x)[0-9a-fA-F]+|\d+)$/);
}
