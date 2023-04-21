// @ts-check
"use strict";

/* * /
import { ExecutionProcess } from "./classes/ExecutionProcess";
import { Simulation } from "./classes/Simulation";
import { Asm } from "./classes/Asm";
/* */

/** @type {Simulation} */
var sim; // = new Simulation();
var running = false;
var slow_mode = false;
var fast_mode = true;
var fast_mode_steps = 797; // Prime; instructions run per frame.  On my system this gets me ~50 FPS and ~40k IPS.

var frame_count = 0;
/** @type {number|null} */
var run_start_time = Date.now();
var inst_execution_count = 0;

var last_fps_update_ts = 0;
var last_execution_count = 0;
var last_frame_count = 0;
/** @type {number[]} */
var running_fps_avg = [];
/** @type {number[]} */
var running_ips_avg = [];

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
    window.setInterval(fps_update_callback, 1000);
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
    viz_request_redraw();
}

function update_simui() {
    gebid_stfu('run_el').innerText = running ? (fast_mode ? 'Yes (fast)' : (slow_mode ? 'Yes (slow)' :'Yes')) : 'No';

    gebid_stfu('nstate_el').innerText = sim.flow.flow_state;
    gebid_stfu('pstate_el').innerText = sim.flow.prev_flow_state;

    gebid_stfu('wp_el').innerText = '>' + sim.state.workspace_pointer.toString(16).toUpperCase().padStart(4, '0');
    gebid_stfu('wp_el').style.color = color_for_word(sim.state.workspace_pointer);
    gebid_stfu('pc_el').innerText = '>' + sim.state.getPc().toString(16).toUpperCase().padStart(4, '0');
    gebid_stfu('pc_el').style.color = color_for_word(sim.state.getPc());

    //gebid_stfu('instcount_el').innerText = inst_execution_count.toString();

    for (let bit of Array(11).keys()) {
        const elname = 'status_bit_' + bit;
        //console.debug(gebid_stfu(elname));
        if (sim.state.status_register.getBit(bit)) {
            gebid_stfu(elname).classList.add('on');
        } else {
            gebid_stfu(elname).classList.remove('on');
        }
    }

    const regrow = gebid_stfu('regrow');
    regrow.innerHTML = '';
    for (let regnum = 0; regnum <= 15; regnum++) {
        const regcell = window.document.createElement('td');
        regcell.style.color = color_for_word(sim.state.getRegisterWord(regnum));
        regcell.textContent = '>' + sim.state.getRegisterWord(regnum).toString(16).toUpperCase().padStart(4, '0');
        regrow.appendChild(regcell);
    }

    /** @type {ExecutionProcess} */
    let ep = sim.flow.ep;
    const inst = ep.getCurrentInstruction();
    if (inst.opcode_info.name != 'NOP') {
        const op_name = inst.opcode_info.name;
        const op_code = inst.getEffectiveOpcode().toString(16).toUpperCase().padStart(4, '0');
        gebid_stfu('epci_el').innerText = `${op_name} >${op_code}`;
        gebid_stfu('epci_el').style.color = color_for_word(inst.getEffectiveOpcode());
    } else {
        gebid_stfu('epci_el').innerText = '--';
    }
}

function run_frame_callback() {
    if (running) {
        const steps = fast_mode ? fast_mode_steps : 1;
        for (let i = 0; i < steps; i++) {
            try {
                if (slow_mode) {
                    const state = sim.step();
                    if (state == 'B') {
                        inst_execution_count++;
                    }
                } else {
                    sim.stepInstruction();
                    inst_execution_count++;
                }
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
        frame_count++;
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
    gebid_stfu('runslow_button').addEventListener('click', runslow_button_onclick);
    gebid_stfu('runfast_button').addEventListener('click', runfast_button_onclick);

    gebid_stfu('stop_button').addEventListener('click', stop_button_onclick);
    gebid_stfu('reset_button').addEventListener('click', reset_button_onclick);
}

function fps_update_callback() {
    if (!running || run_start_time === null) {
        gebid_stfu('fps_el').innerText = '--';
        gebid_stfu('ips_el').innerText = '--';
        return;
    }
    // Keeping a running average results in more correct figures during performance drops
    const running_average_limit = 5;

    const frames_since_last_update = frame_count - last_frame_count;
    const execs_since_last_update = inst_execution_count - last_execution_count;

    last_frame_count = frame_count;
    last_execution_count = inst_execution_count;

    const now = Date.now();
    if (last_fps_update_ts == 0) {
        // Pretending the first update was one second ago gets a more correct figure earlier
        last_fps_update_ts = now - 1000;
    }
    const this_elapsed_ms = now - last_fps_update_ts;
    last_fps_update_ts = now;

    const this_fps = frames_since_last_update / (this_elapsed_ms / 1000);
    const this_ips = execs_since_last_update / (this_elapsed_ms / 1000);

    running_fps_avg.push(this_fps);
    running_ips_avg.push(this_ips);

    if (running_fps_avg.length > running_average_limit) { running_fps_avg.shift(); }
    if (running_ips_avg.length > running_average_limit) { running_ips_avg.shift(); }

    const avg_fps = running_fps_avg.reduce(function(accumulator, current) { accumulator += current; return accumulator; });
    const avg_ips = running_ips_avg.reduce(function(accumulator, current) { accumulator += current; return accumulator; });

    // Weighting the average against the current numbers results in more correct figures during performance drops
    const weighted_fps = ((avg_fps / running_fps_avg.length) + this_fps) / 2;
    const weighted_ips = ((avg_ips / running_ips_avg.length) + this_ips) / 2;

    gebid_stfu('fps_el').textContent = weighted_fps.toFixed(2).toString();
    gebid_stfu('ips_el').textContent = weighted_ips.toFixed(2).toString();
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
    viz_request_redraw();
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
    viz_request_redraw();
    return false;
}

/** @param {Event} event */
function codebox_process_button_onclick(event) {
    event.stopPropagation();
    event.preventDefault();

    assemble_codebox();
    viz_request_redraw();
    return false;
}

/** @param {Event} event */
function run_button_onclick(event) {
    event.stopPropagation();
    event.preventDefault();
    slow_mode = false;
    fast_mode = false;
    if (running) {
        return;
    }

    if (run_start_time === null ) {
        run_start_time = Date.now();
    }

    running = true;
    run_frame_callback();
}

/** @param {Event} event */
function runfast_button_onclick(event) {
    event.stopPropagation();
    event.preventDefault();
    slow_mode = false;
    fast_mode = true;
    if (running) {
        return;
    }

    if (run_start_time === null ) {
        run_start_time = Date.now();
    }

    running = true;
    run_frame_callback();
}

/** @param {Event} event */
function runslow_button_onclick(event) {
    event.stopPropagation();
    event.preventDefault();
    slow_mode = true;
    fast_mode = false;
    if (running) {
        return;
    }

    if (run_start_time === null ) {
        run_start_time = Date.now();
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
    viz_request_redraw();

    run_start_time = null;
    frame_count = 0;
    inst_execution_count = 0;
}

/** @param {Event} event */
function reset_button_onclick(event) {
    event.stopPropagation();
    event.preventDefault();

    running = false;
    reset_simui();
    update_simui();
    viz_request_redraw();

    run_start_time = null;
    frame_count = 0;
    inst_execution_count = 0;
}

/**
 * @param {number} word
 * @returns {string}
 **/
function color_for_word(word) {
    const red_val = extract_binary(word, 16, 11, 5) * 8;
    const red_string = Math.round(red_val).toString(16).padStart(2, '0');

    const green_val = extract_binary(word, 16, 5, 6) * 4;
    const green_string = Math.round(green_val).toString(16).padStart(2, '0');

    const blue_val = extract_binary(word, 16, 0, 5) * 8;
    const blue_string = Math.round(blue_val).toString(16).padStart(2, '0');

    const color_string = `#${red_string}${green_string}${blue_string}`;
    return color_string;
}
