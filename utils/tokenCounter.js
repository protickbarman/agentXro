/**
 * Simple token counter for LLM models
 * Estimates tokens based on character/word count
 * For precise counting, use official tokenizer libraries
 */

/**
 * Count tokens in text (rough estimate)
 * Typical: 1 token ≈ 4 characters or 0.75 words
 * @param {string} text - Text to count tokens for
 * @returns {number} Estimated token count
 */
function countTokens(text) {
  if (!text) return 0;
  // Rough estimation: 1 token ≈ 4 characters
  return Math.ceil(text.length / 4);
}

/**
 * Count tokens in object (JSON)
 * @param {object} obj - Object to count tokens for
 * @returns {number} Estimated token count
 */
function countTokensObject(obj) {
  const json = JSON.stringify(obj);
  return countTokens(json);
}

/**
 * Estimate total tokens for API call
 * @param {string} prompt - Prompt text
 * @param {string} response - Response text
 * @returns {object} Token counts
 */
function estimateTokens(prompt, response) {
  const promptTokens = countTokens(prompt);
  const responseTokens = countTokens(response);
  const totalTokens = promptTokens + responseTokens;

  return {
    promptTokens,
    responseTokens,
    totalTokens,
  };
}

/**
 * Format tokens for logging
 * @param {number} tokens - Token count
 * @returns {string} Formatted token count
 */
function formatTokens(tokens) {
  if (tokens >= 1000000) {
    return `${(tokens / 1000000).toFixed(2)}M`;
  }
  if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(2)}K`;
  }
  return `${tokens}`;
}

module.exports = {
  countTokens,
  countTokensObject,
  estimateTokens,
  formatTokens,
};
