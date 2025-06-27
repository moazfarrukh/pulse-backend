// middleware/uploadAvatarMiddleware.ts
import multer, { MulterError } from 'multer';
import { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { UPLOAD_CONSTANTS, HTTP_CONSTANTS } from '../constants';

// Extend Express Request type to include file
interface MulterRequest extends Request {
    file?: Express.Multer.File;
}

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../', UPLOAD_CONSTANTS.AVATARS_DIR);
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        // Generate unique filename
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
        cb(null, `${UPLOAD_CONSTANTS.AVATAR_PREFIX}-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

const upload = multer({ 
    storage,
    limits: {
        fileSize: UPLOAD_CONSTANTS.MAX_FILE_SIZE,
    },
    fileFilter: (req, file, cb) => {
        // Only allow image files
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    }
});

const uploadFile = upload.single('image');

const uploadAvatarMiddleware = (
    req: MulterRequest, 
    res: Response, 
    next: NextFunction
): void => {
    uploadFile(req, res, (err) => {
        if (err) {
            // Handle different types of multer errors
            if (err instanceof MulterError) {
                switch (err.code) {
                    case 'LIMIT_FILE_SIZE':
                        res.status(HTTP_CONSTANTS.STATUS.BAD_REQUEST).json({ 
                            error: `File too large. Maximum size is ${UPLOAD_CONSTANTS.MAX_FILE_SIZE / (1024 * 1024)}MB.` 
                        });
                        break;
                    case 'LIMIT_UNEXPECTED_FILE':
                        res.status(HTTP_CONSTANTS.STATUS.BAD_REQUEST).json({ 
                            error: 'Unexpected field name. Use "image" field.' 
                        });
                        break;
                    default:
                        res.status(HTTP_CONSTANTS.STATUS.BAD_REQUEST).json({ 
                            error: `Upload error: ${err.message}` 
                        });
                        break;
                }
            } else {
                // Handle custom errors (like file type validation)
                res.status(HTTP_CONSTANTS.STATUS.BAD_REQUEST).json({ 
                    error: err.message || 'Error uploading file' 
                });
            }
            return;
        }

        next();
    });
};

export default uploadAvatarMiddleware;
