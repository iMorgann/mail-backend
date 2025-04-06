/**
 * Apply template variables to content
 * @param {string} content - Content with variable placeholders
 * @param {Object} vars - Template variables
 * @returns {string} - Content with variables replaced
 */
const applyTemplateVars = (content, vars = {}) => {
  if (!content) return '';
  if (!vars || typeof vars !== 'object') return content;
  
  let result = content;
  
  // Replace {{varName}} placeholders
  Object.keys(vars).forEach(key => {
    const value = vars[key] !== undefined ? vars[key] : '';
    const regex = new RegExp(`{{\\s*${escapeRegExp(key)}\\s*}}`, 'g');
    result = result.replace(regex, value);
  });
  
  // Add default values for common placeholders if not provided
  const defaultVars = getDefaultTemplateVars();
  Object.keys(defaultVars).forEach(key => {
    if (vars[key] === undefined) {
      const regex = new RegExp(`{{\\s*${escapeRegExp(key)}\\s*}}`, 'g');
      result = result.replace(regex, defaultVars[key]);
    }
  });
  
  return result;
};

/**
 * Get default template variables
 * @returns {Object} - Default template variables
 */
const getDefaultTemplateVars = () => {
  const now = new Date();
  
  return {
    date: now.toLocaleDateString(),
    time: now.toLocaleTimeString(),
    year: now.getFullYear().toString(),
    month: now.toLocaleString('default', { month: 'long' }),
    day: now.getDate().toString(),
    company: 'Our Company',
    website: 'example.com',
    phone: '(555) 123-4567',
    address: '123 Main St, Anytown, US 12345'
  };
};

/**
 * Extract placeholders from content
 * @param {string} content - Content to extract placeholders from
 * @returns {Array} - List of placeholders
 */
const extractPlaceholders = (content) => {
  if (!content) return [];
  
  const regex = /{{(.*?)}}/g;
  const placeholders = [];
  let match;
  
  while ((match = regex.exec(content)) !== null) {
    placeholders.push(match[1].trim());
  }
  
  return [...new Set(placeholders)]; // Return unique placeholders
};

/**
 * Escape string for use in regular expression
 * @param {string} string - String to escape
 * @returns {string} - Escaped string
 */
const escapeRegExp = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

module.exports = {
  applyTemplateVars,
  extractPlaceholders,
  getDefaultTemplateVars
};