// @ts-check

// A bunch of ChatGPT-generated helper functions.
// The reflection nonsense is to let this file be used by both modules and the browser.

/**
 * @param {number} value        An unsigned 32-bit integer.
 * @param {number} bit_start    Index from the Least Significant Bit to start selection of bits, no greater than 31.
 * @param {number} bit_count    Count of bits to return after bit_start, no greater than 31.
 * @returns {number}            Extracted unsigned integer.
 **/
function extract_binary(value, bit_start, bit_count) {
    let return_value = 0;
    const mask = (1 << bit_count) - 1; // Create a mask with bit_count bits set to 1
    const shifted_value = value >>> bit_start; // Shift value to the right by bit_start bits
    return_value = shifted_value & mask; // Extract bit_count bits from the shifted value
    return return_value;
}
Reflect.set(window, 'extract_binary', extract_binary);
window.extract_binary = extract_binary;

/**
 * @param {number} value        An unsigned 32-bit integer.
 * @param {number} bit_start    Index from the Least Significant Bit to start insertion of bits, no greater than 31.
 * @param {number} bit_count    Count of bits to replace after bit_start, no greater than 31.
 * @param {number} new_value    An unsigned 32-bit integer to insert.
 * @returns {number}            Resulting unsigned integer after insertion.
 **/
function insert_binary(value, bit_start, bit_count, new_value) {
    const mask = ((1 << bit_count) - 1) << bit_start; // Create a mask with bit_count bits set to 1, starting at bit_start
    const shifted_new_value = new_value << bit_start; // Shift new_value to the left by bit_start bits
    const cleared_bits = value & ~mask; // Clear the bit range specified by mask in value
    const inserted_bits = shifted_new_value & mask; // Extract the bit range from shifted_new_value that fits in mask
    return cleared_bits | inserted_bits; // Combine the cleared and inserted bits
}
Reflect.set(window, 'insert_binary', insert_binary);
window.insert_binary = insert_binary;

/**
 * @param {number} value    An unsigned 32-bit integer.
 * @returns {number}        Resulting unsigned integer after swapping the two 16-bit words.
 **/
function swap_words(value) {
    const mask = 0xFFFF; // 16-bit mask with all bits set to 1
    const word1 = (value >>> 16) & mask; // Extract the first 16-bit word of value
    const word2 = value & mask; // Extract the second 16-bit word of value
    return (word2 << 16) | word1; // Swap the two words and combine them into a 32-bit integer
}
Reflect.set(window, 'swap_words', swap_words);
window.swap_words = swap_words;

/**
 * @param {number} value    An unsigned 16-bit integer.
 * @returns {number}        Resulting unsigned integer after swapping the two 8-bit bytes.
 **/
function swap_bytes(value) {
    const mask = 0xFF; // 8-bit mask with all bits set to 1
    const byte1 = (value >>> 8) & mask; // Extract the first 8-bit byte of value
    const byte2 = value & mask; // Extract the second 8-bit byte of value
    return (byte2 << 8) | byte1; // Swap the two bytes and combine them into a 16-bit integer
}
Reflect.set(window, 'swap_bytes', swap_bytes);
window.swap_bytes = swap_bytes;

/**
 * @param {bigint} bigint_value An unsigned 32-bit integer.
 * @param {number} bit_start    Index from the Least Significant Bit to start selection of bits, no greater than 31.
 * @param {number} bit_count    Count of bits to return after bit_start, no greater than 31.
 * @returns {bigint}            Extracted unsigned integer.
 **/
function extract_binary_from_bigint(bigint_value, bit_start, bit_count) {
    let return_value = 0n; // Initialize the return value to a BigInt literal

    // Convert the bit_start and bit_count parameters to BigInts
    const start = BigInt(bit_start);
    const count = BigInt(bit_count);

    // Calculate the mask to extract the desired bits
    const mask = (1n << count) - 1n;

    // Shift and mask the value to extract the desired bits
    return_value = (bigint_value >> start) & mask;

    return return_value;
}
Reflect.set(window, 'extract_binary_from_bigint', extract_binary_from_bigint);
window.extract_binary_from_bigint = extract_binary_from_bigint;

/**
 * We're working with a virtual machine that works in 16-bit words that contain
 * two 8-bit bytes.  The architecture is Big Endian, where the most significant
 * byte of the word is the first eight bits, and the least significant byte
 * of the word is the last eight bits.
 *
 * To represent numbers larger than 16 bits, we must use multiple words.
 *
 * @param {number[]} words
 * This function receives an array of 16-bit words as unsigned integers.  The
 * word with the most significant byte is the first word in the array.  Likewise,
 * the word with the least significant byte is the final word in the array.
 *
 * @returns {bigint}
 **/
function word_list_to_bignum(words) {
    let result = BigInt(0);

    // Iterate over each word in the array
    for (let i = 0; i < words.length; i++) {
        // Shift the current word to its proper position and add it to the result
        result = (result << BigInt(16)) + BigInt(words[i]);
    }

    return result;
}
Reflect.set(window, 'word_list_to_bignum', word_list_to_bignum);
window.word_list_to_bignum = word_list_to_bignum;
