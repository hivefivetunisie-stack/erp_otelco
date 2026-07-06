// Mocking node-domexception to use the platform's native DOMException
module.exports = globalThis.DOMException || DOMException;
