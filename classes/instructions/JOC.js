// @ts-check

import { OpDef } from "../OpDef.js";
import { Format2Unit } from "../ExecutionUnit.js";
import { StatusRegister } from "../StatusRegister.js";

export { OpDef_JOC, ExecutionUnit_JOC };

class OpDef_JOC extends OpDef {
    get op() {                          return "JOC"; }
    get shortdesc() {                   return "Jump if Carry"; }
    get opcode() {                      return 6144; } // 1800
    get opcode_legal_max() {            return 6399; } // 18FF
    get arg_start_bit() {               return 8; }
    get args() {                        return { 'disp': 8 }; }
    get platforms() {
        return { // Platform base (Base instruction set, all platforms)
            '990/10'  :  true,
            '9900'    :  true,
            '990/4'   :  true,
            '990/12'  :  true,
            '9995'    :  true,
            '99000'   :  true,
            '99110A'  :  true,
            '990/10A' :  true,
        };
    }

    get format() {                      return 2; }
    get format_var() {                  return 1; }
    get performs_privilege_check() {    return false; }
    get touches_status_bits() {         return []; }
}

class ExecutionUnit_JOC extends Format2Unit {
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
}
