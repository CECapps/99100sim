// @ts-check

import { SimulationState } from "./SimulationState.js";
import { ErrorFlags } from "./ErrorFlags.js";
import { InterruptList } from "./InterruptList.js";
import { Flow } from "./Flow.js";
import { ExecutionProcess } from "./ExecutionProcess.js";

export class Simulation {
    /** @type {SimulationState} */
    state;
    /** @returns {ErrorFlags} */
    get error_flags() { return this.state.error_flags; }
    /** @returns {InterruptList} */
    get interrupts() { return this.state.interrupt_list; }
    /** @type {Flow} */
    flow;
    /** @type {ExecutionProcess} */
    ep;

    constructor() {
        this.state = new SimulationState();
        this.ep = new ExecutionProcess(this.state);
        this.flow = new Flow(this.state, this.ep);
        this.resetIVs();
    }

    reset() {
        this.state.reset();
        this.flow.reset();
        this.ep.reset();
        this.resetIVs();
    }

    resetIVs() {
        // Set all interrupts to WP = 0x0080 and PC = 0x0100
        for (let addr = 0; addr < 64; addr += 2) {
            this.state.setWord(addr, 0x0080);
            addr += 2;
            this.state.setWord(addr, 0x0100);
        }
        // Including the NMI
        this.state.setWord(0xFFFC, 0x0080);
        this.state.setWord(0xFFFE, 0x0100);
    }

    run(step_limit = 1) {
        while (step_limit-- > 0) {
            this.stepInstruction();
        }
        return this.flow.prev_flow_state;
    }

    step() {
        this.flow.run(1);
        window.dispatchEvent(new CustomEvent('memory_updated'));
        return this.flow.prev_flow_state;
    }

    stepInstruction() {
        this.flow.runUntilExecutionState();
        // This is a lie, but this lie makes us run faster
        window.dispatchEvent(new CustomEvent('memory_updated'));
        return this.flow.prev_flow_state;
    }

}
