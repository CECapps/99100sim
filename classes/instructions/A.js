// @ts-check

import { OpDef } from "../OpDef.js";
import { Format1Unit } from "../ExecutionUnit.js";

export { OpDef_A, ExecutionUnit_A };

class OpDef_A extends OpDef {
    get op() {                          return "A"; }
    get shortdesc() {                   return "Add int16"; }
    get opcode() {                      return 40960; } // A000
    get opcode_legal_max() {            return 45055; } // AFFF
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
    get touches_status_bits() {         return ['Lgt', 'Agt', 'Eq', 'Car', 'Ov']; }
}

class ExecutionUnit_A extends Format1Unit {
    doTheThing() {
        const td = this.inst.getParam('Td');
        const d = this.inst.getParam('D');
        //console.debug([td, d]);
        const current_value = this.resolveAddressingModeAndGet(td, d);
        this.target_value = this.clampAndUpdateCarryAndOverflow(current_value + this.source_value);
        this.updateEq(this.target_value, 0);
        this.updateGt(this.target_value, 0);
    }
}
