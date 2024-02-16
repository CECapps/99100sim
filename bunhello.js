// @ts-check

import { Asm } from "./classes/Asm";
import { Simulation } from "./classes/Simulation";


const sim = new Simulation;

const asmtext = await Bun.file('asm/default.asm').text();

sim.reset();
for (let i = 0; i < 32768; i++) {
    sim.state.setWord(i * 2, 0x1000);
}
sim.resetIVs();

const asm = new Asm();
//console.debug(asmtext);
asm.setLines(asmtext)
asm.process();

const bytes = asm.toBytes();
for (const i in bytes) {
    // @ts-ignore 2345 -- yes, i is numeric here, shut up
    sim.state.setByte(i, bytes[i]);
}

console.info(asm.toAsm().join("\n"));

