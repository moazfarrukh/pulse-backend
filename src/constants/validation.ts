// Validation constants
export const VALIDATION_CONSTANTS = {
  // User validation
  USERNAME_MIN_LENGTH: 3,
  DISPLAY_NAME_MIN_LENGTH: 1,
  PASSWORD_MIN_LENGTH: 6,
  
  // Chat validation
  CHAT_NAME_MIN_LENGTH: 1,
  MIN_MEMBERS_FOR_GROUP: 2,
  MAX_MEMBERS_FOR_GROUP: 100,
  
  // Message validation
  MESSAGE_CONTENT_MIN_LENGTH: 1,
  MESSAGE_CONTENT_MAX_LENGTH: 1000,
  
  // Email validation
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  
  // ID validation
  ID_REGEX: /^\d+$/,
} as const;

export default VALIDATION_CONSTANTS; 