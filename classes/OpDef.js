// @ts-check

import { FormatInfo } from "./Format.js";

export class OpDef {

    get name() { return this.op; }

    get has_immediate_operand() {           return this.format == 8; }
    get has_possible_immediate_source() {   return !!this.args['Ts']; }
    get has_possible_immediate_dest() {     return !!this.args['Td']; }
    get has_second_opcode_word() {          return (this.format > 11) && (this.format != 18); }
    get format_info() {                     return FormatInfo.getFormat(this.format); }

    get minimum_instruction_words() {
        return 1 + (this.has_immediate_operand ? 1 : 0) + (this.has_second_opcode_word ? 1 : 0);
    }

    get maximum_instruction_words() {
        return this.minimum_instruction_words
               + (this.has_possible_immediate_source ? 1 : 0)
               + (this.has_possible_immediate_dest ? 1 : 0);
    }

    // These all get overridden.  Receiving "NOP" is or opcode = 0 is considered
    // to be an error condition.
    get op() {                          return "NOP"; }
    get shortdesc() {                   return "NOP (IMPOSSIBLE ERROR)"; }
    get opcode() {                      return 0; }
    get opcode_legal_max() {            return 0; }
    get arg_start_bit() {               return 0; }
    /** @return { Object<string,number> } */
    get args() {                        return { };  }
    /** @return { Object<string,boolean> } */
    get platforms() {
        return { // Platform base (Base instruction set, all platforms)
            '990/10'  :  false,
            '9900'    :  false,
            '990/4'   :  false,
            '990/12'  :  false,
            '9995'    :  false,
            '99000'   :  false,
            '99110A'  :  false,
            '990/10A' :  false,
        };
    }

    get format() {                      return 0; }
    get format_var() {                  return 0; }
    get performs_privilege_check() {    return false; }
    /** @return { Array<string> } */
    get touches_status_bits() {         return []; }
}
