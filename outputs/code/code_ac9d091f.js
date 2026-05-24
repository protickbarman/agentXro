/**
 * Adds two numbers and returns the result.
 * @param {number} a - First addend.
 * @param {number} b - Second addend.
 * @returns {number} The sum of a and b.
 * @throws {TypeError} If either argument is not a number.
 */
function addNumbers(a, b) {
  if (typeof a !== 'number' || typeof b !== 'number') {
    throw new TypeError('Both arguments must be of type number');
  }
  return a + b;
}

// Example usage:
// console.log(addNumbers(3, 5)); // 8
// console.log(addNumbers(2.5, 4.1)); // 6.6