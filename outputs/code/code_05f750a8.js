/**
 * Adds two numbers and returns the result.
 * @param {number} a - First addend.
 * @param {number} b - Second addend.
 * @returns {number} The sum of a and b.
 */
function add(a, b) {
  // Ensure the arguments are treated as numbers; if they aren't,
  // JavaScript will attempt to coerce them (e.g., "5" => 5).
  return Number(a) + Number(b);
}