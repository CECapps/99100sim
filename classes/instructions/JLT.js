// @ts-check

import { OpDef } from "../OpDef.js";
import { Format2Unit } from "../ExecutionUnit.js";
import { StatusRegister } from "../StatusRegister.js";

export { OpDef_JLT, ExecutionUnit_JLT };

class OpDef_JLT extends OpDef {
    get op() {                          return "JLT"; }
    get shortdesc() {                   return "Jump if Less Than"; }
    get opcode() {                      return 4352; } // 1100
    get opcode_legal_max() {            return 4607; } // 11FF
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

class ExecutionUnit_JLT extends Format2Unit {
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
}
