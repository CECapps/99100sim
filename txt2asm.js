// @ts-check

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
}

/**
 * @param {Event} event
 **/
function txt2asm_keydown_listener(event) {
    console.log(event);
}

class Asm {

    /** @type string[] */
    #lines = [];

    /** @param {string} lines */
    setLines(lines) {
        this.#lines = lines.split(/[\r\n]/);
    }

    process() {
        const labels = new Map();
        const start_word = 0;

        const processed = [];

        let words_processed = 0;
        // First pull them out...
        for (let i in this.#lines) {
            let line = this.#lines[i];
            const matches = line.match(/^\:([A-Z]+)/);
            if (matches) {
                const matched_label = matches[1];
                //console.debug(matched_label);
                labels.set(matched_label, words_processed);
                continue;
            }

            for (let kv of labels) {
                const replace_regex = new RegExp('\\:' + kv[0] + '\\b');
                let matches2 = line.match(replace_regex);
                while (matches2) {
                    const repl = kv[1];
                    line = line.replace(replace_regex, 0 - words_processed + repl);
                    matches2 = line.match(replace_regex);
                }
            }

            const res = txt2asm(line);
            if (res && res instanceof Array) {
                console.log('res=', res);
                processed.push(res);
                const instr = res[0];
                words_processed += 1 + (instr && instr.isTwoWordInstruction() ? 1 : 0);
            }
        }

        return processed;
    }

}



/**
 * Our incoming text will look something like:
 * "0x1234 ABCD 1,2,3,4 ; FOO BAR"
 *  -- or something like
 * "LI"
 *
 * Turn this stuff into an Instruction.
 *
 * @param {string} line
 * @x returns {Instruction|false}
 **/
function txt2asm(line) {
    const Op = Reflect.get(window, 'Op');
    const Instruction = Reflect.get(window, 'Instruction');

    line = line.trim();
    //console.debug('line=', line);

    // We don't care about labels.
    if (line.startsWith(':') || line.startsWith(';')) {
        //console.debug('txt2asm: starts with a colon (label) or semicolon (comment)');
        return false;
    }

    if (line.startsWith('.')) {
        const dot_matches = line.match(/^\.([a-z_]+)\s+(0([xbo]))?([0-9a-f\-]+)\s*(;.+)?$/i);
        if (dot_matches && dot_matches[1].toLowerCase() == 'data') {
            //console.debug(dot_matches);
            let data_value = parseInt(dot_matches[4], 10);
            if (dot_matches[3] == 'x') {
                data_value = parseInt(dot_matches[4], 16);
            } else if (dot_matches[3] == 'b') {
                data_value = parseInt(dot_matches[4], 2);
            } else if (dot_matches[3] == 'o') {
                data_value = parseInt(dot_matches[4], 8);
            }
            return [ false, data_value, '.data  0x' + data_value.toString(16).toUpperCase().padStart(4, '0') ];
        }
        return false;
    }

    let hex_part = 0;
    let op_name_part = '';
    /** @type Array<number|string> */
    let args_part = [];
    let comment_part = '';

    const line_regex = /^(0x)?([0-9a-fA-F]{4})?\s*([A-Z]{1,4})?\s*([0-9A-Za-z:\,\-]+)?\s*(;.+)?$/;
    const matches = line.match(line_regex);
    console.debug('matches=', matches);
    if (!matches) {
        console.debug('txt2asm: regex fail', line);
        return false;
    }

    if (matches[2]) {
        hex_part = parseInt(matches[2], 16);
    }
    if (matches[3]) {
        op_name_part = matches[3].trim();
    }
    if (matches[4]) {
        args_part = matches[4].trim().split(',');
    }
    if (matches[5]) {
        comment_part = matches[5].trim();
    }
    //console.debug('comment_part=', comment_part);

    let is_hex_valid = false;
    let hex_op_name = '';
    if (hex_part > 0) {
        hex_op_name = Op.getOpNameForOpcode(hex_part);
        //console.debug('txt2asm: hex_op_name=', hex_op_name);
        is_hex_valid = !!hex_op_name.length;
    }

    let is_op_name_valid = false;
    let possible_hex_part = 0;
    if (op_name_part.length) {
        possible_hex_part = Op.getOpcodeForString(op_name_part);
        //console.debug(possible_hex_part);
        //console.debug('txt2asm: possible_hex_part=', possible_hex_part, op_name_part);
        if (!possible_hex_part) {
            possible_hex_part = 0;
        }
        if (possible_hex_part > 0) {
            is_op_name_valid = true;
        }
    }

    if (!is_hex_valid && !is_op_name_valid) {
        //console.debug('txt2asm: !is_hex_valid && !is_op_name_valid');
        return false;
    }

    if (is_hex_valid && !is_op_name_valid) {
        op_name_part = hex_op_name;
    }

    if (is_op_name_valid && !is_hex_valid) {
        //console.debug('txt2asm: is_op_name_valid && !is_hex_valid', op_name_part);
        const new_opcode = Op.getOpcodeForString(op_name_part);
        if (new_opcode !== false) {
            hex_part = new_opcode;
        }
    }

    if (Op.getOpNameForOpcode(hex_part) !== op_name_part) {
        console.error('txt2asm: hex_part -> name != op_name', hex_part, op_name_part);
        return false;
    }

    if (Op.getOpcodeForString(op_name_part) !== hex_part) {
        console.error('txt2asm: name -> opcode != hex_part', op_name_part, hex_part);
        return false;
    }

    const instr = Instruction.newFromOpcode(hex_part);
    if (args_part.length != instr.getParamList().length) {
        console.error('txt2asm: args_part length mismatch');
        return false;
    }

    let ki = 0;
    for (let k of instr.getParamList()) {
        instr.setParam(k, args_part[ki++]);
    }

    while (comment_part.startsWith(';')) {
        comment_part = comment_part.substr(1).trim();
    }
    comment_part = comment_part.length ? ' ; ' + comment_part : '';

    instr.finalize();
    const new_opcode = instr.getEffectiveOpcode();
    const new_hex_part = new_opcode.toString(16).toUpperCase().padStart(4, '0');
    const new_op_name = instr.op.op.padEnd(4, ' ');
    const new_args_list = [];
    for (let k of instr.getParamList()) {
        new_args_list.push(instr.getParam(k));
    }
    const final_string = `0x${new_hex_part}  ${new_op_name} ${new_args_list.join(',')}${comment_part}`;

    return [instr, new_opcode, final_string];
}
