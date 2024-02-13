// @ts-check

import { OpDef } from "../OpDef.js";
import { Format2Unit } from "../ExecutionUnit.js";
import { StatusRegister } from "../StatusRegister.js";

export { OpDef_JMP, ExecutionUnit_JMP };

class OpDef_JMP extends OpDef {
    get op() {                          return "JMP"; }
    get shortdesc() {                   return "Unconditional Jump"; }
    get opcode() {                      return 4096; } // 1000
    get opcode_legal_max() {            return 4351; } // 10FF
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

class ExecutionUnit_JMP extends Format2Unit {
    displacement = 0;
    fetchOperands() {
        this.run = true;
        return true;
    }
}
