// @ts-check

import { SimulationState } from "./SimulationState.js";
import { ErrorFlags } from "./ErrorFlags.js";
import { InterruptList } from "./InterruptList.js";
import { Flow } from "./Flow.js";
import { ExecutionProcess } from "./ExecutionProcess";

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
        // Set all interrupts to WP = 1100 and PC = 1200
        for (let addr = 0; addr < 64; addr += 2) {
            this.state.memory.setWord(addr, 0x1100);
            addr += 2;
            this.state.memory.setWord(addr, 0x1200);
        }
        // Including the NMI
        this.state.memory.setWord(0xFFFC, 0x1100);
        this.state.memory.setWord(0xFFFE, 0x1200);
    }

    /**
     * @param {number} state_change_limit
     * @return {string}
     **/
    run(state_change_limit) {
        this.flow.run(state_change_limit);
        return this.flow.flow_state;
    }

}
