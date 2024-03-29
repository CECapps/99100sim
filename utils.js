// @ts-check

// A bunch of (mostly) ChatGPT-generated helper functions.
// The reflection nonsense is to let this file be used by both modules and the browser.

/**
 * @param {number} value            An unsigned integer.
 * @param {number} value_bit_count  The size of the given value, in bits (16 or 32)
 * @param {number} bit_start        Index from the Least Significant Bit to start selection of bits, no greater than 31.
 * @param {number} bit_count        Count of bits to return after bit_start, no greater than 31.
 * @returns {number}                Extracted unsigned integer.
 **/
function extract_binary(value, value_bit_count, bit_start, bit_count) {
    if (bit_start + bit_count > value_bit_count) {
        console.error('extract_binary: bit_start + bit_count > value_bit_count', bit_start, bit_count, value_bit_count);
        throw new Error('extract_binary: desired start and count range exceeds possible value size');
    }
    // Clamp the value to the desired bit size.
    value &= (2 ** value_bit_count) - 1;

    // Shift the value over until our target range occupies the leftmost (LSB) bits.
    value >>= value_bit_count - (bit_count + bit_start);

    // Mask out everything to the left of the start of the range.
    value &= (1 << bit_count) - 1;

    // What remains must be the value we want.
    return value;
}
Reflect.set(window, 'extract_binary', extract_binary);
window.extract_binary = extract_binary;

/**
 * @param {number} value            An unsigned integer.
 * @param {number} value_bit_count  The size of the given value, in bits (16 or 32)
 * @param {number} bit_start        Index from the Least Significant Bit to start insertion of bits, no greater than 31.
 * @param {number} bit_count        Count of bits to replace after bit_start, no greater than 31.
 * @param {number} insert_value     An unsigned integer to insert.
 * @returns {number}                Resulting unsigned integer after insertion.
 **/
function insert_binary(value, value_bit_count, bit_start, bit_count, insert_value) {
    if (bit_start + bit_count > value_bit_count) {
        console.error('insert_binary: bit_start + bit_count > value_bit_count', bit_start, bit_count, value_bit_count);
        throw new Error('insert_binary: desired start and count range exceeds possible value size');
    }
    // Clamp the value to the desired bit size.
    value &= (2 ** value_bit_count) - 1;

    // Clamp the insert value as well.
    let nv_mask = (2 ** bit_count) - 1;
    insert_value &= nv_mask;

    // Shift the mask and insert value over to where they'd live in the real number
    const left_shift_count = value_bit_count - (bit_start + bit_count);
    insert_value <<= left_shift_count;
    nv_mask <<= left_shift_count;

    // Clear out the bits to be replaced, then substitute in the new ones
    value &= ~nv_mask;
    value |= insert_value;

    return value;
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
 * Given a 16-bit word in big-endian format, return the high / first / MSB 8-bit byte.
 * @param {number} value    An unsigned 16-bit integer in big-endian format.
 * @returns {number}        The high byte (MSB) of the given integer.
 **/
function word_high_byte(value) {
    return (value >> 8) & 0xff;
}
Reflect.set(window, 'word_high_byte', word_high_byte);
window.word_high_byte = word_high_byte;


/**
 * Given a 16-bit word in big-endian format, return the second / low / LSB 8-bit byte.
 * @param {number} value    An unsigned 16-bit integer in big-endian format.
 * @returns {number}        The low byte (LSB) of the given integer.
 **/
function word_low_byte(value) {
    return value & 0xff;
}
Reflect.set(window, 'word_low_byte', word_low_byte);
window.word_low_byte = word_low_byte;


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
 * This function receives an array of 16-bit words as unsigned integers.  The
 * word with the most significant byte is the first word in the array.  Likewise,
 * the word with the least significant byte is the final word in the array.
 *
 * @param {number[]} words
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


/**
 * @param {number|bigint} value
 * @returns {number[]}
 **/
function number_to_word_list(value) {
    const word_size = 16;
    const max_word_value = (1 << word_size) - 1;

    if (typeof value === 'number') {
        if (value < 0 || value > Number.MAX_SAFE_INTEGER) {
            throw new Error('Value out of range for conversion to words');
        }
        value = BigInt(value);
    }

    const words = [];

    while (value > 0) {
        const word_value = Number(value & BigInt(max_word_value));
        words.unshift(word_value);
        value >>= BigInt(word_size);
    }

    return words;
}
Reflect.set(window, 'number_to_word_list', number_to_word_list);
window.number_to_word_list = number_to_word_list;


/**
 * @param {number} value
 * @param {number} bit_count
 * @returns {number}
 **/
function unsigned_to_signed(value, bit_count = 16) {
    // Determine the maximum positive value that can be represented with bit_count bits.
    const max_positive_value = (2 ** bit_count) - 1;

    // If the value is greater than the maximum positive value, it must be negative.
    if (value > max_positive_value) {
        // Determine the magnitude of the negative value.
        const magnitude = value - max_positive_value - 1;

        // Return the negative value.
        return -magnitude;
    } else {
        // The value is positive.
        return value;
    }
}
Reflect.set(window, 'unsigned_to_signed', unsigned_to_signed);
window.unsigned_to_signed = unsigned_to_signed;


/**
 * @param {number} value
 * @param {number} bit_count
 * @returns {number}
 **/
function signed_to_unsigned(value, bit_count = 16) {
    // Determine the maximum positive value that can be represented with bit_count bits.
    const max_positive_value = (2 ** bit_count) - 1;

    // If the value is negative, convert it to its positive equivalent.
    if (value < 0) {
        value = max_positive_value + value + 1;
    }

    // Return the unsigned value.
    return value;
}
Reflect.set(window, 'signed_to_unsigned', signed_to_unsigned);
window.signed_to_unsigned = signed_to_unsigned;


/**
 * @param {number} num
 * @param {number} padding
 * @return {string}
 **/
function number_to_hex(num, padding = 4) {
    return num.toString(16).toUpperCase().padStart(padding, '0');
}
Reflect.set(window, 'number_to_hex', number_to_hex);
window.number_to_hex = number_to_hex;


/**
 * Return the numeric values for each 8-bit byte in the given Javascript UTF-8 string.
 *
 * For example, given 'foo🎆bar', it will internally convert it into the URI-safe
 * 'foo%F0%9F%8E%86bar', which then gets converted into the final byte array
 * [ 102, 111, 111, 240, 159, 142, 134, 98, 97, 114 ]
 *
 * @param {string} str
 * @returns {number[]}
 **/
function string_to_ords(str) {
    const encoded = encodeURIComponent(str);
    const bytes = [];
    for (let i = 0; i < encoded.length; i++) {
        const char = encoded.slice(i, i + 1);
        let num = 0;
        if (char == '%') {
            const hex = encoded.slice(i + 1, i + 3);
            num = parseInt(hex, 16);
            i += 2;
        } else {
            // codePointAt returns a 16-bit number, but we only care about the first 8.
            num = char.codePointAt(0) & 0xff;
        }
        bytes.push(num);
    }
    return bytes;
}
