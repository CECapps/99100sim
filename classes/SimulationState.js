// @ts-check

import { Memory } from "./Memory.js";
import { StatusRegister } from "./StatusRegister.js";
import { InterruptList } from "./InterruptList.js";
import { ErrorFlags } from "./ErrorFlags.js";
import { Instruction } from "./Instruction";

/**
 * SimulationState: Because even solid-state machines have moving parts.
 *
 * We directly hold the Workspace Pointer and Program Counter, and hold references
 * to the system memory, the status register, interrupt states, and error flags.
 *
 * Right now anything can access these innards.
 * @TODO Eliminate direct access to memory, st, il, er.
 **/
export class SimulationState {
    #wp = 0;
    get workspace_pointer()         { return this.#wp; }
    set workspace_pointer(new_wp)   { this.#wp = new_wp & ((2 ** 16) - 1); }

    #pc = 0;

    /** @type {Memory} */
    #mem;
    /** @returns {Memory} */
    get memory()                    { return this.#mem; }

    /** @type {StatusRegister} */
    #st;
    /** @returns {StatusRegister} */
    get status_register()           { return this.#st; }

    /** @type {InterruptList} */
    #il;
    /** @returns {InterruptList} */
    get interrupt_list()            { return this.#il; }

    /** @type {ErrorFlags} */
    #er;
    /** @returns {ErrorFlags} */
    get error_flags()            { return this.#er; }

    constructor() {
        this.#mem = new Memory();
        this.#wp = 0;
        this.#pc = 0;
        this.#st = new StatusRegister();
        this.#il = new InterruptList();
        this.#er = new ErrorFlags();
    }

    reset() {
        this.#mem.reset();
        this.#wp = 0;
        this.#pc = 0;
        this.#st.reset();
        this.#il.reset();
        this.#er.reset();
    }

    getInstructionAtPc() {
        return Instruction.newFromOpcode(this.memory.getWord(this.#pc));
    }

    getPc() {
        return this.#pc;
    }
    /** @param {number} value */
    setPc(value) {
        this.#pc = value;
    }
    advancePc() {
        this.#pc += 2;
    }
    reducePc() {
        this.#pc -= 2;
    }

    /**
     * @param {number} register
     * @param {number} word
     **/
    setRegisterWord(register, word) {
        if (register > 15 || register < 0) {
            register = 0;
        }
        this.memory.setWord(this.#wp + (register * 2), word);
    }

    /**
     * @param {number} register
     **/
    getRegisterWord(register) {
        if (register > 15 || register < 0) {
            register = 0;
        }
        this.memory.getWord(this.#wp + (register * 2));
    }

}
