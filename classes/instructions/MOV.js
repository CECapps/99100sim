// @ts-check

import { OpDef } from "../OpDef.js";
import { ExecutionUnit } from "../ExecutionUnit.js";

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

class ExecutionUnit_MOV extends ExecutionUnit {
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
}
