// HTTP constants
export const HTTP_CONSTANTS = {
  // Status codes
  STATUS: {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    INTERNAL_SERVER_ERROR: 500,
  },
  
  // Common messages
  MESSAGES: {
    // Authentication
    NOT_AUTHENTICATED: 'Not authenticated',
    INVALID_CREDENTIALS: 'Invalid email or password',
    EMAIL_ALREADY_EXISTS: 'Email is already taken',
    USER_NOT_FOUND: 'User not found',
    
    // Chat
    CHAT_NOT_FOUND: 'Chat not found',
    ACCESS_DENIED: 'Access denied to this chat',
    NOT_CHAT_MEMBER: 'You are not a member of this chat',
    CANNOT_ADD_TO_DM: 'Cannot add members to direct chats',
    CANNOT_REMOVE_FROM_DM: 'Cannot remove members from direct chats',
    ONLY_CREATOR_DELETE: 'Only the chat creator can delete this chat',
    GROUP_NAME_REQUIRED: 'Group chat name is required',
    
    // Messages
    MESSAGE_NOT_FOUND: 'Message not found',
    MESSAGE_CREATED: 'Message created successfully',
    
    // Server
    SERVER_ERROR: 'Server error',
    VALIDATION_ERROR: 'Validation error',
    INVALID_PARAMETERS: 'Invalid parameters',
  },
} as const;

export default HTTP_CONSTANTS; 