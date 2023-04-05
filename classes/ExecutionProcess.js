// @ts-check

import { Op } from "../ops";
import { ExecutionUnit } from "./ExecutionUnit";
import { Instruction } from "./Instruction";
import { SimulationState } from "./SimulationState";

/**
 * Execution Process: A Flow-oriented abstraction over instruction operations.
 *
 * This code contains the upcoming and current Instructions, with the logic to
 * pull them and their operands out of memory, validate the result for legality,
 * and give confident answers back to Flow when it needs them.
 *
 * To achieve this, we request an ExecutionUnit to do the real work.
 *
 * This code does not try to comply with the flowchart.  It only provides a single
 * programmatic interface so that the logic to deal with all of these separate
 * parts isn't spread all over the state machine.
 **/
export class ExecutionProcess {

    #simstate;

    #ni_pc = 0;
    #ni = new Instruction(new Op());
    #ci_pc = 0;
    #ci = new Instruction(new Op());
    /** @type {ExecutionUnit|null} */
    #eu = null;

    #finished_begin = false;
    #finished_fetch = false;
    #finished_exec = false;
    #finished_write = false;

    /**
     * @param {SimulationState} simstate
     **/
    constructor(simstate) {
        this.#simstate = simstate;
    }

    reset() {
        this.#ni_pc = 0;
        this.#ni = new Instruction(new Op());
        this.#ci_pc = 0;
        this.#ci = new Instruction(new Op());
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

        // The exact acquisition point of the second word in two-word ops is not
        // expressly stated anywhere in the narrative text in the manual.  The
        // only concrete reference I found is in the instruction sequence / timing
        // bits, such as for SLAM/SRAM as documented on page 86, in which it's
        // documented that the second word is fetched before the operands, and
        // that the PC is not touched during this process.  We need to know the
        // total legality of ourself before operand fetching, so let's get the
        // second word right now.
        if (this.#ni.isTwoWordInstruction()) {
            throw new Error('Two word support NYI sorry.');
            this.#ni.setSecondWord(this.#simstate.getWord(this.#ni_pc + 2));
        }
        this.#ni.finalize();

    }

    promoteNextInstructionToCurrentInstruction() {
        this.#ci_pc = this.#ni_pc;
        this.#ci = this.#ni;
        //console.debug('Current Instruction is now ', this.#ci.op.op, this.#ci);

        this.#eu = ExecutionUnit.newFromInstruction(this.#ci, this.#simstate);

        this.#ni = new Instruction(new Op());
        this.#ni_pc = 0;

        this.#finished_begin = false;
        this.#finished_fetch = false;
        this.#finished_exec = false;
        this.#finished_write = false;
    }

    /**
     * Is the current instruction legal?  Legal here means:
     *  - The Op was found in the list provided in Ops.
     *    (The default Op has opcode = 0 and op name "NOP")
     *  - The Parameters derived from the opcode are legal, including any found
     *    in the optional second word.
     *
     * @returns {boolean} True if Instruction is Legal.
     **/
    currentInstructionIsLegal() {
        return this.#ci.isLegal() && (this.#ci.isTwoWordInstruction() ? this.#ci.checkSecondWordLegality() : true);
    }

    currentInstructionIsTwoWords() {
        return this.#ci.isTwoWordInstruction();
    }

    currentInstructionSecondWordIsLegal() {
        return this.#ci.checkSecondWordLegality();
    }

    /**
     * Does the current instruction need handling as a MID?  Any instructions
     * that are defined in Ops are not MID by definition, so invoking any others
     * means we're not legal.  Likewise, there are a set of defined ranges for
     * all MID instructions and while there's in practice a 100% overlap between
     * undefined instructions and MID areas, it's better to be explicit here.
     *
     * @returns {boolean} True if Instruction needs to be handled as MID.
     **/
    currentInstructionIsMID() {
        return (!this.currentInstructionIsLegal()) && Op.opcodeCouldBeMID(this.#ci.getEffectiveOpcode());
    }

    currentInstructionNeedsPrivilegedMode() {
        if (!this.#eu) {
            return false;
        }
        return this.#eu.doParamsNeedPrivilege();
    }

    /**
     * Is this a Jump instruction?  The Flow needs to know so it can do PC math.
     * All Jumps are Format 2, but so are some CRU operations.  All Jumps also
     * start with the letter J, while the CRU operations never start with J.
     *
     * @returns {boolean} True if Instruction is a Jump
     **/
    currentInstructionIsJump() {
        return this.#ci.op.format == 2 && (this.#ci.op.op.indexOf('J') === 0);
    }

    begin() {
        if (!this.#eu) {
            return false;
        }
        if (this.#finished_begin) {
            throw new Error('ExecutionProcess.begin called twice, you have a bug.');
        }
        this.#finished_begin = true;

        const a = this.#eu.validateOpcode();
        const b = this.#eu.validateParams();
        return a && b;
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
        this.#finished_fetch = true;

        return this.#eu.fetchOperands();
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
        this.#finished_exec = true;

        return this.#eu.execute();
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
        this.#finished_write = true;

        this.#eu.writeResults();
    }

}
