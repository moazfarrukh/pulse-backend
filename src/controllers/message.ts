import { Request, Response } from 'express';
import { messageService, messageAttachmentService } from '../services';
import { HTTP_CONSTANTS, UPLOAD_CONSTANTS } from '../constants';

const getChatMessages = async (req:Request, res:Response): Promise<void> => {
    try {
        const chatId = parseInt(req.params.chatId, 10);
        const messages = await messageService.getChatMessages(chatId);
        res.status(HTTP_CONSTANTS.STATUS.OK).json(messages);
    } catch {
        res.status(HTTP_CONSTANTS.STATUS.INTERNAL_SERVER_ERROR).json({ message: HTTP_CONSTANTS.MESSAGES.SERVER_ERROR });
    }
};

const createMessage = async (req: Request, res: Response): Promise<void> => {
    try {
        const { chat_id, content } = req.body;
        const sender_id = req.user?.id; 

        if (!sender_id) {
            res.status(HTTP_CONSTANTS.STATUS.UNAUTHORIZED).json({ message: HTTP_CONSTANTS.MESSAGES.NOT_AUTHENTICATED });
            return;
        }

        // Create the message
        const messageId = await messageService.createMessage({ 
            chat_id, 
            sender_id, 
            content 
        });

        // Save attachments if any
        let savedAttachments = [];
        if (req.body.attachmentMetadata && Array.isArray(req.body.attachmentMetadata)) {
            // Construct file_url as public URL
            const serverUrl = process.env[UPLOAD_CONSTANTS.SERVER_HOST_ENV] || UPLOAD_CONSTANTS.DEFAULT_SERVER_HOST;
            const attachmentsToSave = req.body.attachmentMetadata.map((file: any) => ({
                file_url: `${serverUrl}/${UPLOAD_CONSTANTS.MESSAGES_DIR}/${file.filename}`,
                file_type: file.mimetype
            }));
            await messageAttachmentService.addAttachments(messageId, attachmentsToSave);
            savedAttachments = attachmentsToSave;
        }
        
        res.status(HTTP_CONSTANTS.STATUS.CREATED).json({ 
            id: messageId, 
            message: HTTP_CONSTANTS.MESSAGES.MESSAGE_CREATED, 
            attachments: savedAttachments 
        });
    } catch  {
        res.status(HTTP_CONSTANTS.STATUS.INTERNAL_SERVER_ERROR).json({ message: HTTP_CONSTANTS.MESSAGES.SERVER_ERROR });
    }
};

export { getChatMessages, createMessage };