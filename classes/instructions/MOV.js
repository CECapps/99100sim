// @ts-check

import { OpDef } from "../OpDef.js";
import { Format1Unit } from "../ExecutionUnit.js";

export { OpDef_MOV, ExecutionUnit_MOV };

class OpDef_MOV extends OpDef {
    get op() {                          return "MOV"; }
    get shortdesc() {                   return "Copy word"; }
    get opcode() {                      return 49152; } // C000
    get opcode_legal_max() {            return 53247; } // CFFF
    get arg_start_bit() {               return 4; }
    get args() {                        return { 'Td': 2, 'D': 4, 'Ts': 2, 'S': 4 }; }
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

    get format() {                      return 1; }
    get format_var() {                  return 1; }
    get performs_privilege_check() {    return false; }
    get touches_status_bits() {         return ['Lgt', 'Agt', 'Eq']; }
}

class ExecutionUnit_MOV extends Format1Unit {
    doTheThing() {
        this.target_value = this.source_value;
        this.updateGt(this.target_value, 0);
        this.updateEq(this.target_value, 0);
        return true;
    }
}
