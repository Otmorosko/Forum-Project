const sanitizeHtml = require('sanitize-html');

/**
 * Sanitize user input to prevent XSS attacks.
 * @param {string} input - The user input string (HTML).
 * @returns {string} - Sanitized HTML string.
 */
function sanitizeInput(input) {
  return sanitizeHtml(input, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img']),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      img: ['src', 'alt', 'style'],
    },
    allowedSchemes: ['http', 'https', 'data'],
  });
}

module.exports = {
  sanitizeInput,
};
