// Authentication constants
export const AUTH_CONSTANTS = {
  // JWT settings
  JWT_EXPIRES_IN: '1d',
  JWT_REFRESH_EXPIRES_IN: '7d',
  
  // Cookie settings
  COOKIE_HTTP_ONLY: true,
  COOKIE_SECURE_PRODUCTION: true,
  COOKIE_SAME_SITE: 'strict' as const,
  
  // Password settings
  PASSWORD_MIN_LENGTH: 6,
  SALT_ROUNDS: 10,
} as const;

export default AUTH_CONSTANTS; 