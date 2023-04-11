// @ts-check
"use strict";

//import { ExecutionProcess } from "./classes/ExecutionProcess";
//import { Simulation } from "./classes/Simulation";
//import { Asm } from "./classes/Asm";

/** @type {Simulation} */
var sim; // = new Simulation();
var running = false;
var fast_mode = true;
var fast_mode_steps = 1777; // prime, makes fast mode inst count "look" fast
var inst_execution_count = 0;

/**
 * @param {string} element_id
 * @returns {HTMLElement}
 **/
function gebid_stfu(element_id) {
    const el = window.document.getElementById(element_id);
    if (!el) {
        throw new Error('gebid_stfu failed lol');
    }
    return el;
}

function setup_simui() {
    sim = new Simulation();
    Reflect.set(window, 'sim', sim);
}

function reset_simui() {
    running = false;
    fast_mode = false;
    inst_execution_count = 0;

    sim.reset();
    for (let i = 0; i < 32768; i++) {
        sim.state.setWord(i * 2, 0x1000);
    }
    sim.resetIVs();
    assemble_codebox();
    gebid_stfu('errors').innerHTML = '';
    update_simui();
}

function update_simui() {
    gebid_stfu('run_el').innerText = running ? (fast_mode ? 'Yes (fast)' : 'Yes') : 'No';

    gebid_stfu('nstate_el').innerText = sim.flow.flow_state;
    gebid_stfu('pstate_el').innerText = sim.flow.prev_flow_state;

    gebid_stfu('wp_el').innerText = '0x' + sim.state.workspace_pointer.toString(16).toUpperCase().padStart(4, '0');
    gebid_stfu('pc_el').innerText = '0x' + sim.state.getPc().toString(16).toUpperCase().padStart(4, '0');
    gebid_stfu('st_el').innerText = '0b' + sim.state.status_register.getRegisterString();

    gebid_stfu('instcount_el').innerText = inst_execution_count.toString();

    const regrow = gebid_stfu('regrow');
    regrow.innerHTML = '';
    for (let regnum = 0; regnum <= 15; regnum++) {
        const regcell = window.document.createElement('td');
        regcell.textContent = '0x' + sim.state.getRegisterWord(regnum).toString(16).toUpperCase().padStart(4, '0');
        regrow.appendChild(regcell);
    }

    /** @type {ExecutionProcess} */
    let ep = sim.flow.ep;
    const inst = ep.getCurrentInstruction();
    if (inst.opcode_info.name != 'NOP') {
        const op_name = inst.opcode_info.name;
        const op_code = inst.getEffectiveOpcode().toString(16).toUpperCase().padStart(4, '0');
        gebid_stfu('epci_el').innerText = `${op_name} 0x${op_code}`;
    } else {
        gebid_stfu('epci_el').innerText = '--';
    }

    const inst2 = ep.getNextInstruction();
    if (inst2.opcode_info.name != 'NOP') {
        const op2_name = inst2.opcode_info.name;
        const op2_code = inst2.getEffectiveOpcode().toString(16).toUpperCase().padStart(4, '0');
        gebid_stfu('epni_el').innerText = `${op2_name} 0x${op2_code}`;
    } else {
        gebid_stfu('epni_el').innerText = '--';
    }
}

function run_frame_callback() {
    if (running) {
        const steps = fast_mode ? fast_mode_steps : 1;
        for (let i = 0; i < steps; i++) {
            try {
                sim.stepInstruction();
                inst_execution_count++;
            } catch (e) {
                const whoops = window.document.createElement('div');
                whoops.textContent = (e instanceof Error ? e : '!').toString();
                const targ_el = gebid_stfu('errors');

                if (targ_el.hasChildNodes()) {
                    targ_el.insertBefore(whoops, targ_el.firstChild);
                } else {
                    targ_el.appendChild(whoops);
                }
                running = false;
                throw e; // lol
            }
        }
        window.requestAnimationFrame(run_frame_callback);
    }
    update_simui();
}

function assemble_codebox() {
    const ta = gebid_stfu('codebox');
    if ( !(ta instanceof HTMLTextAreaElement)) {
        throw new Error('oh come on');
    }
    const asm = new Asm();
    asm.setLines(ta.value);
    console.debug(asm.process());
    const results = asm.toWords();
    console.debug('asm.towords:', results);
    gebid_stfu('assembled').innerText = asm.toAsm().join("\n");

    if (results && results instanceof Array) {
        for (let i in results) {
            sim.state.setWord(0x0100 + (parseInt(i) * 2), results[i]);
        }
    }
}

function button_onclick_setup() {
    gebid_stfu('codebox_process_button').addEventListener('click', codebox_process_button_onclick);

    gebid_stfu('step_state_button').addEventListener('click', step_state_button_onclick);
    gebid_stfu('inst_state_button').addEventListener('click', inst_state_button_onclick);

    gebid_stfu('run_button').addEventListener('click', run_button_onclick);
    gebid_stfu('runfast_button').addEventListener('click', runfast_button_onclick);

    gebid_stfu('stop_button').addEventListener('click', stop_button_onclick);
    gebid_stfu('reset_button').addEventListener('click', reset_button_onclick);
}

/** @param {Event} event */
function step_state_button_onclick(event) {
    event.stopPropagation();
    event.preventDefault();

    running = false;
    const last_state = sim.step();
    if (last_state == 'B') {
        inst_execution_count++;
    }
    update_simui();
    return false;
}

/** @param {Event} event */
function inst_state_button_onclick(event) {
    event.stopPropagation();
    event.preventDefault();

    running = false;
    sim.stepInstruction();
    inst_execution_count++;
    update_simui();
    return false;
}

/** @param {Event} event */
function codebox_process_button_onclick(event) {
    event.stopPropagation();
    event.preventDefault();

    assemble_codebox();
    return false;
}

/** @param {Event} event */
function run_button_onclick(event) {
    event.stopPropagation();
    event.preventDefault();
    fast_mode = false;
    if (running) {
        return;
    }

    running = true;
    run_frame_callback();
}

/** @param {Event} event */
function runfast_button_onclick(event) {
    event.stopPropagation();
    event.preventDefault();
    fast_mode = true;
    if (running) {
        return;
    }

    running = true;
    run_frame_callback();
}

/** @param {Event} event */
function stop_button_onclick(event) {
    event.stopPropagation();
    event.preventDefault();
    if (!running) {
        return;
    }

    running = false;
    update_simui();
}

/** @param {Event} event */
function reset_button_onclick(event) {
    event.stopPropagation();
    event.preventDefault();

    running = false;
    reset_simui();
    update_simui();
}
