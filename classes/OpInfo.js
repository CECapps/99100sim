// @ts-check

import { OpDef } from "./OpDef.js";
import { OpDef_A } from "./instructions/A.js";

/**
 * OpInfo: A bag of static methods that maps instructions to their opcodes and
 * their associated OpDefs.
 */
export class OpInfo {

    /** @type string[] */
    static #function_map;

    /** @type Object<string,number[]> */
    static #mids = {
        'MID A'     : [parseInt('0000', 16), parseInt('007F', 16)],
        'MID B'     : [parseInt('00A0', 16), parseInt('017F', 16)],
        'MID C 1A'  : [parseInt('0210', 16), parseInt('021F', 16)],
        'MID C 1B'  : [parseInt('0230', 16), parseInt('023F', 16)],
        'MID C 1C'  : [parseInt('0250', 16), parseInt('025F', 16)],
        'MID C 1D'  : [parseInt('0270', 16), parseInt('027F', 16)],
        'MID C 1E'  : [parseInt('0290', 16), parseInt('029F', 16)],
        'MID C 1F'  : [parseInt('02B0', 16), parseInt('02BF', 16)],
        'MID C 1G'  : [parseInt('02D0', 16), parseInt('02DF', 16)],
        'MID C 2A'  : [parseInt('02E1', 16), parseInt('02FF', 16)],
        'MID C 2B'  : [parseInt('0301', 16), parseInt('033F', 16)],
        'MID C 3A'  : [parseInt('0341', 16), parseInt('035F', 16)],
        'MID C 3B'  : [parseInt('0361', 16), parseInt('037F', 16)],
        'MID C 3C'  : [parseInt('0381', 16), parseInt('039F', 16)],
        'MID C 3D'  : [parseInt('03A1', 16), parseInt('03BF', 16)],
        'MID C 3E'  : [parseInt('03C1', 16), parseInt('03DF', 16)],
        'MID C 4A'  : [parseInt('03E1', 16), parseInt('03FF', 16)],
        'MID D'     : [parseInt('0780', 16), parseInt('07FF', 16)],
        'MID E'     : [parseInt('0C00', 16), parseInt('0FFF', 16)],
    };

    static #populateFunctionMap() {
        if (!this.#function_map) {
            this.#function_map = [];
            for (const oiclass in this.#ops) {
                const opinfo = new this.#ops[oiclass];
                for (let i = opinfo.opcode; i <= opinfo.opcode_legal_max; i++) {
                    OpInfo.#function_map[i] = opinfo.name;
                }
            }
        }
    }

    /**
     * @param {string} opname
     * @returns {boolean}
     **/
    static opNameIsValid(opname) {
        return Object.hasOwn(this.#ops, opname);
    }

    /**
     * @param {number} opcode
     * @returns {boolean}
     **/
    static opcodeIsValid(opcode) {
        this.#populateFunctionMap();
        return Object.hasOwn(this.#function_map, opcode) && (typeof this.#function_map[opcode] === 'string');
    }

    /**
     * @param {string} opname
     * @returns {number}
     **/
    static getOpcodeFromOpName(opname) {
        if (!this.opNameIsValid(opname)) {
            throw new Error(`Invalid op name: "${opname}"`);
        }
        return (new this.#ops[opname]).opcode;
    }

    /**
     * @param {number} opcode
     * @returns {string}
     **/
    static getOpNameFromOpcode(opcode) {
        if (!this.opcodeIsValid(opcode)) {
            throw new Error(`Invalid opcode: "${opcode}"`);
        }
        return this.#function_map[opcode];
    }

    /**
     * @param {string} opname
     * @returns {OpDef}
     **/
    static getFromOpName(opname) {
        if (!this.opNameIsValid(opname)) {
            throw new Error(`Invalid op name: "${opname}"`);
        }
        return new this.#ops[opname];
    }

    /**
     * @param {number} opcode
     * @returns {OpDef}
     **/
    static getFromOpcode(opcode) {
        if (!this.opcodeIsValid(opcode)) {
            throw new Error(`Invalid opcode: "${opcode}"`);
        }
        return new this.#ops[this.#function_map[opcode]];
    }

    /**
     * @param {number} opcode
     * @returns {boolean}
     **/
    static opcodeCouldBeMID(opcode) {
        for (const mid_name in this.#mids) {
            if (opcode >= this.#mids[mid_name][0] && opcode <= this.#mids[mid_name][1]) {
                return true;
            }
        }
        return false;
    }

    /**
     * @typedef {typeof OpDef} OpDefImpl
     * @type Object<string,OpDefImpl>
     **/
    static #ops = {
        'A': OpDef_A,

        'AB': class extends OpDef {
            get op() {                          return "AB"; }
            get shortdesc() {                   return "Add int8"; }
            get opcode() {                      return 45056; } // B000
            get opcode_legal_max() {            return 49151; } // BFFF
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
            get touches_status_bits() {         return ['Lgt', 'Agt', 'Eq', 'Car', 'Ov', 'Par']; }
        },

        'ABS': class extends OpDef {
            get op() {                          return "ABS"; }
            get shortdesc() {                   return "Absolute Value"; }
            get opcode() {                      return 1856; } // 0740
            get opcode_legal_max() {            return 1919; } // 077F
            get arg_start_bit() {               return 10; }
            get args() {                        return { 'Ts': 2, 'S': 4 }; }
            get platforms() {
                return { // Platform base (Base instruction set, all platforms)
                    '990/10'  :  true, // Multi-CPU Flag
                    '9900'    :  true,
                    '990/4'   :  true,
                    '990/12'  :  true, // Multi-CPU Flag
                    '9995'    :  true,
                    '99000'   :  true,
                    '99110A'  :  true,
                    '990/10A' :  true,
                };
            }

            get format() {                      return 6; }
            get format_var() {                  return 2; }
            get performs_privilege_check() {    return false; }
            get touches_status_bits() {         return ['Lgt', 'Agt', 'Eq', 'Ov']; }
        },

        'AD': class extends OpDef {
            get op() {                          return "AD"; }
            get shortdesc() {                   return "Add float64"; }
            get opcode() {                      return 3648; } // 0E40
            get opcode_legal_max() {            return 3711; } // 0E7F
            get arg_start_bit() {               return 10; }
            get args() {                        return { 'Ts': 2, 'S': 4 }; }
            get platforms() {
                return { // Platform group F64 (990/12-exclusive 64-bit floating point instructions; 9995 & 99100 MID)
                    '990/10'  :  false,
                    '9900'    :  false,
                    '990/4'   :  false,
                    '990/12'  :  true,
                    '9995'    :  true,
                    '99000'   :  true,
                    '99110A'  :  true,
                    '990/10A' :  false,
                };
            }

            get format() {                      return 6; }
            get format_var() {                  return 4; }
            get performs_privilege_check() {    return false; }
            get touches_status_bits() {         return ['Lgt', 'Agt', 'Eq', 'Car', 'Ov']; }
        },

        'AI': class extends OpDef {
            get op() {                          return "AI"; }
            get shortdesc() {                   return "Add Immediate to reg"; }
            get opcode() {                      return 544; } // 0220
            get opcode_legal_max() {            return 559; } // 022F
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
            get touches_status_bits() {         return ['Lgt', 'Agt', 'Eq', 'Car', 'Ov']; }
        },

        'AM': class extends OpDef {
            get op() {                          return "AM"; }
            get shortdesc() {                   return "Add bigint"; }
            get opcode() {                      return 42; } // 002A
            get opcode_legal_max() {            return 42; } // 002A
            get arg_start_bit() {               return 16; }
            get args() {                        return { 'bc': 4, 'Td': 2, 'D': 4, 'Ts': 2, 'S': 4 }; }
            get platforms() {
                return { // Platform group C (990/12 features added to 99100 and later generations; 9995 MID)
                    '990/10'  :  false,
                    '9900'    :  false,
                    '990/4'   :  false,
                    '990/12'  :  true,
                    '9995'    :  true,
                    '99000'   :  true,
                    '99110A'  :  true,
                    '990/10A' :  false,
                };
            }

            get format() {                      return 11; }
            get format_var() {                  return 2; }
            get performs_privilege_check() {    return false; }
            get touches_status_bits() {         return ['Lgt', 'Agt', 'Eq', 'Car']; }
        },

        'ANDI': class extends OpDef {
            get op() {                          return "ANDI"; }
            get shortdesc() {                   return "Logic AND a word"; }
            get opcode() {                      return 576; } // 0240
            get opcode_legal_max() {            return 591; } // 024F
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
        },

        'ANDM': class extends OpDef {
            get op() {                          return "ANDM"; }
            get shortdesc() {                   return "AND Multiple Precision"; }
            get opcode() {                      return 40; } // 0028
            get opcode_legal_max() {            return 40; } // 0028
            get arg_start_bit() {               return 16; }
            get args() {                        return { 'bc': 4, 'Td': 2, 'D': 4, 'Ts': 2, 'S': 4 }; }
            get platforms() {
                return { // Platform group E (990/12-exclusive features; 9995 & 99100 MID)
                    '990/10'  :  false,
                    '9900'    :  false,
                    '990/4'   :  false,
                    '990/12'  :  true,
                    '9995'    :  true,
                    '99000'   :  true,
                    '99110A'  :  true,
                    '990/10A' :  false,
                };
            }

            get format() {                      return 11; }
            get format_var() {                  return 2; }
            get performs_privilege_check() {    return false; }
            get touches_status_bits() {         return ['Lgt', 'Agt', 'Eq']; }
        },

        'AR': class extends OpDef {
            get op() {                          return "AR"; }
            get shortdesc() {                   return "Add float32"; }
            get opcode() {                      return 3136; } // 0C40
            get opcode_legal_max() {            return 3199; } // 0C7F
            get arg_start_bit() {               return 10; }
            get args() {                        return { 'Ts': 2, 'S': 4 }; }
            get platforms() {
                return { // Platform group F32 (990/12-exclusive 32-bit floating point instructions added to 99110A as internal MID; 9995 & 99100 MID)
                    '990/10'  :  false,
                    '9900'    :  false,
                    '990/4'   :  false,
                    '990/12'  :  true,
                    '9995'    :  true,
                    '99000'   :  false, // 99110A only
                    '99110A'  :  true,
                    '990/10A' :  false,
                };
            }

            get format() {                      return 6; }
            get format_var() {                  return 3; }
            get performs_privilege_check() {    return false; }
            get touches_status_bits() {         return ['Lgt', 'Agt', 'Eq', 'Car', 'Ov']; }
        },

        'ARJ': class extends OpDef {
            get op() {                          return "ARJ"; }
            get shortdesc() {                   return "Add to Register and Jump"; }
            get opcode() {                      return 3085; } // 0C0D
            get opcode_legal_max() {            return 3085; } // 0C0D
            get arg_start_bit() {               return 16; }
            get args() {                        return { 'const': 4, 'reg': 4, 'disp': 8 }; }
            get platforms() {
                return { // Platform group E (990/12-exclusive features; 9995 & 99100 MID)
                    '990/10'  :  false,
                    '9900'    :  false,
                    '990/4'   :  false,
                    '990/12'  :  true,
                    '9995'    :  true,
                    '99000'   :  true,
                    '99110A'  :  true,
                    '990/10A' :  false,
                };
            }

            get format() {                      return 17; }
            get format_var() {                  return 1; }
            get performs_privilege_check() {    return false; }
            get touches_status_bits() {         return []; }
        },

        'B': class extends OpDef {
            get op() {                          return "B"; }
            get shortdesc() {                   return "Unconditional Branch"; }
            get opcode() {                      return 1088; } // 0440
            get opcode_legal_max() {            return 1151; } // 047F
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
            get touches_status_bits() {         return []; }
        },

        'BDC': class extends OpDef {
            get op() {                          return "BDC"; }
            get shortdesc() {                   return "Bigint to ASCII Number String"; }
            get opcode() {                      return 35; } // 0023
            get opcode_legal_max() {            return 35; } // 0023
            get arg_start_bit() {               return 16; }
            get args() {                        return { 'bc': 4, 'Td': 2, 'D': 4, 'Ts': 2, 'S': 4 }; }
            get platforms() {
                return { // Platform group E (990/12-exclusive features; 9995 & 99100 MID)
                    '990/10'  :  false,
                    '9900'    :  false,
                    '990/4'   :  false,
                    '990/12'  :  true,
                    '9995'    :  true,
                    '99000'   :  true,
                    '99110A'  :  true,
                    '990/10A' :  false,
                };
            }

            get format() {                      return 11; }
            get format_var() {                  return 2; }
            get performs_privilege_check() {    return false; }
            get touches_status_bits() {         return ['Lgt', 'Agt', 'Eq', 'Ov']; }
        },

        'BIND': class extends OpDef {
            get op() {                          return "BIND"; }
            get shortdesc() {                   return "Branch Indirect"; }
            get opcode() {                      return 320; } // 0140
            get opcode_legal_max() {            return 383; } // 017F
            get arg_start_bit() {               return 10; }
            get args() {                        return { 'Ts': 2, 'S': 4 }; }
            get platforms() {
                return { // Platform group B (990/12 features added to 9995 and later generations, including the 990/10A)
                    '990/10'  :  false,
                    '9900'    :  false,
                    '990/4'   :  false,
                    '990/12'  :  true,
                    '9995'    :  true,
                    '99000'   :  true,
                    '99110A'  :  true,
                    '990/10A' :  true,
                };
            }

            get format() {                      return 6; }
            get format_var() {                  return 1; }
            get performs_privilege_check() {    return false; }
            get touches_status_bits() {         return []; }
        },

        'BL': class extends OpDef {
            get op() {                          return "BL"; }
            get shortdesc() {                   return "Branch, PC -> R11"; }
            get opcode() {                      return 1664; } // 0680
            get opcode_legal_max() {            return 1727; } // 06BF
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
            get touches_status_bits() {         return []; }
        },

        'BLSK': class extends OpDef {
            get op() {                          return "BLSK"; }
            get shortdesc() {                   return "Branch, PC -> Stack from Reg"; }
            get opcode() {                      return 176; } // 00B0
            get opcode_legal_max() {            return 191; } // 00BF
            get arg_start_bit() {               return 12; }
            get args() {                        return { 'reg': 4 }; }
            get platforms() {
                return { // Platform group C (990/12 features added to 99100 and later generations; 9995 MID)
                    '990/10'  :  false,
                    '9900'    :  false,
                    '990/4'   :  false,
                    '990/12'  :  true,
                    '9995'    :  true,
                    '99000'   :  true,
                    '99110A'  :  true,
                    '990/10A' :  false,
                };
            }

            get format() {                      return 8; }
            get format_var() {                  return 1; }
            get performs_privilege_check() {    return false; }
            get touches_status_bits() {         return []; }
        },

        'BLWP': class extends OpDef {
            get op() {                          return "BLWP"; }
            get shortdesc() {                   return "Branch, new Workspace"; }
            get opcode() {                      return 1024; } // 0400
            get opcode_legal_max() {            return 1087; } // 043F
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
            get touches_status_bits() {         return []; }
        },

        'C': class extends OpDef {
            get op() {                          return "C"; }
            get shortdesc() {                   return "Compare words"; }
            get opcode() {                      return 32768; } // 8000
            get opcode_legal_max() {            return 36863; } // 8FFF
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
        },

        'CB': class extends OpDef {
            get op() {                          return "CB"; }
            get shortdesc() {                   return "Compare bytes"; }
            get opcode() {                      return 36864; } // 9000
            get opcode_legal_max() {            return 40959; } // 9FFF
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
            get touches_status_bits() {         return ['Lgt', 'Agt', 'Eq', 'Par']; }
        },

        'CDE': class extends OpDef {
            get op() {                          return "CDE"; }
            get shortdesc() {                   return "float64 to int32"; }
            get opcode() {                      return 3077; } // 0C05
            get opcode_legal_max() {            return 3077; } // 0C05
            get arg_start_bit() {               return 16; }
            get args() {                        return { };  }
            get platforms() {
                return { // Platform group F64 (990/12-exclusive 64-bit floating point instructions; 9995 & 99100 MID)
                    '990/10'  :  false,
                    '9900'    :  false,
                    '990/4'   :  false,
                    '990/12'  :  true,
                    '9995'    :  true,
                    '99000'   :  true,
                    '99110A'  :  true,
                    '990/10A' :  false,
                };
            }

            get format() {                      return 7; }
            get format_var() {                  return 3; }
            get performs_privilege_check() {    return false; }
            get touches_status_bits() {         return ['Lgt', 'Agt', 'Eq', 'Car', 'Ov']; }
        },

        'CDI': class extends OpDef {
            get op() {                          return "CDI"; }
            get shortdesc() {                   return "float64 to int16"; }
            get opcode() {                      return 3073; } // 0C01
            get opcode_legal_max() {            return 3073; } // 0C01
            get arg_start_bit() {               return 16; }
            get args() {                        return { };  }
            get platforms() {
                return { // Platform group F64 (990/12-exclusive 64-bit floating point instructions; 9995 & 99100 MID)
                    '990/10'  :  false,
                    '9900'    :  false,
                    '990/4'   :  false,
                    '990/12'  :  true,
                    '9995'    :  true,
                    '99000'   :  true,
                    '99110A'  :  true,
                    '990/10A' :  false,
                };
            }

            get format() {                      return 7; }
            get format_var() {                  return 3; }
            get performs_privilege_check() {    return false; }
            get touches_status_bits() {         return ['Lgt', 'Agt', 'Eq', 'Car', 'Ov']; }
        },

        'CED': class extends OpDef {
            get op() {                          return "CED"; }
            get shortdesc() {                   return "int32 to float64"; }
            get opcode() {                      return 3079; } // 0C07
            get opcode_legal_max() {            return 3079; } // 0C07
            get arg_start_bit() {               return 16; }
            get args() {                        return { };  }
            get platforms() {
                return { // Platform group F64 (990/12-exclusive 64-bit floating point instructions; 9995 & 99100 MID)
                    '990/10'  :  false,
                    '9900'    :  false,
                    '990/4'   :  false,
                    '990/12'  :  true,
                    '9995'    :  true,
                    '99000'   :  true,
                    '99110A'  :  true,
                    '990/10A' :  false,
                };
            }

            get format() {                      return 7; }
            get format_var() {                  return 3; }
            get performs_privilege_check() {    return false; }
            get touches_status_bits() {         return ['Lgt', 'Agt', 'Eq', 'Car', 'Ov']; }
        },

        'CER': class extends OpDef {
            get op() {                          return "CER"; }
            get shortdesc() {                   return "int32 to float32"; }
            get opcode() {                      return 3078; } // 0C06
            get opcode_legal_max() {            return 3078; } // 0C06
            get arg_start_bit() {               return 16; }
            get args() {                        return { };  }
            get platforms() {
                return { // Platform group F32 (990/12-exclusive 32-bit floating point instructions added to 99110A as internal MID; 9995 & 99100 MID)
                    '990/10'  :  false,
                    '9900'    :  false,
                    '990/4'   :  false,
                    '990/12'  :  true,
                    '9995'    :  true,
                    '99000'   :  false, // 99110A only
                    '99110A'  :  true,
                    '990/10A' :  false,
                };
            }

            get format() {                      return 7; }
            get format_var() {                  return 3; }
            get performs_privilege_check() {    return false; }
            get touches_status_bits() {         return ['Lgt', 'Agt', 'Eq', 'Car', 'Ov']; }
        },

        'CI': class extends OpDef {
            get op() {                          return "CI"; }
            get shortdesc() {                   return "Compare immediate to Reg"; }
            get opcode() {                      return 640; } // 0280
            get opcode_legal_max() {            return 655; } // 028F
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
        },

        'CID': class extends OpDef {
            get op() {                          return "CID"; }
            get shortdesc() {                   return "int16 to float64"; }
            get opcode() {                      return 3712; } // 0E80
            get opcode_legal_max() {            return 3775; } // 0EBF
            get arg_start_bit() {               return 10; }
            get args() {                        return { 'Ts': 2, 'S': 4 }; }
            get platforms() {
                return { // Platform group F64 (990/12-exclusive 64-bit floating point instructions; 9995 & 99100 MID)
                    '990/10'  :  false,
                    '9900'    :  false,
                    '990/4'   :  false,
                    '990/12'  :  true,
                    '9995'    :  true,
                    '99000'   :  true,
                    '99110A'  :  true,
                    '990/10A' :  false,
                };
            }

            get format() {                      return 6; }
            get format_var() {                  return 4; }
            get performs_privilege_check() {    return false; }
            get touches_status_bits() {         return ['Lgt', 'Agt', 'Eq', 'Car', 'Ov']; }
        },

        'CIR': class extends OpDef {
            get op() {                          return "CIR"; }
            get shortdesc() {                   return "int16 to float32"; }
            get opcode() {                      return 3200; } // 0C80
            get opcode_legal_max() {            return 3263; } // 0CBF
            get arg_start_bit() {               return 10; }
            get args() {                        return { 'Ts': 2, 'S': 4 }; }
            get platforms() {
                return { // Platform group F32 (990/12-exclusive 32-bit floating point instructions added to 99110A as internal MID; 9995 & 99100 MID)
                    '990/10'  :  false,
                    '9900'    :  false,
                    '990/4'   :  false,
                    '990/12'  :  true,
                    '9995'    :  true,
                    '99000'   :  false, // 99110A only
                    '99110A'  :  true,
                    '990/10A' :  false,
                };
            }

            get format() {                      return 6; }
            get format_var() {                  return 3; }
            get performs_privilege_check() {    return false; }
            get touches_status_bits() {         return ['Lgt', 'Agt', 'Eq', 'Car', 'Ov']; }
        },

        'CKOF': class extends OpDef {
            get op() {                          return "CKOF"; }
            get shortdesc() {                   return "Interrupt clock on"; }
            get opcode() {                      return 960; } // 03C0
            get opcode_legal_max() {            return 960; } // 03C0
            get arg_start_bit() {               return 16; }
            get args() {                        return { };  }
            get platforms() {
                return { // Platform base (Base instruction set, all platforms)
                    '990/10'  :  true,
                    '9900'    :  false,
                    '990/4'   :  true, // Possible bug, See _B
                    '990/12'  :  true,
                    '9995'    :  true, // no-op; Sets signal on D0-D2
                    '99000'   :  true,
                    '99110A'  :  true,
                    '990/10A' :  true,
                };
            }

            get format() {                      return 7; }
            get format_var() {                  return 2; }
            get performs_privilege_check() {    return true; }
            get touches_status_bits() {         return []; }
        },

        'CKON': class extends OpDef {
            get op() {                          return "CKON"; }
            get shortdesc() {                   return "Interrupt clock off"; }
            get opcode() {                      return 928; } // 03A0
            get opcode_legal_max() {            return 928; } // 03A0
            get arg_start_bit() {               return 16; }
            get args() {                        return { };  }
            get platforms() {
                return { // Platform base (Base instruction set, all platforms)
                    '990/10'  :  true,
                    '9900'    :  false,
                    '990/4'   :  true,
                    '990/12'  :  true,
                    '9995'    :  true, // no-op; Sets signal on D0-D2
                    '99000'   :  true,
                    '99110A'  :  true,
                    '990/10A' :  true,
                };
            }

            get format() {                      return 7; }
            get format_var() {                  return 2; }
            get performs_privilege_check() {    return true; }
            get touches_status_bits() {         return []; }
        },

        'CLR': class extends OpDef {
            get op() {                          return "CLR"; }
            get shortdesc() {                   return "Set word to zero"; }
            get opcode() {                      return 1216; } // 04C0
            get opcode_legal_max() {            return 1279; } // 04FF
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
            get touches_status_bits() {         return []; }
        },

        'CNTO': class extends OpDef {
            get op() {                          return "CNTO"; }
            get shortdesc() {                   return "Count ones in a bigbits"; }
            get opcode() {                      return 32; } // 0020
            get opcode_legal_max() {            return 32; } // 0020
            get arg_start_bit() {               return 16; }
            get args() {                        return { 'bc': 4, 'Td': 2, 'D': 4, 'Ts': 2, 'S': 4 }; }
            get platforms() {
                return { // Platform group E (990/12-exclusive features; 9995 & 99100 MID)
                    '990/10'  :  false,
                    '9900'    :  false,
                    '990/4'   :  false,
                    '990/12'  :  true,
                    '9995'    :  true,
                    '99000'   :  true,
                    '99110A'  :  true,
                    '990/10A' :  false,
                };
            }

            get format() {                      return 11; }
            get format_var() {                  return 1; }
            get performs_privilege_check() {    return false; }
            get touches_status_bits() {         return ['Eq']; }
        },

        'COC': class extends OpDef {
            get op() {                          return "COC"; }
            get shortdesc() {                   return "Test for 1 bits using a mask"; }
            get opcode() {                      return 8192; } // 2000
            get opcode_legal_max() {            return 9215; } // 23FF
            get arg_start_bit() {               return 6; }
            get args() {                        return { 'D': 4, 'Ts': 2, 'S': 4 }; }
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

            get format() {                      return 3; }
            get format_var() {                  return 1; }
            get performs_privilege_check() {    return false; }
            get touches_status_bits() {         return ['Eq']; }
        },

        'CR': class extends OpDef {
            get op() {                          return "CR"; }
            get shortdesc() {                   return "Compare float32"; }
            get opcode() {                      return 769; } // 0301
            get opcode_legal_max() {            return 769; } // 0301
            get arg_start_bit() {               return 16; }
            get args() {                        return { 'nu': 4, 'Td': 2, 'D': 4, 'Ts': 2, 'S': 4 }; }
            get platforms() {
                return { // Platform group F32 (990/12-exclusive 32-bit floating point instructions added to 99110A as internal MID; 9995 & 99100 MID)
                    '990/10'  :  false,
                    '9900'    :  false,
                    '990/4'   :  false,
                    '990/12'  :  false, // Illegal!
                    '9995'    :  false,
                    '99000'   :  false, // 99110A only
                    '99110A'  :  true,
                    '990/10A' :  false,
                };
            }

            get format() {                      return 19; }
            get format_var() {                  return 2; }
            get performs_privilege_check() {    return false; }
            get touches_status_bits() {         return ['Lgt', 'Agt', 'Eq', 'Car', 'Ov']; }
        },

        'CRC': class extends OpDef {
            get op() {                          return "CRC"; }
            get shortdesc() {                   return "CRC16"; }
            get opcode() {                      return 3616; } // 0E20
            get opcode_legal_max() {            return 3631; } // 0E2F
            get arg_start_bit() {               return 12; }
            get args() {                        return { 'ckpt': 4, 'bc': 4, 'Td': 2, 'D': 4, 'Ts': 2, 'S': 4 }; }
            get platforms() {
                return { // Platform group E (990/12-exclusive features; 9995 & 99100 MID)
                    '990/10'  :  false,
                    '9900'    :  false,
                    '990/4'   :  false,
                    '990/12'  :  true,
                    '9995'    :  true,
                    '99000'   :  true,
                    '99110A'  :  true,
                    '990/10A' :  false,
                };
            }

            get format() {                      return 12; }
            get format_var() {                  return 3; }
            get performs_privilege_check() {    return false; }
            get touches_status_bits() {         return ['Eq']; }
        },

        'CRE': class extends OpDef {
            get op() {                          return "CRE"; }
            get shortdesc() {                   return "float32 to int32"; }
            get opcode() {                      return 3076; } // 0C04
            get opcode_legal_max() {            return 3076; } // 0C04
            get arg_start_bit() {               return 16; }
            get args() {                        return { };  }
            get platforms() {
                return { // Platform group F32 (990/12-exclusive 32-bit floating point instructions added to 99110A as internal MID; 9995 & 99100 MID)
                    '990/10'  :  false,
                    '9900'    :  false,
                    '990/4'   :  false,
                    '990/12'  :  true,
                    '9995'    :  true,
                    '99000'   :  false, // 99110A only
                    '99110A'  :  true,
                    '990/10A' :  false,
                };
            }

            get format() {                      return 7; }
            get format_var() {                  return 3; }
            get performs_privilege_check() {    return false; }
            get touches_status_bits() {         return ['Lgt', 'Agt', 'Eq', 'Car', 'Ov']; }
        },

        'CRI': class extends OpDef {
            get op() {                          return "CRI"; }
            get shortdesc() {                   return "float32 to int16"; }
            get opcode() {                      return 3072; } // 0C00
            get opcode_legal_max() {            return 3072; } // 0C00
            get arg_start_bit() {               return 16; }
            get args() {                        return { };  }
            get platforms() {
                return { // Platform group F32 (990/12-exclusive 32-bit floating point instructions added to 99110A as internal MID; 9995 & 99100 MID)
                    '990/10'  :  false,
                    '9900'    :  false,
                    '990/4'   :  false,
                    '990/12'  :  true,
                    '9995'    :  true,
                    '99000'   :  false, // 99110A only
                    '99110A'  :  true,
                    '990/10A' :  false,
                };
            }

            get format() {                      return 7; }
            get format_var() {                  return 3; }
            get performs_privilege_check() {    return false; }
            get touches_status_bits() {         return ['Lgt', 'Agt', 'Eq', 'Car', 'Ov']; }
        },

        'CS': class extends OpDef {
            get op() {                          return "CS"; }
            get shortdesc() {                   return "Compare strings bytewise"; }
            get opcode() {                      return 64; } // 0040
            get opcode_legal_max() {            return 79; } // 004F
            get arg_start_bit() {               return 12; }
            get args() {                        return { 'ckpt': 4, 'bc': 4, 'Td': 2, 'D': 4, 'Ts': 2, 'S': 4 }; }
            get platforms() {
                return { // Platform group E (990/12-exclusive features; 9995 & 99100 MID)
                    '990/10'  :  false,
                    '9900'    :  false,
                    '990/4'   :  false,
                    '990/12'  :  true,
                    '9995'    :  true,
                    '99000'   :  true,
                    '99110A'  :  true,
                    '990/10A' :  false,
                };
            }

            get format() {                      return 12; }
            get format_var() {                  return 1; }
            get performs_privilege_check() {    return false; }
            get touches_status_bits() {         return ['Lgt', 'Agt', 'Eq']; }
        },

        'CZC': class extends OpDef {
            get op() {                          return "CZC"; }
            get shortdesc() {                   return "Test for 0 bits using a mask"; }
            get opcode() {                      return 9216; } // 2400
            get opcode_legal_max() {            return 10239; } // 27FF
            get arg_start_bit() {               return 6; }
            get args() {                        return { 'D': 4, 'Ts': 2, 'S': 4 }; }
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

            get format() {                      return 3; }
            get format_var() {                  return 1; }
            get performs_privilege_check() {    return false; }
            get touches_status_bits() {         return ['Eq']; }
        },

        'DBC': class extends OpDef {
            get op() {                          return "DBC"; }
            get shortdesc() {                   return "ASCII Number String to int16"; }
            get opcode() {                      return 36; } // 0024
            get opcode_legal_max() {            return 36; } // 0024
            get arg_start_bit() {               return 16; }
            get args() {                        return { 'bc': 4, 'Td': 2, 'D': 4, 'Ts': 2, 'S': 4 }; }
            get platforms() {
                return { // Platform group E (990/12-exclusive features; 9995 & 99100 MID)
                    '990/10'  :  false,
                    '9900'    :  false,
                    '990/4'   :  false,
                    '990/12'  :  true,
                    '9995'    :  true,
                    '99000'   :  true,
                    '99110A'  :  true,
                    '990/10A' :  false,
                };
            }

            get format() {                      return 11; }
            get format_var() {                  return 2; }
            get performs_privilege_check() {    return false; }
            get touches_status_bits() {         return ['Lgt', 'Agt', 'Eq', 'Ov']; }
        },

        'DD': class extends OpDef {
            get op() {                          return "DD"; }
            get shortdesc() {                   return "float64 divide"; }
            get opcode() {                      return 3904; } // 0F40
            get opcode_legal_max() {            return 3967; } // 0F7F
            get arg_start_bit() {               return 10; }
            get args() {                        return { 'Ts': 2, 'S': 4 }; }
            get platforms() {
                return { // Platform group F64 (990/12-exclusive 64-bit floating point instructions; 9995 & 99100 MID)
                    '990/10'  :  false,
                    '9900'    :  false,
                    '990/4'   :  false,
                    '990/12'  :  true,
                    '9995'    :  true,
                    '99000'   :  true,
                    '99110A'  :  true,
                    '990/10A' :  false,
                };
            }

            get format() {                      return 6; }
            get format_var() {                  return 4; }
            get performs_privilege_check() {    return false; }
            get touches_status_bits() {         return ['Lgt', 'Agt', 'Eq', 'Car', 'Ov']; }
        },

        'DEC': class extends OpDef {
            get op() {                          return "DEC"; }
            get shortdesc() {                   return "Decrement"; }
            get opcode() {                      return 1536; } // 0600
            get opcode_legal_max() {            return 1599; } // 063F
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
        },

        'DECT': class extends OpDef {
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
        },

        'DINT': class extends OpDef {
            get op() {                          return "DINT"; }
            get shortdesc() {                   return "Disable interrupts"; }
            get opcode() {                      return 47; } // 002F
            get opcode_legal_max() {            return 47; } // 002F
            get arg_start_bit() {               return 16; }
            get args() {                        return { };  }
            get platforms() {
                return { // Platform group E (990/12-exclusive features; 9995 & 99100 MID)
                    '990/10'  :  false,
                    '9900'    :  false,
                    '990/4'   :  false,
                    '990/12'  :  true,
                    '9995'    :  true,
                    '99000'   :  true,
                    '99110A'  :  true,
                    '990/10A' :  false,
                };
            }

            get format() {                      return 7; }
            get format_var() {                  return 1; }
            get performs_privilege_check() {    return false; }
            get touches_status_bits() {         return []; }
        },

        'DIV': class extends OpDef {
            get op() {                          return "DIV"; }
            get shortdesc() {                   return "Integer divide"; }
            get opcode() {                      return 15360; } // 3C00
            get opcode_legal_max() {            return 16383; } // 3FFF
            get arg_start_bit() {               return 6; }
            get args() {                        return { 'O': 4, 'Ts': 2, 'S': 4 }; }
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

            get format() {                      return 9; }
            get format_var() {                  return 2; }
            get performs_privilege_check() {    return false; }
            get touches_status_bits() {         return ['Ov']; }
        },

        'DIVS': class extends OpDef {
            get op() {                          return "DIVS"; }
            get shortdesc() {                   return "Divide int32 by int16"; }
            get opcode() {                      return 384; } // 0180
            get opcode_legal_max() {            return 447; } // 01BF
            get arg_start_bit() {               return 10; }
            get args() {                        return { 'Ts': 2, 'S': 4 }; }
            get platforms() {
                return { // Platform group B (990/12 features added to 9995 and later generations, including the 990/10A)
                    '990/10'  :  false,
                    '9900'    :  false,
                    '990/4'   :  false,
                    '990/12'  :  true,
                    '9995'    :  true,
                    '99000'   :  true,
                    '99110A'  :  true,
                    '990/10A' :  true,
                };
            }

            get format() {                      return 6; }
            get format_var() {                  return 1; }
            get performs_privilege_check() {    return false; }
            get touches_status_bits() {         return ['Lgt', 'Agt', 'Eq', 'Ov']; }
        },

        'DR': class extends OpDef {
            get op() {                          return "DR"; }
            get shortdesc() {                   return "Divide float32"; }
            get opcode() {                      return 3392; } // 0D40
            get opcode_legal_max() {            return 3455; } // 0D7F
            get arg_start_bit() {               return 10; }
            get args() {                        return { 'Ts': 2, 'S': 4 }; }
            get platforms() {
                return { // Platform group F32 (990/12-exclusive 32-bit floating point instructions added to 99110A as internal MID; 9995 & 99100 MID)
                    '990/10'  :  false,
                    '9900'    :  false,
                    '990/4'   :  false,
                    '990/12'  :  true,
                    '9995'    :  true,
                    '99000'   :  false, // 99110A only
                    '99110A'  :  true,
                    '990/10A' :  false,
                };
            }

            get format() {                      return 6; }
            get format_var() {                  return 3; }
            get performs_privilege_check() {    return false; }
            get touches_status_bits() {         return ['Lgt', 'Agt', 'Eq', 'Car', 'Ov']; }
        },

        'EINT': class extends OpDef {
            get op() {                          return "EINT"; }
            get shortdesc() {                   return "Enable interrupts"; }
            get opcode() {                      return 46; } // 002E
            get opcode_legal_max() {            return 46; } // 002E
            get arg_start_bit() {               return 16; }
            get args() {                        return { };  }
            get platforms() {
                return { // Platform group E (990/12-exclusive features; 9995 & 99100 MID)
                    '990/10'  :  false,
                    '9900'    :  false,
                    '990/4'   :  false,
                    '990/12'  :  true,
                    '9995'    :  true,
                    '99000'   :  true,
                    '99110A'  :  true,
                    '990/10A' :  false,
                };
            }

            get format() {                      return 7; }
            get format_var() {                  return 1; }
            get performs_privilege_check() {    return false; }
            get touches_status_bits() {         return []; }
        },

        'EMD': class extends OpDef {
            get op() {                          return "EMD"; }
            get shortdesc() {                   return "Execute diagnostics"; }
            get opcode() {                      return 45; } // 002D
            get opcode_legal_max() {            return 45; } // 002D
            get arg_start_bit() {               return 16; }
            get args() {                        return { };  }
            get platforms() {
                return { // Platform group E (990/12-exclusive features; 9995 & 99100 MID)
                    '990/10'  :  false,
                    '9900'    :  false,
                    '990/4'   :  false,
                    '990/12'  :  true,
                    '9995'    :  true,
                    '99000'   :  true,
                    '99110A'  :  true,
                    '990/10A' :  false,
                };
            }

            get format() {                      return 7; }
            get format_var() {                  return 1; }
            get performs_privilege_check() {    return true; }
            get touches_status_bits() {         return ['Lgt', 'Agt', 'Eq', 'Car', 'Ov', 'Par', 'XOP', 'Priv', 'Mf', 'MM', 'Oint', 'WCS', 'IntMask']; }
        },

        'EP': class extends OpDef {
            get op() {                          return "EP"; }
            get shortdesc() {                   return "Expand integer precision"; }
            get opcode() {                      return 1008; } // 03F0
            get opcode_legal_max() {            return 1023; } // 03FF
            get arg_start_bit() {               return 12; }
            get args() {                        return { 'd_len': 4, 's_len': 4, 'Td': 2, 'D': 4, 'Ts': 2, 'S': 4 }; }
            get platforms() {
                return { // Platform group E (990/12-exclusive features; 9995 & 99100 MID)
                    '990/10'  :  false,
                    '9900'    :  false,
                    '990/4'   :  false,
                    '990/12'  :  true, // yes (but should be illegal!)
                    '9995'    :  true,
                    '99000'   :  true,
                    '99110A'  :  true,
                    '990/10A' :  false,
                };
            }

            get format() {                      return 21; }
            get format_var() {                  return 1; }
            get performs_privilege_check() {    return false; }
            get touches_status_bits() {         return []; }
        },

        'IDLE': class extends OpDef {
            get op() {                          return "IDLE"; }
            get shortdesc() {                   return "Idle until interrupt"; }
            get opcode() {                      return 832; } // 0340
            get opcode_legal_max() {            return 832; } // 0340
            get arg_start_bit() {               return 16; }
            get args() {                        return { };  }
            get platforms() {
                return { // Platform base (Base instruction set, all platforms)
                    '990/10'  :  true,
                    '9900'    :  true,
                    '990/4'   :  true,
                    '990/12'  :  true,
                    '9995'    :  true, // Sets signal on D0-D2
                    '99000'   :  true,
                    '99110A'  :  true,
                    '990/10A' :  true,
                };
            }

            get format() {                      return 7; }
            get format_var() {                  return 2; }
            get performs_privilege_check() {    return true; }
            get touches_status_bits() {         return []; }
        },

        'INC': class extends OpDef {
            get op() {                          return "INC"; }
            get shortdesc() {                   return "Increment"; }
            get opcode() {                      return 1408; } // 0580
            get opcode_legal_max() {            return 1471; } // 05BF
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
        },

        'INCT': class extends OpDef {
            get op() {                          return "INCT"; }
            get shortdesc() {                   return "Increment by two"; }
            get opcode() {                      return 1472; } // 05C0
            get opcode_legal_max() {            return 1535; } // 05FF
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
        },

        'INSF': class extends OpDef {
            get op() {                          return "INSF"; }
            get shortdesc() {                   return "Bitwise substring insert"; }
            get opcode() {                      return 3088; } // 0C10
            get opcode_legal_max() {            return 3103; } // 0C1F
            get arg_start_bit() {               return 12; }
            get args() {                        return { 'width': 4, 'pos': 4, 'Td': 2, 'D': 4, 'Ts': 2, 'S': 4 }; }
            get platforms() {
                return { // Platform group E (990/12-exclusive features; 9995 & 99100 MID)
                    '990/10'  :  false,
                    '9900'    :  false,
                    '990/4'   :  false,
                    '990/12'  :  true,
                    '9995'    :  true,
                    '99000'   :  true,
                    '99110A'  :  true,
                    '990/10A' :  false,
                };
            }

            get format() {                      return 16; }
            get format_var() {                  return 1; }
            get performs_privilege_check() {    return false; }
            get touches_status_bits() {         return ['Lgt', 'Agt', 'Eq']; }
        },

        'INV': class extends OpDef {
            get op() {                          return "INV"; }
            get shortdesc() {                   return "Logic NOT a word"; }
            get opcode() {                      return 1344; } // 0540
            get opcode_legal_max() {            return 1407; } // 057F
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
            get touches_status_bits() {         return ['Lgt', 'Agt', 'Eq']; }
        },

        'IOF': class extends OpDef {
            get op() {                          return "IOF"; }
            get shortdesc() {                   return "Bitwise substring NOT"; }
            get opcode() {                      return 3584; } // 0E00
            get opcode_legal_max() {            return 3599; } // 0E0F
            get arg_start_bit() {               return 12; }
            get args() {                        return { 'width': 4, 'pos': 4, 'nu': 6, 'Ts': 2, 'S': 4 }; }
            get platforms() {
                return { // Platform group E (990/12-exclusive features; 9995 & 99100 MID)
                    '990/10'  :  false,
                    '9900'    :  false,
                    '990/4'   :  false,
                    '990/12'  :  true,
                    '9995'    :  true,
                    '99000'   :  true,
                    '99110A'  :  true,
                    '990/10A' :  false,
                };
            }

            get format() {                      return 15; }
            get format_var() {                  return 1; }
            get performs_privilege_check() {    return false; }
            get touches_status_bits() {         return []; }
        },

        'JEQ': class extends OpDef {
            get op() {                          return "JEQ"; }
            get shortdesc() {                   return "Jump if Equal"; }
            get opcode() {                      return 4864; } // 1300
            get opcode_legal_max() {            return 5119; } // 13FF
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
        },

        'JGT': class extends OpDef {
            get op() {                          return "JGT"; }
            get shortdesc() {                   return "Jump if Greater Than"; }
            get opcode() {                      return 5376; } // 1500
            get opcode_legal_max() {            return 5631; } // 15FF
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
        },

        'JH': class extends OpDef {
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
        },

        'JHE': class extends OpDef {
            get op() {                          return "JHE"; }
            get shortdesc() {                   return "Jump if Greater or Equal"; }
            get opcode() {                      return 5120; } // 1400
            get opcode_legal_max() {            return 5375; } // 14FF
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
        },

        'JL': class extends OpDef {
            get op() {                          return "JL"; }
            get shortdesc() {                   return "Jump if Logical Lower"; }
            get opcode() {                      return 6656; } // 1A00
            get opcode_legal_max() {            return 6911; } // 1AFF
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
        },

        'JLE': class extends OpDef {
            get op() {                          return "JLE"; }
            get shortdesc() {                   return "Jump if Lower or Equal"; }
            get opcode() {                      return 4608; } // 1200
            get opcode_legal_max() {            return 4863; } // 12FF
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
        },

        'JLT': class extends OpDef {
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
        },

        'JMP': class extends OpDef {
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
        },

        'JNC': class extends OpDef {
            get op() {                          return "JNC"; }
            get shortdesc() {                   return "Jump if No Carry"; }
            get opcode() {                      return 5888; } // 1700
            get opcode_legal_max() {            return 6143; } // 17FF
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
        },

        'JNE': class extends OpDef {
            get op() {                          return "JNE"; }
            get shortdesc() {                   return "Jump if Not Equal"; }
            get opcode() {                      return 5632; } // 1600
            get opcode_legal_max() {            return 5887; } // 16FF
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
        },

        'JNO': class extends OpDef {
            get op() {                          return "JNO"; }
            get shortdesc() {                   return "Jump if No Overflow"; }
            get opcode() {                      return 6400; } // 1900
            get opcode_legal_max() {            return 6655; } // 19FF
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
        },

        'JOC': class extends OpDef {
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
        },

        'JOP': class extends OpDef {
            get op() {                          return "JOP"; }
            get shortdesc() {                   return "Jump if Odd Parity"; }
            get opcode() {                      return 7168; } // 1C00
            get opcode_legal_max() {            return 7423; } // 1CFF
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
        },

        'LCS': class extends OpDef {
            get op() {                          return "LCS"; }
            get shortdesc() {                   return "Load Microcode Data (???)"; }
            get opcode() {                      return 160; } // 00A0
            get opcode_legal_max() {            return 175; } // 00AF
            get arg_start_bit() {               return 12; }
            get args() {                        return { 'reg': 4 }; }
            get platforms() {
                return { // Platform group E (990/12-exclusive features; 9995 & 99100 MID)
                    '990/10'  :  false,
                    '9900'    :  false,
                    '990/4'   :  false,
                    '990/12'  :  true, // Exclusive feature, 0x800-0xBFF only
                    '9995'    :  true,
                    '99000'   :  true,
                    '99110A'  :  true,
                    '990/10A' :  false,
                };
            }

            get format() {                      return 18; }
            get format_var() {                  return 2; }
            get performs_privilege_check() {    return true; }
            get touches_status_bits() {         return []; }
        },

        'LD': class extends OpDef {
            get op() {                          return "LD"; }
            get shortdesc() {                   return "Load float64 into R0-3"; }
            get opcode() {                      return 3968; } // 0F80
            get opcode_legal_max() {            return 4031; } // 0FBF
            get arg_start_bit() {               return 10; }
            get args() {                        return { 'Ts': 2, 'S': 4 }; }
            get platforms() {
                return { // Platform group F64 (990/12-exclusive 64-bit floating point instructions; 9995 & 99100 MID)
                    '990/10'  :  false,
                    '9900'    :  false,
                    '990/4'   :  false,
                    '990/12'  :  true,
                    '9995'    :  true,
                    '99000'   :  true,
                    '99110A'  :  true,
                    '990/10A' :  false,
                };
            }

            get format() {                      return 6; }
            get format_var() {                  return 4; }
            get performs_privilege_check() {    return false; }
            get touches_status_bits() {         return ['Lgt', 'Agt', 'Eq']; }
        },

        'LDCR': class extends OpDef {
            get op() {                          return "LDCR"; }
            get shortdesc() {                   return "Send bits from a word to the CRU"; }
            get opcode() {                      return 12288; } // 3000
            get opcode_legal_max() {            return 13311; } // 33FF
            get arg_start_bit() {               return 6; }
            get args() {                        return { 'num': 4, 'Ts': 2, 'S': 4 }; }
            get platforms() {
                return { // Platform base (Base instruction set, all platforms)
                    '990/10'  :  true, // Priv=0 req'd for addr > 0x0E00
                    '9900'    :  true,
                    '990/4'   :  true,
                    '990/12'  :  true,
                    '9995'    :  true,
                    '99000'   :  true,
                    '99110A'  :  true,
                    '990/10A' :  true,
                };
            }

            get format() {                      return 4; }
            get format_var() {                  return 1; }
            get performs_privilege_check() {    return true; }
            get touches_status_bits() {         return ['Lgt', 'Agt', 'Eq', 'Par']; }
        },

        'LDD': class extends OpDef {
            get op() {                          return "LDD"; }
            get shortdesc() {                   return "Next instruction dest gets mapped mem"; }
            get opcode() {                      return 1984; } // 07C0
            get opcode_legal_max() {            return 2047; } // 07FF
            get arg_start_bit() {               return 10; }
            get args() {                        return { 'Ts': 2, 'S': 4 }; }
            get platforms() {
                return { // Platform group A (Memory mapping instructions, requires hardware.)
                    '990/10'  :  true,
                    '9900'    :  false,
                    '990/4'   :  false,
                    '990/12'  :  true,
                    '9995'    :  true,
                    '99000'   :  false, // 99110A only
                    '99110A'  :  true,
                    '990/10A' :  true,
                };
            }

            get format() {                      return 6; }
            get format_var() {                  return 2; }
            get performs_privilege_check() {    return true; }
            get touches_status_bits() {         return []; }
        },

        'LDS': class extends OpDef {
            get op() {                          return "LDS"; }
            get shortdesc() {                   return "Next instruction src gets mapped mem"; }
            get opcode() {                      return 1920; } // 0780
            get opcode_legal_max() {            return 1983; } // 07BF
            get arg_start_bit() {               return 10; }
            get args() {                        return { 'Ts': 2, 'S': 4 }; }
            get platforms() {
                return { // Platform group A (Memory mapping instructions, requires hardware.)
                    '990/10'  :  true,
                    '9900'    :  false,
                    '990/4'   :  false,
                    '990/12'  :  true,
                    '9995'    :  true,
                    '99000'   :  false, // 99110A only
                    '99110A'  :  true,
                    '990/10A' :  true,
                };
            }

            get format() {                      return 6; }
            get format_var() {                  return 2; }
            get performs_privilege_check() {    return true; }
            get touches_status_bits() {         return []; }
        },

        'LI': class extends OpDef {
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
        },

        'LIM': class extends OpDef {
            get op() {                          return "LIM"; }
            get shortdesc() {                   return "Load interrupt mask"; }
            get opcode() {                      return 112; } // 0070
            get opcode_legal_max() {            return 127; } // 007F
            get arg_start_bit() {               return 12; }
            get args() {                        return { 'reg': 4 }; }
            get platforms() {
                return { // Platform group E (990/12-exclusive features; 9995 & 99100 MID)
                    '990/10'  :  false,
                    '9900'    :  false,
                    '990/4'   :  false,
                    '990/12'  :  true,
                    '9995'    :  true,
                    '99000'   :  true,
                    '99110A'  :  true,
                    '990/10A' :  false,
                };
            }

            get format() {                      return 18; }
            get format_var() {                  return 2; }
            get performs_privilege_check() {    return true; }
            get touches_status_bits() {         return ['IntMask']; }
        },

        'LIMI': class extends OpDef {
            get op() {                          return "LIMI"; }
            get shortdesc() {                   return "Load interrupt mask immediate"; }
            get opcode() {                      return 768; } // 0300
            get opcode_legal_max() {            return 783; } // 030F
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
            get format_var() {                  return 3; }
            get performs_privilege_check() {    return true; }
            get touches_status_bits() {         return ['IntMask']; }
        },

        'LMF': class extends OpDef {
            get op() {                          return "LMF"; }
            get shortdesc() {                   return "Map memory"; }
            get opcode() {                      return 800; } // 0320
            get opcode_legal_max() {            return 831; } // 033F
            get arg_start_bit() {               return 11; }
            get args() {                        return { 'm': 1, 'reg': 4 }; }
            get platforms() {
                return { // Platform group A (Memory mapping instructions, requires hardware.)
                    '990/10'  :  true,
                    '9900'    :  false,
                    '990/4'   :  false,
                    '990/12'  :  true,
                    '9995'    :  false,
                    '99000'   :  false,
                    '99110A'  :  false,
                    '990/10A' :  true,
                };
            }

            get format() {                      return 10; }
            get format_var() {                  return 1; }
            get performs_privilege_check() {    return true; }
            get touches_status_bits() {         return []; }
        },

        'LR': class extends OpDef {
            get op() {                          return "LR"; }
            get shortdesc() {                   return "Load float32 into R0-1"; }
            get opcode() {                      return 3456; } // 0D80
            get opcode_legal_max() {            return 3519; } // 0DBF
            get arg_start_bit() {               return 10; }
            get args() {                        return { 'Ts': 2, 'S': 4 }; }
            get platforms() {
                return { // Platform group F32 (990/12-exclusive 32-bit floating point instructions added to 99110A as internal MID; 9995 & 99100 MID)
                    '990/10'  :  false,
                    '9900'    :  false,
                    '990/4'   :  false,
                    '990/12'  :  true,
                    '9995'    :  true,
                    '99000'   :  false, // 99110A only
                    '99110A'  :  true,
                    '990/10A' :  false,
                };
            }

            get format() {                      return 6; }
            get format_var() {                  return 3; }
            get performs_privilege_check() {    return false; }
            get touches_status_bits() {         return ['Lgt', 'Agt', 'Eq']; }
        },

        'LREX': class extends OpDef {
            get op() {                          return "LREX"; }
            get shortdesc() {                   return "Restart from 0xFFC0, context switch"; }
            get opcode() {                      return 992; } // 03E0
            get opcode_legal_max() {            return 992; } // 03E0
            get arg_start_bit() {               return 16; }
            get args() {                        return { };  }
            get platforms() {
                return { // Platform base (Base instruction set, all platforms)
                    '990/10'  :  true,
                    '9900'    :  false,
                    '990/4'   :  true,
                    '990/12'  :  true,
                    '9995'    :  true, // no-op; Sets signal on D0-D2
                    '99000'   :  true,
                    '99110A'  :  true,
                    '990/10A' :  true,
                };
            }

            get format() {                      return 7; }
            get format_var() {                  return 2; }
            get performs_privilege_check() {    return true; }
            get touches_status_bits() {         return ['Priv', 'Mf', 'IntMask']; }
        },

        'LST': class extends OpDef {
            get op() {                          return "LST"; }
            get shortdesc() {                   return "Load Reg into Status Register"; }
            get opcode() {                      return 128; } // 0080
            get opcode_legal_max() {            return 143; } // 008F
            get arg_start_bit() {               return 12; }
            get args() {                        return { 'reg': 4 }; }
            get platforms() {
                return { // Platform group B (990/12 features added to 9995 and later generations, including the 990/10A)
                    '990/10'  :  false,
                    '9900'    :  false,
                    '990/4'   :  false,
                    '990/12'  :  true, // Priv bit=0 to not skip ST 6,7,8,9,11+IM
                    '9995'    :  true,
                    '99000'   :  true,
                    '99110A'  :  true,
                    '990/10A' :  true,
                };
            }

            get format() {                      return 18; }
            get format_var() {                  return 2; }
            get performs_privilege_check() {    return false; }
            get touches_status_bits() {         return ['Lgt', 'Agt', 'Eq', 'Car', 'Ov', 'Par', 'XOP', 'Priv', 'Mf', 'MM', 'Oint', 'WCS', 'IntMask']; }
        },

        'LTO': class extends OpDef {
            get op() {                          return "LTO"; }
            get shortdesc() {                   return "Find the 1 nearest to the left bytewise"; }
            get opcode() {                      return 31; } // 001F
            get opcode_legal_max() {            return 31; } // 001F
            get arg_start_bit() {               return 16; }
            get args() {                        return { 'bc': 4, 'Td': 2, 'D': 4, 'Ts': 2, 'S': 4 }; }
            get platforms() {
                return { // Platform group E (990/12-exclusive features; 9995 & 99100 MID)
                    '990/10'  :  false,
                    '9900'    :  false,
                    '990/4'   :  false,
                    '990/12'  :  true,
                    '9995'    :  true,
                    '99000'   :  true,
                    '99110A'  :  true,
                    '990/10A' :  false,
                };
            }

            get format() {                      return 11; }
            get format_var() {                  return 1; }
            get performs_privilege_check() {    return false; }
            get touches_status_bits() {         return ['Eq']; }
        },

        'LWP': class extends OpDef {
            get op() {                          return "LWP"; }
            get shortdesc() {                   return "Load Reg into Workspace Register"; }
            get opcode() {                      return 144; } // 0090
            get opcode_legal_max() {            return 159; } // 009F
            get arg_start_bit() {               return 12; }
            get args() {                        return { 'reg': 4 }; }
            get platforms() {
                return { // Platform group B (990/12 features added to 9995 and later generations, including the 990/10A)
                    '990/10'  :  false,
                    '9900'    :  false,
                    '990/4'   :  false,
                    '990/12'  :  true,
                    '9995'    :  true,
                    '99000'   :  true,
                    '99110A'  :  true,
                    '990/10A' :  true,
                };
            }

            get format() {                      return 18; }
            get format_var() {                  return 2; }
            get performs_privilege_check() {    return false; }
            get touches_status_bits() {         return []; }
        },

        'LWPI': class extends OpDef {
            get op() {                          return "LWPI"; }
            get shortdesc() {                   return "Load Immediate into Workplace Register"; }
            get opcode() {                      return 736; } // 02E0
            get opcode_legal_max() {            return 751; } // 02EF
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
            get format_var() {                  return 3; }
            get performs_privilege_check() {    return false; }
            get touches_status_bits() {         return []; }
        },

        'MD': class extends OpDef {
            get op() {                          return "MD"; }
            get shortdesc() {                   return "Multiply float64"; }
            get opcode() {                      return 3840; } // 0F00
            get opcode_legal_max() {            return 3903; } // 0F3F
            get arg_start_bit() {               return 10; }
            get args() {                        return { 'Ts': 2, 'S': 4 }; }
            get platforms() {
                return { // Platform group F64 (990/12-exclusive 64-bit floating point instructions; 9995 & 99100 MID)
                    '990/10'  :  false,
                    '9900'    :  false,
                    '990/4'   :  false,
                    '990/12'  :  true,
                    '9995'    :  true,
                    '99000'   :  true,
                    '99110A'  :  true,
                    '990/10A' :  false,
                };
            }

            get format() {                      return 6; }
            get format_var() {                  return 4; }
            get performs_privilege_check() {    return false; }
            get touches_status_bits() {         return ['Lgt', 'Agt', 'Eq', 'Car', 'Ov']; }
        },

        'MM': class extends OpDef {
            get op() {                          return "MM"; }
            get shortdesc() {                   return "Multiply int32 into bigint (3 words)"; }
            get opcode() {                      return 770; } // 0302
            get opcode_legal_max() {            return 770; } // 0302
            get arg_start_bit() {               return 16; }
            get args() {                        return { 'nu': 4, 'Td': 2, 'D': 4, 'Ts': 2, 'S': 4 }; }
            get platforms() {
                return { // Platform group D (99110-exclusive features; 99100 MID)
                    '990/10'  :  false,
                    '9900'    :  false,
                    '990/4'   :  false,
                    '990/12'  :  false, // Illegal!
                    '9995'    :  false,
                    '99000'   :  false, // 99110A only
                    '99110A'  :  true,
                    '990/10A' :  false,
                };
            }

            get format() {                      return 19; }
            get format_var() {                  return 2; }
            get performs_privilege_check() {    return false; }
            get touches_status_bits() {         return ['Lgt', 'Agt', 'Eq', 'Car', 'Ov']; }
        },

        'MOV': class extends OpDef {
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
        },

        'MOVA': class extends OpDef {
            get op() {                          return "MOVA"; }
            get shortdesc() {                   return "Copy address"; }
            get opcode() {                      return 43; } // 002B
            get opcode_legal_max() {            return 43; } // 002B
            get arg_start_bit() {               return 16; }
            get args() {                        return { 'nu': 4, 'Td': 2, 'D': 4, 'Ts': 2, 'S': 4 }; }
            get platforms() {
                return { // Platform group E (990/12-exclusive features; 9995 & 99100 MID)
                    '990/10'  :  false,
                    '9900'    :  false,
                    '990/4'   :  false,
                    '990/12'  :  true,
                    '9995'    :  true,
                    '99000'   :  true,
                    '99110A'  :  true,
                    '990/10A' :  false,
                };
            }

            get format() {                      return 19; }
            get format_var() {                  return 1; }
            get performs_privilege_check() {    return false; }
            get touches_status_bits() {         return ['Lgt', 'Agt', 'Eq']; }
        },

        'MOVB': class extends OpDef {
            get op() {                          return "MOVB"; }
            get shortdesc() {                   return "Copy byte"; }
            get opcode() {                      return 53248; } // D000
            get opcode_legal_max() {            return 57343; } // DFFF
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
            get touches_status_bits() {         return ['Lgt', 'Agt', 'Eq', 'Par']; }
        },

        'MOVS': class extends OpDef {
            get op() {                          return "MOVS"; }
            get shortdesc() {                   return "Copy string bytewise"; }
            get opcode() {                      return 96; } // 0060
            get opcode_legal_max() {            return 111; } // 006F
            get arg_start_bit() {               return 12; }
            get args() {                        return { 'ckpt': 4, 'bc': 4, 'Td': 2, 'D': 4, 'Ts': 2, 'S': 4 }; }
            get platforms() {
                return { // Platform group E (990/12-exclusive features; 9995 & 99100 MID)
                    '990/10'  :  false,
                    '9900'    :  false,
                    '990/4'   :  false,
                    '990/12'  :  true,
                    '9995'    :  true,
                    '99000'   :  true,
                    '99110A'  :  true,
                    '990/10A' :  false,
                };
            }

            get format() {                      return 12; }
            get format_var() {                  return 1; }
            get performs_privilege_check() {    return false; }
            get touches_status_bits() {         return ['Lgt', 'Agt', 'Eq']; }
        },

        'MPY': class extends OpDef {
            get op() {                          return "MPY"; }
            get shortdesc() {                   return "Multiply uint16 into uint32"; }
            get opcode() {                      return 14336; } // 3800
            get opcode_legal_max() {            return 15359; } // 3BFF
            get arg_start_bit() {               return 6; }
            get args() {                        return { 'O': 4, 'Ts': 2, 'S': 4 }; }
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

            get format() {                      return 9; }
            get format_var() {                  return 2; }
            get performs_privilege_check() {    return false; }
            get touches_status_bits() {         return []; }
        },

        'MPYS': class extends OpDef {
            get op() {                          return "MPYS"; }
            get shortdesc() {                   return "Multiply int16 into int32"; }
            get opcode() {                      return 448; } // 01C0
            get opcode_legal_max() {            return 511; } // 01FF
            get arg_start_bit() {               return 10; }
            get args() {                        return { 'Ts': 2, 'S': 4 }; }
            get platforms() {
                return { // Platform group B (990/12 features added to 9995 and later generations, including the 990/10A)
                    '990/10'  :  false,
                    '9900'    :  false,
                    '990/4'   :  false,
                    '990/12'  :  true,
                    '9995'    :  true,
                    '99000'   :  true,
                    '99110A'  :  true,
                    '990/10A' :  true,
                };
            }

            get format() {                      return 6; }
            get format_var() {                  return 1; }
            get performs_privilege_check() {    return false; }
            get touches_status_bits() {         return ['Lgt', 'Agt', 'Eq']; }
        },

        'MR': class extends OpDef {
            get op() {                          return "MR"; }
            get shortdesc() {                   return "Multiply float32"; }
            get opcode() {                      return 3328; } // 0D00
            get opcode_legal_max() {            return 3391; } // 0D3F
            get arg_start_bit() {               return 10; }
            get args() {                        return { 'Ts': 2, 'S': 4 }; }
            get platforms() {
                return { // Platform group F32 (990/12-exclusive 32-bit floating point instructions added to 99110A as internal MID; 9995 & 99100 MID)
                    '990/10'  :  false,
                    '9900'    :  false,
                    '990/4'   :  false,
                    '990/12'  :  true,
                    '9995'    :  true,
                    '99000'   :  false, // 99110A only
                    '99110A'  :  true,
                    '990/10A' :  false,
                };
            }

            get format() {                      return 6; }
            get format_var() {                  return 3; }
            get performs_privilege_check() {    return false; }
            get touches_status_bits() {         return ['Lgt', 'Agt', 'Eq', 'Car', 'Ov']; }
        },

        'MVSK': class extends OpDef {
            get op() {                          return "MVSK"; }
            get shortdesc() {                   return "Copy string from stack bytewise"; }
            get opcode() {                      return 208; } // 00D0
            get opcode_legal_max() {            return 223; } // 00DF
            get arg_start_bit() {               return 12; }
            get args() {                        return { 'ckpt': 4, 'bc': 4, 'Td': 2, 'D': 4, 'Ts': 2, 'S': 4 }; }
            get platforms() {
                return { // Platform group E (990/12-exclusive features; 9995 & 99100 MID)
                    '990/10'  :  false,
                    '9900'    :  false,
                    '990/4'   :  false,
                    '990/12'  :  true,
                    '9995'    :  true,
                    '99000'   :  true,
                    '99110A'  :  true,
                    '990/10A' :  false,
                };
            }

            get format() {                      return 12; }
            get format_var() {                  return 2; }
            get performs_privilege_check() {    return false; }
            get touches_status_bits() {         return ['Lgt', 'Agt', 'Eq']; }
        },

        'MVSR': class extends OpDef {
            get op() {                          return "MVSR"; }
            get shortdesc() {                   return "Copy string in reverse bytewise"; }
            get opcode() {                      return 192; } // 00C0
            get opcode_legal_max() {            return 207; } // 00CF
            get arg_start_bit() {               return 12; }
            get args() {                        return { 'ckpt': 4, 'bc': 4, 'Td': 2, 'D': 4, 'Ts': 2, 'S': 4 }; }
            get platforms() {
                return { // Platform group E (990/12-exclusive features; 9995 & 99100 MID)
                    '990/10'  :  false,
                    '9900'    :  false,
                    '990/4'   :  false,
                    '990/12'  :  true,
                    '9995'    :  true,
                    '99000'   :  true,
                    '99110A'  :  true,
                    '990/10A' :  false,
                };
            }

            get format() {                      return 12; }
            get format_var() {                  return 2; }
            get performs_privilege_check() {    return false; }
            get touches_status_bits() {         return ['Lgt', 'Agt', 'Eq']; }
        },

        'NEG': class extends OpDef {
            get op() {                          return "NEG"; }
            get shortdesc() {                   return "Negate word"; }
            get opcode() {                      return 1280; } // 0500
            get opcode_legal_max() {            return 1343; } // 053F
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
            get touches_status_bits() {         return ['Lgt', 'Agt', 'Eq', 'Ov']; }
        },

        'NEGD': class extends OpDef {
            get op() {                          return "NEGD"; }
            get shortdesc() {                   return "Negate float64"; }
            get opcode() {                      return 3075; } // 0C03
            get opcode_legal_max() {            return 3075; } // 0C03
            get arg_start_bit() {               return 16; }
            get args() {                        return { };  }
            get platforms() {
                return { // Platform group F64 (990/12-exclusive 64-bit floating point instructions; 9995 & 99100 MID)
                    '990/10'  :  false,
                    '9900'    :  false,
                    '990/4'   :  false,
                    '990/12'  :  true,
                    '9995'    :  true,
                    '99000'   :  true,
                    '99110A'  :  true,
                    '990/10A' :  false,
                };
            }

            get format() {                      return 7; }
            get format_var() {                  return 3; }
            get performs_privilege_check() {    return false; }
            get touches_status_bits() {         return ['Lgt', 'Agt', 'Eq']; }
        },

        'NEGR': class extends OpDef {
            get op() {                          return "NEGR"; }
            get shortdesc() {                   return "Negate float32"; }
            get opcode() {                      return 3074; } // 0C02
            get opcode_legal_max() {            return 3074; } // 0C02
            get arg_start_bit() {               return 16; }
            get args() {                        return { };  }
            get platforms() {
                return { // Platform group F32 (990/12-exclusive 32-bit floating point instructions added to 99110A as internal MID; 9995 & 99100 MID)
                    '990/10'  :  false,
                    '9900'    :  false,
                    '990/4'   :  false,
                    '990/12'  :  true,
                    '9995'    :  true,
                    '99000'   :  false, // 99110A only
                    '99110A'  :  true,
                    '990/10A' :  false,
                };
            }

            get format() {                      return 7; }
            get format_var() {                  return 3; }
            get performs_privilege_check() {    return false; }
            get touches_status_bits() {         return ['Lgt', 'Agt', 'Eq']; }
        },

        'NRM': class extends OpDef {
            get op() {                          return "NRM"; }
            get shortdesc() {                   return "Normalize a bigint by bit shifting left"; }
            get opcode() {                      return 3080; } // 0C08
            get opcode_legal_max() {            return 3080; } // 0C08
            get arg_start_bit() {               return 16; }
            get args() {                        return { 'bc': 4, 'Td': 2, 'D': 4, 'Ts': 2, 'S': 4 }; }
            get platforms() {
                return { // Platform group E (990/12-exclusive features; 9995 & 99100 MID)
                    '990/10'  :  false,
                    '9900'    :  false,
                    '990/4'   :  false,
                    '990/12'  :  true,
                    '9995'    :  true,
                    '99000'   :  true,
                    '99110A'  :  true,
                    '990/10A' :  false,
                };
            }

            get format() {                      return 11; }
            get format_var() {                  return 3; }
            get performs_privilege_check() {    return false; }
            get touches_status_bits() {         return ['Lgt', 'Agt', 'Eq', 'Car']; }
        },

        'ORI': class extends OpDef {
            get op() {                          return "ORI"; }
            get shortdesc() {                   return "Logic OR a word"; }
            get opcode() {                      return 608; } // 0260
            get opcode_legal_max() {            return 623; } // 026F
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
        },

        'ORM': class extends OpDef {
            get op() {                          return "ORM"; }
            get shortdesc() {                   return "Bitwise bigint OR (yes, signed int!)"; }
            get opcode() {                      return 39; } // 0027
            get opcode_legal_max() {            return 39; } // 0027
            get arg_start_bit() {               return 16; }
            get args() {                        return { 'bc': 4, 'Td': 2, 'D': 4, 'Ts': 2, 'S': 4 }; }
            get platforms() {
                return { // Platform group E (990/12-exclusive features; 9995 & 99100 MID)
                    '990/10'  :  false,
                    '9900'    :  false,
                    '990/4'   :  false,
                    '990/12'  :  true,
                    '9995'    :  true,
                    '99000'   :  true,
                    '99110A'  :  true,
                    '990/10A' :  false,
                };
            }

            get format() {                      return 11; }
            get format_var() {                  return 2; }
            get performs_privilege_check() {    return false; }
            get touches_status_bits() {         return ['Lgt', 'Agt', 'Eq']; }
        },

        'POPS': class extends OpDef {
            get op() {                          return "POPS"; }
            get shortdesc() {                   return "Pop byte string from stack"; }
            get opcode() {                      return 224; } // 00E0
            get opcode_legal_max() {            return 239; } // 00EF
            get arg_start_bit() {               return 12; }
            get args() {                        return { 'ckpt': 4, 'bc': 4, 'Td': 2, 'D': 4, 'Ts': 2, 'S': 4 }; }
            get platforms() {
                return { // Platform group E (990/12-exclusive features; 9995 & 99100 MID)
                    '990/10'  :  false,
                    '9900'    :  false,
                    '990/4'   :  false,
                    '990/12'  :  true,
                    '9995'    :  true,
                    '99000'   :  true,
                    '99110A'  :  true,
                    '990/10A' :  false,
                };
            }

            get format() {                      return 12; }
            get format_var() {                  return 2; }
            get performs_privilege_check() {    return false; }
            get touches_status_bits() {         return ['Lgt', 'Agt', 'Eq']; }
        },

        'PSHS': class extends OpDef {
            get op() {                          return "PSHS"; }
            get shortdesc() {                   return "Push byte string to stack"; }
            get opcode() {                      return 240; } // 00F0
            get opcode_legal_max() {            return 255; } // 00FF
            get arg_start_bit() {               return 12; }
            get args() {                        return { 'ckpt': 4, 'bc': 4, 'Td': 2, 'D': 4, 'Ts': 2, 'S': 4 }; }
            get platforms() {
                return { // Platform group E (990/12-exclusive features; 9995 & 99100 MID)
                    '990/10'  :  false,
                    '9900'    :  false,
                    '990/4'   :  false,
                    '990/12'  :  true,
                    '9995'    :  true,
                    '99000'   :  true,
                    '99110A'  :  true,
                    '990/10A' :  false,
                };
            }

            get format() {                      return 12; }
            get format_var() {                  return 2; }
            get performs_privilege_check() {    return false; }
            get touches_status_bits() {         return ['Lgt', 'Agt', 'Eq']; }
        },

        'RSET': class extends OpDef {
            get op() {                          return "RSET"; }
            get shortdesc() {                   return "System reset"; }
            get opcode() {                      return 864; } // 0360
            get opcode_legal_max() {            return 864; } // 0360
            get arg_start_bit() {               return 16; }
            get args() {                        return { };  }
            get platforms() {
                return { // Platform base (Base instruction set, all platforms)
                    '990/10'  :  true,
                    '9900'    :  false,
                    '990/4'   :  true,
                    '990/12'  :  true,
                    '9995'    :  true, // Sets signal on D0-D2
                    '99000'   :  true,
                    '99110A'  :  true,
                    '990/10A' :  true,
                };
            }

            get format() {                      return 7; }
            get format_var() {                  return 2; }
            get performs_privilege_check() {    return true; }
            get touches_status_bits() {         return ['Lgt', 'Agt', 'Eq', 'Car', 'Ov', 'Par', 'XOP', 'Priv', 'Mf', 'IntMask']; }
        },

        'RTO': class extends OpDef {
            get op() {                          return "RTO"; }
            get shortdesc() {                   return "Find the 1 nearest to the right of a bigbits"; }
            get opcode() {                      return 30; } // 001E
            get opcode_legal_max() {            return 30; } // 001E
            get arg_start_bit() {               return 16; }
            get args() {                        return { 'bc': 4, 'Td': 2, 'D': 4, 'Ts': 2, 'S': 4 }; }
            get platforms() {
                return { // Platform group E (990/12-exclusive features; 9995 & 99100 MID)
                    '990/10'  :  false,
                    '9900'    :  false,
                    '990/4'   :  false,
                    '990/12'  :  true,
                    '9995'    :  true,
                    '99000'   :  true,
                    '99110A'  :  true,
                    '990/10A' :  false,
                };
            }

            get format() {                      return 11; }
            get format_var() {                  return 1; }
            get performs_privilege_check() {    return false; }
            get touches_status_bits() {         return ['Eq']; }
        },

        'RTWP': class extends OpDef {
            get op() {                          return "RTWP"; }
            get shortdesc() {                   return "Return with Workspace Pointer"; }
            get opcode() {                      return 896; } // 0380
            get opcode_legal_max() {            return 896; } // 0380
            get arg_start_bit() {               return 16; }
            get args() {                        return { };  }
            get platforms() {
                return { // Platform base (Base instruction set, all platforms)
                    '990/10'  :  true, // Priv bit=0 to not skip ST 6-11
                    '9900'    :  true,
                    '990/4'   :  true, // Skips ST bits 6-11
                    '990/12'  :  true, // Priv=0? 0-8+IM, otherwise 0-5+10
                    '9995'    :  true,
                    '99000'   :  true,
                    '99110A'  :  true,
                    '990/10A' :  true,
                };
            }

            get format() {                      return 7; }
            get format_var() {                  return 2; }
            get performs_privilege_check() {    return false; }
            get touches_status_bits() {         return ['Lgt', 'Agt', 'Eq', 'Car', 'Ov', 'Par', 'XOP', 'Priv', 'Mf', 'IntMask']; }
        },

        'S': class extends OpDef {
            get op() {                          return "S"; }
            get shortdesc() {                   return "Subtract int16"; }
            get opcode() {                      return 24576; } // 6000
            get opcode_legal_max() {            return 28671; } // 6FFF
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
        },

        'SB': class extends OpDef {
            get op() {                          return "SB"; }
            get shortdesc() {                   return "Subtract int8"; }
            get opcode() {                      return 28672; } // 7000
            get opcode_legal_max() {            return 32767; } // 7FFF
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
            get touches_status_bits() {         return ['Lgt', 'Agt', 'Eq', 'Car', 'Ov', 'Par']; }
        },

        'SBO': class extends OpDef {
            get op() {                          return "SBO"; }
            get shortdesc() {                   return "Set given CRU bit to 1"; }
            get opcode() {                      return 7424; } // 1D00
            get opcode_legal_max() {            return 7679; } // 1DFF
            get arg_start_bit() {               return 8; }
            get args() {                        return { 'disp': 8 }; }
            get platforms() {
                return { // Platform base (Base instruction set, all platforms)
                    '990/10'  :  true, // Priv=0 req'd for addr > 0x0E00
                    '9900'    :  true,
                    '990/4'   :  true,
                    '990/12'  :  true, // Priv=0 req'd for addr > 0x0E00
                    '9995'    :  true,
                    '99000'   :  true,
                    '99110A'  :  true,
                    '990/10A' :  true,
                };
            }

            get format() {                      return 2; }
            get format_var() {                  return 1; }
            get performs_privilege_check() {    return true; }
            get touches_status_bits() {         return []; }
        },

        'SBZ': class extends OpDef {
            get op() {                          return "SBZ"; }
            get shortdesc() {                   return "Set given CRU bit to 0"; }
            get opcode() {                      return 7680; } // 1E00
            get opcode_legal_max() {            return 7935; } // 1EFF
            get arg_start_bit() {               return 8; }
            get args() {                        return { 'disp': 8 }; }
            get platforms() {
                return { // Platform base (Base instruction set, all platforms)
                    '990/10'  :  true, // Priv=0 req'd for addr > 0x0E00
                    '9900'    :  true,
                    '990/4'   :  true,
                    '990/12'  :  true, // Priv=0 req'd for addr > 0x0E00
                    '9995'    :  true,
                    '99000'   :  true,
                    '99110A'  :  true,
                    '990/10A' :  true,
                };
            }

            get format() {                      return 2; }
            get format_var() {                  return 1; }
            get performs_privilege_check() {    return true; }
            get touches_status_bits() {         return []; }
        },

        'SD': class extends OpDef {
            get op() {                          return "SD"; }
            get shortdesc() {                   return "Subtract float64"; }
            get opcode() {                      return 3776; } // 0EC0
            get opcode_legal_max() {            return 3839; } // 0EFF
            get arg_start_bit() {               return 10; }
            get args() {                        return { 'Ts': 2, 'S': 4 }; }
            get platforms() {
                return { // Platform group F64 (990/12-exclusive 64-bit floating point instructions; 9995 & 99100 MID)
                    '990/10'  :  false,
                    '9900'    :  false,
                    '990/4'   :  false,
                    '990/12'  :  true,
                    '9995'    :  true,
                    '99000'   :  true,
                    '99110A'  :  true,
                    '990/10A' :  false,
                };
            }

            get format() {                      return 6; }
            get format_var() {                  return 4; }
            get performs_privilege_check() {    return false; }
            get touches_status_bits() {         return ['Lgt', 'Agt', 'Eq', 'Car', 'Ov']; }
        },

        'SEQB': class extends OpDef {
            get op() {                          return "SEQB"; }
            get shortdesc() {                   return "Search for byte in a string"; }
            get opcode() {                      return 80; } // 0050
            get opcode_legal_max() {            return 95; } // 005F
            get arg_start_bit() {               return 12; }
            get args() {                        return { 'ckpt': 4, 'bc': 4, 'Td': 2, 'D': 4, 'Ts': 2, 'S': 4 }; }
            get platforms() {
                return { // Platform group E (990/12-exclusive features; 9995 & 99100 MID)
                    '990/10'  :  false,
                    '9900'    :  false,
                    '990/4'   :  false,
                    '990/12'  :  true,
                    '9995'    :  true,
                    '99000'   :  true,
                    '99110A'  :  true,
                    '990/10A' :  false,
                };
            }

            get format() {                      return 12; }
            get format_var() {                  return 1; }
            get performs_privilege_check() {    return false; }
            get touches_status_bits() {         return ['Lgt', 'Agt', 'Eq']; }
        },

        'SETO': class extends OpDef {
            get op() {                          return "SETO"; }
            get shortdesc() {                   return "Set word to ones (FFFF)"; }
            get opcode() {                      return 1792; } // 0700
            get opcode_legal_max() {            return 1855; } // 073F
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
            get touches_status_bits() {         return []; }
        },

        'SLA': class extends OpDef {
            get op() {                          return "SLA"; }
            get shortdesc() {                   return "Shift left, fill with zero"; }
            get opcode() {                      return 2560; } // 0A00
            get opcode_legal_max() {            return 2815; } // 0AFF
            get arg_start_bit() {               return 8; }
            get args() {                        return { 'count': 4, 'reg': 4 }; }
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

            get format() {                      return 5; }
            get format_var() {                  return 1; }
            get performs_privilege_check() {    return false; }
            get touches_status_bits() {         return ['Lgt', 'Agt', 'Eq', 'Car', 'Ov']; }
        },

        'SLAM': class extends OpDef {
            get op() {                          return "SLAM"; }
            get shortdesc() {                   return "Shift bigbits left, fill with zero"; }
            get opcode() {                      return 29; } // 001D
            get opcode_legal_max() {            return 29; } // 001D
            get arg_start_bit() {               return 16; }
            get args() {                        return { 's_len': 4, 'nu': 2, 'count': 4, 'Ts': 2, 'S': 4 }; }
            get platforms() {
                return { // Platform group C (990/12 features added to 99100 and later generations; 9995 MID)
                    '990/10'  :  false,
                    '9900'    :  false,
                    '990/4'   :  false,
                    '990/12'  :  true,
                    '9995'    :  true,
                    '99000'   :  true,
                    '99110A'  :  true,
                    '990/10A' :  false,
                };
            }

            get format() {                      return 13; }
            get format_var() {                  return 1; }
            get performs_privilege_check() {    return false; }
            get touches_status_bits() {         return ['Lgt', 'Agt', 'Eq', 'Car']; }
        },

        'SLSL': class extends OpDef {
            get op() {                          return "SLSL"; }
            get shortdesc() {                   return "Search list for matching bits"; }
            get opcode() {                      return 33; } // 0021
            get opcode_legal_max() {            return 33; } // 0021
            get arg_start_bit() {               return 16; }
            get args() {                        return { 'cond': 4, 'Td': 2, 'D': 4, 'Ts': 2, 'S': 4 }; }
            get platforms() {
                return { // Platform group E (990/12-exclusive features; 9995 & 99100 MID)
                    '990/10'  :  false,
                    '9900'    :  false,
                    '990/4'   :  false,
                    '990/12'  :  true,
                    '9995'    :  true,
                    '99000'   :  true,
                    '99110A'  :  true,
                    '990/10A' :  false,
                };
            }

            get format() {                      return 20; }
            get format_var() {                  return 1; }
            get performs_privilege_check() {    return false; }
            get touches_status_bits() {         return ['Eq']; }
        },

        'SLSP': class extends OpDef {
            get op() {                          return "SLSP"; }
            get shortdesc() {                   return "Search list for matching bits, mapped"; }
            get opcode() {                      return 34; } // 0022
            get opcode_legal_max() {            return 34; } // 0022
            get arg_start_bit() {               return 16; }
            get args() {                        return { 'cond': 4, 'Td': 2, 'D': 4, 'Ts': 2, 'S': 4 }; }
            get platforms() {
                return { // Platform group E (990/12-exclusive features; 9995 & 99100 MID)
                    '990/10'  :  false,
                    '9900'    :  false,
                    '990/4'   :  false,
                    '990/12'  :  true,
                    '9995'    :  true,
                    '99000'   :  true,
                    '99110A'  :  true,
                    '990/10A' :  false,
                };
            }

            get format() {                      return 20; }
            get format_var() {                  return 1; }
            get performs_privilege_check() {    return false; }
            get touches_status_bits() {         return ['Eq']; }
        },

        'SM': class extends OpDef {
            get op() {                          return "SM"; }
            get shortdesc() {                   return "Subtract bigint"; }
            get opcode() {                      return 41; } // 0029
            get opcode_legal_max() {            return 41; } // 0029
            get arg_start_bit() {               return 16; }
            get args() {                        return { 'bc': 4, 'Td': 2, 'D': 4, 'Ts': 2, 'S': 4 }; }
            get platforms() {
                return { // Platform group C (990/12 features added to 99100 and later generations; 9995 MID)
                    '990/10'  :  false,
                    '9900'    :  false,
                    '990/4'   :  false,
                    '990/12'  :  true,
                    '9995'    :  true,
                    '99000'   :  true,
                    '99110A'  :  true,
                    '990/10A' :  false,
                };
            }

            get format() {                      return 11; }
            get format_var() {                  return 2; }
            get performs_privilege_check() {    return false; }
            get touches_status_bits() {         return ['Lgt', 'Agt', 'Eq', 'Car']; }
        },

        'SNEB': class extends OpDef {
            get op() {                          return "SNEB"; }
            get shortdesc() {                   return "Search for not equal byte in a string"; }
            get opcode() {                      return 3600; } // 0E10
            get opcode_legal_max() {            return 3615; } // 0E1F
            get arg_start_bit() {               return 12; }
            get args() {                        return { 'ckpt': 4, 'bc': 4, 'Td': 2, 'D': 4, 'Ts': 2, 'S': 4 }; }
            get platforms() {
                return { // Platform group E (990/12-exclusive features; 9995 & 99100 MID)
                    '990/10'  :  false,
                    '9900'    :  false,
                    '990/4'   :  false,
                    '990/12'  :  true,
                    '9995'    :  true,
                    '99000'   :  true,
                    '99110A'  :  true,
                    '990/10A' :  false,
                };
            }

            get format() {                      return 12; }
            get format_var() {                  return 3; }
            get performs_privilege_check() {    return false; }
            get touches_status_bits() {         return ['Lgt', 'Agt', 'Eq']; }
        },

        'SOC': class extends OpDef {
            get op() {                          return "SOC"; }
            get shortdesc() {                   return "Logic OR: Copy 1s between words"; }
            get opcode() {                      return 57344; } // E000
            get opcode_legal_max() {            return 61439; } // EFFF
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
        },

        'SOCB': class extends OpDef {
            get op() {                          return "SOCB"; }
            get shortdesc() {                   return "Logic OR: Copy 1s between bytes"; }
            get opcode() {                      return 61440; } // F000
            get opcode_legal_max() {            return 65535; } // FFFF
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
            get touches_status_bits() {         return ['Lgt', 'Agt', 'Eq', 'Par']; }
        },

        'SR': class extends OpDef {
            get op() {                          return "SR"; }
            get shortdesc() {                   return "Subtract float32"; }
            get opcode() {                      return 3264; } // 0CC0
            get opcode_legal_max() {            return 3327; } // 0CFF
            get arg_start_bit() {               return 10; }
            get args() {                        return { 'Ts': 2, 'S': 4 }; }
            get platforms() {
                return { // Platform group F32 (990/12-exclusive 32-bit floating point instructions added to 99110A as internal MID; 9995 & 99100 MID)
                    '990/10'  :  false,
                    '9900'    :  false,
                    '990/4'   :  false,
                    '990/12'  :  true,
                    '9995'    :  true,
                    '99000'   :  false, // 99110A only
                    '99110A'  :  true,
                    '990/10A' :  false,
                };
            }

            get format() {                      return 6; }
            get format_var() {                  return 3; }
            get performs_privilege_check() {    return false; }
            get touches_status_bits() {         return ['Lgt', 'Agt', 'Eq', 'Car', 'Ov']; }
        },

        'SRA': class extends OpDef {
            get op() {                          return "SRA"; }
            get shortdesc() {                   return "Shift right filling with the sign bit"; }
            get opcode() {                      return 2048; } // 0800
            get opcode_legal_max() {            return 2303; } // 08FF
            get arg_start_bit() {               return 8; }
            get args() {                        return { 'count': 4, 'reg': 4 }; }
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

            get format() {                      return 5; }
            get format_var() {                  return 1; }
            get performs_privilege_check() {    return false; }
            get touches_status_bits() {         return ['Lgt', 'Agt', 'Eq', 'Car']; }
        },

        'SRAM': class extends OpDef {
            get op() {                          return "SRAM"; }
            get shortdesc() {                   return "Shift right filling with the sign bit, bigint"; }
            get opcode() {                      return 28; } // 001C
            get opcode_legal_max() {            return 28; } // 001C
            get arg_start_bit() {               return 16; }
            get args() {                        return { 's_len': 4, 'nu': 2, 'count': 4, 'Ts': 2, 'S': 4 }; }
            get platforms() {
                return { // Platform group C (990/12 features added to 99100 and later generations; 9995 MID)
                    '990/10'  :  false,
                    '9900'    :  false,
                    '990/4'   :  false,
                    '990/12'  :  true,
                    '9995'    :  true,
                    '99000'   :  true,
                    '99110A'  :  true,
                    '990/10A' :  false,
                };
            }

            get format() {                      return 13; }
            get format_var() {                  return 1; }
            get performs_privilege_check() {    return false; }
            get touches_status_bits() {         return ['Lgt', 'Agt', 'Eq', 'Car']; }
        },

        'SRC': class extends OpDef {
            get op() {                          return "SRC"; }
            get shortdesc() {                   return "Shift right, circular"; }
            get opcode() {                      return 2816; } // 0B00
            get opcode_legal_max() {            return 3071; } // 0BFF
            get arg_start_bit() {               return 8; }
            get args() {                        return { 'count': 4, 'reg': 4 }; }
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

            get format() {                      return 5; }
            get format_var() {                  return 1; }
            get performs_privilege_check() {    return false; }
            get touches_status_bits() {         return ['Lgt', 'Agt', 'Eq', 'Car']; }
        },

        'SRJ': class extends OpDef {
            get op() {                          return "SRJ"; }
            get shortdesc() {                   return "Subtract and jump"; }
            get opcode() {                      return 3084; } // 0C0C
            get opcode_legal_max() {            return 3084; } // 0C0C
            get arg_start_bit() {               return 16; }
            get args() {                        return { 'const': 4, 'reg': 4, 'disp': 8 }; }
            get platforms() {
                return { // Platform group E (990/12-exclusive features; 9995 & 99100 MID)
                    '990/10'  :  false,
                    '9900'    :  false,
                    '990/4'   :  false,
                    '990/12'  :  true,
                    '9995'    :  true,
                    '99000'   :  true,
                    '99110A'  :  true,
                    '990/10A' :  false,
                };
            }

            get format() {                      return 17; }
            get format_var() {                  return 1; }
            get performs_privilege_check() {    return false; }
            get touches_status_bits() {         return []; }
        },

        'SRL': class extends OpDef {
            get op() {                          return "SRL"; }
            get shortdesc() {                   return "Shift right filling with zero"; }
            get opcode() {                      return 2304; } // 0900
            get opcode_legal_max() {            return 2559; } // 09FF
            get arg_start_bit() {               return 8; }
            get args() {                        return { 'count': 4, 'reg': 4 }; }
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

            get format() {                      return 5; }
            get format_var() {                  return 1; }
            get performs_privilege_check() {    return false; }
            get touches_status_bits() {         return ['Lgt', 'Agt', 'Eq', 'Car']; }
        },

        'STCR': class extends OpDef {
            get op() {                          return "STCR"; }
            get shortdesc() {                   return "Read up to 16 bits from the CRU"; }
            get opcode() {                      return 13312; } // 3400
            get opcode_legal_max() {            return 14335; } // 37FF
            get arg_start_bit() {               return 6; }
            get args() {                        return { 'num': 4, 'Ts': 2, 'S': 4 }; }
            get platforms() {
                return { // Platform base (Base instruction set, all platforms)
                    '990/10'  :  true, // Priv=0 req'd for addr > 0x0E00
                    '9900'    :  true,
                    '990/4'   :  true,
                    '990/12'  :  true,
                    '9995'    :  true,
                    '99000'   :  true,
                    '99110A'  :  true,
                    '990/10A' :  true,
                };
            }

            get format() {                      return 4; }
            get format_var() {                  return 1; }
            get performs_privilege_check() {    return true; }
            get touches_status_bits() {         return ['Lgt', 'Agt', 'Eq', 'Par']; }
        },

        'STD': class extends OpDef {
            get op() {                          return "STD"; }
            get shortdesc() {                   return "Store float64"; }
            get opcode() {                      return 4032; } // 0FC0
            get opcode_legal_max() {            return 4095; } // 0FFF
            get arg_start_bit() {               return 10; }
            get args() {                        return { 'Ts': 2, 'S': 4 }; }
            get platforms() {
                return { // Platform group F64 (990/12-exclusive 64-bit floating point instructions; 9995 & 99100 MID)
                    '990/10'  :  false,
                    '9900'    :  false,
                    '990/4'   :  false,
                    '990/12'  :  true,
                    '9995'    :  true,
                    '99000'   :  true,
                    '99110A'  :  true,
                    '990/10A' :  false,
                };
            }

            get format() {                      return 6; }
            get format_var() {                  return 4; }
            get performs_privilege_check() {    return false; }
            get touches_status_bits() {         return ['Lgt', 'Agt', 'Eq']; }
        },

        'STPC': class extends OpDef {
            get op() {                          return "STPC"; }
            get shortdesc() {                   return "Store Program Counter"; }
            get opcode() {                      return 48; } // 0030
            get opcode_legal_max() {            return 63; } // 003F
            get arg_start_bit() {               return 12; }
            get args() {                        return { 'reg': 4 }; }
            get platforms() {
                return { // Platform group E (990/12-exclusive features; 9995 & 99100 MID)
                    '990/10'  :  false,
                    '9900'    :  false,
                    '990/4'   :  false,
                    '990/12'  :  true,
                    '9995'    :  true,
                    '99000'   :  true,
                    '99110A'  :  true,
                    '990/10A' :  false,
                };
            }

            get format() {                      return 18; }
            get format_var() {                  return 1; }
            get performs_privilege_check() {    return false; }
            get touches_status_bits() {         return []; }
        },

        'STR': class extends OpDef {
            get op() {                          return "STR"; }
            get shortdesc() {                   return "Store float32"; }
            get opcode() {                      return 3520; } // 0DC0
            get opcode_legal_max() {            return 3583; } // 0DFF
            get arg_start_bit() {               return 10; }
            get args() {                        return { 'Ts': 2, 'S': 4 }; }
            get platforms() {
                return { // Platform group F32 (990/12-exclusive 32-bit floating point instructions added to 99110A as internal MID; 9995 & 99100 MID)
                    '990/10'  :  false,
                    '9900'    :  false,
                    '990/4'   :  false,
                    '990/12'  :  true,
                    '9995'    :  true,
                    '99000'   :  false, // 99110A only
                    '99110A'  :  true,
                    '990/10A' :  false,
                };
            }

            get format() {                      return 6; }
            get format_var() {                  return 3; }
            get performs_privilege_check() {    return false; }
            get touches_status_bits() {         return ['Lgt', 'Agt', 'Eq']; }
        },

        'STST': class extends OpDef {
            get op() {                          return "STST"; }
            get shortdesc() {                   return "Store Status Register"; }
            get opcode() {                      return 704; } // 02C0
            get opcode_legal_max() {            return 719; } // 02CF
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

            get format() {                      return 18; }
            get format_var() {                  return 3; }
            get performs_privilege_check() {    return false; }
            get touches_status_bits() {         return []; }
        },

        'STWP': class extends OpDef {
            get op() {                          return "STWP"; }
            get shortdesc() {                   return "Store Workspace Pointer"; }
            get opcode() {                      return 672; } // 02A0
            get opcode_legal_max() {            return 687; } // 02AF
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

            get format() {                      return 18; }
            get format_var() {                  return 3; }
            get performs_privilege_check() {    return false; }
            get touches_status_bits() {         return []; }
        },

        'SWPB': class extends OpDef {
            get op() {                          return "SWPB"; }
            get shortdesc() {                   return "Swap Bytes"; }
            get opcode() {                      return 1728; } // 06C0
            get opcode_legal_max() {            return 1791; } // 06FF
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
            get touches_status_bits() {         return []; }
        },

        'SWPM': class extends OpDef {
            get op() {                          return "SWPM"; }
            get shortdesc() {                   return "Swap Bytes in a bigbits"; }
            get opcode() {                      return 37; } // 0025
            get opcode_legal_max() {            return 37; } // 0025
            get arg_start_bit() {               return 16; }
            get args() {                        return { 'bc': 4, 'Td': 2, 'D': 4, 'Ts': 2, 'S': 4 }; }
            get platforms() {
                return { // Platform group E (990/12-exclusive features; 9995 & 99100 MID)
                    '990/10'  :  false,
                    '9900'    :  false,
                    '990/4'   :  false,
                    '990/12'  :  true,
                    '9995'    :  true,
                    '99000'   :  true,
                    '99110A'  :  true,
                    '990/10A' :  false,
                };
            }

            get format() {                      return 11; }
            get format_var() {                  return 2; }
            get performs_privilege_check() {    return false; }
            get touches_status_bits() {         return ['Lgt', 'Agt', 'Eq']; }
        },

        'SZC': class extends OpDef {
            get op() {                          return "SZC"; }
            get shortdesc() {                   return "Logic AND masked words"; }
            get opcode() {                      return 16384; } // 4000
            get opcode_legal_max() {            return 20479; } // 4FFF
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
        },

        'SZCB': class extends OpDef {
            get op() {                          return "SZCB"; }
            get shortdesc() {                   return "Logic AND masked bytes"; }
            get opcode() {                      return 20480; } // 5000
            get opcode_legal_max() {            return 24575; } // 5FFF
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
            get touches_status_bits() {         return ['Lgt', 'Agt', 'Eq', 'Par']; }
        },

        'TB': class extends OpDef {
            get op() {                          return "TB"; }
            get shortdesc() {                   return "Test bit"; }
            get opcode() {                      return 7936; } // 1F00
            get opcode_legal_max() {            return 8191; } // 1FFF
            get arg_start_bit() {               return 8; }
            get args() {                        return { 'disp': 8 }; }
            get platforms() {
                return { // Platform base (Base instruction set, all platforms)
                    '990/10'  :  true, // Priv=0 req'd for addr > 0x0E00
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
            get performs_privilege_check() {    return true; }
            get touches_status_bits() {         return ['Eq']; }
        },

        'TCMB': class extends OpDef {
            get op() {                          return "TCMB"; }
            get shortdesc() {                   return "Test & reset bit in word"; }
            get opcode() {                      return 3082; } // 0C0A
            get opcode_legal_max() {            return 3082; } // 0C0A
            get arg_start_bit() {               return 16; }
            get args() {                        return { 'bpos': 10, 'Ts': 2, 'S': 4 }; }
            get platforms() {
                return { // Platform group C (990/12 features added to 99100 and later generations; 9995 MID)
                    '990/10'  :  false,
                    '9900'    :  false,
                    '990/4'   :  false,
                    '990/12'  :  true, // Multi-CPU Flag
                    '9995'    :  true,
                    '99000'   :  true,
                    '99110A'  :  true,
                    '990/10A' :  false,
                };
            }

            get format() {                      return 14; }
            get format_var() {                  return 1; }
            get performs_privilege_check() {    return false; }
            get touches_status_bits() {         return ['Eq']; }
        },

        'TMB': class extends OpDef {
            get op() {                          return "TMB"; }
            get shortdesc() {                   return "Test bit in word"; }
            get opcode() {                      return 3081; } // 0C09
            get opcode_legal_max() {            return 3081; } // 0C09
            get arg_start_bit() {               return 16; }
            get args() {                        return { 'bpos': 10, 'Ts': 2, 'S': 4 }; }
            get platforms() {
                return { // Platform group C (990/12 features added to 99100 and later generations; 9995 MID)
                    '990/10'  :  false,
                    '9900'    :  false,
                    '990/4'   :  false,
                    '990/12'  :  true,
                    '9995'    :  true,
                    '99000'   :  true,
                    '99110A'  :  true,
                    '990/10A' :  false,
                };
            }

            get format() {                      return 14; }
            get format_var() {                  return 1; }
            get performs_privilege_check() {    return false; }
            get touches_status_bits() {         return ['Eq']; }
        },

        'TS': class extends OpDef {
            get op() {                          return "TS"; }
            get shortdesc() {                   return "Translate words in a string from a table"; }
            get opcode() {                      return 3632; } // 0E30
            get opcode_legal_max() {            return 3647; } // 0E3F
            get arg_start_bit() {               return 12; }
            get args() {                        return { 'ckpt': 4, 'bc': 4, 'Td': 2, 'D': 4, 'Ts': 2, 'S': 4 }; }
            get platforms() {
                return { // Platform group E (990/12-exclusive features; 9995 & 99100 MID)
                    '990/10'  :  false,
                    '9900'    :  false,
                    '990/4'   :  false,
                    '990/12'  :  true,
                    '9995'    :  true,
                    '99000'   :  true,
                    '99110A'  :  true,
                    '990/10A' :  false,
                };
            }

            get format() {                      return 12; }
            get format_var() {                  return 3; }
            get performs_privilege_check() {    return false; }
            get touches_status_bits() {         return ['Lgt', 'Agt', 'Eq']; }
        },

        'TSMB': class extends OpDef {
            get op() {                          return "TSMB"; }
            get shortdesc() {                   return "Test & set bit in word"; }
            get opcode() {                      return 3083; } // 0C0B
            get opcode_legal_max() {            return 3083; } // 0C0B
            get arg_start_bit() {               return 16; }
            get args() {                        return { 'bpos': 10, 'Ts': 2, 'S': 4 }; }
            get platforms() {
                return { // Platform group C (990/12 features added to 99100 and later generations; 9995 MID)
                    '990/10'  :  false,
                    '9900'    :  false,
                    '990/4'   :  false,
                    '990/12'  :  true, // Multi-CPU Flag
                    '9995'    :  true,
                    '99000'   :  true,
                    '99110A'  :  true,
                    '990/10A' :  false,
                };
            }

            get format() {                      return 14; }
            get format_var() {                  return 1; }
            get performs_privilege_check() {    return false; }
            get touches_status_bits() {         return ['Eq']; }
        },

        'X': class extends OpDef {
            get op() {                          return "X"; }
            get shortdesc() {                   return "Execute"; }
            get opcode() {                      return 1152; } // 0480
            get opcode_legal_max() {            return 1215; } // 04BF
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
            get touches_status_bits() {         return []; }
        },

        'XF': class extends OpDef {
            get op() {                          return "XF"; }
            get shortdesc() {                   return "Extract bits from word"; }
            get opcode() {                      return 3120; } // 0C30
            get opcode_legal_max() {            return 3135; } // 0C3F
            get arg_start_bit() {               return 12; }
            get args() {                        return { 'width': 4, 'pos': 4, 'Td': 2, 'D': 4, 'Ts': 2, 'S': 4 }; }
            get platforms() {
                return { // Platform group E (990/12-exclusive features; 9995 & 99100 MID)
                    '990/10'  :  false,
                    '9900'    :  false,
                    '990/4'   :  false,
                    '990/12'  :  true,
                    '9995'    :  true,
                    '99000'   :  true,
                    '99110A'  :  true,
                    '990/10A' :  false,
                };
            }

            get format() {                      return 16; }
            get format_var() {                  return 1; }
            get performs_privilege_check() {    return false; }
            get touches_status_bits() {         return ['Lgt', 'Agt', 'Eq']; }
        },

        'XIT': class extends OpDef {
            get op() {                          return "XIT"; }
            get shortdesc() {                   return "No-OP"; }
            get opcode() {                      return 3086; } // 0C0E
            get opcode_legal_max() {            return 3086; } // 0C0E
            get arg_start_bit() {               return 16; }
            get args() {                        return { };  }
            get platforms() {
                return { // Platform group E (990/12-exclusive features; 9995 & 99100 MID)
                    '990/10'  :  false,
                    '9900'    :  false,
                    '990/4'   :  false,
                    '990/12'  :  true, // Book C: 0C0E or 0C0F
                    '9995'    :  true,
                    '99000'   :  true,
                    '99110A'  :  true,
                    '990/10A' :  false,
                };
            }

            get format() {                      return 7; }
            get format_var() {                  return 4; }
            get performs_privilege_check() {    return false; }
            get touches_status_bits() {         return []; }
        },

        'XOP': class extends OpDef {
            get op() {                          return "XOP"; }
            get shortdesc() {                   return "Extended Operation Call"; }
            get opcode() {                      return 11264; } // 2C00
            get opcode_legal_max() {            return 12287; } // 2FFF
            get arg_start_bit() {               return 6; }
            get args() {                        return { 'O': 4, 'Ts': 2, 'S': 4 }; }
            get platforms() {
                return { // Platform base (Base instruction set, all platforms)
                    '990/10'  :  true, // HW Flag.  Sets priv=0.
                    '9900'    :  true,
                    '990/4'   :  true,
                    '990/12'  :  true,
                    '9995'    :  true,
                    '99000'   :  true,
                    '99110A'  :  true,
                    '990/10A' :  true,
                };
            }

            get format() {                      return 9; }
            get format_var() {                  return 1; }
            get performs_privilege_check() {    return false; }
            get touches_status_bits() {         return ['XOP', 'Priv', 'Mf']; }
        },

        'XOR': class extends OpDef {
            get op() {                          return "XOR"; }
            get shortdesc() {                   return "Logic XOR a word"; }
            get opcode() {                      return 10240; } // 2800
            get opcode_legal_max() {            return 11263; } // 2BFF
            get arg_start_bit() {               return 6; }
            get args() {                        return { 'D': 4, 'Ts': 2, 'S': 4 }; }
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

            get format() {                      return 3; }
            get format_var() {                  return 1; }
            get performs_privilege_check() {    return false; }
            get touches_status_bits() {         return ['Lgt', 'Agt', 'Eq']; }
        },

        'XORM': class extends OpDef {
            get op() {                          return "XORM"; }
            get shortdesc() {                   return "Logic XOR a bigbits"; }
            get opcode() {                      return 38; } // 0026
            get opcode_legal_max() {            return 38; } // 0026
            get arg_start_bit() {               return 16; }
            get args() {                        return { 'bc': 4, 'Td': 2, 'D': 4, 'Ts': 2, 'S': 4 }; }
            get platforms() {
                return { // Platform group E (990/12-exclusive features; 9995 & 99100 MID)
                    '990/10'  :  false,
                    '9900'    :  false,
                    '990/4'   :  false,
                    '990/12'  :  true,
                    '9995'    :  true,
                    '99000'   :  true,
                    '99110A'  :  true,
                    '990/10A' :  false,
                };
            }

            get format() {                      return 11; }
            get format_var() {                  return 2; }
            get performs_privilege_check() {    return false; }
            get touches_status_bits() {         return ['Lgt', 'Agt', 'Eq']; }
        },

        'XV': class extends OpDef {
            get op() {                          return "XV"; }
            get shortdesc() {                   return "Extract bits into a new word"; }
            get opcode() {                      return 3104; } // 0C20
            get opcode_legal_max() {            return 3119; } // 0C2F
            get arg_start_bit() {               return 12; }
            get args() {                        return { 'width': 4, 'pos': 4, 'Td': 2, 'D': 4, 'Ts': 2, 'S': 4 }; }
            get platforms() {
                return { // Platform group E (990/12-exclusive features; 9995 & 99100 MID)
                    '990/10'  :  false,
                    '9900'    :  false,
                    '990/4'   :  false,
                    '990/12'  :  true,
                    '9995'    :  true,
                    '99000'   :  true,
                    '99110A'  :  true,
                    '990/10A' :  false,
                };
            }

            get format() {                      return 16; }
            get format_var() {                  return 1; }
            get performs_privilege_check() {    return false; }
            get touches_status_bits() {         return ['Lgt', 'Agt', 'Eq']; }
        },

    };

}
