// @ts-check
"use strict";


const Tab_Width = 4;
function tab_fixer_onload() {
    const codebox = document.getElementById('codebox');
    if (!codebox) {
        throw new Error();
    }
    // Turn tabs into 4-char indents.
    codebox.addEventListener(
        'keydown',
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
