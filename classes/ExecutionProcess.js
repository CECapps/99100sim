// @ts-check

import { OpInfo } from "./OpInfo.js";
import { ExecutionUnit } from "./ExecutionUnit.js";
import { Instruction } from "./Instruction.js";
import { SimulationState } from "./SimulationState.js";

/**
 * Execution Process: An abstraction over Instruction operations.
 *
 * tl;dr: Flow is complex enough without trying to juggle the execution status
 *        of the current and prefetched next instruction.  All of that logic
 *        instead lives here.
 *
 * This code contains the upcoming and current Instructions, with the logic to
 * pull them and their operands out of memory, validate the result for legality,
 * and give confident answers back to Flow when it needs them.
 *
 * To achieve this, we invoke an ExecutionUnit to do the real work and manage
 * the begin/fetch/execute/write cycle.
 *
 * This code does not try to comply with the flowchart.  It only provides a single
 * programmatic interface so that the logic to deal with all of these separate
 * parts isn't spread all over the state machine.
 **/
export class ExecutionProcess {

    #simstate;

    #ni_pc = 0;
    #ni = new Instruction(new OpInfo());
    #ci_pc = 0;
    #ci = new Instruction(new OpInfo());
    /** @type {ExecutionUnit|null} */
    #eu = null;

    #finished_begin = false;
    #finished_fetch = false;
    #finished_exec = false;
    #finished_write = false;

    #pc_offset_for_addtl_words = 0;

    /**
     * @param {SimulationState} simstate
     **/
    constructor(simstate) {
        this.#simstate = simstate;
    }

    reset() {
        this.#ni_pc = 0;
        this.#ni = new Instruction(new OpInfo());
        this.#ci_pc = 0;
        this.#ci = new Instruction(new OpInfo());
        this.#eu = null;
    }

    getCurrentInstruction() {
        return this.#ci;
    }

    getNextInstruction() {
        return this.#ni;
    }

    getCurrentInstructionPC() {
        return this.#ci_pc;
    }

    fetchNextInstruction() {
        this.#ni_pc = this.#simstate.getPc();
        // This does not advance the PC.  This is on purpose.
        this.#ni = this.#simstate.getInstructionAtPc();
    }

    promoteNextInstructionToCurrentInstruction() {
        this.#ci_pc = this.#ni_pc;
        this.#ci = this.#ni;
        //console.debug('Current Instruction is now ', this.#ci.opcode_info.name, this.#ci);

        this.#eu = ExecutionUnit.newFromInstruction(this.#ci, this.#simstate);

        this.#ni = new Instruction(new OpInfo());
        this.#ni_pc = 0;

        this.#finished_begin = false;
        this.#finished_fetch = false;
        this.#finished_exec = false;
        this.#finished_write = false;

        this.#pc_offset_for_addtl_words = 0;
    }

    getPCOffset() {
        return this.#pc_offset_for_addtl_words;
    }

    /**
     * Is this a Jump instruction?  The Flow needs to know so it can do PC math.
     * All Jumps are Format 2, but so are some CRU operations.  All Jumps also
     * start with the letter J, while the CRU operations never start with J.
     *
     * @returns {boolean} True if Instruction is a Jump
     **/
    currentInstructionIsJump() {
        return this.#ci.opcode_info.format == 2 && (this.#ci.opcode_info.name.startsWith('J'));
    }

    begin() {
        if (!this.#eu) {
            return false;
        }
        if (this.#finished_begin) {
            throw new Error('ExecutionProcess.begin called twice, you have a bug.');
        }

        if (this.#ci.hasSecondOpcodeWord()) {
            this.#pc_offset_for_addtl_words += 2;
            this.#ci.setSecondOpcodeWord(this.#simstate.getWord(this.#ci_pc + this.#pc_offset_for_addtl_words));
        }

        const a = this.#eu.validateOpcode();
        this.#finished_begin = true;
        return a;
    }

    fetchOperands() {
        if (!this.#eu) {
            return false;
        }
        if (this.#finished_fetch) {
            throw new Error('ExecutionProcess.fetchOperands called twice, you have a bug.');
        }
        if (!this.#finished_begin) {
            throw new Error('ExecutionProcess.fetchOperands called before begin, you have a bug.');
        }

        if (this.#ci.hasImmediateValue()) {
            this.#pc_offset_for_addtl_words += 2;
            this.#ci.setImmediateValue(this.#simstate.getWord(this.#ci_pc + this.#pc_offset_for_addtl_words));
        }
        if (this.#ci.hasImmediateSourceValue()) {
            this.#pc_offset_for_addtl_words += 2;
            this.#ci.setImmediateSourceValue(this.#simstate.getWord(this.#ci_pc + this.#pc_offset_for_addtl_words));
        }
        if (this.#ci.hasImmediateDestValue()) {
            this.#pc_offset_for_addtl_words += 2;
            this.#ci.setImmediateDestValue(this.#simstate.getWord(this.#ci_pc + this.#pc_offset_for_addtl_words));
        }

        const b = this.#eu.fetchOperands();
        const c = this.#eu.validateParams();
        this.#ci.finalize();
        this.#finished_fetch = true;
        return b && c;
    }

    execute() {
        if (!this.#eu) {
            return false;
        }
        if (this.#finished_exec) {
            throw new Error('ExecutionProcess.execute called twice, you have a bug.');
        }
        if (!this.#finished_fetch) {
            throw new Error('ExecutionProcess.execute called before fetchOperands, you have a bug.');
        }

        const e = this.#eu.execute();
        this.#finished_exec = true;
        return e;
    }

    writeResults() {
        if (!this.#eu) {
            return false;
        }
        if (this.#finished_write) {
            throw new Error('ExecutionProcess.writeResults called twice, you have a bug.');
        }
        if (!this.#finished_exec) {
            throw new Error('ExecutionProcess.writeResults called before execute, you have a bug.');
        }

        const f = this.#eu.writeResults();
        this.#finished_write = true;
        return f;
    }

}
