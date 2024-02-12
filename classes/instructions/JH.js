// @ts-check

import { OpDef } from "../OpDef.js";
import { Format2Unit } from "../ExecutionUnit.js";
import { StatusRegister } from "../StatusRegister.js";

export { OpDef_JH, ExecutionUnit_JH };

class OpDef_JH extends OpDef {
    get op() {                          return "JH"; }
    get shortdesc() {                   return "Jump if Logical Greater"; }
    get opcode() {                      return 6912; } // 1B00
    get opcode_legal_max() {            return 7167; } // 1BFF
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

class ExecutionUnit_JH extends Format2Unit {
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
}
