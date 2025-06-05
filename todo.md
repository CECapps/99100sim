Here we have the inner guts of my TMS99100 simulator.  We have to know everything about the operations we need to perform.  I collected all of this data in a spreadsheet and then automated the creation of the opcode definitions.  Only the first 200 or so lines of OpInfo.js are important, the rest are just OpDef impls.

I have to use and reuse this same data all over the codebase.  I am not interested in high performance optimizations here, but in a codebase with clearly defined areas of control.  You know, the Single Responsibility Principal and all that.

This code is a *mess* simply because of how it ends up being the core dependency of other things.  Suggest options to make the code around opcodes both better organized and more clear.  This is high-level architectural work, so no code yet, just docs.  Go!

-----

Okay, this is a common challenge when dealing with systems that have a large, static dataset at their core, like CPU instruction sets. The goal is to make the data accessible and usable without creating tight coupling across your entire codebase.

Here are some architectural suggestions to improve organization and clarity around your opcode handling:

1.  **Decouple Opcode Definitions from the Registry (OpInfo.js)**:
    *   **Current State:** OpInfo.js both defines many opcodes inline (as anonymous classes) and acts as a registry/lookup service.
    *   **Suggestion:**
        *   **Individual OpDef Files:** Ensure *every* `OpDef` (including those currently anonymous within `OpInfo.#ops`) resides in its own file (e.g., `OpDef_AB.js`, `OpDef_ABS.js`) within a dedicated directory like `js/classes/instructions/definitions/`. Each file would export its specific `OpDef` class.
        *   **Registry Service:** OpInfo.js (perhaps renamed to `InstructionSetRegistry.js` or `OpcodeMetadataService.js`) would then be solely responsible for *loading and providing access to* these definitions. It would dynamically import or be explicitly provided with all `OpDef` classes during initialization to populate its internal lookup structures (like `#ops` and `#function_map`).
    *   **Benefit:** This makes OpInfo.js cleaner and focused on its registry role. Adding or modifying an instruction definition only touches its own file and potentially the registry's initialization if not fully dynamic.

2.  **Centralize Opcode Encoding/Decoding Logic**:
    *   **Current State:** Instruction.js handles the conversion between a numeric opcode and its constituent parameters (`getParam`, `setParam`) using bit manipulation helpers and knowledge from `OpDef` and `FormatInfo`.
    *   **Suggestion:**
        *   **InstructionCodec/Serializer Service:** Introduce a new class or module (e.g., `InstructionCodec.js` or `OpcodeSerializer.js`). This service would be responsible for:
            *   **Encoding:** Taking an `OpDef` (or its `FormatInfo`) and a set of parameter values, and producing the numeric opcode (and second word, if applicable).
            *   **Decoding:** Taking a numeric opcode (and second word) and an `OpDef`, and producing an `Instruction` instance with its parameters populated.
        *   The `insert_binary` and `extract_binary` functions would naturally live within or be primarily used by this Codec service.
        *   Instruction.js would then use this service. When created from a numeric opcode, it would pass the opcode and its `OpDef` to the Codec for decoding. When parameters are set, it might trigger a re-encoding via the Codec if the `working_opcode` needs to be updated directly from parameters.
    *   **Benefit:** Instruction.js becomes more of a data container for a specific, decoded instruction instance, offloading the complex bit-level serialization/deserialization to a specialized component. This improves SRP for Instruction.js.

3.  **Clarify Roles of `OpDef` vs. `Instruction`**:
    *   **Current State:** Generally good, but can be reinforced.
    *   **Suggestion:**
        *   `OpDef`: Strictly static, immutable data describing an *instruction type*. It knows its name, potential opcode range, parameter structure (via `FormatInfo`), etc. It should not hold any instance-specific data.
        *   `Instruction`: Represents a *specific instance* of an operation, including its actual numeric opcode, resolved parameter values, and any associated runtime data like immediate words. It holds an `OpDef` to understand its own structure.
    *   **Benefit:** Reinforces the distinction between a blueprint (`OpDef`) and an object created from that blueprint (`Instruction`).

4.  **Maintain Separation of Concerns for Execution Units**:
    *   **Current State:** ExecutionUnit.js and ExecutionUnitMap.js seem to handle the behavioral aspects well.
    *   **Suggestion:** Continue this pattern. `ExecutionUnit`s should:
        *   Receive a fully formed and decoded `Instruction` object.
        *   Focus solely on the *runtime semantics* of that instruction: interacting with `SimulationState` (registers, memory, status flags).
        *   ExecutionUnitMap.js remains the factory for selecting the correct `ExecutionUnit` based on the instruction.
    *   **Benefit:** Keeps execution logic separate from instruction definition, parsing, and encoding.

**Summary of Key Components and Responsibilities after Refactoring:**

*   **`OpDef_XYZ.js` files (in `js/classes/instructions/definitions/`)**:
    *   Responsibility: Define the static properties of a single instruction type (name, opcode, format, args, etc.).
    *   Immutable.
*   **`InstructionSetRegistry.js` (formerly OpInfo.js)**:
    *   Responsibility: Load all `OpDef`s. Provide lookup methods to get an `OpDef` by name or numeric opcode. Manage the mapping from numeric opcode ranges to instruction names.
*   **Format.js (`FormatInfo`)**:
    *   Responsibility: Describe the binary layout (parameter positions, bit widths) for different instruction formats.
    *   Immutable.
*   **`InstructionCodec.js`**:
    *   Responsibility: Encode a set of parameters (with an `OpDef`/`FormatInfo`) into a numeric opcode. Decode a numeric opcode (with an `OpDef`) into its constituent parameters. Handles all bit-level manipulation.
*   **Instruction.js**:
    *   Responsibility: Represent a specific, instantiated instruction. Holds its `OpDef`, its actual numeric opcode(s), and decoded parameter values. Manages associated data like immediate words. Uses `InstructionCodec` for populating itself from raw opcodes or updating its raw opcode from parameters.
*   **`ExecutionUnit_XYZ.js` / ExecutionUnit.js**:
    *   Responsibility: Implement the runtime behavior of an instruction. Operates on an `Instruction` instance and modifies `SimulationState`.
*   **ExecutionUnitMap.js**:
    *   Responsibility: Factory for `ExecutionUnit` instances based on an instruction name.

This layered approach should lead to a more modular, maintainable, and understandable system where each component has a clearly defined role.


-----

Ah, I forgot to give you a *working* instruction file to see what they're like.  They include both the op definition and the part of the execution unit that actually runs the instruction.

The trouble I've been having is splitting that line between "this object knows all about itself and can work" and "wait hold on this is a data object, it should not do anything."  Part of this is naming.

The thing that defines the format of the binary instruction is one thing.  The thing that carries an instance of that instruction (could be multiple words) is another.

This is how I ended up with "op" and "instruction" and "execution unit" as terms.  Given this architecture, suggest additional or alternative terms for the various types and state of instruction data.

-----

Okay, let's break down the lifecycle and nature of instruction data and suggest some terms. The goal is to have names that clearly reflect the role and state of the data/object.

You currently have:

*   **`OpDef` (e.g., `OpDef_A`):** Defines the static properties of an instruction *type* (mnemonic, base opcode, parameter structure, etc.). This is the blueprint.
*   **`Instruction`:** Represents a *specific instance* of an instruction, holding an `OpDef` and the actual numeric opcode (potentially with parameters embedded), and any associated immediate words.
*   **`ExecutionUnit` (e.g., `ExecutionUnit_A`):** Contains the logic to *perform* the action of an instruction.
*   **`FormatInfo`:** Describes the binary layout of parameters for different instruction formats.

Here are some additional or alternative terms, focusing on clarity for "types and state of instruction data":

1.  **For the Static Blueprint (currently `OpDef`):**
    *   **`InstructionDefinition`**: This is very explicit. `OpDef_A` becomes `InstructionDefinition_A`.
    *   **`InstructionSpec` (Specification)**: Highlights that it's the formal description.
    *   **`MnemonicProperties`**: Focuses on the assembly-level characteristics.
    *   *Recommendation:* `InstructionDefinition` is clear and descriptive.

2.  **For the Binary Layout Rules (currently `FormatInfo`):**
    *   **`InstructionFormat`** or **`FormatDescriptor`**: Simple and clear.
    *   **`OpcodeLayout`**: Focuses on how the bits are arranged.
    *   *Recommendation:* `InstructionFormat` or `OpcodeLayout` are good. `FormatInfo` is also acceptable.

3.  **For the Raw Binary Data (as read from memory, before full parsing):**
    *   **`RawOpcodeWord(s)`**: Describes the unprocessed 16-bit value(s).
    *   **`MachineInstructionImage`**: Represents the instruction as it exists in memory.
    *   *Recommendation:* This is more of a concept or a primitive type (number/array of numbers) than a complex class in your current structure, but useful for discussion.

4.  **For the Instantiated, Parsed Instruction (currently `Instruction`):**
    *   This object holds an `InstructionDefinition` and the *actual values* for a specific instance, including resolved parameters. It's the data packet ready for execution.
    *   **`DecodedInstruction`**: Emphasizes that the raw binary has been processed into a structured form.
    *   **`InstructionInstance`**: Clearly distinguishes it from the `InstructionDefinition`.
    *   **`ResolvedInstruction`**: Indicates that all its parts (opcode, parameters, immediate words) are known.
    *   **`InstructionDataContext`**: Highlights it's a container for all data related to one instruction instance.
    *   *Recommendation:* `DecodedInstruction` or `InstructionInstance` strongly clarifies its role as a data carrier for a specific, processed instruction.

5.  **For the Active Logic (currently `ExecutionUnit`):**
    *   **`InstructionExecutor`**: Very direct.
    *   **`OperationHandler`**: A common pattern name.
    *   **`InstructionSemantics`**: If you want to be more abstract, referring to the meaning/action.
    *   *Recommendation:* `ExecutionUnit` is already quite good and standard in emulators. `InstructionExecutor` is a strong alternative.

**Applying a consistent set of refined terms:**

*   Blueprint: **`InstructionDefinition`** (was `OpDef`)
*   Binary Layout: **`OpcodeLayout`** (was `FormatInfo`)
*   Raw data from memory: `RawOpcodeWord(s)` (conceptual)
*   Parsed instance: **`DecodedInstruction`** (was `Instruction`)
*   Execution logic: **`ExecutionUnit`** (or `InstructionExecutor`)

This set of terms aims to clearly separate:
*   The *static definition* of what an instruction type is.
*   The *rules for its binary encoding*.
*   The *parsed data representation* of a specific instruction instance.
*   The *behavioral logic* that acts upon that instance.

This should help in reinforcing the Single Responsibility Principle for each component. The `DecodedInstruction` is primarily a data holder, its methods focused on accessing its constituent parts based on its `InstructionDefinition` and `OpcodeLayout`. The `ExecutionUnit` then takes this `DecodedInstruction` and performs the state changes.
