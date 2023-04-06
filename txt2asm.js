// @ts-check

//import { Instruction } from "./classes/Instruction";

const Tab_Width = 4;
function tab_fixer_onload() {
    const codebox = document.getElementById('codebox');
    if (!codebox) {
        throw new Error();
    }
    // Turn tabs into 4-char indents.
    codebox.addEventListener('keydown',
        /** @param {KeyboardEvent} event */
        function (event) {
            if (event.key != "Tab") {
                return true;
            }
            event.preventDefault();
            event.stopPropagation();

            const el = event.target;
            if ( !(el instanceof HTMLTextAreaElement) ) {
                // lol yeah this to shut the typechecker up
                return;
            }
            const start_point = el.selectionStart;
            const end_point = el.selectionEnd;
            const previous_newline = el.value.lastIndexOf("\x0a", start_point);

            const chars_in = start_point - previous_newline - 1;
            let insert_count = 0;
            if (chars_in > 0) {
                const tabstops = Math.floor(chars_in / Tab_Width);
                const remainder = chars_in - (tabstops * Tab_Width);
                insert_count = Tab_Width - remainder;
            }
            if (insert_count == 0) {
                insert_count = Tab_Width;
            }
            const left = el.value.substring(0, start_point);
            const right = el.value.substring(start_point);
            el.value = left + ' '.repeat(insert_count) + right;
            el.setSelectionRange(start_point + insert_count, end_point + insert_count);
        }
    );
}


function txt2asm_init() {
    const codebox = window.document.getElementById('codebox');
    if (!codebox) {
        return;
    }
    codebox.addEventListener('keydown', txt2asm_keydown_listener);
    codebox.addEventListener('focus', txt2asm_keydown_listener);
    codebox.addEventListener('blur', txt2asm_keydown_listener);
}

/**
 * @param {Event} event
 **/
function txt2asm_keydown_listener(event) {
    event.stopPropagation();
    const textarea = event.target;
    if ( !(textarea instanceof HTMLTextAreaElement)) {
        return;
    }
    resize_textarea(textarea);

}

/** @param {HTMLTextAreaElement} textarea */
function resize_textarea(textarea) {
    const rawlines = textarea.value.replaceAll(/\r\n/g, "\n").split(/\n/);
    textarea.rows = rawlines.length + 2;
}

class Asm {

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
            // All remaining things in the line must be arguments.
            result.instruction_argument = line.substring(result.instruction.length).trim();
        }
        // Step 4: Processing instructions.
        const pi_match = line.match(/^\.([a-zA-Z_0-9]+)([\b\s]|$)/);
        if (result.line_type == 'pending' && pi_match) {
            result.line_type = 'pi';
            result.instruction = pi_match[1].toLowerCase();
            // All remaining things in the line must be arguments.
            result.instruction_argument = line.substring(result.instruction.length + 1).trim();
        }
        // Step 5: Labels.
        const label_match = line.match(/^\:([a-zA-Z_0-9]+)([\b\s]|$)/);
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

    #checkLines() {
        for (let line of this.#parsed_lines) {
            if (line.line_type == 'instruction') {
                const new_opcode = this.#checkLineInstructionToOpcode(line);
                if (new_opcode) {
                    line.word = new_opcode;
                }
                continue;
            }

            if (line.line_type == 'pi' && line.instruction == 'data') {
                // @TODO cleanup
                if (line.instruction_argument.startsWith('0x')) {
                    line.word = parseInt(line.instruction_argument.substring(2), 16);
                } else if (line.instruction_argument.startsWith('0b')) {
                    line.word = parseInt(line.instruction_argument.substring(2), 2);
                } else if (line.instruction_argument.match(/^\d+$/)) {
                    line.word = parseInt(line.instruction_argument.substring(2), 10);
                }
            }

        }
    }

    /** @param {AsmParseLineResult} line */
    #checkLineInstructionToOpcode(line) {
        const inst = Instruction.newFromString(line.instruction);
        if (!inst.isLegal()) {
            console.error('illegal op', line, inst);
            return null;
        }
        const param_list = inst.getParamList();
        const split_params = line.instruction_argument.split(',');
        if (param_list.length != split_params.length) {
            let operand_adjust = 0;
            if (param_list.includes('Ts')) {
                operand_adjust++;
            }
            if (param_list.includes('Td')) {
                operand_adjust++;
            }
            if (param_list.length == (split_params.length - operand_adjust)) {
                throw new Error('can not yet scan Rs sorry');
            }
            console.error('param count mismatch', param_list, split_params);
            return null;
        }
        for (let i in param_list) {
            inst.setParam(param_list[i], split_params[i]);
        }
        inst.finalize();

        if (!inst.isLegal()) {
            console.error('illegal op (2)', line, inst);
            return null;
        }
        return inst.getEffectiveOpcode();
    }

    process() {
        this.#parsed_lines = [];
        for (let line of this.#lines) {
            this.#parseLine(line);
        }
        this.#checkLines();
        return this.#parsed_lines;
    }

    toWords() {
        /** @type number[] */
        const words = [];
        for (let line of this.#parsed_lines) {
            const is_instruction = line.line_type == 'instruction';
            const is_pi_data = ((line.line_type == 'pi') && (line.instruction == 'data'));
            if (is_instruction || is_pi_data) {
                words.push(line.word);
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
            if (!is_instruction) {
                continue;
            }

            const instr = Instruction.newFromOpcode(line.word);
            instr.finalize();
            const f_instr = instr.opcode_info.name.padEnd(8, ' ');
            const f_params = [];
            for (let param_name of instr.getParamList()) {
                const param_value = instr.getParam(param_name);
                if (param_value === undefined) {
                    throw new Error('hey look another params check failed');
                }
                f_params.push(param_value);
            }
            const f_comments = line.comments.length ? ' ; ' + line.comments : '';
            asm.push(f_instr + f_params.join(',').padEnd(10, ' ') + f_comments);
        }
        return asm;
    }

}

class AsmParseLineResult {
    line_type =             'ERROR';
    line =                  'ERROR';
    instruction =           'ERROR';
    instruction_argument =  'ERROR';
    comments =              'ERROR';
    word =                  0;
}
