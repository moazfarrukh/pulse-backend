// Upload constants
export const UPLOAD_CONSTANTS = {
  // File upload limits
  MAX_ATTACHMENTS_PER_MESSAGE: 5,
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  
  // Upload directories
  UPLOADS_BASE_DIR: 'uploads',
  AVATARS_DIR: 'uploads/avatars',
  MESSAGES_DIR: 'uploads/messages',
  
  // Server URLs
  DEFAULT_SERVER_HOST: 'http://localhost:5000',
  SERVER_HOST_ENV: 'SERVER_HOST',
  
  // File naming
  AVATAR_PREFIX: 'image',
  ATTACHMENT_PREFIX: 'attachment',
  FILE_EXTENSIONS: {
    IMAGES: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'],
    DOCUMENTS: ['.pdf', '.doc', '.docx', '.txt'],
    VIDEOS: ['.mp4', '.avi', '.mov', '.wmv'],
  },
} as const;

export default UPLOAD_CONSTANTS; 