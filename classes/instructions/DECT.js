// @ts-check

import { OpDef } from "../OpDef.js";
import { ExecutionUnit } from "../ExecutionUnit.js";
import { StatusRegister } from "../StatusRegister.js";

export { OpDef_DECT, ExecutionUnit_DECT };

class OpDef_DECT extends OpDef {
    get op() {                          return "DECT"; }
    get shortdesc() {                   return "Decrement by two"; }
    get opcode() {                      return 1600; } // 0640
    get opcode_legal_max() {            return 1663; } // 067F
    get arg_start_bit() {               return 10; }
    get args() {                        return { 'Ts': 2, 'S': 4 }; }
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

    get format() {                      return 6; }
    get format_var() {                  return 2; }
    get performs_privilege_check() {    return false; }
    get touches_status_bits() {         return ['Lgt', 'Agt', 'Eq', 'Car', 'Ov']; }
}

class ExecutionUnit_DECT extends ExecutionUnit {
    nv = 0;
    fetchOperands() {
        const ts = this.inst.getParam('Ts');
        const s = this.inst.getParam('S');
        this.nv = this.resolveAddressingModeAndGet(ts, s);
        return true;
    }

    execute() {
        this.nv = this.clampAndUpdateCarryAndOverflow(this.nv - 2);
        this.updateEq(this.nv, 0);
        this.updateGt(this.nv, 0);
        return true;
    }

    writeResults() {
        const ts = this.inst.getParam('Ts');
        const s = this.inst.getParam('S');
        this.resolveAddressingModeAndSet(ts, s, this.nv);
        return true;
    }
}
