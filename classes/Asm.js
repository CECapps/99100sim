// @ts-check
"use strict";

import { Instruction } from "./Instruction.js";
import { InstructionDecode, EncodedInstruction } from "./InstructionDecode.js";
import { OpInfo } from "./OpInfo.js";

export { Asm, AsmParseLineResult };

/*global number_to_hex,string_to_ords,word_high_byte,word_low_byte */

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
    // These PIs declare the start of a code or data segment.
    static #pi_segment_start_list = ['PSEG', 'DSEG', 'CSEG', 'AORG', 'DORG'];
    // These PIs will end the current segment, even if the types don't match.
    static #pi_segment_end_list = ['PSEG', 'PEND', 'DSEG', 'DEND', 'CSEG', 'CEND', 'AORG', 'DORG', 'END'];
    // These PIs can define symbols that reference the current value of the location counter
    static #pi_location_list = ['BYTE', 'DATA', 'TEXT', 'DFOP', 'DXOP', 'PSEG', 'PEND', 'DSEG', 'DEND', 'CSEG', 'CEND'];
    // These PIs define symbols through their operands.
    static #pi_assign_list = ['EQU', 'DFOP', 'DXOP'];
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

    /** @type {Map<string,Map<number,number[]|string[]>>} That is, map<symbol_name, map<line_number,param_indexes[]>> */
    #symbol_map = new Map;

    /** @type {AsmSegment[]} */
    #segments = [];

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
        // We should now have temporary values for everything.  Clean up the
        // temporary mess we've created and do a fresh swap of all symbols.
        this.#applySymbolTable();
        // Now that everything is in the right place, build our bytecode segments!
        this.#buildSegments();
        /** @FIXME lol and then do it again because location counters are broken */
        this.#buildSegments();

        return this.#parsed_lines;
    }

    /**
     * @returns {Uint8Array}
     **/
    toBytes() {
        const data = new Uint8Array(2 ** 16);
        let location = 0;
        for (const segment of this.#segments) {
            location = segment.starting_point;
            for (const seg_bytes of segment.data) {
                for (const byte of seg_bytes.bytes) {
                    data[location++] = byte;
                }
            }
        }

        /*
        let lc = 0;
        for (const segment of this.#segments) {
            lc = segment.starting_point;
            for (const data of segment.data) {
                lc += data.bytes.length;
                console.debug('line', data.line_number, ', lc=', lc, 'bytes=', data.bytes.length, ' so words=', data.bytes.length / 2);
            }
        }
        */
        console.debug(this.#segments);

        return data;
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
            //console.debug(line.encoded_instruction);

            const f_instr = instr.opcode_def.name.padEnd(8, ' ');
            const f_params = [];
            for (const param_name of instr.opcode_def.format_info.asm_param_order) {
                if (param_name == '_immediate_word_') {
                    const imword = number_to_hex(instr.getImmediateValue());
                    f_params.push(`>${imword}`);
                    continue;
                }

                const param_value = instr.getParam(param_name);
                if (param_value === undefined) {
                    throw new Error('hey look another params check failed');
                }

                if (param_name == 'S' && Object.hasOwn(instr.opcode_def.format_info.opcode_params, 'Ts')) {
                    f_params.push(this.#registerAddressingModeToStringHelper(line, instr.getParam('Ts'), instr.getParam('S')));
                    continue;
                }
                if (param_name == 'D' && Object.hasOwn(instr.opcode_def.format_info.opcode_params, 'Td')) {
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
     * Assembly line parser.
     *
     * TI assembler syntax is clunky, but there's only so much I can do to make
     * it nicer without making it harder to use other people's unmodified code.
     *
     * The core syntax is built on the assumption of a 60-character wide grid.
     * Why?  PUNCHCARDS.  That's how old this platform is!
     *
     * The nature of the line is driven by the first character.  An asterisk
     * means that it's a comment.  Whitespace means it's an instruction.  Anything
     * else becomes a label, and then the rest of the line is treated as an
     * instruction.
     *
     * Instructions come in the form of a 1-6 character long capitalized string.
     * Most instructions have operands that immediately follow after whitespace.
     * Parameters are divided by commas.  Any whitespace signals the end of the
     * operand area.  TEXT processing instructions may include whitespace inside
     * of single quotes.  Anything following the operands is treated as comment.
     * In general, instructions that take optional operands only permit comments
     * if an operand is given.  Operands given for instructions that do not take
     * operands are teated as comments. (@TODO NYI).  To disambiguate, we also
     * treat anything after the first semicolon in the line as a comment, but
     * that is a violation of the spec.  (@TODO use asterisks instead)
     *
     * @param {string} line
     * @param {number} line_number
     **/
    #parseLine(line, line_number) {
        const result = new AsmParseLineResult();

        result.line                 = line;
        result.line_number          = line_number;
        result.line_type            = 'pending';
        result.label                = '';
        result.instruction          = '';
        result.instruction_argument = '';
        result.comments             = '';

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

            result.instruction_params = result.parsed_params.map( (pp) => { return pp.value; } );

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
     * Given the asm string of parameters for a given line, parse it for params
     * and return them and any remaining content, which should be treated by the
     * caller as a comment.
     *
     * Parsing params is harder than it looks at first glance.  A param can
     * be a string, a normal base 10 number, a prefixed hex or binary number,
     * or a symbol.  The spec also allows for math operations, but that's a
     * real pain in the ass right now and I'm gonna ignore it. (@TODO math lol)
     * Params are separated by a comma.  Params may not contain whitespace
     * or commas ... unless they're in a string.  Empty params are valid.
     *
     * @param {string} raw_param_string
     * @param {number} line_number
     * @returns {AsmParamParseResult}
     **/
    #parseParams(raw_param_string, line_number) {
        let remainder = '';
        const orig_param_string = raw_param_string;

        /** @type {AsmParam[]} */
        const parsed_params = [];

        // This line noise captures single quoted strings that may contain
        // backslash-escaped single quotes, and then the same thing for double
        // quotes.  Backslash escaping and double quotes are not in the spec.
        const quoted_string_regex = /^('((?:[^'\\]|\\.)+?)'|"((?:[^"\\]|\\.)+?)")/;

        const glom_until_comma_regex = /^([^\s,]+),?/;

        let limit = 100;

        while (raw_param_string.length > 0 && limit-- > 0) {
            const new_param = new AsmParam;
            new_param.line_number = line_number;
            new_param.param_index = parsed_params.length;

            // We need to split this param from any that follow.  This can
            // normally be done by just grabbing everything up to the next comma
            // or until the end of the string, but string arguments make that hard
            // because they are allowed to contain commas.  It's regex time!
            const quoted_match = raw_param_string.match(quoted_string_regex);
            if (quoted_match) {
                new_param.parsed_string = quoted_match[1];
                new_param.param_type = 'text';
                parsed_params.push(new_param);

                // Trim off what we just grabbed, including any trailing comma.
                raw_param_string = raw_param_string.substring(quoted_match[1].length);
                if (raw_param_string.startsWith(',')) {
                    raw_param_string = raw_param_string.substring(1);
                }

                // This param needs no further processing, so move on.
                continue;
            }

            let extracted_param = '';
            // We won't be dealing with a quoted string so we can safely glom up
            // everything until the next comma.
            const glommed_matches = raw_param_string.match(glom_until_comma_regex);
            if (glommed_matches) {
                extracted_param = glommed_matches[1];

                // Trim off what we just grabbed, including any trailing comma.
                raw_param_string = raw_param_string.substring(extracted_param.length);
                if (raw_param_string.startsWith(',')) {
                    raw_param_string = raw_param_string.substring(1);
                }
            } else {
                // There wasn't anything left to glom up.  The most likely
                // situation is that we found whitespace. If so, that marks the
                // end of the parameters.  Let's make sure that's true.
                if (raw_param_string.length == 0 || raw_param_string.match(/^\s+/)) {
                    remainder = raw_param_string;
                    break;
                }
                // This should be unreachable.
                console.debug(parsed_params, raw_param_string);
                throw new Error('Parse error: can not make heads or tails of remaining param');
            }

            // If we got this far, we have a parameter in extracted_param.
            new_param.parsed_string = extracted_param;
            // So, what exactly is it?
            new_param.param_type = this.#paramLooksLikeSymbolHelper(extracted_param);

            if (new_param.param_type == 'number') {
                new_param.param_numeric = asm_number_format(extracted_param);
                new_param.is_numeric = true;
            } else if (new_param.param_type == 'symbolic') {
                // paramLooksLikeSymbolHelper returns "symbolic" only if the param
                // is an at sign followed by something that looks like a number.
                // This means we can reliably strip the at sign and make it numeric.
                new_param.param_numeric = asm_number_format(extracted_param.substring(1));
                new_param.is_numeric = true;
            }
            parsed_params.push(new_param);
        }

        if (limit <= 0) {
            console.error(orig_param_string, raw_param_string, parsed_params);
            throw new Error('parseParams loop limit exceeded, what a great bug!');
        }

        const res = new AsmParamParseResult;
        res.params = parsed_params;
        res.remainder = remainder;
        return res;
    }

    /**
     * Line processing, stage 2:
     * Given a line, extract any symbols it contains and add them to the symbol table.
     *
     * Note: DFOP and DXOP definitions are given symbols, though their values
     * later on do not flow through the symbol table but through the separate
     * extracted values.
     *
     * @TODO make DFOP and DXOP store their canonical values inside the symbol table
     * @TODO This allows the definition of only one symbol per line, which might be wrong.
     *
     * @param {AsmParseLineResult} line
     **/
    #processLineSymbolsIntoSymbolTable(line) {
        if ( !(line.label.length > 0 || line.line_type == 'pi')) {
            // Do not process lines that can not define a symbol.
            return;
        }

        const sym = new AsmSymbol;
        sym.line_number             = line.line_number;
        sym.symbol_params           = line.instruction_params;
        sym.symbol_value_string     = sym.symbol_params.length ? sym.symbol_params[0] : '';
        sym.symbol_value_type       = sym.symbol_params.length ? this.#paramLooksLikeSymbolHelper(sym.symbol_value_string) : 'unknown';
        sym.symbol_value_numeric    = sym.symbol_value_type == 'number' ? asm_number_format(sym.symbol_value_string) : 0;
        sym.has_resolved_value      = false;

        // Pure labels become location symbols to be resolved later.
        if (line.line_type == 'label') {
            sym.symbol_type = 'location';
            sym.symbol_name = line.label;

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

            if (sym.symbol_value_type == 'number') {
                sym.is_numeric = true;
            }
            if (sym.symbol_value_type != 'unknown') {
                sym.has_resolved_value = true;
            }

            if (Object.hasOwn(this.#symbol_table, sym.symbol_name)) {
                throw new Error(`Attempt to redefine symbol ${sym.symbol_name} on line ${line.line_number}`);
            }
            this.#symbol_table[sym.symbol_name] = sym;
            return;
        }

        // DFOP creates a string value symbol that is valid only in the context
        // of replacing an instruction.
        if (line.instruction == 'DFOP') {
            sym.symbol_type             = 'assign';
            sym.symbol_name             = sym.symbol_params[0];
            sym.symbol_value_string     = sym.symbol_params[1];
            sym.symbol_value_type       = this.#paramLooksLikeSymbolHelper(sym.symbol_value_string);
            sym.symbol_value_numeric    = 0;
            sym.has_resolved_value      = true;

            if (Object.hasOwn(this.#symbol_table, sym.symbol_name)) {
                throw new Error(`Attempt to redefine symbol ${sym.symbol_name} on line ${line.line_number}`);
            }
            this.#symbol_table[sym.symbol_name] = sym;
            this.#dfops[sym.symbol_name] = sym.symbol_value_string;
            return;
        }

        // Like DFOP, DXOP works only in the context of replacing an instruction,
        // though the replacement is much more of a pain in the ass later on.
        if (line.instruction == 'DXOP') {
            sym.symbol_type = 'assign';
            sym.symbol_name = sym.symbol_params[0];

            if (looks_like_number(sym.symbol_params[0])) {
                sym.symbol_value_numeric = asm_number_format(line.instruction_params[1]);
                sym.is_numeric = true;
                sym.has_resolved_value = true;
            }

            if (Object.hasOwn(this.#symbol_table, sym.symbol_name)) {
                throw new Error(`Attempt to redefine symbol ${sym.symbol_name} on line ${line.line_number}`);
            }
            this.#symbol_table[sym.symbol_name] = sym;
            this.#dxops[sym.symbol_name] = sym.symbol_value_numeric;
            return;
        }

        // If it's a PI, but not a location-related PI, we're done.
        if (line.line_type == 'pi'
            && !Asm.#pi_location_change_list.includes(line.instruction)
            && !Asm.#pi_location_list.includes(line.instruction)
        ) {
            return;
        }

        // If we've managed to get this far, the only remaining possible symbol
        // has to come from the line label.  No label?  No symbol.
        if (!line.label || line.label.length == 0) {
            return;
        }

        // Congrats, it's a location symbol!
        sym.symbol_name = line.label;
        sym.symbol_type = 'location';
        sym.symbol_value_numeric = 0;
        sym.has_resolved_value = false;

        if (Object.hasOwn(this.#symbol_table, sym.symbol_name)) {
            throw new Error(`Attempt to redefine symbol ${sym.symbol_name} on line ${line.line_number}`);
        }
        this.#symbol_table[sym.symbol_name] = sym;
    }

    /**
     * Line processing, stage 3:
     * Some PIs are dealt with later, and some PIs are dealt with immediately.
     * Given a line, deal with the immediate PIs.
     *
     * RT and NOP are effectively macros and swap out the entire line.
     *
     * CKPT defines a FUCKING STATEFUL symbol that gets swapped into any given
     * Format 12 line.
     *
     * This is also where DFOP and DXOP aliases turn into the correct instruction.
     *
     * @FIXME Remove the CKPT default value and error out if one is not defined, per spec.
     *
     * @param {AsmParseLineResult} line
     * @returns {AsmParseLineResult}
     **/
    #preProcessLinePIs(line) {
        if (line.line_type != 'instruction' && line.line_type != 'pi') {
            return line;
        }

        // DFOPs are easy, it's just swapping the instruction with the value defined
        // during symbol processing.  For example:
        //      DFOP    CMP,C
        // ; later followed by by
        //      CMP     R1,R2
        // ; becomes
        //      C       R1,R2
        // We process this first because it can do things like become a DXOP or
        // a CKPT or something else incredibly annoying.
        if (Object.hasOwn(this.#dfops, line.instruction)) {
            line.line_type = 'instruction';
            line.instruction = this.#dfops[line.instruction];
        }

        // RT becomes B *R11
        if (line.instruction == 'RT') {
            line.line_type = 'instruction';
            line.instruction = 'B';
            line.instruction_argument = '*R11';
            line.parsed_params = this.#parseParams(line.instruction_argument, line.line_number).params;
            line.instruction_params = line.parsed_params.map( (pp) => { return pp.value; } );

            // No further processing is possible or needed.
            return line;
        }

        // NOP becomes JMP $+2
        if (line.instruction == 'NOP') {
            line.line_type = 'instruction';
            line.instruction = 'JMP';
            line.instruction_argument = '2';
            line.parsed_params = this.#parseParams(line.instruction_argument, line.line_number).params;
            line.instruction_params = line.parsed_params.map( (pp) => { return pp.value; } );

            // No further processing is possible or needed.
            return line;
        }

        // DXOPs get replaced with the appropriate XOP call by prepending the
        // XOP number to the params.  The remaining param is Ts+S.  For example:
        //      DXOP    FOO,7
        // ; later followed by
        //      FOO     *R2
        // ; becomes
        //      XOP     7,*R2
        if (Object.hasOwn(this.#dxops, line.instruction)) {
            line.line_type = 'instruction';
            line.instruction = 'XOP';

            // instruction_argument is supposed to contain the unprocessed,
            // unreplaced original operand string.  Replacing it this way is
            // very rude, but there's not really a better way outside of deferring
            // the entire DXOP replacement until we're actually building our
            // segments below.
            line.instruction_argument = this.#dxops[line.instruction].toString() + ',' + line.instruction_argument;
            line.parsed_params = this.#parseParams(line.instruction_argument, line.line_number).params;
            line.instruction_params = line.parsed_params.map( (pp) => { return pp.value; } );

            // No further processing is possible or needed.
            return line;
        }

        // CKPT defines the current, running checkpoint value for Format 12,
        // which we process below.
        if (line.instruction == 'CKPT') {
            this.#current_ckpt_default = asm_number_format(line.instruction_params[0]);
            // No further processing is possible or needed.
            return line;
        }

        // Format 12 instructions are "interruptable" and store their state in a
        // specified register called the checkpoint register.  A default can be
        // be specified via the CKPT PI (done above).  If the third param in the
        // instruction is blank or omitted, we need to swap it in.
        // The spec says that this swap should not occur if there is no previous
        // defined CKPT, but we ignore that and define the default CKPT as R10.
        if (line.line_type == 'instruction' && OpInfo.opNameIsValid(line.instruction)) {
            const opcode_def = OpInfo.getFromOpName(line.instruction);
            if (opcode_def.format == 12 && !looks_like_register(line.instruction_params[2])) {
                /** @FIXME instruction_argument should **NEVER** be overwritten this way! */
                line.instruction_params[2] = `R${this.#current_ckpt_default.toString()}`;
                line.instruction_argument = line.instruction_params.join(',');
                line.parsed_params = this.#parseParams(line.instruction_argument, line.line_number).params;
                line.instruction_params = line.parsed_params.map( (pp) => { return pp.value; } );
            }
        }
        return line;
    }

    /**
     * Line processing, stage 4:
     * Perform an estimate of location counter values for any location symbol.
     *
     * This is quick and dirty and gives wrong answers sometimes, but it's needed
     * before we can safely continue processing.
     *
     * parsed_lines iteration count: 2
     *
     * @FIXME this should not produce wrong answers :(
     **/
    #preProcessLocationCounterSymbols() {
        // Let's pre-locate all of the location symbols for rewrite
        const symbols_by_line = [];
        for (const symbol_name in this.#symbol_table) {
            if (this.#symbol_table[symbol_name].symbol_type != 'location') {
                continue;
            }
            /** @FIXME This artificially limits the number of symbols per line to 1, which is not strictly true */
            symbols_by_line[this.#symbol_table[symbol_name].line_number] = symbol_name;
        }

        // Remember: the location counter operates in bytes, not words.
        let location_counter = 0;
        for (const line of this.#parsed_lines) {
            if (line.line_type == 'comment') {
                continue;
            }

            // Do we have a candidate symbol?  Now is the time to assign a location to it.
            if (symbols_by_line[line.line_number]) {
                //console.debug(`pplcs: ${symbols_by_line[line.line_number]} => ${location_counter}`);
                this.#symbol_table[symbols_by_line[line.line_number]].symbol_value_numeric = location_counter;
                this.#symbol_table[symbols_by_line[line.line_number]].has_resolved_value = true;
                this.#symbol_table[symbols_by_line[line.line_number]].is_numeric = true;
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
                const opcode_def = OpInfo.getFromOpName(line.instruction);
                // This is a lie, but it's a good enough lie for preprocessing.
                adjustment = opcode_def.minimum_instruction_words * 2;
            }

            if (line.line_type == 'pi') {
                switch (line.instruction) {
                    case 'BYTE': // The params are each single bytes.
                        adjustment = line.instruction_params.length;
                        //console.debug('BYTE', adjustment);
                        break;
                    case 'DATA': // The params are each one word, so two bytes.
                        adjustment = line.instruction_params.length * 2;
                        //console.debug('DATA', adjustment);
                        break;
                    case 'TEXT': // The single param is a string of (7-bit (lol)) ASCII bytes, in quotes.
                        adjustment = line.instruction_argument.length - 2;
                        //console.debug('TEXT', adjustment);
                        break;
                    case 'BSS': // The single param is a relative adjustment to the counter.
                        adjustment = asm_number_format(line.instruction_params[0]);
                        //console.debug('BSS', adjustment);
                        break;
                    case 'BES': // The single param is a relative adjustment, but that adjustment is given to the label!
                        adjustment = asm_number_format(line.instruction_params[0]);
                        reassign_symbol = true;
                        //console.debug('BES', adjustment);
                        break;
                    case 'EVEN': // Move the location counter forward to the next word boundary (even byte), if needed.
                        if (location_counter % 2 !== 0) {
                            adjustment = 1;
                            reassign_symbol = true;
                            //console.debug('EVEN', adjustment);
                        }
                        break;
                    case 'AORG': // The single param is assigned to the location counter and the label.
                    case 'DORG':
                        if (!line.instruction_params.length) {
                            throw new Error('AORG/DORG require a parameter');
                        }
                        adjustment = asm_number_format(line.instruction_params[0]);
                        reassign_symbol = true;
                        reassign_counter = true;
                        //console.debug('AORG/DORG', adjustment);
                        break;
                    default: // Does nothing, goes nowhere.
                        break;
                }
            }
            /*
            console.debug(
                line.line_number,
                symbols_by_line[line.line_number],
                line.instruction,
                line.instruction_params.join(','),
                'lc=',
                location_counter,
                'adj=',
                adjustment,
                'reass counter?',
                reassign_counter,
                'reass sym?',
                reassign_symbol
            );
            */
            if (reassign_counter) {
                location_counter = adjustment;
            } else {
                location_counter += adjustment;
            }
            if (reassign_symbol && symbols_by_line[line.line_number]) {
                this.#symbol_table[symbols_by_line[line.line_number]].symbol_value_numeric = location_counter;
                this.#symbol_table[symbols_by_line[line.line_number]].has_resolved_value = true;
                this.#symbol_table[symbols_by_line[line.line_number]].is_numeric = true;
            }
        }
        //console.debug('preProcessLocationCounterSymbols:', this.#symbol_table);
    }

    /**
     * Line processing, stage 5:
     * Symbols can reference other symbols in their definitions.  Resolve those
     * recursive references now.
     *
     * @FIXME this can give wrong answers by proxy of preProcessLocationCounterSymbols :(
     **/
    #preProcessUndefinedSymbols() {
        let replaced = false;
        do {
            replaced = false;
            for (const sym_name in this.#symbol_table) {
                const sym = this.#symbol_table[sym_name];
                // If the value has been resolved, we have no work to do.
                if (sym.has_resolved_value) {
                    continue;
                }

                // Okay, is it just another symbol name?  That's easy!
                if (Object.hasOwn(this.#symbol_table, sym.symbol_value_string)) {
                    // And if so, is it one with a resolved value?
                    if (this.#symbol_table[sym.symbol_value_string].has_resolved_value) {
                        const outer_sym_name = sym.symbol_value_string;
                        // Easy!
                        sym.symbol_value_string = this.#symbol_table[outer_sym_name].symbol_value_string;
                        sym.symbol_value_numeric = this.#symbol_table[outer_sym_name].symbol_value_numeric;
                        sym.is_numeric = this.#symbol_table[outer_sym_name].is_numeric;

                        sym.symbol_value_type = this.#paramLooksLikeSymbolHelper(sym.symbol_value_string);
                        sym.has_resolved_value = true;

                        replaced = true;
                        continue;
                    }
                }
                // It's not easy :(
                for (const inner_sym_name in this.#symbol_table) {
                    const inner_sym = this.#symbol_table[inner_sym_name];
                    // Don't accept unresolved symbols as valid things to swap in to other unresolved symbols
                    if (!inner_sym.has_resolved_value) {
                        continue;
                    }
                    const old_value = sym.symbol_value_string;
                    const new_value = this.#symbolReplaceHelper(old_value, inner_sym_name, inner_sym.value);
                    if (old_value != new_value) {
                        sym.symbol_value_string = inner_sym.symbol_value_string;
                        sym.symbol_value_numeric = inner_sym.symbol_value_numeric;
                        sym.is_numeric = inner_sym.is_numeric;

                        sym.symbol_value_type = this.#paramLooksLikeSymbolHelper(sym.symbol_value_string);
                        sym.has_resolved_value = true;

                        replaced = true;
                        break;
                    }
                }
            }
        } while (replaced);
    }

    /**
     * Line processing, stage 6:
     * All symbols should now have resolved values, so go through all the instructions
     * and swap out the symbols in their params for the actual values
     *
     * parsed_lines iteration count: 3
     *
     * @FIXME This rebuilds the location counter inline, but does it wrong.
     **/
    #applySymbolTable() {
        // Keep track of where symbols appear in params for later possible correction.
        this.#symbol_map = new Map;
        for (const sym_name in this.#symbol_table) {
            this.#symbol_map.set(sym_name, new Map);
        }

        let word_count = 0;
        for (const line of this.#parsed_lines) {
            // We don't care about PIs here.
            if (line.line_type != 'instruction') {
                continue;
            }
            if (!OpInfo.opNameIsValid(line.instruction)) {
                console.debug(line);
                throw new Error(`Encountered unknown instruction "${line.instruction}" on line ${line.line_number}`);
            }
            const opcode_def = OpInfo.getFromOpName(line.instruction);
            const format = opcode_def.format;
            //console.groupCollapsed(line.line_number);

            // Clean up the mess from earlier processing by resetting the params
            // to their original parsed state.  This is safe as long as earlier
            // preprocessing correctly readjusts parsed_params.
            /** @TODO is this still needed? */
            line.instruction_params = line.parsed_params.map( (pp) => { return pp.value; } );

            for (const i in line.instruction_params) {
                for (const sym_name in this.#symbol_table) {
                    // Jump instructions get the offset adjust thing.  This SHOULD
                    // be as simple as subtracting the current word count from
                    // the word count (== value) of the location symbol and then
                    // doubling the value because that's how jumps work?
                    let numeric_value = this.#symbol_table[sym_name].symbol_value_numeric;
                    if (this.#symbol_table[sym_name].symbol_type == 'location' && (format == 2 || format == 17)) {
                        numeric_value = (numeric_value - word_count) * 2;
                    }

                    const b4 = line.instruction_params[i];

                    line.instruction_params[i] = this.#symbolReplaceHelper(
                        line.instruction_params[i],
                        sym_name,
                        this.#symbol_table[sym_name].value
                    );

                    // The definition of a symbol in a param is quite literally
                    // if it gets substituted by symbolReplaceHelper and isn't
                    // also a number.
                    if (line.parsed_params[i].param_type != 'number' && b4 != line.instruction_params[i]) {
                        //console.debug(line.line_number, i, 'b4 != line.instruction_params[i]', b4, line.instruction_params[i]);
                        let sym_map = this.#symbol_map.get(sym_name);
                        if (sym_map === undefined) {
                            sym_map = new Map;
                            this.#symbol_map.set(sym_name, sym_map);
                        }
                        let line_param_idxes = sym_map.get(line.line_number);
                        if (line_param_idxes === undefined) {
                            line_param_idxes = [];
                            // @ts-ignore 6133 -- sym_name will always be defined inside the symbol map at this point
                            this.#symbol_map.get(sym_name).set(line.line_number, line_param_idxes);
                        }
                        // Maps are magic and this correctly updates the value inside without a reassign.
                        // @ts-ignore 2345 -- ts is inferring "never[]" here instead of the actual number[] | string[]
                        line_param_idxes.push(i);
                        //console.debug('Successfully replaced', sym_name, 'in string', b4, 'line:', line);
                        break;
                    }
                }
                //console.debug(inst.opcode_def.format_info.asm_param_order[i], line.instruction_params[i]);
                //inst.setParam(inst.opcode_def.format_info.asm_param_order[i], line.instruction_params[i]);
            }
            // With the correct params subbed into each instruction_params, we
            // can now safely build an Instruction that has a more correct word
            // count, which in turn will give us a more accurate location counter.
            const inst = this.#getInstructionFromLine(line);
            const ei = InstructionDecode.getEncodedInstruction(inst);
            word_count += ei.words.length;
            //console.debug(inst, ei);
            //console.groupEnd();
        }
    }

    /**
     * Line processing, stage 7:
     * By this time we should have a completely filled out symbol table.  We can
     * assume that all assign symbols are resolved to acceptable values and that
     * all location symbols have sane placeholder values.
     *
     * Group lines into segments, keeping a new, 100% accurate location counter
     * along the way.  Update location symbol definitions as they are found so
     * that future references to that symbol are correct.
     *
     * @FIXME Whoops, location symbols that are used before they are defined might
     *        end up with subtly wrong values from preProcessLocationCounterSymbols / applySymbolTable
     **/
    #buildSegments() {
        this.#segments = [];

        // We're eventually doing some param symbol replacement.  Earlier, we
        // collected #symbol_map, which is a list of the symbols and where they
        // appear.  It turns out it's more convenient for us to get that per-line.
        //            line       index   symbol
        /**
         * @FIXME This is yet another place where we accidentally limit symbol defs to one per line
         * @type {Map<number,Map<number,string>>} That is, map of line_number=>map of symbol_name=>param_index
         **/
        const line_symbol_map = new Map;
        for (const [sym_name, line_map] of this.#symbol_map) {
            for (const [line_number, param_indexes] of line_map) {
                for (const param_index of param_indexes) {
                    if (!line_symbol_map.has(line_number)) {
                        line_symbol_map.set(line_number, new Map);
                    }
                    // @ts-ignore 6133 -- the check above guarantees it'll be set
                    line_symbol_map.get(line_number).set(param_index, sym_name);
                }
            }
        }

        // We start out assuming we're in absolute mode, and that we're starting
        // from the very first byte.  (We're always in absolute mode, lol)
        let current_segment = new AsmSegment;
        current_segment.segment_type = 'AORG';
        current_segment.starting_point = 0;
        let location_counter = 0;

        for (const line of this.#parsed_lines) {
            // All valid lines are considered.  We should never encounter these:
            if (['ERROR', 'pending', 'fallthrough'].includes(line.line_type)) {
                console.error(line);
                throw new Error(`buildSegments encountered bogus line type "${line.line_type}"`);
            }

            // We include comment line numbers in the segment for reference/debugging.
            if (line.line_type == 'comment') {
                const comment_seg_bytes = new AsmSegmentBytes;
                comment_seg_bytes.line_number = line.line_number;
                current_segment.data.push(comment_seg_bytes);
            }

            // While all labels become symbols, only *most* labels end up defining a location.
            if (line.label && this.#symbol_table[line.label].symbol_type == 'location') {
                // Adjust the symbol accordingly.
                //console.debug(`bs: ${line.label} => ${location_counter}`);
                this.#symbol_table[line.label].symbol_value_numeric = location_counter;
                this.#symbol_table[line.label].is_numeric = true;

                // Like comments, include label-only line numbers for reference/debugging.
                if (line.line_type == 'label') {
                    const label_seg_bytes = new AsmSegmentBytes;
                    label_seg_bytes.line_number = line.line_number;
                    current_segment.data.push(label_seg_bytes);
                }
            }

            if (line.instruction == 'AORG') {
                /**
                 * @FIXME this assumes a successful parse of the param into a number
                 * @FIXME also, where do we even do that validation?
                 **/
                location_counter = line.parsed_params[0].param_numeric;
            }

            if (line.instruction == 'EVEN' && location_counter % 2 != 0) {
                location_counter++;
            }

            if (line.instruction && Asm.#pi_emitters_list.includes(line.instruction)) {
                const emitter_bytes = new AsmSegmentBytes;
                emitter_bytes.line_number = line.line_number;

                if (line.instruction == 'BSS' || line.instruction == 'BES') {
                    //console.debug('BSS/BES', line);
                    // BSS and BES allocate an empty chunk of space.
                    /** @FIXME this assumes a successful parse of the param into a number */
                    emitter_bytes.bytes = Array(line.parsed_params[0].param_numeric).fill(0);
                } else {
                    // Freshly extract each parsed param and coerce it into a
                    // value.  Earlier replacements have adjusted the param
                    // string and the comma-exploded string directly, so we also
                    // need to perform symbol replacement.  For these three
                    // remaining emitter PIs, we will assume that any "unknown"
                    // param is supposed to be a symbol.  We will also assume
                    // that the user has provided only bytes for BYTE, only words
                    // for DATA, and only a single text string for TEXT.
                    /** @FIXME Being lazy like this saves time and effort at the cost of being WRONG. */
                    for (const pp of line.parsed_params) {
                        const parsed_string = pp.parsed_string;
                        let param_numeric = [word_high_byte(pp.param_numeric), word_low_byte(pp.param_numeric)];
                        let value_assigned = pp.value.length > 0;

                        if (pp.param_type == 'unknown' && Object.hasOwn(this.#symbol_table, parsed_string)) {
                            const sym = this.#symbol_table[parsed_string];
                            console.log(sym.symbol_value_numeric);
                            param_numeric = [
                                word_high_byte(sym.symbol_value_numeric), word_low_byte(sym.symbol_value_numeric)
                            ];
                            value_assigned = true;
                        } else if (pp.param_type == 'text') {
                            param_numeric = string_to_ords(parsed_string);
                            value_assigned = true;
                        } else if (['register', 'indexed', 'symbolic', 'ERROR'].includes(pp.param_type)) {
                            console.error(pp, line);
                            throw new Error(`Encountered unexpected parsed param type "${pp.param_type}" in emitter PI`);
                        }

                        if (!value_assigned) {
                            console.error(pp, line);
                            throw new Error(`Encountered unassigned parsed param "${pp.parsed_string}" in emitter PI`);
                        }

                        emitter_bytes.bytes = emitter_bytes.bytes.concat(param_numeric);
                    }

                }
                location_counter += emitter_bytes.bytes.length;
                current_segment.data.push(emitter_bytes);
            }

            // Finally!
            if (line.instruction && OpInfo.opNameIsValid(line.instruction)) {
                const opcode_def = OpInfo.getFromOpName(line.instruction);
                // Rebuild our line params with fresh symbol values.  Numeric
                // and other conversions have already occurred at this point.
                const line_symbols = line_symbol_map.get(line.line_number) ?? new Map;
                for (const i in line.parsed_params) {
                    const pp = line.parsed_params[i];
                    let param_value = pp.value;

                    const sym_name = line_symbols.get(i);
                    if (sym_name) {
                        const b4 = param_value;
                        param_value = this.#symbolReplaceHelper(
                            param_value, sym_name, this.#symbol_table[sym_name].value
                        );
                        const b42 = param_value;

                        // Instructions in formats 2 and 17, mostly jumps, take
                        // *relative* addresses.  We just subbed in a non-relative
                        // location.  Adjust it to be relative based on our
                        // current location counter value.
                        if (opcode_def.format == 2 || opcode_def.format == 17) {
                            //param_value = (2 + ((parseInt(param_value, 10)) * 2) - (location_counter * 2)).toString();
                            // We need to think in words, even though the argument
                            // ends up working in bytes.  Why?  IDK, it's broken.
                            if (location_counter % 2 != 0) {
                                throw new Error('Encountered odd location counter during format 2/17 resolution');
                            }
                            const location_counter_as_words = location_counter / 2;
                            const target_location_as_words = parseInt(param_value, 10) / 2;

                            const diff_in_bytes = parseInt(param_value, 10) - location_counter;
                            const diff_in_words = target_location_as_words - location_counter_as_words;
                            console.debug(
                                line.line_number,
                                line.instruction,
                                line.parsed_params.map( (ipp) => { return ipp.value; } ).join(','),
                                'sym=',
                                sym_name,
                                this.#symbol_table[sym_name].value,
                                'lc=',
                                location_counter,
                                diff_in_bytes,
                                diff_in_words,
                                'b4=',
                                b4,
                                b42,
                                param_value
                            );

                            param_value = diff_in_bytes.toString(); // (2 + target_location_as_words - location_counter_as_words).toString();
                        }
                    }

                    line.instruction_params[i] = param_value;
                }

                const instr_bytes = new AsmSegmentBytes;
                instr_bytes.line_number = line.line_number;

                // Finally, at long last, we can get the actual instruction data from the line!
                const instr = this.#getInstructionFromLine(line);
                const ei = InstructionDecode.getEncodedInstruction(instr);
                // Hell, we can even store it with the line now!
                line.encoded_instruction = ei;

                for (const word of ei.words) {
                    //console.debug(`buildSegments line ${line.line_number} instr ${instr.opcode_def.name} word ${number_to_hex(word)}`);
                    const msb = word_high_byte(word);
                    const lsb = word_low_byte(word);

                    //console.debug(word.toString(2).padStart(16, '0'), msb.toString(2).padStart(8, '0'), lsb.toString(2).padStart(8, '0'));
                    instr_bytes.bytes.push(msb);
                    instr_bytes.bytes.push(lsb);
                }

                current_segment.data.push(instr_bytes);
                location_counter += instr_bytes.bytes.length;
            }

            // Any time we find a segment-ending instruction, we can close up
            // this segment and open up another.  It's fine if this ends up
            // being an empty segment or ends up unused, the bytecode emitter
            // bits will simply skip over them.
            if (line.instruction && Asm.#pi_segment_end_list.includes(line.instruction)) {
                this.#segments.push(current_segment);

                const next_segment = new AsmSegment;
                next_segment.segment_type = 'AORG';
                next_segment.starting_point = location_counter;

                current_segment = next_segment;
            }

        }

        this.#segments.push(current_segment);
    }

    /**
     * Given an AsmParseLineResult, create and return an Instruction with populated params.
     *
     * @param {AsmParseLineResult} line
     * @returns {Instruction}
     **/
    #getInstructionFromLine(line) {
        const inst = Instruction.newFromString(line.instruction);

        if (!inst.isLegal()) {
            console.error('illegal op??', line, inst);
            throw new Error(`Illegal instruction (1) while parsing line ${line.line_number}`);
        }
        // These are the ones we see in the assembly text
        const asm_param_list = inst.opcode_def.format_info.asm_param_order;
        // These are the ones we put into the bytecode output
        const opcode_param_list = Object.keys(inst.opcode_def.args);
        // We're dealing with assembly-side things.
        const split_params = line.instruction_params;

        let offset = 0;
        for (const param_name of asm_param_list) {
            const this_param = split_params[offset++];
            // Addressing mode encoder for the Source / Type of Source params
            if (param_name == 'S' && opcode_param_list.includes('Ts')) {
                const res = this.#registerStringToAddressingModeHelper(this_param);
                inst.setParam('Ts', res[0]);
                inst.setParam('S', res[1]);
                if (res[0] == 2 && res[1] == 0 && inst.opcode_def.has_possible_immediate_source) {
                    inst.setImmediateSourceValue(res[2]);
                }
                continue;
            }
            // Addressing mode encoder for the Destination / Type of Destination params
            if (param_name == 'D' && opcode_param_list.includes('Td')) {
                const res = this.#registerStringToAddressingModeHelper(this_param);
                inst.setParam('Td', res[0]);
                inst.setParam('D', res[1]);
                if (res[0] == 2 && res[1] == 0 && inst.opcode_def.has_possible_immediate_dest) {
                    inst.setImmediateDestValue(res[2]);
                }
                continue;
            }
            // A hack for instructions with immediate values
            if (param_name == '_immediate_word_') {
                inst.setImmediateValue(asm_number_format(this_param));
                continue;
            }
            inst.setParam(param_name, asm_number_format(this_param));
        }
        inst.finalize();

        if (!inst.isLegal()) {
            console.error('illegal op (2)', line, inst);
            throw new Error(`Illegal instruction (2) while parsing line ${line.line_number}`);
        }
        return inst;
    }

    /**
     * Given an AsmParseLineResult and addressing mode information, return a working register string.
     *
     * @FIXME addressing mode 2 is broken here
     *
     * @param {AsmParseLineResult} line
     * @param {number} type
     * @param {number} value
     * @returns {string}
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
            /** @FIXME fallback_word is dead so this is completely broken */
            const imword = number_to_hex(line.fallback_word);
            string = `@>${imword}`;
            if (value > 0) {
                string += `(R${value})`;
            }
        }
        return string;
    }

    /**
     * Given a register string, decode and return addressing mode information.
     *
     * @FIXME addressing mode 2 and the fallback bits are almost certainly broken here
     *
     * @param {string} register_string
     * @returns {number[]}
     **/
    #registerStringToAddressingModeHelper(register_string) {
        let mode = 0;
        let register = 0;
        let immediate_word = 0;

        const orig_register_string = register_string;

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
                immediate_word = asm_number_format(value_test[2]);
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
            } else if (looks_like_number(register_string)) {
                // It's symbolic, without the at.
                mode = 2;
                register = 0;
                immediate_word = asm_number_format(register_string);
                //console.debug(orig_register_string, register_string, mode, register, immediate_word);
            } else {
                console.debug(orig_register_string, register_string, mode, register, immediate_word);
                throw new Error('Unlikely fallthrough during addressing mode check (BUG)');
            }
        }
        return [mode, register, immediate_word];
    }

    /**
     * Given a single parameter string value, determine what it's most likely
     * to be.  This is intended to sniff out symbols.
     *
     * @param {string} param_value
     * @returns { 'number' | 'register' | 'indexed' | 'symbolic' | 'text' | 'unknown' }
     **/
    #paramLooksLikeSymbolHelper(param_value) {
        // If it's a nothing, it's an unknown.
        if (param_value === null || param_value === undefined) {
            console.trace('paramLooksLikeSymbolHelper: Got undef or null param_value, (BUG?)');
            return 'unknown';
        }
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

    /**
     * Look for a symbol name in a parameter value, and replace it with a given
     * symbol value.  This is only hard due to addressing mode 2.
     *
     * @FIXME addressing mode 2 is almost certainly broken here
     *
     * @param {string} param_value
     * @param {string} symbol_name
     * @param {string} symbol_value_numeric
     **/
    #symbolReplaceHelper(param_value, symbol_name, symbol_value_numeric) {
        // Easy mode: the param is the symbol.
        if (param_value == symbol_name) {
            return symbol_value_numeric;
        }

        // Easy mode: it's just a number, so it can't be a symbol.
        if (looks_like_number(param_value)) {
            return asm_number_format(param_value).toString();
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
            return star + symbol_value_numeric + plus;
        }

        // Easy mode: symbolic addressing in the format of "@symbol_goes_here"
        if (param_value.startsWith('@') && param_value.substring(1) == symbol_name) {
            return `@${symbol_value_numeric}`;
        }

        // Hard mode: indexed.  This looks both at the value and the register,
        // allowing both "@1234(symbol_goes_here)" and "@symbol_goes_here(R1)".
        /** @FIXME "@sym1(sym2)" will break somewhere previously I expect, verify and fix */
        const indexed_matches = param_value.match(indexed_regex);
        if (indexed_matches) {
            let addr = indexed_matches[1];
            let index = indexed_matches[2];
            if (addr == symbol_name) {
                addr = symbol_value_numeric;
            }
            if (index == symbol_name) {
                index = symbol_value_numeric;
            }
            return `@${addr}(${index})`;
        }

        // Fallthrough!
        return param_value;
    }

}

/**
 * A processed assembly line.
 **/
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

/**
 * A processed symbol
 **/
class AsmSymbol {
    line_number = 0;
    symbol_name = '';
    /** @type { 'ERROR' | 'assign' | 'location' } */
    symbol_type = 'ERROR';
    symbol_value_numeric = 0;
    symbol_value_string = '';
    /** @type { 'ERROR' | 'number' | 'register' | 'indexed' | 'symbolic' | 'text' | 'unknown' } */
    symbol_value_type = 'ERROR';

    /** @type {string[]} */
    symbol_params = [];

    has_resolved_value = false;
    is_numeric = false;

    get value() { return this.is_numeric ? this.symbol_value_numeric.toString() : this.symbol_value_string; }
}

/**
 * lol
 **/
class AsmParamParseResult {
    /** @type {AsmParam[]} */
    params = [];
    remainder = '';
}

/**
 * A processed instruction parameter
 **/
class AsmParam {
    line_number = 0;
    /** @type { 'ERROR' | 'number' | 'register' | 'indexed' | 'symbolic' | 'text' | 'unknown' } */
    param_type = 'ERROR';
    param_index = 0;
    parsed_string = '';
    param_numeric = 0;
    is_numeric = false;

    get value() { return this.is_numeric ? this.param_numeric.toString() : this.parsed_string; }
}

/**
 * An assembly bytecode segment
 **/
class AsmSegment {
    /** @type { 'ERROR' | 'PSEG' | 'DSEG' | 'CSEG' | 'AORG' | 'DORG' } */
    segment_type = 'ERROR';
    starting_point = 0;
    /** @type {AsmSegmentBytes[]} */
    data = [];
}

/**
 * A container for one line worth of output into a bytecode segment.
 **/
class AsmSegmentBytes {
    line_number = 0;
    /** @type {number[]} */
    bytes = [];
}


/**
 * Given an asm-approved numeric string, returns the actual numeric value.
 * This code accepts addressing mode 0 register syntax and will return just the number.
 *
 * @param {string} string
 * @returns {number}
 **/
function asm_number_format(string) {
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
        throw new Error('asm_number_format: unparsable value');
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
 * Assumes asm-approved numeric syntax, similar to that of asm_number_format.
 * Does *NOT* accept addressing mode 0 register syntax as a valid number.
 *
 * @param {string} string
 * @returns {boolean}
 **/
function looks_like_number(string) {
    return !!string.match(/^-?(0b[01]+|(>|0x)[0-9a-fA-F]+|\d+)$/);
}

/**
 * Given a 16-bit word in big-endian format, return the high / first / MSB 8-bit byte.
 * @param {number} value    An unsigned 16-bit integer in big-endian format.
 * @returns {number}        The high byte (MSB) of the given integer.
 **/
function word_high_byte(value) {
    return (value >> 8) & 0xff;
}
/**
 * Given a 16-bit word in big-endian format, return the second / low / LSB 8-bit byte.
 * @param {number} value    An unsigned 16-bit integer in big-endian format.
 * @returns {number}        The low byte (LSB) of the given integer.
 **/
function word_low_byte(value) {
    return value & 0xff;
}
/**
 * @param {number} num
 * @param {number} padding
 * @return {string}
 **/
function number_to_hex(num, padding = 4) {
    return num.toString(16).toUpperCase().padStart(padding, '0');
}