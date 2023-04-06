// @ts-check

export { Op, Ops };

class Op {
    /** @type Array<string> */
    static #function_map = [];

    /** @type Object<string,number[]> */
    static #mids = {
        'MID A'	    : [parseInt('0000',16),	parseInt('007F',16)],
        'MID B'	    : [parseInt('00A0',16),	parseInt('017F',16)],
        'MID C 1A'	: [parseInt('0210',16),	parseInt('021F',16)],
        'MID C 1B'	: [parseInt('0230',16),	parseInt('023F',16)],
        'MID C 1C'	: [parseInt('0250',16),	parseInt('025F',16)],
        'MID C 1D'	: [parseInt('0270',16),	parseInt('027F',16)],
        'MID C 1E'	: [parseInt('0290',16),	parseInt('029F',16)],
        'MID C 1F'	: [parseInt('02B0',16),	parseInt('02BF',16)],
        'MID C 1G'	: [parseInt('02D0',16),	parseInt('02DF',16)],
        'MID C 2A'	: [parseInt('02E1',16),	parseInt('02FF',16)],
        'MID C 2B'	: [parseInt('0301',16),	parseInt('033F',16)],
        'MID C 3A'	: [parseInt('0341',16),	parseInt('035F',16)],
        'MID C 3B'	: [parseInt('0361',16),	parseInt('037F',16)],
        'MID C 3C'	: [parseInt('0381',16),	parseInt('039F',16)],
        'MID C 3D'	: [parseInt('03A1',16),	parseInt('03BF',16)],
        'MID C 3E'	: [parseInt('03C1',16),	parseInt('03DF',16)],
        'MID C 4A'	: [parseInt('03E1',16),	parseInt('03FF',16)],
        'MID D'	    : [parseInt('0780',16),	parseInt('07FF',16)],
        'MID E'	    : [parseInt('0C00',16),	parseInt('0FFF',16)],
    };

    // This gets built by Ops.init(), called at the bottom of the file because
    // lol who needs static initializers that can actually see their own class
    /**
     * @param {string} op_name
     * @param {number} min
     * @param {number} max
     **/
    static addOp(op_name, min, max) {
        for (let i = min; i <= max; i++) {
            Op.#function_map[i] = op_name;
        }
    }

    /**
     * @param {number} opcode
     * @returns {string|undefined}
     **/
    static getOpNameForOpcode(opcode) {
        return this.#function_map.at(opcode);
    }

    /**
     * @param {string} op_name
     * @returns { Op | false }
     **/
    static getOpForString(op_name) {
        if (Ops.op_names.includes(op_name.toUpperCase())) {
            return Reflect.get(Ops, op_name.toUpperCase());
        }
        return false;
    }

    /**
     * @param {string} op_name
     * @returns { Op | false }
     **/
    static getOpcodeForString(op_name) {
        if (Ops.op_names.includes(op_name.toUpperCase())) {
            return Reflect.get(Ops, op_name.toUpperCase()).opcode;
        }
        return false;
    }

    /**
     * @param {number} opcode
     **/
    static opcodeCouldBeMID(opcode) {
        for (let mid_name in this.#mids) {
            if (opcode >= this.#mids[mid_name][0] && opcode <= this.#mids[mid_name][1]) {
                return true;
            }
        }
        return false;
    }

    get name() { return this.op; }

    get has_immediate_operand() {           return this.format == 8; }
    get has_possible_immediate_source() {   return !!this.args['Ts']; }
    get has_possible_immediate_dest() {     return !!this.args['Td']; }
    get has_second_opcode_word() {          return (this.format > 11) && (this.format != 18); }
    get minimum_instruction_words() {       return 1 + (this.has_immediate_operand?1:0) + (this.has_second_opcode_word?1:0); }
    get maximum_instruction_words() {       return this.minimum_instruction_words + (this.has_possible_immediate_source?1:0) + (this.has_possible_immediate_dest?1:0); }

    // These all get overridden
    get op() {                          return "NOP"; }
    get shortdesc() {                   return "NOP (IMPOSSIBLE ERROR)"; }
    get opcode() {                      return 0; }
    get opcode_legal_max() {            return 0; }
    get arg_start_bit() {               return 0; }
    /** @return {Object<string,number>} */
    get args() {                        return {}; }
    /** @return {Object<string,boolean>} */
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
    /** @return {Array<string>} */
    get touches_status_bits() {         return []; }
}

class Ops {

    static get op_names() { return [
        "A", "AB", "ABS", "AD", "AI", "AM", "ANDI", "ANDM", "AR", "ARJ", "B",
        "BDC", "BIND", "BL", "BLSK", "BLWP", "C", "CB", "CDE", "CDI", "CED",
        "CER", "CI", "CID", "CIR", "CKOF", "CKON", "CLR", "CNTO", "COC", "CR",
        "CRC", "CRE", "CRI", "CS", "CZC", "DBC", "DD", "DEC", "DECT", "DINT",
        "DIV", "DIVS", "DR", "EINT", "EMD", "EP", "IDLE", "INC", "INCT", "INSF",
        "INV", "IOF", "JEQ", "JGT", "JH", "JHE", "JL", "JLE", "JLT", "JMP",
        "JNC", "JNE", "JNO", "JOC", "JOP", "LCS", "LD", "LDCR", "LDD", "LDS",
        "LI", "LIM", "LIMI", "LMF", "LR", "LREX", "LST", "LTO", "LWP", "LWPI",
        "MD", "MM", "MOV", "MOVA", "MOVB", "MOVS", "MPY", "MPYS", "MR", "MVSK",
        "MVSR", "NEG", "NEGD", "NEGR", "NRM", "ORI", "ORM", "POPS", "PSHS",
        "RSET", "RTO", "RTWP", "S", "SB", "SBO", "SBZ", "SD", "SEQB", "SETO",
        "SLA", "SLAM", "SLSL", "SLSP", "SM", "SNEB", "SOC", "SOCB", "SR", "SRA",
        "SRAM", "SRC", "SRJ", "SRL", "STCR", "STD", "STPC", "STR", "STST",
        "STWP", "SWPB", "SWPM", "SZC", "SZCB", "TB", "TCMB", "TMB", "TS",
        "TSMB", "X", "XF", "XIT", "XOP", "XOR", "XORM", "XV"
    ];}

/*******************************************************************************
 * EVERYTHING BELOW HAS BEEN AUTOMATICALLY GENERATED.
 * CHANGES MAY BE OVERWRITTEN!
 * You're looking for create_opcode_classes.
 ******************************************************************************/

static A = new class extends Op {
    get op() {                          return "A"; }
    get shortdesc() {                   return "Add int16"; }
    get opcode() {                      return 40960; } // A000
    get opcode_legal_max() {            return 45055; } // AFFF
    get arg_start_bit() {               return 4; }
    get args() {                        return {'Td': 2, 'D': 4, 'Ts': 2, 'S': 4}; }
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
};

static AB = new class extends Op {
    get op() {                          return "AB"; }
    get shortdesc() {                   return "Add int8"; }
    get opcode() {                      return 45056; } // B000
    get opcode_legal_max() {            return 49151; } // BFFF
    get arg_start_bit() {               return 4; }
    get args() {                        return {'Td': 2, 'D': 4, 'Ts': 2, 'S': 4}; }
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
};

static ABS = new class extends Op {
    get op() {                          return "ABS"; }
    get shortdesc() {                   return "Absolute Value"; }
    get opcode() {                      return 1856; } // 0740
    get opcode_legal_max() {            return 1919; } // 077F
    get arg_start_bit() {               return 10; }
    get args() {                        return {'Ts': 2, 'S': 4}; }
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
};

static AD = new class extends Op {
    get op() {                          return "AD"; }
    get shortdesc() {                   return "Add float64"; }
    get opcode() {                      return 3648; } // 0E40
    get opcode_legal_max() {            return 3711; } // 0E7F
    get arg_start_bit() {               return 10; }
    get args() {                        return {'Ts': 2, 'S': 4}; }
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
};

static AI = new class extends Op {
    get op() {                          return "AI"; }
    get shortdesc() {                   return "Add Immediate to reg"; }
    get opcode() {                      return 544; } // 0220
    get opcode_legal_max() {            return 559; } // 022F
    get arg_start_bit() {               return 12; }
    get args() {                        return {'reg': 4}; }
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
};

static AM = new class extends Op {
    get op() {                          return "AM"; }
    get shortdesc() {                   return "Add bigint"; }
    get opcode() {                      return 42; } // 002A
    get opcode_legal_max() {            return 42; } // 002A
    get arg_start_bit() {               return 16; }
    get args() {                        return {'bc': 4, 'Td': 2, 'D': 4, 'Ts': 2, 'S': 4}; }
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
};

static ANDI = new class extends Op {
    get op() {                          return "ANDI"; }
    get shortdesc() {                   return "Logic AND a word"; }
    get opcode() {                      return 576; } // 0240
    get opcode_legal_max() {            return 591; } // 024F
    get arg_start_bit() {               return 12; }
    get args() {                        return {'reg': 4}; }
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
};

static ANDM = new class extends Op {
    get op() {                          return "ANDM"; }
    get shortdesc() {                   return "AND Multiple Precision"; }
    get opcode() {                      return 40; } // 0028
    get opcode_legal_max() {            return 40; } // 0028
    get arg_start_bit() {               return 16; }
    get args() {                        return {'bc': 4, 'Td': 2, 'D': 4, 'Ts': 2, 'S': 4}; }
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
};

static AR = new class extends Op {
    get op() {                          return "AR"; }
    get shortdesc() {                   return "Add float32"; }
    get opcode() {                      return 3136; } // 0C40
    get opcode_legal_max() {            return 3199; } // 0C7F
    get arg_start_bit() {               return 10; }
    get args() {                        return {'Ts': 2, 'S': 4}; }
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
};

static ARJ = new class extends Op {
    get op() {                          return "ARJ"; }
    get shortdesc() {                   return "Add to Register and Jump"; }
    get opcode() {                      return 3085; } // 0C0D
    get opcode_legal_max() {            return 3085; } // 0C0D
    get arg_start_bit() {               return 16; }
    get args() {                        return {'const': 4, 'reg': 4, 'disp': 8}; }
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
};

static B = new class extends Op {
    get op() {                          return "B"; }
    get shortdesc() {                   return "Unconditional Branch"; }
    get opcode() {                      return 1088; } // 0440
    get opcode_legal_max() {            return 1151; } // 047F
    get arg_start_bit() {               return 10; }
    get args() {                        return {'Ts': 2, 'S': 4}; }
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
};

static BDC = new class extends Op {
    get op() {                          return "BDC"; }
    get shortdesc() {                   return "Bigint to ASCII Number String"; }
    get opcode() {                      return 35; } // 0023
    get opcode_legal_max() {            return 35; } // 0023
    get arg_start_bit() {               return 16; }
    get args() {                        return {'bc': 4, 'Td': 2, 'D': 4, 'Ts': 2, 'S': 4}; }
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
};

static BIND = new class extends Op {
    get op() {                          return "BIND"; }
    get shortdesc() {                   return "Branch Indirect"; }
    get opcode() {                      return 320; } // 0140
    get opcode_legal_max() {            return 383; } // 017F
    get arg_start_bit() {               return 10; }
    get args() {                        return {'Ts': 2, 'S': 4}; }
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
};

static BL = new class extends Op {
    get op() {                          return "BL"; }
    get shortdesc() {                   return "Branch, PC -> R11"; }
    get opcode() {                      return 1664; } // 0680
    get opcode_legal_max() {            return 1727; } // 06BF
    get arg_start_bit() {               return 10; }
    get args() {                        return {'Ts': 2, 'S': 4}; }
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
};

static BLSK = new class extends Op {
    get op() {                          return "BLSK"; }
    get shortdesc() {                   return "Branch, PC -> Stack from Reg"; }
    get opcode() {                      return 176; } // 00B0
    get opcode_legal_max() {            return 191; } // 00BF
    get arg_start_bit() {               return 12; }
    get args() {                        return {'reg': 4}; }
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
};

static BLWP = new class extends Op {
    get op() {                          return "BLWP"; }
    get shortdesc() {                   return "Branch, new Workspace"; }
    get opcode() {                      return 1024; } // 0400
    get opcode_legal_max() {            return 1087; } // 043F
    get arg_start_bit() {               return 10; }
    get args() {                        return {'Ts': 2, 'S': 4}; }
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
};

static C = new class extends Op {
    get op() {                          return "C"; }
    get shortdesc() {                   return "Compare words"; }
    get opcode() {                      return 32768; } // 8000
    get opcode_legal_max() {            return 36863; } // 8FFF
    get arg_start_bit() {               return 4; }
    get args() {                        return {'Td': 2, 'D': 4, 'Ts': 2, 'S': 4}; }
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
};

static CB = new class extends Op {
    get op() {                          return "CB"; }
    get shortdesc() {                   return "Compare bytes"; }
    get opcode() {                      return 36864; } // 9000
    get opcode_legal_max() {            return 40959; } // 9FFF
    get arg_start_bit() {               return 4; }
    get args() {                        return {'Td': 2, 'D': 4, 'Ts': 2, 'S': 4}; }
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
};

static CDE = new class extends Op {
    get op() {                          return "CDE"; }
    get shortdesc() {                   return "float64 to int32"; }
    get opcode() {                      return 3077; } // 0C05
    get opcode_legal_max() {            return 3077; } // 0C05
    get arg_start_bit() {               return 16; }
    get args() {                        return {}; }
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
};

static CDI = new class extends Op {
    get op() {                          return "CDI"; }
    get shortdesc() {                   return "float64 to int16"; }
    get opcode() {                      return 3073; } // 0C01
    get opcode_legal_max() {            return 3073; } // 0C01
    get arg_start_bit() {               return 16; }
    get args() {                        return {}; }
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
};

static CED = new class extends Op {
    get op() {                          return "CED"; }
    get shortdesc() {                   return "int32 to float64"; }
    get opcode() {                      return 3079; } // 0C07
    get opcode_legal_max() {            return 3079; } // 0C07
    get arg_start_bit() {               return 16; }
    get args() {                        return {}; }
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
};

static CER = new class extends Op {
    get op() {                          return "CER"; }
    get shortdesc() {                   return "int32 to float32"; }
    get opcode() {                      return 3078; } // 0C06
    get opcode_legal_max() {            return 3078; } // 0C06
    get arg_start_bit() {               return 16; }
    get args() {                        return {}; }
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
};

static CI = new class extends Op {
    get op() {                          return "CI"; }
    get shortdesc() {                   return "Compare immediate to Reg"; }
    get opcode() {                      return 640; } // 0280
    get opcode_legal_max() {            return 655; } // 028F
    get arg_start_bit() {               return 12; }
    get args() {                        return {'reg': 4}; }
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
};

static CID = new class extends Op {
    get op() {                          return "CID"; }
    get shortdesc() {                   return "int16 to float64"; }
    get opcode() {                      return 3712; } // 0E80
    get opcode_legal_max() {            return 3775; } // 0EBF
    get arg_start_bit() {               return 10; }
    get args() {                        return {'Ts': 2, 'S': 4}; }
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
};

static CIR = new class extends Op {
    get op() {                          return "CIR"; }
    get shortdesc() {                   return "int16 to float32"; }
    get opcode() {                      return 3200; } // 0C80
    get opcode_legal_max() {            return 3263; } // 0CBF
    get arg_start_bit() {               return 10; }
    get args() {                        return {'Ts': 2, 'S': 4}; }
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
};

static CKOF = new class extends Op {
    get op() {                          return "CKOF"; }
    get shortdesc() {                   return "Interrupt clock on"; }
    get opcode() {                      return 960; } // 03C0
    get opcode_legal_max() {            return 960; } // 03C0
    get arg_start_bit() {               return 16; }
    get args() {                        return {}; }
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
};

static CKON = new class extends Op {
    get op() {                          return "CKON"; }
    get shortdesc() {                   return "Interrupt clock off"; }
    get opcode() {                      return 928; } // 03A0
    get opcode_legal_max() {            return 928; } // 03A0
    get arg_start_bit() {               return 16; }
    get args() {                        return {}; }
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
};

static CLR = new class extends Op {
    get op() {                          return "CLR"; }
    get shortdesc() {                   return "Set word to zero"; }
    get opcode() {                      return 1216; } // 04C0
    get opcode_legal_max() {            return 1279; } // 04FF
    get arg_start_bit() {               return 10; }
    get args() {                        return {'Ts': 2, 'S': 4}; }
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
};

static CNTO = new class extends Op {
    get op() {                          return "CNTO"; }
    get shortdesc() {                   return "Count ones in a bigbits"; }
    get opcode() {                      return 32; } // 0020
    get opcode_legal_max() {            return 32; } // 0020
    get arg_start_bit() {               return 16; }
    get args() {                        return {'bc': 4, 'Td': 2, 'D': 4, 'Ts': 2, 'S': 4}; }
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
};

static COC = new class extends Op {
    get op() {                          return "COC"; }
    get shortdesc() {                   return "Test for 1 bits using a mask"; }
    get opcode() {                      return 8192; } // 2000
    get opcode_legal_max() {            return 9215; } // 23FF
    get arg_start_bit() {               return 6; }
    get args() {                        return {'D': 4, 'Ts': 2, 'S': 4}; }
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
};

static CR = new class extends Op {
    get op() {                          return "CR"; }
    get shortdesc() {                   return "Compare float32"; }
    get opcode() {                      return 769; } // 0301
    get opcode_legal_max() {            return 769; } // 0301
    get arg_start_bit() {               return 16; }
    get args() {                        return {'nu': 4, 'Td': 2, 'D': 4, 'Ts': 2, 'S': 4}; }
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
};

static CRC = new class extends Op {
    get op() {                          return "CRC"; }
    get shortdesc() {                   return "CRC16"; }
    get opcode() {                      return 3616; } // 0E20
    get opcode_legal_max() {            return 3631; } // 0E2F
    get arg_start_bit() {               return 12; }
    get args() {                        return {'ckpt': 4, 'bc': 4, 'Td': 2, 'D': 4, 'Ts': 2, 'S': 4}; }
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
};

static CRE = new class extends Op {
    get op() {                          return "CRE"; }
    get shortdesc() {                   return "float32 to int32"; }
    get opcode() {                      return 3076; } // 0C04
    get opcode_legal_max() {            return 3076; } // 0C04
    get arg_start_bit() {               return 16; }
    get args() {                        return {}; }
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
};

static CRI = new class extends Op {
    get op() {                          return "CRI"; }
    get shortdesc() {                   return "float32 to int16"; }
    get opcode() {                      return 3072; } // 0C00
    get opcode_legal_max() {            return 3072; } // 0C00
    get arg_start_bit() {               return 16; }
    get args() {                        return {}; }
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
};

static CS = new class extends Op {
    get op() {                          return "CS"; }
    get shortdesc() {                   return "Compare strings bytewise"; }
    get opcode() {                      return 64; } // 0040
    get opcode_legal_max() {            return 79; } // 004F
    get arg_start_bit() {               return 12; }
    get args() {                        return {'ckpt': 4, 'bc': 4, 'Td': 2, 'D': 4, 'Ts': 2, 'S': 4}; }
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
};

static CZC = new class extends Op {
    get op() {                          return "CZC"; }
    get shortdesc() {                   return "Test for 0 bits using a mask"; }
    get opcode() {                      return 9216; } // 2400
    get opcode_legal_max() {            return 10239; } // 27FF
    get arg_start_bit() {               return 6; }
    get args() {                        return {'D': 4, 'Ts': 2, 'S': 4}; }
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
};

static DBC = new class extends Op {
    get op() {                          return "DBC"; }
    get shortdesc() {                   return "ASCII Number String to int16"; }
    get opcode() {                      return 36; } // 0024
    get opcode_legal_max() {            return 36; } // 0024
    get arg_start_bit() {               return 16; }
    get args() {                        return {'bc': 4, 'Td': 2, 'D': 4, 'Ts': 2, 'S': 4}; }
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
};

static DD = new class extends Op {
    get op() {                          return "DD"; }
    get shortdesc() {                   return "float64 divide"; }
    get opcode() {                      return 3904; } // 0F40
    get opcode_legal_max() {            return 3967; } // 0F7F
    get arg_start_bit() {               return 10; }
    get args() {                        return {'Ts': 2, 'S': 4}; }
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
};

static DEC = new class extends Op {
    get op() {                          return "DEC"; }
    get shortdesc() {                   return "Decrement"; }
    get opcode() {                      return 1536; } // 0600
    get opcode_legal_max() {            return 1599; } // 063F
    get arg_start_bit() {               return 10; }
    get args() {                        return {'Ts': 2, 'S': 4}; }
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
};

static DECT = new class extends Op {
    get op() {                          return "DECT"; }
    get shortdesc() {                   return "Decrement by two"; }
    get opcode() {                      return 1600; } // 0640
    get opcode_legal_max() {            return 1663; } // 067F
    get arg_start_bit() {               return 10; }
    get args() {                        return {'Ts': 2, 'S': 4}; }
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
};

static DINT = new class extends Op {
    get op() {                          return "DINT"; }
    get shortdesc() {                   return "Disable interrupts"; }
    get opcode() {                      return 47; } // 002F
    get opcode_legal_max() {            return 47; } // 002F
    get arg_start_bit() {               return 16; }
    get args() {                        return {}; }
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
};

static DIV = new class extends Op {
    get op() {                          return "DIV"; }
    get shortdesc() {                   return "Integer divide"; }
    get opcode() {                      return 15360; } // 3C00
    get opcode_legal_max() {            return 16383; } // 3FFF
    get arg_start_bit() {               return 6; }
    get args() {                        return {'D': 4, 'Ts': 2, 'S': 4}; }
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
};

static DIVS = new class extends Op {
    get op() {                          return "DIVS"; }
    get shortdesc() {                   return "Divide int32 by int16"; }
    get opcode() {                      return 384; } // 0180
    get opcode_legal_max() {            return 447; } // 01BF
    get arg_start_bit() {               return 10; }
    get args() {                        return {'Ts': 2, 'S': 4}; }
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
};

static DR = new class extends Op {
    get op() {                          return "DR"; }
    get shortdesc() {                   return "Divide float32"; }
    get opcode() {                      return 3392; } // 0D40
    get opcode_legal_max() {            return 3455; } // 0D7F
    get arg_start_bit() {               return 10; }
    get args() {                        return {'Ts': 2, 'S': 4}; }
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
};

static EINT = new class extends Op {
    get op() {                          return "EINT"; }
    get shortdesc() {                   return "Enable interrupts"; }
    get opcode() {                      return 46; } // 002E
    get opcode_legal_max() {            return 46; } // 002E
    get arg_start_bit() {               return 16; }
    get args() {                        return {}; }
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
};

static EMD = new class extends Op {
    get op() {                          return "EMD"; }
    get shortdesc() {                   return "Execute diagnostics"; }
    get opcode() {                      return 45; } // 002D
    get opcode_legal_max() {            return 45; } // 002D
    get arg_start_bit() {               return 16; }
    get args() {                        return {}; }
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
};

static EP = new class extends Op {
    get op() {                          return "EP"; }
    get shortdesc() {                   return "Expand integer precision"; }
    get opcode() {                      return 1008; } // 03F0
    get opcode_legal_max() {            return 1023; } // 03FF
    get arg_start_bit() {               return 12; }
    get args() {                        return {'d_len': 4, 's_len': 4, 'Td': 2, 'D': 4, 'Ts': 2, 'S': 4}; }
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
};

static IDLE = new class extends Op {
    get op() {                          return "IDLE"; }
    get shortdesc() {                   return "Idle until interrupt"; }
    get opcode() {                      return 832; } // 0340
    get opcode_legal_max() {            return 832; } // 0340
    get arg_start_bit() {               return 16; }
    get args() {                        return {}; }
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
};

static INC = new class extends Op {
    get op() {                          return "INC"; }
    get shortdesc() {                   return "Increment"; }
    get opcode() {                      return 1408; } // 0580
    get opcode_legal_max() {            return 1471; } // 05BF
    get arg_start_bit() {               return 10; }
    get args() {                        return {'Ts': 2, 'S': 4}; }
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
};

static INCT = new class extends Op {
    get op() {                          return "INCT"; }
    get shortdesc() {                   return "Increment by two"; }
    get opcode() {                      return 1472; } // 05C0
    get opcode_legal_max() {            return 1535; } // 05FF
    get arg_start_bit() {               return 10; }
    get args() {                        return {'Ts': 2, 'S': 4}; }
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
};

static INSF = new class extends Op {
    get op() {                          return "INSF"; }
    get shortdesc() {                   return "Bitwise substring insert"; }
    get opcode() {                      return 3088; } // 0C10
    get opcode_legal_max() {            return 3103; } // 0C1F
    get arg_start_bit() {               return 12; }
    get args() {                        return {'width': 4, 'pos': 4, 'Td': 2, 'D': 4, 'Ts': 2, 'S': 4}; }
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
};

static INV = new class extends Op {
    get op() {                          return "INV"; }
    get shortdesc() {                   return "Logic NOT a word"; }
    get opcode() {                      return 1344; } // 0540
    get opcode_legal_max() {            return 1407; } // 057F
    get arg_start_bit() {               return 10; }
    get args() {                        return {'Ts': 2, 'S': 4}; }
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
};

static IOF = new class extends Op {
    get op() {                          return "IOF"; }
    get shortdesc() {                   return "Bitwise substring NOT"; }
    get opcode() {                      return 3584; } // 0E00
    get opcode_legal_max() {            return 3599; } // 0E0F
    get arg_start_bit() {               return 12; }
    get args() {                        return {'width': 4, 'pos': 4, 'nu': 6, 'Ts': 2, 'S': 4}; }
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
};

static JEQ = new class extends Op {
    get op() {                          return "JEQ"; }
    get shortdesc() {                   return "Jump if Equal"; }
    get opcode() {                      return 4864; } // 1300
    get opcode_legal_max() {            return 5119; } // 13FF
    get arg_start_bit() {               return 8; }
    get args() {                        return {'disp': 8}; }
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
};

static JGT = new class extends Op {
    get op() {                          return "JGT"; }
    get shortdesc() {                   return "Jump if Greater Than"; }
    get opcode() {                      return 5376; } // 1500
    get opcode_legal_max() {            return 5631; } // 15FF
    get arg_start_bit() {               return 8; }
    get args() {                        return {'disp': 8}; }
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
};

static JH = new class extends Op {
    get op() {                          return "JH"; }
    get shortdesc() {                   return "Jump if Logicical Greater"; }
    get opcode() {                      return 6912; } // 1B00
    get opcode_legal_max() {            return 7167; } // 1BFF
    get arg_start_bit() {               return 8; }
    get args() {                        return {'disp': 8}; }
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
};

static JHE = new class extends Op {
    get op() {                          return "JHE"; }
    get shortdesc() {                   return "Jump if Greater or Equal"; }
    get opcode() {                      return 5120; } // 1400
    get opcode_legal_max() {            return 5375; } // 14FF
    get arg_start_bit() {               return 8; }
    get args() {                        return {'disp': 8}; }
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
};

static JL = new class extends Op {
    get op() {                          return "JL"; }
    get shortdesc() {                   return "Jump if Logical Lower"; }
    get opcode() {                      return 6656; } // 1A00
    get opcode_legal_max() {            return 6911; } // 1AFF
    get arg_start_bit() {               return 8; }
    get args() {                        return {'disp': 8}; }
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
};

static JLE = new class extends Op {
    get op() {                          return "JLE"; }
    get shortdesc() {                   return "Jump if Lower or Equal"; }
    get opcode() {                      return 4608; } // 1200
    get opcode_legal_max() {            return 4863; } // 12FF
    get arg_start_bit() {               return 8; }
    get args() {                        return {'disp': 8}; }
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
};

static JLT = new class extends Op {
    get op() {                          return "JLT"; }
    get shortdesc() {                   return "Jump if Less Than"; }
    get opcode() {                      return 4352; } // 1100
    get opcode_legal_max() {            return 4607; } // 11FF
    get arg_start_bit() {               return 8; }
    get args() {                        return {'disp': 8}; }
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
};

static JMP = new class extends Op {
    get op() {                          return "JMP"; }
    get shortdesc() {                   return "Unconditional Jump"; }
    get opcode() {                      return 4096; } // 1000
    get opcode_legal_max() {            return 4351; } // 10FF
    get arg_start_bit() {               return 8; }
    get args() {                        return {'disp': 8}; }
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
};

static JNC = new class extends Op {
    get op() {                          return "JNC"; }
    get shortdesc() {                   return "Jump if No Carry"; }
    get opcode() {                      return 5888; } // 1700
    get opcode_legal_max() {            return 6143; } // 17FF
    get arg_start_bit() {               return 8; }
    get args() {                        return {'disp': 8}; }
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
};

static JNE = new class extends Op {
    get op() {                          return "JNE"; }
    get shortdesc() {                   return "Jump if Not Equal"; }
    get opcode() {                      return 5632; } // 1600
    get opcode_legal_max() {            return 5887; } // 16FF
    get arg_start_bit() {               return 8; }
    get args() {                        return {'disp': 8}; }
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
};

static JNO = new class extends Op {
    get op() {                          return "JNO"; }
    get shortdesc() {                   return "Jump if No Overflow"; }
    get opcode() {                      return 6400; } // 1900
    get opcode_legal_max() {            return 6655; } // 19FF
    get arg_start_bit() {               return 8; }
    get args() {                        return {'disp': 8}; }
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
};

static JOC = new class extends Op {
    get op() {                          return "JOC"; }
    get shortdesc() {                   return "Jump if Carry"; }
    get opcode() {                      return 6144; } // 1800
    get opcode_legal_max() {            return 6399; } // 18FF
    get arg_start_bit() {               return 8; }
    get args() {                        return {'disp': 8}; }
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
};

static JOP = new class extends Op {
    get op() {                          return "JOP"; }
    get shortdesc() {                   return "Jump if Odd Parity"; }
    get opcode() {                      return 7168; } // 1C00
    get opcode_legal_max() {            return 7423; } // 1CFF
    get arg_start_bit() {               return 8; }
    get args() {                        return {'disp': 8}; }
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
};

static LCS = new class extends Op {
    get op() {                          return "LCS"; }
    get shortdesc() {                   return "Load Microcode Data (???)"; }
    get opcode() {                      return 160; } // 00A0
    get opcode_legal_max() {            return 175; } // 00AF
    get arg_start_bit() {               return 12; }
    get args() {                        return {'reg': 4}; }
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
};

static LD = new class extends Op {
    get op() {                          return "LD"; }
    get shortdesc() {                   return "Load float64 into R0-3"; }
    get opcode() {                      return 3968; } // 0F80
    get opcode_legal_max() {            return 4031; } // 0FBF
    get arg_start_bit() {               return 10; }
    get args() {                        return {'Ts': 2, 'S': 4}; }
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
};

static LDCR = new class extends Op {
    get op() {                          return "LDCR"; }
    get shortdesc() {                   return "Send bits from a word to the CRU"; }
    get opcode() {                      return 12288; } // 3000
    get opcode_legal_max() {            return 13311; } // 33FF
    get arg_start_bit() {               return 6; }
    get args() {                        return {'num': 4, 'Ts': 2, 'S': 4}; }
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
};

static LDD = new class extends Op {
    get op() {                          return "LDD"; }
    get shortdesc() {                   return "Next instruction dest gets mapped mem"; }
    get opcode() {                      return 1984; } // 07C0
    get opcode_legal_max() {            return 2047; } // 07FF
    get arg_start_bit() {               return 10; }
    get args() {                        return {'Ts': 2, 'S': 4}; }
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
};

static LDS = new class extends Op {
    get op() {                          return "LDS"; }
    get shortdesc() {                   return "Next instruction src gets mapped mem"; }
    get opcode() {                      return 1920; } // 0780
    get opcode_legal_max() {            return 1983; } // 07BF
    get arg_start_bit() {               return 10; }
    get args() {                        return {'Ts': 2, 'S': 4}; }
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
};

static LI = new class extends Op {
    get op() {                          return "LI"; }
    get shortdesc() {                   return "Load immediate"; }
    get opcode() {                      return 512; } // 0200
    get opcode_legal_max() {            return 527; } // 020F
    get arg_start_bit() {               return 12; }
    get args() {                        return {'reg': 4}; }
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
};

static LIM = new class extends Op {
    get op() {                          return "LIM"; }
    get shortdesc() {                   return "Load interrupt mask"; }
    get opcode() {                      return 112; } // 0070
    get opcode_legal_max() {            return 127; } // 007F
    get arg_start_bit() {               return 12; }
    get args() {                        return {'reg': 4}; }
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
};

static LIMI = new class extends Op {
    get op() {                          return "LIMI"; }
    get shortdesc() {                   return "Load interrupt mask immediate"; }
    get opcode() {                      return 768; } // 0300
    get opcode_legal_max() {            return 783; } // 030F
    get arg_start_bit() {               return 12; }
    get args() {                        return {'reg': 4}; }
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
};

static LMF = new class extends Op {
    get op() {                          return "LMF"; }
    get shortdesc() {                   return "Map memory"; }
    get opcode() {                      return 800; } // 0320
    get opcode_legal_max() {            return 831; } // 033F
    get arg_start_bit() {               return 11; }
    get args() {                        return {'m': 1, 'reg': 4}; }
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
};

static LR = new class extends Op {
    get op() {                          return "LR"; }
    get shortdesc() {                   return "Load float32 into R0-1"; }
    get opcode() {                      return 3456; } // 0D80
    get opcode_legal_max() {            return 3519; } // 0DBF
    get arg_start_bit() {               return 10; }
    get args() {                        return {'Ts': 2, 'S': 4}; }
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
};

static LREX = new class extends Op {
    get op() {                          return "LREX"; }
    get shortdesc() {                   return "Restart from 0xFFC0, context switch"; }
    get opcode() {                      return 992; } // 03E0
    get opcode_legal_max() {            return 992; } // 03E0
    get arg_start_bit() {               return 16; }
    get args() {                        return {}; }
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
};

static LST = new class extends Op {
    get op() {                          return "LST"; }
    get shortdesc() {                   return "Load Reg into Status Register"; }
    get opcode() {                      return 128; } // 0080
    get opcode_legal_max() {            return 143; } // 008F
    get arg_start_bit() {               return 12; }
    get args() {                        return {'reg': 4}; }
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
};

static LTO = new class extends Op {
    get op() {                          return "LTO"; }
    get shortdesc() {                   return "Find the 1 nearest to the left bytewise"; }
    get opcode() {                      return 31; } // 001F
    get opcode_legal_max() {            return 31; } // 001F
    get arg_start_bit() {               return 16; }
    get args() {                        return {'bc': 4, 'Td': 2, 'D': 4, 'Ts': 2, 'S': 4}; }
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
};

static LWP = new class extends Op {
    get op() {                          return "LWP"; }
    get shortdesc() {                   return "Load Reg into Workspace Register"; }
    get opcode() {                      return 144; } // 0090
    get opcode_legal_max() {            return 159; } // 009F
    get arg_start_bit() {               return 12; }
    get args() {                        return {'reg': 4}; }
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
};

static LWPI = new class extends Op {
    get op() {                          return "LWPI"; }
    get shortdesc() {                   return "Load Immediate into Workplace Register"; }
    get opcode() {                      return 736; } // 02E0
    get opcode_legal_max() {            return 751; } // 02EF
    get arg_start_bit() {               return 12; }
    get args() {                        return {'reg': 4}; }
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
};

static MD = new class extends Op {
    get op() {                          return "MD"; }
    get shortdesc() {                   return "Multiply float64"; }
    get opcode() {                      return 3840; } // 0F00
    get opcode_legal_max() {            return 3903; } // 0F3F
    get arg_start_bit() {               return 10; }
    get args() {                        return {'Ts': 2, 'S': 4}; }
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
};

static MM = new class extends Op {
    get op() {                          return "MM"; }
    get shortdesc() {                   return "Multiply int32 into bigint (3 words)"; }
    get opcode() {                      return 770; } // 0302
    get opcode_legal_max() {            return 770; } // 0302
    get arg_start_bit() {               return 16; }
    get args() {                        return {'nu': 4, 'Td': 2, 'D': 4, 'Ts': 2, 'S': 4}; }
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
};

static MOV = new class extends Op {
    get op() {                          return "MOV"; }
    get shortdesc() {                   return "Copy word"; }
    get opcode() {                      return 49152; } // C000
    get opcode_legal_max() {            return 53247; } // CFFF
    get arg_start_bit() {               return 4; }
    get args() {                        return {'Td': 2, 'D': 4, 'Ts': 2, 'S': 4}; }
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
};

static MOVA = new class extends Op {
    get op() {                          return "MOVA"; }
    get shortdesc() {                   return "Copy address"; }
    get opcode() {                      return 43; } // 002B
    get opcode_legal_max() {            return 43; } // 002B
    get arg_start_bit() {               return 16; }
    get args() {                        return {'nu': 4, 'Td': 2, 'D': 4, 'Ts': 2, 'S': 4}; }
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
};

static MOVB = new class extends Op {
    get op() {                          return "MOVB"; }
    get shortdesc() {                   return "Copy byte"; }
    get opcode() {                      return 53248; } // D000
    get opcode_legal_max() {            return 57343; } // DFFF
    get arg_start_bit() {               return 4; }
    get args() {                        return {'Td': 2, 'D': 4, 'Ts': 2, 'S': 4}; }
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
};

static MOVS = new class extends Op {
    get op() {                          return "MOVS"; }
    get shortdesc() {                   return "Copy string bytewise"; }
    get opcode() {                      return 96; } // 0060
    get opcode_legal_max() {            return 111; } // 006F
    get arg_start_bit() {               return 12; }
    get args() {                        return {'ckpt': 4, 'bc': 4, 'Td': 2, 'D': 4, 'Ts': 2, 'S': 4}; }
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
};

static MPY = new class extends Op {
    get op() {                          return "MPY"; }
    get shortdesc() {                   return "Multiply uint16 into uint32"; }
    get opcode() {                      return 14336; } // 3800
    get opcode_legal_max() {            return 15359; } // 3BFF
    get arg_start_bit() {               return 6; }
    get args() {                        return {'D': 4, 'Ts': 2, 'S': 4}; }
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
};

static MPYS = new class extends Op {
    get op() {                          return "MPYS"; }
    get shortdesc() {                   return "Multiply int16 into int32"; }
    get opcode() {                      return 448; } // 01C0
    get opcode_legal_max() {            return 511; } // 01FF
    get arg_start_bit() {               return 10; }
    get args() {                        return {'Ts': 2, 'S': 4}; }
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
};

static MR = new class extends Op {
    get op() {                          return "MR"; }
    get shortdesc() {                   return "Multiply float32"; }
    get opcode() {                      return 3328; } // 0D00
    get opcode_legal_max() {            return 3391; } // 0D3F
    get arg_start_bit() {               return 10; }
    get args() {                        return {'Ts': 2, 'S': 4}; }
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
};

static MVSK = new class extends Op {
    get op() {                          return "MVSK"; }
    get shortdesc() {                   return "Copy string from stack bytewise"; }
    get opcode() {                      return 208; } // 00D0
    get opcode_legal_max() {            return 223; } // 00DF
    get arg_start_bit() {               return 12; }
    get args() {                        return {'ckpt': 4, 'bc': 4, 'Td': 2, 'D': 4, 'Ts': 2, 'S': 4}; }
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
};

static MVSR = new class extends Op {
    get op() {                          return "MVSR"; }
    get shortdesc() {                   return "Copy string in reverse bytewise"; }
    get opcode() {                      return 192; } // 00C0
    get opcode_legal_max() {            return 207; } // 00CF
    get arg_start_bit() {               return 12; }
    get args() {                        return {'ckpt': 4, 'bc': 4, 'Td': 2, 'D': 4, 'Ts': 2, 'S': 4}; }
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
};

static NEG = new class extends Op {
    get op() {                          return "NEG"; }
    get shortdesc() {                   return "Negate word"; }
    get opcode() {                      return 1280; } // 0500
    get opcode_legal_max() {            return 1343; } // 053F
    get arg_start_bit() {               return 10; }
    get args() {                        return {'Ts': 2, 'S': 4}; }
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
};

static NEGD = new class extends Op {
    get op() {                          return "NEGD"; }
    get shortdesc() {                   return "Negate float64"; }
    get opcode() {                      return 3075; } // 0C03
    get opcode_legal_max() {            return 3075; } // 0C03
    get arg_start_bit() {               return 16; }
    get args() {                        return {}; }
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
};

static NEGR = new class extends Op {
    get op() {                          return "NEGR"; }
    get shortdesc() {                   return "Negate float32"; }
    get opcode() {                      return 3074; } // 0C02
    get opcode_legal_max() {            return 3074; } // 0C02
    get arg_start_bit() {               return 16; }
    get args() {                        return {}; }
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
};

static NRM = new class extends Op {
    get op() {                          return "NRM"; }
    get shortdesc() {                   return "Normalize a bigint by bit shifting left"; }
    get opcode() {                      return 3080; } // 0C08
    get opcode_legal_max() {            return 3080; } // 0C08
    get arg_start_bit() {               return 16; }
    get args() {                        return {'bc': 4, 'Td': 2, 'D': 4, 'Ts': 2, 'S': 4}; }
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
};

static ORI = new class extends Op {
    get op() {                          return "ORI"; }
    get shortdesc() {                   return "Logic OR a word"; }
    get opcode() {                      return 608; } // 0260
    get opcode_legal_max() {            return 623; } // 026F
    get arg_start_bit() {               return 12; }
    get args() {                        return {'reg': 4}; }
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
};

static ORM = new class extends Op {
    get op() {                          return "ORM"; }
    get shortdesc() {                   return "Bitwise bigint OR (yes, signed int!)"; }
    get opcode() {                      return 39; } // 0027
    get opcode_legal_max() {            return 39; } // 0027
    get arg_start_bit() {               return 16; }
    get args() {                        return {'bc': 4, 'Td': 2, 'D': 4, 'Ts': 2, 'S': 4}; }
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
};

static POPS = new class extends Op {
    get op() {                          return "POPS"; }
    get shortdesc() {                   return "Pop byte string from stack"; }
    get opcode() {                      return 224; } // 00E0
    get opcode_legal_max() {            return 239; } // 00EF
    get arg_start_bit() {               return 12; }
    get args() {                        return {'ckpt': 4, 'bc': 4, 'Td': 2, 'D': 4, 'Ts': 2, 'S': 4}; }
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
};

static PSHS = new class extends Op {
    get op() {                          return "PSHS"; }
    get shortdesc() {                   return "Push byte string to stack"; }
    get opcode() {                      return 240; } // 00F0
    get opcode_legal_max() {            return 255; } // 00FF
    get arg_start_bit() {               return 12; }
    get args() {                        return {'ckpt': 4, 'bc': 4, 'Td': 2, 'D': 4, 'Ts': 2, 'S': 4}; }
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
};

static RSET = new class extends Op {
    get op() {                          return "RSET"; }
    get shortdesc() {                   return "System reset"; }
    get opcode() {                      return 864; } // 0360
    get opcode_legal_max() {            return 864; } // 0360
    get arg_start_bit() {               return 16; }
    get args() {                        return {}; }
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
};

static RTO = new class extends Op {
    get op() {                          return "RTO"; }
    get shortdesc() {                   return "Find the 1 nearest to the right of a bigbits"; }
    get opcode() {                      return 30; } // 001E
    get opcode_legal_max() {            return 30; } // 001E
    get arg_start_bit() {               return 16; }
    get args() {                        return {'bc': 4, 'Td': 2, 'D': 4, 'Ts': 2, 'S': 4}; }
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
};

static RTWP = new class extends Op {
    get op() {                          return "RTWP"; }
    get shortdesc() {                   return "Return with Workspace Pointer"; }
    get opcode() {                      return 896; } // 0380
    get opcode_legal_max() {            return 896; } // 0380
    get arg_start_bit() {               return 16; }
    get args() {                        return {}; }
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
};

static S = new class extends Op {
    get op() {                          return "S"; }
    get shortdesc() {                   return "Subtract int16"; }
    get opcode() {                      return 24576; } // 6000
    get opcode_legal_max() {            return 28671; } // 6FFF
    get arg_start_bit() {               return 4; }
    get args() {                        return {'Td': 2, 'D': 4, 'Ts': 2, 'S': 4}; }
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
};

static SB = new class extends Op {
    get op() {                          return "SB"; }
    get shortdesc() {                   return "Subtract int8"; }
    get opcode() {                      return 28672; } // 7000
    get opcode_legal_max() {            return 32767; } // 7FFF
    get arg_start_bit() {               return 4; }
    get args() {                        return {'Td': 2, 'D': 4, 'Ts': 2, 'S': 4}; }
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
};

static SBO = new class extends Op {
    get op() {                          return "SBO"; }
    get shortdesc() {                   return "Set given CRU bit to 1"; }
    get opcode() {                      return 7424; } // 1D00
    get opcode_legal_max() {            return 7679; } // 1DFF
    get arg_start_bit() {               return 8; }
    get args() {                        return {'disp': 8}; }
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
};

static SBZ = new class extends Op {
    get op() {                          return "SBZ"; }
    get shortdesc() {                   return "Set given CRU bit to 0"; }
    get opcode() {                      return 7680; } // 1E00
    get opcode_legal_max() {            return 7935; } // 1EFF
    get arg_start_bit() {               return 8; }
    get args() {                        return {'disp': 8}; }
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
};

static SD = new class extends Op {
    get op() {                          return "SD"; }
    get shortdesc() {                   return "Subtract float64"; }
    get opcode() {                      return 3776; } // 0EC0
    get opcode_legal_max() {            return 3839; } // 0EFF
    get arg_start_bit() {               return 10; }
    get args() {                        return {'Ts': 2, 'S': 4}; }
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
};

static SEQB = new class extends Op {
    get op() {                          return "SEQB"; }
    get shortdesc() {                   return "Search for byte in a string"; }
    get opcode() {                      return 80; } // 0050
    get opcode_legal_max() {            return 95; } // 005F
    get arg_start_bit() {               return 12; }
    get args() {                        return {'ckpt': 4, 'bc': 4, 'Td': 2, 'D': 4, 'Ts': 2, 'S': 4}; }
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
};

static SETO = new class extends Op {
    get op() {                          return "SETO"; }
    get shortdesc() {                   return "Set word to ones (FFFF)"; }
    get opcode() {                      return 1792; } // 0700
    get opcode_legal_max() {            return 1855; } // 073F
    get arg_start_bit() {               return 10; }
    get args() {                        return {'Ts': 2, 'S': 4}; }
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
};

static SLA = new class extends Op {
    get op() {                          return "SLA"; }
    get shortdesc() {                   return "Shift left, fill with zero"; }
    get opcode() {                      return 2560; } // 0A00
    get opcode_legal_max() {            return 2815; } // 0AFF
    get arg_start_bit() {               return 8; }
    get args() {                        return {'count': 4, 'reg': 4}; }
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
};

static SLAM = new class extends Op {
    get op() {                          return "SLAM"; }
    get shortdesc() {                   return "Shift bigbits left, fill with zero"; }
    get opcode() {                      return 29; } // 001D
    get opcode_legal_max() {            return 29; } // 001D
    get arg_start_bit() {               return 16; }
    get args() {                        return {'s_len': 4, 'nu': 2, 'count': 4, 'Ts': 2, 'S': 4}; }
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
};

static SLSL = new class extends Op {
    get op() {                          return "SLSL"; }
    get shortdesc() {                   return "Search list for matching bits"; }
    get opcode() {                      return 33; } // 0021
    get opcode_legal_max() {            return 33; } // 0021
    get arg_start_bit() {               return 16; }
    get args() {                        return {'cond': 4, 'Td': 2, 'D': 4, 'Ts': 2, 'S': 4}; }
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
};

static SLSP = new class extends Op {
    get op() {                          return "SLSP"; }
    get shortdesc() {                   return "Search list for matching bits, mapped"; }
    get opcode() {                      return 34; } // 0022
    get opcode_legal_max() {            return 34; } // 0022
    get arg_start_bit() {               return 16; }
    get args() {                        return {'cond': 4, 'Td': 2, 'D': 4, 'Ts': 2, 'S': 4}; }
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
};

static SM = new class extends Op {
    get op() {                          return "SM"; }
    get shortdesc() {                   return "Subtract bigint"; }
    get opcode() {                      return 41; } // 0029
    get opcode_legal_max() {            return 41; } // 0029
    get arg_start_bit() {               return 16; }
    get args() {                        return {'bc': 4, 'Td': 2, 'D': 4, 'Ts': 2, 'S': 4}; }
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
};

static SNEB = new class extends Op {
    get op() {                          return "SNEB"; }
    get shortdesc() {                   return "Search for not equal byte in a string"; }
    get opcode() {                      return 3600; } // 0E10
    get opcode_legal_max() {            return 3615; } // 0E1F
    get arg_start_bit() {               return 12; }
    get args() {                        return {'ckpt': 4, 'bc': 4, 'Td': 2, 'D': 4, 'Ts': 2, 'S': 4}; }
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
};

static SOC = new class extends Op {
    get op() {                          return "SOC"; }
    get shortdesc() {                   return "Logic OR: Copy 1s between words"; }
    get opcode() {                      return 57344; } // E000
    get opcode_legal_max() {            return 61439; } // EFFF
    get arg_start_bit() {               return 4; }
    get args() {                        return {'Td': 2, 'D': 4, 'Ts': 2, 'S': 4}; }
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
};

static SOCB = new class extends Op {
    get op() {                          return "SOCB"; }
    get shortdesc() {                   return "Logic OR: Copy 1s between bytes"; }
    get opcode() {                      return 61440; } // F000
    get opcode_legal_max() {            return 65535; } // FFFF
    get arg_start_bit() {               return 4; }
    get args() {                        return {'Td': 2, 'D': 4, 'Ts': 2, 'S': 4}; }
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
};

static SR = new class extends Op {
    get op() {                          return "SR"; }
    get shortdesc() {                   return "Subtract float32"; }
    get opcode() {                      return 3264; } // 0CC0
    get opcode_legal_max() {            return 3327; } // 0CFF
    get arg_start_bit() {               return 10; }
    get args() {                        return {'Ts': 2, 'S': 4}; }
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
};

static SRA = new class extends Op {
    get op() {                          return "SRA"; }
    get shortdesc() {                   return "Shift right filling with the sign bit"; }
    get opcode() {                      return 2048; } // 0800
    get opcode_legal_max() {            return 2303; } // 08FF
    get arg_start_bit() {               return 8; }
    get args() {                        return {'count': 4, 'reg': 4}; }
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
};

static SRAM = new class extends Op {
    get op() {                          return "SRAM"; }
    get shortdesc() {                   return "Shift right filling with the sign bit, bigint"; }
    get opcode() {                      return 28; } // 001C
    get opcode_legal_max() {            return 28; } // 001C
    get arg_start_bit() {               return 16; }
    get args() {                        return {'s_len': 4, 'nu': 2, 'count': 4, 'Ts': 2, 'S': 4}; }
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
};

static SRC = new class extends Op {
    get op() {                          return "SRC"; }
    get shortdesc() {                   return "Shift right, circular"; }
    get opcode() {                      return 2816; } // 0B00
    get opcode_legal_max() {            return 3071; } // 0BFF
    get arg_start_bit() {               return 8; }
    get args() {                        return {'count': 4, 'reg': 4}; }
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
};

static SRJ = new class extends Op {
    get op() {                          return "SRJ"; }
    get shortdesc() {                   return "Subtract and jump"; }
    get opcode() {                      return 3084; } // 0C0C
    get opcode_legal_max() {            return 3084; } // 0C0C
    get arg_start_bit() {               return 16; }
    get args() {                        return {'const': 4, 'reg': 4, 'disp': 8}; }
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
};

static SRL = new class extends Op {
    get op() {                          return "SRL"; }
    get shortdesc() {                   return "Shift right filling with zero"; }
    get opcode() {                      return 2304; } // 0900
    get opcode_legal_max() {            return 2559; } // 09FF
    get arg_start_bit() {               return 8; }
    get args() {                        return {'count': 4, 'reg': 4}; }
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
};

static STCR = new class extends Op {
    get op() {                          return "STCR"; }
    get shortdesc() {                   return "Read up to 16 bits from the CRU"; }
    get opcode() {                      return 13312; } // 3400
    get opcode_legal_max() {            return 14335; } // 37FF
    get arg_start_bit() {               return 6; }
    get args() {                        return {'num': 4, 'Ts': 2, 'S': 4}; }
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
};

static STD = new class extends Op {
    get op() {                          return "STD"; }
    get shortdesc() {                   return "Store float64"; }
    get opcode() {                      return 4032; } // 0FC0
    get opcode_legal_max() {            return 4095; } // 0FFF
    get arg_start_bit() {               return 10; }
    get args() {                        return {'Ts': 2, 'S': 4}; }
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
};

static STPC = new class extends Op {
    get op() {                          return "STPC"; }
    get shortdesc() {                   return "Store Program Counter"; }
    get opcode() {                      return 48; } // 0030
    get opcode_legal_max() {            return 63; } // 003F
    get arg_start_bit() {               return 12; }
    get args() {                        return {'reg': 4}; }
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
};

static STR = new class extends Op {
    get op() {                          return "STR"; }
    get shortdesc() {                   return "Store float32"; }
    get opcode() {                      return 3520; } // 0DC0
    get opcode_legal_max() {            return 3583; } // 0DFF
    get arg_start_bit() {               return 10; }
    get args() {                        return {'Ts': 2, 'S': 4}; }
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
};

static STST = new class extends Op {
    get op() {                          return "STST"; }
    get shortdesc() {                   return "Store Status Register"; }
    get opcode() {                      return 704; } // 02C0
    get opcode_legal_max() {            return 719; } // 02CF
    get arg_start_bit() {               return 12; }
    get args() {                        return {'reg': 4}; }
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
};

static STWP = new class extends Op {
    get op() {                          return "STWP"; }
    get shortdesc() {                   return "Store Workspace Pointer"; }
    get opcode() {                      return 672; } // 02A0
    get opcode_legal_max() {            return 687; } // 02AF
    get arg_start_bit() {               return 12; }
    get args() {                        return {'reg': 4}; }
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
};

static SWPB = new class extends Op {
    get op() {                          return "SWPB"; }
    get shortdesc() {                   return "Swap Bytes"; }
    get opcode() {                      return 1728; } // 06C0
    get opcode_legal_max() {            return 1791; } // 06FF
    get arg_start_bit() {               return 10; }
    get args() {                        return {'Ts': 2, 'S': 4}; }
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
};

static SWPM = new class extends Op {
    get op() {                          return "SWPM"; }
    get shortdesc() {                   return "Swap Bytes in a bigbits"; }
    get opcode() {                      return 37; } // 0025
    get opcode_legal_max() {            return 37; } // 0025
    get arg_start_bit() {               return 16; }
    get args() {                        return {'bc': 4, 'Td': 2, 'D': 4, 'Ts': 2, 'S': 4}; }
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
};

static SZC = new class extends Op {
    get op() {                          return "SZC"; }
    get shortdesc() {                   return "Logic AND masked words"; }
    get opcode() {                      return 16384; } // 4000
    get opcode_legal_max() {            return 20479; } // 4FFF
    get arg_start_bit() {               return 4; }
    get args() {                        return {'Td': 2, 'D': 4, 'Ts': 2, 'S': 4}; }
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
};

static SZCB = new class extends Op {
    get op() {                          return "SZCB"; }
    get shortdesc() {                   return "Logic AND masked bytes"; }
    get opcode() {                      return 20480; } // 5000
    get opcode_legal_max() {            return 24575; } // 5FFF
    get arg_start_bit() {               return 4; }
    get args() {                        return {'Td': 2, 'D': 4, 'Ts': 2, 'S': 4}; }
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
};

static TB = new class extends Op {
    get op() {                          return "TB"; }
    get shortdesc() {                   return "Test bit"; }
    get opcode() {                      return 7936; } // 1F00
    get opcode_legal_max() {            return 8191; } // 1FFF
    get arg_start_bit() {               return 8; }
    get args() {                        return {'disp': 8}; }
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
};

static TCMB = new class extends Op {
    get op() {                          return "TCMB"; }
    get shortdesc() {                   return "Test & reset bit in word"; }
    get opcode() {                      return 3082; } // 0C0A
    get opcode_legal_max() {            return 3082; } // 0C0A
    get arg_start_bit() {               return 16; }
    get args() {                        return {'pos': 10, 'Ts': 2, 'S': 4}; }
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
};

static TMB = new class extends Op {
    get op() {                          return "TMB"; }
    get shortdesc() {                   return "Test bit in word"; }
    get opcode() {                      return 3081; } // 0C09
    get opcode_legal_max() {            return 3081; } // 0C09
    get arg_start_bit() {               return 16; }
    get args() {                        return {'pos': 10, 'Ts': 2, 'S': 4}; }
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
};

static TS = new class extends Op {
    get op() {                          return "TS"; }
    get shortdesc() {                   return "Translate words in a string from a table"; }
    get opcode() {                      return 3632; } // 0E30
    get opcode_legal_max() {            return 3647; } // 0E3F
    get arg_start_bit() {               return 12; }
    get args() {                        return {'ckpt': 4, 'bc': 4, 'Td': 2, 'D': 4, 'Ts': 2, 'S': 4}; }
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
};

static TSMB = new class extends Op {
    get op() {                          return "TSMB"; }
    get shortdesc() {                   return "Test & set bit in word"; }
    get opcode() {                      return 3083; } // 0C0B
    get opcode_legal_max() {            return 3083; } // 0C0B
    get arg_start_bit() {               return 16; }
    get args() {                        return {'pos': 10, 'Ts': 2, 'S': 4}; }
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
};

static X = new class extends Op {
    get op() {                          return "X"; }
    get shortdesc() {                   return "Execute"; }
    get opcode() {                      return 1152; } // 0480
    get opcode_legal_max() {            return 1215; } // 04BF
    get arg_start_bit() {               return 10; }
    get args() {                        return {'Ts': 2, 'S': 4}; }
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
};

static XF = new class extends Op {
    get op() {                          return "XF"; }
    get shortdesc() {                   return "Extract bits from word"; }
    get opcode() {                      return 3120; } // 0C30
    get opcode_legal_max() {            return 3135; } // 0C3F
    get arg_start_bit() {               return 12; }
    get args() {                        return {'width': 4, 'pos': 4, 'Td': 2, 'D': 4, 'Ts': 2, 'S': 4}; }
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
};

static XIT = new class extends Op {
    get op() {                          return "XIT"; }
    get shortdesc() {                   return "No-OP"; }
    get opcode() {                      return 3086; } // 0C0E
    get opcode_legal_max() {            return 3086; } // 0C0E
    get arg_start_bit() {               return 16; }
    get args() {                        return {}; }
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
};

static XOP = new class extends Op {
    get op() {                          return "XOP"; }
    get shortdesc() {                   return "Extended Operation Call"; }
    get opcode() {                      return 11264; } // 2C00
    get opcode_legal_max() {            return 12287; } // 2FFF
    get arg_start_bit() {               return 6; }
    get args() {                        return {'D': 4, 'Ts': 2, 'S': 4}; }
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
};

static XOR = new class extends Op {
    get op() {                          return "XOR"; }
    get shortdesc() {                   return "Logic XOR a word"; }
    get opcode() {                      return 10240; } // 2800
    get opcode_legal_max() {            return 11263; } // 2BFF
    get arg_start_bit() {               return 6; }
    get args() {                        return {'D': 4, 'Ts': 2, 'S': 4}; }
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
};

static XORM = new class extends Op {
    get op() {                          return "XORM"; }
    get shortdesc() {                   return "Logic XOR a bigbits"; }
    get opcode() {                      return 38; } // 0026
    get opcode_legal_max() {            return 38; } // 0026
    get arg_start_bit() {               return 16; }
    get args() {                        return {'bc': 4, 'Td': 2, 'D': 4, 'Ts': 2, 'S': 4}; }
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
};

static XV = new class extends Op {
    get op() {                          return "XV"; }
    get shortdesc() {                   return "Extract bits into a new word"; }
    get opcode() {                      return 3104; } // 0C20
    get opcode_legal_max() {            return 3119; } // 0C2F
    get arg_start_bit() {               return 12; }
    get args() {                        return {'width': 4, 'pos': 4, 'Td': 2, 'D': 4, 'Ts': 2, 'S': 4}; }
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
};

/*******************************************************************************
 * END AUTOMATICALLY GENERATED BLOCK
 ******************************************************************************/

    static init() {
        // Can't use a static initializer because it can't yet see the static properties when run.
        for (let i in this.op_names) {
            const op_name = this.op_names[i];
            /** @type {Op} op */
            const op = Reflect.get(this, op_name);
            Op.addOp(op_name, op.opcode, op.opcode_legal_max);
        }
    }

}
Ops.init();
