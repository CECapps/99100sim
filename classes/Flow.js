// @ts-check

import { ExecutionProcess } from "./ExecutionProcess";
import { SimulationState } from "./SimulationState.js";

/**
 * Flow: A state machine built from the operation flowchart in the manual.
 *
 * "The manual" here is "2250077-9701 990/12 Assembly Language Programmer's Guide"
 * <http://www.bitsavers.org/pdf/ti/990/assembler/2250077-9701A_-12asm_May79.pdf>
 *
 * The flowchart starts on page 5 and goes through page 9, but the chart in
 * isolation isn't enough to actually understand what's going on.  You have to
 * read the rest of Section 2 (Architecture), all of Section 4 (Interrupts),
 * all of Section 6 (Privileged Mode), all of Section 7 (Macrostore), and
 * all of Section 8 (The Attached Processor Interface).
 *
 * Yes, all of it.  Every word.  There are lots of little details that matter,
 * and lots more that don't matter at all in the context of this simulator but
 * that you still need to know.  There are sporadic and well-hidden-in-plain-sight
 * sentences that explain critical concepts.
 *
 * I can not be more clear about this: you won't understand everything that
 * this code does and why it does it without understanding the flowchart.
 * I've done my best to digest it all down into the code and comments.  States
 * named after letters correspond to the letters used to jump between sections
 * of the chart.  The remaining states are glue and isolated complexity.
 *
 * This is how they did it in the old days, you know.  They built a flowchart
 * and then they wrote the code to make it happen.
 **/
export class Flow {

    /**
     * @type {SimulationState}
     * @property simstate
     **/
    simstate;
    /** @type {ExecutionProcess} */
    ep;
    flow_state = 'PowerOn';

    /**
     * @see areActiveInterruptsRaised for docs
     */
    get #running_interrupt() {
        return this.#actual_running_interrupt;
    }
    /** @value {boolean} value */
    set #running_interrupt(value) {
        value = !!value;
        if (value !== this.#actual_running_interrupt) {
            // Only log state changes
            console.debug(`Active Interrupt Request moving from ${this.#actual_running_interrupt.toString()} to ${(value).toString()}`);
        }
        this.#actual_running_interrupt = value;
    }
    #actual_running_interrupt = false;

    #reset_vector_pc = 0;
    #reset_vector_wp = 0;
    #reset_vector_mask = 0;

    /**
     * @param {SimulationState} simstate
     * @param {ExecutionProcess} ep;
     **/
    constructor(simstate, ep) {
        this.simstate = simstate;
        this.ep = ep;
        this.reset();
        this.flow_state = 'PowerOn';
    }

    /** @param {number} state_change_limit */
    run(state_change_limit) {
        // Flow state is set inside enterState.  We pick it up here so we can
        // resume where we left off if we get interrupted.
        let next_function = this.#getStateFunction(this.flow_state);
        let counter = state_change_limit;
        while (next_function !== null && --counter > 0) {
            let chained_state = next_function.call(this);
            next_function = chained_state;
        }
    }

    reset() {
        this.flow_state = 'Reset';
        this.#reset_vector_wp = 0;
        this.#reset_vector_pc = 2;
        this.#reset_vector_mask = 0;
    }

    /**
     * @param {string} state_value
     * @return {function | null}
     **/
    enterState(state_value) {
        // Entering a null state causes run to stop running.
        if (state_value === null) {
            return null;
        }
        const prev_state = this.flow_state;
        let next_state = this.#getStateFunction(state_value);
        if (next_state === null) {
            state_value = 'Crash';
            next_state = this.#getStateFunction(state_value);
        }
        this.flow_state = state_value;
        //console.info(`Flow: "${prev_state}" => "${state_value}"`);
        return next_state;
    }

    /**
     * @param {string} state_value
     * @return {function | null}
     **/
    #getStateFunction(state_value) {
        /** @type {Object<string,function>} */
        const possible_states = {
            'PowerOn': this.statePowerOn,
            'Crash': this.stateCrash,
            'Reset': this.stateReset,
            'Begin': this.stateBegin,
            'A': this.stateA,
            'A2': this.stateA2,
            'B': this.stateB,
            'C': this.stateC,
            'C2': this.stateC2,
            'D': this.stateD,
            'E': this.stateE,
            'F': this.stateF,
            'F2': this.stateF2,
            'G': this.stateG,
        };
        if (!possible_states[state_value]) {
            return null;
        }
        return possible_states[state_value];
    }

    /**
     * State: Crash.
     *
     * We enter this state only after enterState fails to find a legal next state.
     * This should only happen as part of a bug.  Returning null stops the run loop.
     */
    stateCrash() {
        console.warn('Entering state=Crash');
        return null;
    }

    /**
     * State: PowerOn.
     *
     * We enter this state only at the start of the flow and only if the flow
     * has not been subject to a reset.
     *
     * @TODO use this to set interrupt 0 but not set the internal RESET flag
     */
    statePowerOn() {
        return this.enterState('Reset');
    }

    /**
     * State: Reset.
     *
     * The Reset state starts at the top of the flowchart on page 5.  It represents
     * the "real" entry point for all execution.  Because we have no RESET signal,
     * we don't do the busywait for it to be dropped, instead acting like it just did.
     */
    stateReset() {
        // The power-on / interrupt 0 / reset vectors are at the start of memory space.
        this.#reset_vector_wp = this.simstate.getWord(0x0000);
        this.#reset_vector_pc = this.simstate.getWord(0x0002);
        this.#reset_vector_mask = 0b000;
        return this.enterState('Begin');
    }

    /**
     * State: Begin.
     *
     * The Begin state starts in the top right of the flowchart on page 5.  At
     * this point, we have just received a new WP/PC vector from either exiting
     * the Reset state or the E state and need to pick up execution there.
     */
    stateBegin() {
        // Manual context switch!  Stash away our WP, our PC, and our interrupt mask.
        const old_wp = this.simstate.workspace_pointer;
        const old_pc = this.simstate.getPc();
        const old_mask = this.simstate.status_register.getInterruptMask();
        // Then load the new ones in...
        this.simstate.workspace_pointer = this.#reset_vector_wp;
        this.simstate.setPc(this.#reset_vector_pc);
        this.simstate.status_register.setInterruptMask(this.#reset_vector_mask);
        // ... and save where we were.
        this.simstate.setRegisterWord(13, old_wp);
        this.simstate.setRegisterWord(14, old_pc);
        this.simstate.setRegisterWord(15, old_mask);

        // Clear out status bits 7-12
        for (let i = 7; i < 12; i++) {
            this.simstate.status_register.resetBit(i);
        }

        /** @TODO need to manually track the Internal interrupts */
        if (this.#_Begin_NYI_checkLastTrapWasRESET()) {
            this.simstate.status_register.reset();
            this.simstate.error_flags.reset();

            if (this.simstate.interrupt_list.hasRaisedNMI()) {
                return this.enterState('B');
            }
            return this.enterState('C');
        }

        /** @TODO need to manually track the Internal interrupts */
        if (this.#_Begin_NYI_checkLastTrapWasILLOP()) {
            if (this.simstate.interrupt_list.hasRaisedNMI()) {
                return this.enterState('B');
            }
        }
        // Fall through to state C from the bottom right of flowchart page 5.
        return this.enterState('C');
    }

    /**
     * @TODO implement
     **/
    #_Begin_NYI_checkLastTrapWasRESET() {
        return false;
    }

    /**
     * @TODO implement
     **/
    #_Begin_NYI_checkLastTrapWasILLOP() {
        return false;
    }

// #region State A+A2

    /**
     * State A: Begin Execution
     *
     * State A starts at the top of the flowchart on page 7.  There are two routes
     * here.  The first is by way of B->D / C, at the start of which the next
     * instruction is fetched, and then later made our current one through stage B.
     * There are no Active  Interrupt Requests pending.  All error checking here
     * is for the current instruction, not the immediately preceding one.
     * @TODO Did the error checking tense split happen before this stage?
     *
     * @TODO make this paragraph true:
     * The second route here is by way of G, in which case we just came out of
     * the Macrostore.  Macrostore can raise ILLOP (internal interrupt), and
     * also can optionally skip interrupt checks.
     *
     * We'll check for interrupts and then eventually fall through to state B.
     */
    stateA() {
        /** @TODO this returns a value, what do? */
        this.ep.begin();
        if (this.ep.currentInstructionIsJump()) {
            this.simstate.reducePc();
        }
        /** @TODO this returns a value, what do? */
        this.ep.fetchOperands();

        if (this.#_A_NYI_isExitMacrostoreWithoutCheckingInterrupts()) {
            return this.enterState('B');
        }

        if (this.#_A_NYI_isExitMacrostoreWithILLOP()) {
            this.#_A_NYI_doLockInActiveInterruptRequest();
            this.enterState('B');
        }

        // XOP, BLWP, and X are allowed to ignore the NMI until completion.
        if (!this.simstate.interrupt_list.hasRaisedNMI()) {
            const exclude = (this.#checkInstructionIs('XOP')
                             || this.#checkInstructionIs('BLWP')
                             || this.#checkInstructionIs('X')
                            );
            if (exclude) {
                this.enterState('B');
            }
        }

        return this.enterState('A2');
    }

    /**
     * State A2: The IDLE busywait
     *
     * The IDLE instruction is handled here instead of inside the instruction exec.
     * This flow works only in hardware-land, where busywaiting on an interrupt
     * makes sense.  Here in Flow it'd put us in a loop we can't escape from,
     * so instead we crash.
     *
     * @TODO Make handling of IDLE recoverable.
     **/
    stateA2() {
        if (this.#_A_NYI_hasAnyPendingInterruptRequestIgnoringMask()) {
            if (!this.#_A_NYI_isPendingInterruptEnabledByInterruptMask()) {
                this.#_A_NYI_doLockInActiveInterruptRequest();
                return this.enterState('B');
            }
        }

        if (this.#checkInstructionIs('IDLE')) {
            return null;
        }
        return this.enterState('B');
    }

    /**
     * State A, second shape down on page 7.  We came out of state G after doing
     * a MID emulation and expressly not checking for interrupts.  This is done
     * by executing an RTWP with the special opcode 0x0384.
     *
     * @TODO Need to have macrostore support and RTWP special opcode support
     **/
    #_A_NYI_isExitMacrostoreWithoutCheckingInterrupts() { return false; }

    /**
     * State A, third shape down on page 7.  We came out of state G after trying
     * to process a MID instruction but either the macrostore is disabled, or
     * the macrostore balked at the instruction.  The ILLOP error flag has
     * been set, but interrupt 2 has NOT been raised - remember, ILLOP is INTERNAL!
     *
     * @TODO Need to have macrostore support and internal ILLOP support
     **/
    #_A_NYI_isExitMacrostoreWithILLOP() { return false; }

    /**
     * State A2, second shape from the bottom of page 7.
     *
     * @TODO check for NMI, internal, and external interrupts
     **/
    #_A_NYI_hasAnyPendingInterruptRequestIgnoringMask() { return false; }

    /**
     * State A2, only shape near the bottom center of page 7.
     *
     * @TODO internals can't be masked, right?  if so, this is NMI and external
     **/
    #_A_NYI_isPendingInterruptEnabledByInterruptMask() { return false; }

    /**
     * State A2, only shape at the bottom left of page 7.
     *
     * @TODO sync with other "LOCK IN ACTIVE INTERRUPT REQUEST" states
     **/
    #_A_NYI_doLockInActiveInterruptRequest() {}

// #endregion State A+A2

// #region State B

    /**
     * State B: Complete Execution
     *
     * State B starts in the top middle of the flowchart on page 6.  We can get
     * here through either state A or Begin.
     *
     * The flowchart has us fetch the next instruction before finishing the
     * current instruction by writing out results, but I'm not sure that prefetch
     * and write thing works well for this non-hardware simulation.
     * Doing it in that order anyway.
     */
    stateB() {
        // Fetch the next instruction, but do not execute it yet.
        // This automatically uses and stashes the PC but does NOT advance it.
        this.ep.fetchNextInstruction();
        this.#recordStateOfAppSignal(); // For a check during state C2
        this.simstate.advancePc();

        /** @TODO this returns a value, what do? */
        this.ep.execute();
        /** @TODO this returns a value, what do? */
        this.ep.writeResults();

        // This instruction is now complete.  We can move on to the next one.
        this.ep.promoteNextInstructionToCurrentInstruction();

        return this.enterState('D');
    }

// #endregion State B

// #region State C+C2

    /**
     * State C: No Interrupts?  Fetch next instruction.
     *
     * State C starts in the top right of the flowchart on page 6.  We enter this
     * state only and exclusively out of the Begin state.  We know at this time
     * that NMI is not being held.  We may have active internal RESET or ILLOP
     * signals, but we're going to ignore them right now.
     *
     * We always move to state C2 next.
     */
    stateC() {
        // Fetch the next instruction, but do not execute it yet.
        // This automatically uses and stashes the PC but does NOT advance it.
        this.ep.fetchNextInstruction();
        this.#recordStateOfAppSignal(); // For a check during state C2
        this.simstate.advancePc();

        return this.enterState('C2');
    }

    /**
     * State C2: Opcode Error Check, Part 2 (see D)
     *
     * State C2 starts in the mid-bottom right of the flowchart on page 6, after
     * the arrow from the start of state C joins in.  We've recently executed
     * an instruction and fetched the next.  Time to make a few last checks
     * before we begin executing the fetched instruction.
     *
     * We enter this state at the natural conclusion of both states C and D.
     */
    stateC2() {
        if (this.#_C2_NYI_isPrivilegedOpcodeViolation()) {
            this.simstate.error_flags.setFlag(14); // "EIST14"
            if ( !(this.simstate.status_register.getInterruptMask() <= 2)) {
                return this.enterState('E');
            }
        }
        if (this.#_C2_NYI_isMIDOrWasAppSignalHighDuringInstructionFetch()) {
            return this.enterState('F');
        }
        return this.enterState('A');
    }

    /**
     * State C2, second to last shape in the bottom right column.  We've recently
     * executed an instruction and are now checking to see if it raised a PRIVOP
     * violation.  If so, the next steps in the state set the correct error flag
     * and see if it can be processed.
     *
     * @TODO need to detect and raise PRIVOP, at the right time  Where's that?
     **/
    #_C2_NYI_isPrivilegedOpcodeViolation() { return false; }

    /**
     * Stage C2, final shape in the bottom right column.  We've recently fetched
     * a new instruction and need to determine to offload it to APP or MID.
     *
     * @TODO We'll never have APP but MID'll be a thing, fix this when adding MID
     **/
    #_C2_NYI_isMIDOrWasAppSignalHighDuringInstructionFetch() { return false; }

// #endregion State C+C2

// #region State D

    /**
     * State D: Opcode Error Check, Part 1 (see C2)
     *
     * State D starts at the top left of the flowchart on page 6.  We get here
     * either by having finished the APP logic in state F, or by being merged
     * into at the end of stage B (via Execute).
     *
     * At this point we have a valid next instruction lined up but have not yet
     * executed it.  These checks are for the current (just executed) instruction,
     * not the next (unexecuted) one.
     */
    stateD() {
        const is_overflow = this.simstate.status_register.getBit(4);
        const do_raise_af = this.simstate.status_register.getBit(10)
        if (is_overflow && do_raise_af) {
            this.simstate.error_flags.setFlag(4); // "EIST4"
            /** @TODO is this where the interrupt is actually raised? */
            if ( !(this.simstate.status_register.getInterruptMask() <= 2)) {
                this.simstate.reducePc();
                return this.enterState('E');
            }
        }

        if (this.#areActiveInterruptsRaised()) {
            this.simstate.reducePc();
            return this.enterState('E');
        }

        return this.enterState('C2');
    }


// #endregion State D

// #region State E

    /**
     * State E.
     *
     * State E starts at the top left of the flowchart on page 5.  We can get here
     * from states C2 and D after it's been determined that there's an interrupt
     * that must be handled.
     *
     * Processing of interrupts depends on coming through this logic.  If we come
     * through here, various places will look for "active interrupt requests."
     * We're in an "active interrupt request" when we're about to execute the
     * instruction located at the resulting post-Begin PC.  This process must not
     * be interrupted.
     *
     * Both RESET and ILLOP are considered "internal" interrupts.  The current
     * instruction is always completed before these can be handled.  See description
     * of the interrupt handler in section 4.1 starting on page 23.
     *
     * This state pulls the trap IVs into the WP and PC
     */
    stateE() {

        // We are now an Active Interrupt Request!
        /** @TODO are we? */
        this.#running_interrupt = true;

        if (this.simstate.interrupt_list.hasRaisedNMI()) {
            // The NMI vectors are at the end of memory space.
            this.#reset_vector_pc = this.simstate.getWord(0xFFFC);
            this.#reset_vector_wp = this.simstate.getWord(0xFFFE);
            this.#reset_vector_mask = 0b000;
            return this.enterState('Begin');
        }

        if (this.#_E_NYI_isEnabledInternalInterrupt()) {
            // Internals are always dealt with through interrupt 2
            this.#reset_vector_wp = this.simstate.getWord(0x0008);
            this.#reset_vector_pc = this.simstate.getWord(0x000A);
            this.#reset_vector_mask = 0b001; // thus permitting only 0 and 1
            return this.enterState('Begin');
        }

        if (this.#_E_NYI_isLevel0InterruptExternal()) {
            this.#reset_vector_wp = this.simstate.getWord(0x0000);
            this.#reset_vector_pc = this.simstate.getWord(0x0002);
            this.#reset_vector_mask = 0b000;
            return this.enterState('Begin');
        }

        // Therefore this must be a normal interrupt.
        const int_level = this.simstate.interrupt_list.getLowestRaisedInterrupt();
        if (int_level == 0) {
            throw new Error('Bottom of state E reached without a raised interrupt, look for bugs!');
        }
        this.#reset_vector_wp = this.simstate.getWord(0x0000 + (int_level * 4));
        this.#reset_vector_pc = this.simstate.getWord(0x0002 + (int_level * 4));
        this.#reset_vector_mask = int_level - 1;
        return this.enterState('Begin');
    }

    /**
     * State E, second check in the left column of page 5.  We're entering an
     * interrupt handler.  The two internal interrupts, RESET and ILLOP, get
     * special treatment, but we still act like they're a level 2 interrupt.
     *
     * @TODO make this work when RESET and ILLOP are implemented.
     **/
    #_E_NYI_isEnabledInternalInterrupt() { return false; }

    /**
     * State E, third check in the left column of page 5.  We're entering an
     * interrupt handler and checking for special behavior for interrupt 0.
     * Interrupt 0 can come from external hardware sources or from special
     * handling as an internal interrupt.  Later logic needs to discern if we
     * took the special internal RESET route or if we need to treat this like
     * a hardware interrupt 0.
     *
     * @TODO track states Reset vs PowerOn, make this work, and add cleanup
     **/
    #_E_NYI_isLevel0InterruptExternal() { return false; }

// #endregion State E

// #region State F+F2

    /**
     * State F: Prepare to hand off this instruction to the Attached Processor
     *
     * State F starts at the top of the flowchart on page 8.  We get here through
     * state C2, where it's been established that the currently processing opcode
     * is MID, or that APP was being held during the opcode fetch.
     *
     * Because this simulation does not implement APP, and this entire block of
     * logic depends entirely on APP existing and being raised, entering state F
     * is effectively just a punt to state G.
     *
     * See section 8 of the manual starting on page 47, though the useful things
     * for the purpose of this state are in the paragraphs at the bottom of 50.
     */
    stateF() {
        if (!this.#_F_NYI_isAppActiveNow()) {
            return this.enterState('G');
        }
        throw new Error('Entered unreachable point in state F.  nice bug!');

        // The remainder of this code is unreachable.
        /*
        if (this.#_F_NYI_wasAppActiveAtInstructionFetch()) {
            this.simstate.reducePc();
        }

        this.#_F_NYI_doSwitchToInterrupt2WP();

        return this.enterState('F2');
        */
    }

    #_F_NYI_isAppActiveNow() { return false; }
    /*
    #_F_NYI_wasAppActiveAtInstructionFetch() { return false; }
    #_F_NYI_doSwitchToInterrupt2WP() { return false; }
    */

    /**
     * State F2: Busywait for an interrupt while APP does stuff.
     *
     * We can only come here through state F. Like the IDLE loop, this is broken.
     * Unlike the IDLE loop, this code is entirely unreachable and will probably
     * never be made reachable.  The skeleton is here for funsies.
     **/
    stateF2() {
        throw new Error('Entered unreachable state F2.  nice bug!');
        return this.enterState('D');
        /*
        if (!this.#_F2_NYI_isAppOrHoldActive()) {
            this.#_F2_NYI_doSwitchBackFromInterrupt2WP();
            this.#_F2_NYI_doFetchNextInstructionAndAdvancePC();
            return this.enterState('D');
        }

        if (this.#_F2_NYI_isNMIOrUnmaskedInterruptRaised()) {
            this.#_F2_NYI_doLockInActiveInterruptRequest();
        }

        return this.enterState('F2');
        */
    }
    /*
    #_F2_NYI_isAppOrHoldActive() { return false; }
    #_F2_NYI_doSwitchBackFromInterrupt2WP() { return false; }
    #_F2_NYI_isNMIOrUnmaskedInterruptRaised() { return false; }
    #_F2_NYI_doLockInActiveInterruptRequest() { return false; }
    #_F2_NYI_doFetchNextInstructionAndAdvancePC() { return false; }
    */

// #endregion State F+F2

// #region State G

    /**
     * State G.
     *
     * State G starts at the top of the flowchart on page 9.  We get here only
     * through state F, after which it's been determined that this is a MID
     * instruction and APP is not being held.
     */
    stateG() {
        if (this.#_G_NYI_isSecondWordOfTwoWordOpcodeIllegal()) {
            this.simstate.reducePc();
        }

        if (this.#_G_NYI_isMacrostoreDisabled()) {
            /** @TODO make sure to denote the ILLOP internal interrupt */
            this.simstate.error_flags.setFlag(13);
            this.#_G_NYI_doExitMacrostore();
            return this.enterState('A');
        }

        throw new Error('Entered unreachable point in state G.  nice bug!');

        // The remainder of this code is unreachable.
        /*
        this.#_G_NYI_doEnterMacrostore();

        if (!this.#_G_NYI_isOpcodeRecognizedByMacrostore()) {
            this.#_G_NYI_doReturnFromMacrostoreUsingRTWP0x0382();
            this.#_G_NYI_doSetILLOPFlag();
            this.#_G_NYI_doExitMacrostore();
            return this.enterState('A');
        }

        this.#_G_NYI_doEmulateOpcode();

        if (this.#_G_NYI_doesEmulatedOpcodeCheckForInterrupts()) {
            this.#_G_NYI_doReturnFromMacrostoreUsingRTWP0x0380();
        } else {
            this.#_G_NYI_doReturnFromMacrostoreUsingRTWP0x0384();
        }

        this.#_G_NYI_doExitMacrostore();

        return this.enterState('A');
        */
    }

    /**
     * @TODO the underlying check here is busted
     **/
    #_G_NYI_isSecondWordOfTwoWordOpcodeIllegal() {
        return this.ep.currentInstructionSecondWordIsLegal();
    }

    /**
     * @TODO implement macrostore lol
     **/
    #_G_NYI_isMacrostoreDisabled() {
        return true;
    }

    /**
    * Being inside macrostore has some Implications.
    * @TODO document the implications and what exiting means.
    **/
    #_G_NYI_doExitMacrostore() { return false; }

   /*
   // These are unreachable.
   #_G_NYI_doEnterMacrostore() { return false; }
   #_G_NYI_isOpcodeRecognizedByMacrostore() { return false; }
   #_G_NYI_doReturnFromMacrostoreUsingRTWP0x0382() {}
   #_G_NYI_doEmulateOpcode() { return false; }
   #_G_NYI_doesEmulatedOpcodeCheckForInterrupts() { return false; }
   #_G_NYI_doReturnFromMacrostoreUsingRTWP0x0380() { return false; }
   #_G_NYI_doReturnFromMacrostoreUsingRTWP0x0384() { return false; }
   */

// #endregion State G


    /**
     * Did we arrive at this point by route of stage E?  If so, we're running
     * through code that is trying to process the first opcode of an interrupt.
     * There are various checks where this is made that fork away in order to
     * make sure that the first instruction of the interrupt process is completed.
     *
     * If we didn't get here through stage E, we can accept an interrupt request
     * during the next available check.
     */
    #areActiveInterruptsRaised() {
        return this.#running_interrupt;
    }

    /**
     * Given an Op name, check to see if our current instruction is that instruction.
     * @param {string} op_name
     **/
    #checkInstructionIs(op_name) {
        return this.ep.getCurrentInstruction().op.op.toUpperCase() == op_name.toUpperCase();
    }

    #recordStateOfAppSignal() {
        // There is never an APP signal to process.
        return false;
    }

}
