/**
 * Validates required environment variables and throws an error if any are missing
 * @param {string[]} requiredVars - Array of required environment variable names
 * @throws {Error} If any required variables are missing
 */
export function validateEnv(requiredVars) {
  // Debug: Log all available environment variables
  console.log('All available env vars:', import.meta.env);
  
  const missing = requiredVars.filter(varName => !import.meta.env[varName]);
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please check your .env file in the root directory.'
    );
  }
}

/**
 * Gets an environment variable or throws an error if it's missing
 * @param {string} varName - Name of the environment variable
 * @returns {string} The environment variable value
 * @throws {Error} If the variable is missing
 */
export function getEnvVar(varName) {
  // Debug: Log the specific variable we're trying to access
  console.log(`Attempting to access env var: ${varName}`);
  console.log(`Available env vars:`, import.meta.env);
  
  const value = import.meta.env[varName];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${varName}\n` +
      'Please check your .env file in the root directory.'
    );
  }
  return value;
} 