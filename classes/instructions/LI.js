// @ts-check

import { OpDef } from "../OpDef.js";
import { ExecutionUnit } from "../ExecutionUnit.js";

export { OpDef_LI, ExecutionUnit_LI };

class OpDef_LI extends OpDef {
    get op() {                          return "LI"; }
    get shortdesc() {                   return "Load immediate"; }
    get opcode() {                      return 512; } // 0200
    get opcode_legal_max() {            return 527; } // 020F
    get arg_start_bit() {               return 12; }
    get args() {                        return { 'reg': 4 }; }
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

    get format() {                      return 8; }
    get format_var() {                  return 2; }
    get performs_privilege_check() {    return false; }
    get touches_status_bits() {         return ['Lgt', 'Agt', 'Eq']; }
}

class ExecutionUnit_LI extends ExecutionUnit {
    #register_num = 0;
    #next_word = 0;
    fetchOperands() {
        this.#register_num = this.inst.getParam('reg');
        this.#next_word = this.inst.getImmediateValue();
        return true;
    }

    execute() {
        this.updateEq(this.#next_word, 0);
        this.updateGt(this.#next_word, 0);
        return true;
    }

    writeResults() {
        this.simstate.setRegisterWord(this.#register_num, this.#next_word);
        return true;
    }
}
