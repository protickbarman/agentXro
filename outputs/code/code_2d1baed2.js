function reverseString(str) {
  // Split the string into an array of characters, reverse it, then join back
  return str.split('').reverse().join('');
}

// Alternative approach without built-in methods (more efficient for large strings)
function reverseStringManual(str) {
  let reversed = '';
  for (let i = str.length - 1; i >= 0; i--) {
    reversed += str[i];
  }
  return reversed;
}