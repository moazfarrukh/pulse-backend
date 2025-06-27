// middleware/uploadMessageMiddleware.ts
import multer, { MulterError } from 'multer';
import { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { UPLOAD_CONSTANTS, HTTP_CONSTANTS } from '../constants';

// Extend Express Request type to include files
interface MulterRequest extends Request {
    files?: Express.Multer.File[];
}

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../', UPLOAD_CONSTANTS.MESSAGES_DIR);
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        // Generate unique filename with timestamp and random suffix
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
        const sanitizedOriginalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        cb(null, `${UPLOAD_CONSTANTS.ATTACHMENT_PREFIX}-${uniqueSuffix}-${sanitizedOriginalName}`);
    }
});

// File filter to allow multiple file types
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedMimeTypes = [
        // Images
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/svg+xml',
        // Documents
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain',
        'text/csv',
        // Archives
        'application/zip',
        'application/x-rar-compressed',
        'application/x-7z-compressed',
        // Audio
        'audio/mpeg',
        'audio/wav',
        'audio/ogg',
        'audio/mp4',
        // Video
        'video/mp4',
        'video/mpeg',
        'video/quicktime',
        'video/webm',
        // Code files
        'text/javascript',
        'application/json',
        'text/html',
        'text/css',
        'application/xml',
        'text/xml'
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(`File type ${file.mimetype} is not allowed. Please upload supported file types.`));
    }
};

const upload = multer({ 
    storage,
    limits: {
        fileSize: UPLOAD_CONSTANTS.MAX_FILE_SIZE,
        files: UPLOAD_CONSTANTS.MAX_ATTACHMENTS_PER_MESSAGE,
        fieldSize: 1024 * 1024, // 1MB field size limit
    },
    fileFilter
});

// Use array to handle multiple files with the same field name
const uploadFiles = upload.array('attachments', UPLOAD_CONSTANTS.MAX_ATTACHMENTS_PER_MESSAGE);

const uploadMessageMiddleware = (
    req: MulterRequest, 
    res: Response, 
    next: NextFunction
): void => {
    uploadFiles(req, res, (err) => {
        if (err) {            
            // Handle different types of multer errors
            if (err instanceof MulterError) {
                switch (err.code) {
                    case 'LIMIT_FILE_SIZE':
                        res.status(HTTP_CONSTANTS.STATUS.BAD_REQUEST).json({ 
                            error: `File too large. Maximum size is ${UPLOAD_CONSTANTS.MAX_FILE_SIZE / (1024 * 1024)}MB per file.`,
                            code: 'FILE_TOO_LARGE'
                        });
                        break;
                    case 'LIMIT_FILE_COUNT':
                        res.status(HTTP_CONSTANTS.STATUS.BAD_REQUEST).json({ 
                            error: `Too many files. Maximum ${UPLOAD_CONSTANTS.MAX_ATTACHMENTS_PER_MESSAGE} files per message.`,
                            code: 'TOO_MANY_FILES'
                        });
                        break;
                    case 'LIMIT_UNEXPECTED_FILE':
                        res.status(HTTP_CONSTANTS.STATUS.BAD_REQUEST).json({ 
                            error: 'Unexpected field name. Use "attachments" field.',
                            code: 'UNEXPECTED_FIELD'
                        });
                        break;
                    case 'LIMIT_FIELD_VALUE':
                        res.status(HTTP_CONSTANTS.STATUS.BAD_REQUEST).json({ 
                            error: 'Field value too large.',
                            code: 'FIELD_TOO_LARGE'
                        });
                        break;
                    default:
                        res.status(HTTP_CONSTANTS.STATUS.BAD_REQUEST).json({ 
                            error: `Upload error: ${err.message}`,
                            code: 'UPLOAD_ERROR'
                        });
                        break;
                }
            } else {
                // Handle custom errors (like file type validation)
                res.status(HTTP_CONSTANTS.STATUS.BAD_REQUEST).json({ 
                    error: err.message || 'Error uploading files',
                    code: 'VALIDATION_ERROR'
                });
            }
            return;
        }

        // Process uploaded files
        if (req.files && req.files.length > 0) {
            // Add file metadata to request for use in controller
            req.body.attachmentMetadata = req.files.map(file => ({
                originalName: file.originalname,
                filename: file.filename,
                mimetype: file.mimetype,
                size: file.size,
                path: file.path
            }));
        } 
        next();
    });
};

export default uploadMessageMiddleware;