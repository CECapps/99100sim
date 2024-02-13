// @ts-check

import { ExecutionUnit } from "./ExecutionUnit.js";

import { ExecutionUnit_A } from "./instructions/A.js";
import { ExecutionUnit_C } from "./instructions/C.js";
import { ExecutionUnit_DEC } from "./instructions/DEC.js";
import { ExecutionUnit_DECT } from "./instructions/DECT.js";
import { ExecutionUnit_INC } from "./instructions/INC.js";
import { ExecutionUnit_INCT } from "./instructions/INCT.js";
import { ExecutionUnit_JEQ } from "./instructions/JEQ.js";
import { ExecutionUnit_JGT } from "./instructions/JGT.js";
import { ExecutionUnit_JH } from "./instructions/JH.js";
import { ExecutionUnit_JHE } from "./instructions/JHE.js";
import { ExecutionUnit_JL } from "./instructions/JL.js";
import { ExecutionUnit_JLE } from "./instructions/JLE.js";
import { ExecutionUnit_JLT } from "./instructions/JLT.js";
import { ExecutionUnit_JMP } from "./instructions/JMP.js";
import { ExecutionUnit_JNC } from "./instructions/JNC.js";
import { ExecutionUnit_JNE } from "./instructions/JNE.js";
import { ExecutionUnit_JNO } from "./instructions/JNO.js";
import { ExecutionUnit_JOC } from "./instructions/JOC.js";
import { ExecutionUnit_LI } from "./instructions/LI.js";
import { ExecutionUnit_MOV } from "./instructions/MOV.js";
import { ExecutionUnit_S } from "./instructions/S.js";

export class ExecutionUnitMap {

    /** @typedef {typeof ExecutionUnit} AnonymousExecutionUnit */
    /** @type Object<string,AnonymousExecutionUnit> */
    static #units = {
        'A': ExecutionUnit_A,
        'C': ExecutionUnit_C,
        'DEC': ExecutionUnit_DEC,
        'DECT': ExecutionUnit_DECT,
        'INC': ExecutionUnit_INC,
        'INCT': ExecutionUnit_INCT,
        'JEQ': ExecutionUnit_JEQ,
        'JGT': ExecutionUnit_JGT,
        'JH': ExecutionUnit_JH,
        'JHE': ExecutionUnit_JHE,
        'JL': ExecutionUnit_JL,
        'JLE': ExecutionUnit_JLE,
        'JLT': ExecutionUnit_JLT,
        'JMP': ExecutionUnit_JMP,
        'JNC': ExecutionUnit_JNC,
        'JNE': ExecutionUnit_JNE,
        'JNO': ExecutionUnit_JNO,
        'JOC': ExecutionUnit_JOC,
        'LI': ExecutionUnit_LI,
        'MOV': ExecutionUnit_MOV,
        'S': ExecutionUnit_S,
    };

    /**
     * @param {string|false} op_name
     * @returns AnonymousExecutionUnit
     **/
    static getClassForOpName(op_name) {
        const processed_name = op_name.toString().toUpperCase();
        if ( !(processed_name in this.#units)) {
            return false;
        }
        return this.#units[processed_name];
    }


}
