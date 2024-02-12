// @ts-check

import { ExecutionUnit, Format1Unit, Format2Unit } from "./ExecutionUnit.js";
import { StatusRegister } from "./StatusRegister.js";

import { ExecutionUnit_A } from "./instructions/A.js";

export class ExecutionUnitMap {

    /** @typedef {typeof ExecutionUnit} AnonymousExecutionUnit */
    /** @type Object<string,AnonymousExecutionUnit> */
    static #units = {
        'A': ExecutionUnit_A,
        'C': class extends Format1Unit {
            doTheThing() {
                const td = this.inst.getParam('Td');
                const d = this.inst.getParam('D');
                //console.debug([td, d]);
                this.target_value = this.resolveAddressingModeAndGet(td, d);
                this.updateEq(this.source_value, this.target_value);
                this.updateGt(this.source_value, this.target_value);
            }
        },
        'S': class extends Format1Unit {
            doTheThing() {
                const td = this.inst.getParam('Td');
                const d = this.inst.getParam('D');
                //console.debug([td, d]);
                const current_value = this.resolveAddressingModeAndGet(td, d);
                this.target_value = this.clampAndUpdateCarryAndOverflow(current_value - this.source_value);
                this.updateEq(this.target_value, 0);
                this.updateGt(this.target_value, 0);
            }
        },
        'NOP': class extends ExecutionUnit {
            fetchOperands() { return false; }
            execute() {
                console.warn('NOP execute()');
                return true;
            }

            writeResults() { return false; }
        },
        'JEQ': class extends Format2Unit {
            fetchOperands() {
                if (this.simstate.status_register.getBit(StatusRegister.EQUAL)) {
                    this.run = true;
                }
                return true;
            }

            writeResults() {
                /** @FIXME This op does not actually clear the flag.  This is a hack. */
                this.simstate.status_register.resetBit(StatusRegister.EQUAL);
                return false;
            }
        },
        'JGT': class extends Format2Unit {
            fetchOperands() {
                if (this.simstate.status_register.getBit(StatusRegister.AGT)) {
                    this.run = true;
                }
                return true;
            }

            writeResults() {
                /** @FIXME This op does not actually clear the flag.  This is a hack. */
                this.simstate.status_register.resetBit(StatusRegister.AGT);
                return false;
            }
        },
        'JH': class extends Format2Unit {
            fetchOperands() {
                const is_lgt = this.simstate.status_register.getBit(StatusRegister.LGT);
                const is_eq = this.simstate.status_register.getBit(StatusRegister.EQUAL);
                if (is_lgt && !is_eq) {
                    this.run = true;
                }
                return true;
            }

            writeResults() {
                /** @FIXME This op does not actually clear the flag.  This is a hack. */
                this.simstate.status_register.resetBit(StatusRegister.LGT);
                this.simstate.status_register.resetBit(StatusRegister.EQUAL);
                return false;
            }
        },
        'JHE': class extends Format2Unit {
            fetchOperands() {
                const is_lgt = this.simstate.status_register.getBit(StatusRegister.LGT);
                const is_eq = this.simstate.status_register.getBit(StatusRegister.EQUAL);
                if (is_lgt || is_eq) {
                    this.run = true;
                }
                return true;
            }

            writeResults() {
                /** @FIXME This op does not actually clear the flag.  This is a hack. */
                this.simstate.status_register.resetBit(StatusRegister.LGT);
                this.simstate.status_register.resetBit(StatusRegister.EQUAL);
                return false;
            }
        },
        'JL': class extends Format2Unit {
            fetchOperands() {
                const is_lgt = this.simstate.status_register.getBit(StatusRegister.LGT);
                const is_eq = this.simstate.status_register.getBit(StatusRegister.EQUAL);
                if (!is_lgt && !is_eq) {
                    this.run = true;
                }
                return true;
            }

            writeResults() {
                /** @FIXME This op does not actually clear the flag.  This is a hack. */
                this.simstate.status_register.resetBit(StatusRegister.LGT);
                this.simstate.status_register.resetBit(StatusRegister.EQUAL);
                return false;
            }
        },
        'JLE': class extends Format2Unit {
            fetchOperands() {
                const is_lgt = this.simstate.status_register.getBit(StatusRegister.LGT);
                const is_eq = this.simstate.status_register.getBit(StatusRegister.EQUAL);
                if (!is_lgt || is_eq) {
                    this.run = true;
                }
                return true;
            }

            writeResults() {
                /** @FIXME This op does not actually clear the flag.  This is a hack. */
                this.simstate.status_register.resetBit(StatusRegister.LGT);
                this.simstate.status_register.resetBit(StatusRegister.EQUAL);
                return false;
            }
        },
        'JLT': class extends Format2Unit {
            fetchOperands() {
                const is_agt = this.simstate.status_register.getBit(StatusRegister.AGT);
                const is_eq = this.simstate.status_register.getBit(StatusRegister.EQUAL);
                if (!is_agt && !is_eq) {
                    this.run = true;
                }
                return true;
            }

            writeResults() {
                /** @FIXME This op does not actually clear the flag.  This is a hack. */
                this.simstate.status_register.resetBit(StatusRegister.AGT);
                this.simstate.status_register.resetBit(StatusRegister.EQUAL);
                return false;
            }
        },
        'JMP': class extends Format2Unit {
            displacement = 0;
            fetchOperands() {
                this.run = true;
                return true;
            }
        },
        'JNC': class extends Format2Unit {
            fetchOperands() {
                if (!this.simstate.status_register.getBit(StatusRegister.CARRY)) {
                    this.run = true;
                }
                return true;
            }

            writeResults() {
                /** @FIXME This op does not actually clear the flag.  This is a hack. */
                this.simstate.status_register.resetBit(StatusRegister.CARRY);
                return false;
            }
        },
        'JNE': class extends Format2Unit {
            fetchOperands() {
                if (!this.simstate.status_register.getBit(StatusRegister.EQUAL)) {
                    this.run = true;
                }
                return true;
            }

            writeResults() {
                /** @FIXME This op does not actually clear the flag.  This is a hack. */
                this.simstate.status_register.resetBit(StatusRegister.EQUAL);
                return false;
            }
        },
        'JNO': class extends Format2Unit {
            fetchOperands() {
                if (!this.simstate.status_register.getBit(StatusRegister.OVERFLOW)) {
                    this.run = true;
                }
                return true;
            }

            writeResults() {
                /** @FIXME This op does not actually clear the flag.  This is a hack. */
                this.simstate.status_register.resetBit(StatusRegister.OVERFLOW);
                return false;
            }
        },
        'JOC': class extends Format2Unit {
            fetchOperands() {
                if (this.simstate.status_register.getBit(StatusRegister.CARRY)) {
                    this.run = true;
                }
                return true;
            }

            writeResults() {
                /** @FIXME This op does not actually clear the flag.  This is a hack. */
                this.simstate.status_register.resetBit(StatusRegister.CARRY);
                return false;
            }
        },
        'LI': class extends ExecutionUnit {
            #register_num = 0;
            #next_word = 0;
            fetchOperands() {
                this.#register_num = this.inst.getParam('reg');
                this.#next_word = this.inst.getImmediateValue();
                return true;
            }

            execute() {
                //console.debug('LI execute()');
                return true;
            }

            writeResults() {
                this.simstate.setRegisterWord(this.#register_num, this.#next_word);
                return true;
            }
        },
        'MOV': class extends ExecutionUnit {
            source_value = 0;
            fetchOperands() {
                const ts = this.inst.getParam('Ts');
                const s = this.inst.getParam('S');
                //console.debug([ts, s]);
                this.source_value = this.resolveAddressingModeAndGet(ts, s);

                if (ts == 3) {
                    // Autoinc happens *NOW*
                    /** @TODO when copying this, don't forget to set this to 1 instead of 2 for byte instructions instead of word! */
                    this.simstate.setRegisterWord(s, 2 + this.simstate.getRegisterWord(s));
                }
                return true;
            }

            execute() {
                //console.debug('MOV execute()');
                return true;
            }

            writeResults() {
                const td = this.inst.getParam('Td');
                const d = this.inst.getParam('D');
                //console.debug([td, d]);
                this.resolveAddressingModeAndSet(td, d, this.source_value);

                if (td == 3) {
                    /** @TODO when copying this, don't forget to set this to 1 instead of 2 for byte instructions instead of word! */
                    let next_value = this.simstate.getRegisterWord(d) + 2;
                    while (next_value > 0xFFFF) {
                        // Nothing anywhere in the overflow register docs say that
                        // this operation triggers an overflow, so not doing that.
                        next_value -= 0xFFFF;
                    }
                    this.simstate.setRegisterWord(d, next_value);
                }
                return true;
            }
        },
        'INC': class extends ExecutionUnit {
            nv = 0;
            fetchOperands() {
                const ts = this.inst.getParam('Ts');
                const s = this.inst.getParam('S');
                this.nv = this.resolveAddressingModeAndGet(ts, s);
                return true;
            }

            execute() {
                //console.debug('INCT execute()');
                this.nv += 1;
                this.simstate.status_register.resetBit(StatusRegister.OVERFLOW);
                if (this.nv > 0xFFFF) {
                    this.nv -= 0xFFFF;
                    //console.warn('INC: Overflow!');
                    this.simstate.status_register.setBit(StatusRegister.OVERFLOW);
                }
                return true;
            }

            writeResults() {
                const ts = this.inst.getParam('Ts');
                const s = this.inst.getParam('S');
                this.resolveAddressingModeAndSet(ts, s, this.nv);
                return true;
            }
        },
        'INCT': class extends ExecutionUnit {
            nv = 0;
            fetchOperands() {
                const ts = this.inst.getParam('Ts');
                const s = this.inst.getParam('S');
                this.nv = this.resolveAddressingModeAndGet(ts, s);
                return true;
            }

            execute() {
                //console.debug('INCT execute()');
                this.nv += 2;
                this.simstate.status_register.resetBit(StatusRegister.OVERFLOW);
                if (this.nv > 0xFFFF) {
                    this.nv -= 0xFFFF;
                    //console.warn('INCT: Overflow!');
                    this.simstate.status_register.setBit(StatusRegister.OVERFLOW);
                }
                return true;
            }

            writeResults() {
                const ts = this.inst.getParam('Ts');
                const s = this.inst.getParam('S');
                this.resolveAddressingModeAndSet(ts, s, this.nv);
                return true;
            }
        },
        'DEC': class extends ExecutionUnit {
            nv = 0;
            fetchOperands() {
                const ts = this.inst.getParam('Ts');
                const s = this.inst.getParam('S');
                this.nv = this.resolveAddressingModeAndGet(ts, s);
                return true;
            }

            execute() {
                //console.debug('DECT execute()');
                this.nv -= 1;
                this.simstate.status_register.resetBit(StatusRegister.CARRY);
                if (this.nv < 0) {
                    this.nv += 0xFFFF;
                    //console.warn('DEC: Underflow!');
                    this.simstate.status_register.setBit(StatusRegister.CARRY);
                }
                return true;
            }

            writeResults() {
                const ts = this.inst.getParam('Ts');
                const s = this.inst.getParam('S');
                this.resolveAddressingModeAndSet(ts, s, this.nv);
                return true;
            }
        },
        'DECT': class extends ExecutionUnit {
            nv = 0;
            fetchOperands() {
                const ts = this.inst.getParam('Ts');
                const s = this.inst.getParam('S');
                this.nv = this.resolveAddressingModeAndGet(ts, s);
                return true;
            }

            execute() {
                //console.debug('DECT execute()');
                this.nv -= 2;
                this.simstate.status_register.resetBit(StatusRegister.CARRY);
                if (this.nv < 0) {
                    this.nv += 0xFFFF;
                    //console.warn('DECT: Underflow!');
                    this.simstate.status_register.setBit(StatusRegister.CARRY);
                }
                return true;
            }

            writeResults() {
                const ts = this.inst.getParam('Ts');
                const s = this.inst.getParam('S');
                this.resolveAddressingModeAndSet(ts, s, this.nv);
                return true;
            }
        },
    };

    /**
     * @param {string|false} op_name
     * @returns AnonymousExecutionUnit
     **/
    static getClassForOpName(op_name) {
        const processed_name = op_name.toString().toUpperCase();
        if ( !(processed_name in this.#units)) {
            return false;
        }
        return this.#units[processed_name];
    }


}
