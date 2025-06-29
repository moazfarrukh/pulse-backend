import { Socket } from 'socket.io';
import path from 'path';
import fs from 'fs';
import mime from 'mime-types';
import { messageService } from '../services/message';
import { chatService } from '../services/chat';
import { userService } from '../services/user';
import MessageEmitter from './messageEmitter';
import { MessageSendEvent, MessageEditEvent, MessageDeleteEvent, TypingStartEvent, TypingStopEvent, ChatLeaveEvent, ChatJoinEvent } from '../types/message';
import SocketEvents from '../constants/socketEvents';
import { messageAttachmentService } from '../services/messageAttachment';
import { UPLOAD_CONSTANTS, VALIDATION_CONSTANTS } from '../constants';

export default class MessageHandler {
    private messageEmitter: MessageEmitter;

    constructor(messageEmitter: MessageEmitter) {
        this.messageEmitter = messageEmitter;
    }

    async handleSendMessage(socket: Socket, data: MessageSendEvent): Promise<void> {
        try {                
            
            const { userId } = socket.handshake.auth;

            const { chat_id, content, attachments } = data;

            if (!chat_id) {
                this.messageEmitter.emitError(socket.id, 'Chat ID is required');
                return;
            }

            // Convert chat_id to number if it's a string
            const numericChatId = typeof chat_id === 'string' ? parseInt(chat_id, 10) : chat_id;
            
            if (Number.isNaN(numericChatId)) {
                this.messageEmitter.emitError(socket.id, 'Invalid chat ID');
                return;
            }

            // Check if user is member of the chat
            const isMember = await chatService.isUserChatMember(numericChatId, userId);

            if (!isMember) {
                this.messageEmitter.emitError(socket.id, 'Access denied to this chat');
                return;
            }

            // Validate message content
            if ((!content || content.trim().length === 0) && (!attachments || !Array.isArray(attachments) || attachments.length === 0)) {
                this.messageEmitter.emitError(socket.id, 'Message content or attachments are required');
                return;
            }

            if (content && content.length > VALIDATION_CONSTANTS.MESSAGE_CONTENT_MAX_LENGTH) {
                this.messageEmitter.emitError(socket.id, `Message content too long (max ${VALIDATION_CONSTANTS.MESSAGE_CONTENT_MAX_LENGTH} characters)`);
                return;
            }

            // Create the message
            const messageId = await messageService.createMessage({
                chat_id: numericChatId,
                sender_id: userId,
                content: content.trim()
            });
            
            let savedAttachments: { file_url: string; file_type: string; }[] = [];
            if (attachments && Array.isArray(attachments) && attachments.length > 0) {
                const now = Date.now();
                const uploadDir = path.join(process.cwd(), UPLOAD_CONSTANTS.MESSAGES_DIR);
                if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
                const serverUrl = process.env[UPLOAD_CONSTANTS.SERVER_HOST_ENV] || UPLOAD_CONSTANTS.DEFAULT_SERVER_HOST;
                const attachmentsToSave = await Promise.all(attachments.map(async (file: any, i: number) => {
                    // file: { buffer, type, name }
                    let fileBuffer: Buffer;
                    if (Buffer.isBuffer(file.buffer)) {
                        fileBuffer = file.buffer;
                    } else if (file.buffer && file.buffer.type === 'Buffer' && Array.isArray(file.buffer.data)) {
                        fileBuffer = Buffer.from(file.buffer.data);
                    } else {
                        throw new Error('Invalid file buffer format');
                    }

                    // Determine extension from MIME type or fallback to original name
                    let ext = '.bin';
                    if (file.type) {
                        const mimeExt = mime.extension(file.type);
                        if (mimeExt) ext = `.${mimeExt}`;
                    } else if (file.name && file.name.includes('.')) {
                        ext = path.extname(file.name);
                    }

                    const filename = `${UPLOAD_CONSTANTS.ATTACHMENT_PREFIX}-${now}-${i}${ext}`;
                    const filePath = path.join(uploadDir, filename);

                    fs.writeFileSync(filePath, fileBuffer);
                    return {
                        file_url: `${serverUrl}/${UPLOAD_CONSTANTS.MESSAGES_DIR}/${filename}`,
                        file_type: file.type || 'application/octet-stream'
                    };
                }));
                await messageAttachmentService.addAttachments(messageId, attachmentsToSave);
                savedAttachments = attachmentsToSave;
            }

            // Get the complete message with sender info
            const messageWithSender = await messageService.getMessageById(messageId);
            if (!messageWithSender) {
                this.messageEmitter.emitError(socket.id, 'Failed to create message');
                return;
            }

            // Add attachments to the message
            messageWithSender.attachments = savedAttachments.map(att => ({
                file_url: att.file_url,
                file_type: att.file_type,
                created_at: new Date() 
            }));


            // Emit to all chat members
            this.messageEmitter.emitNewMessage(numericChatId, messageWithSender);

        } catch {
            this.messageEmitter.emitError(socket.id, 'Server error while sending message');
        }
    }

    async handleEditMessage(socket: Socket, data: MessageEditEvent): Promise<void> {
        try {
            const { userId } = socket.handshake.auth;
            if (!userId) {
                this.messageEmitter.emitError(socket.id, 'Authentication required ');
                return;
            }

            const { message_id, content } = data;

            if (!message_id) {
                this.messageEmitter.emitError(socket.id, 'Message ID is required');
                return;
            }

            if (!content || content.trim().length === 0) {
                this.messageEmitter.emitError(socket.id, 'Message content cannot be empty');
                return;
            }

            if (content.length > VALIDATION_CONSTANTS.MESSAGE_CONTENT_MAX_LENGTH) {
                this.messageEmitter.emitError(socket.id, `Message content too long (max ${VALIDATION_CONSTANTS.MESSAGE_CONTENT_MAX_LENGTH} characters)`);
                return;
            }

            // Check if user can edit this message
            const canEdit = await messageService.canEditMessage(message_id, userId);
            if (!canEdit) {
                this.messageEmitter.emitError(socket.id, 'Cannot edit this message');
                return;
            }

            // Get original message for chat_id
            const originalMessage = await messageService.getMessageById(message_id);
            if (!originalMessage) {
                this.messageEmitter.emitError(socket.id, 'Message not found');
                return;
            }

            // Update the message
            await messageService.updateMessage(message_id, content.trim());

            // Get updated message
            const updatedMessage = await messageService.getMessageById(message_id);
            if (!updatedMessage) {
                this.messageEmitter.emitError(socket.id, 'Failed to update message');
                return;
            }

            // Emit to all chat members
            this.messageEmitter.emitMessageEdited(originalMessage.chat_id, updatedMessage);

        } catch {
            this.messageEmitter.emitError(socket.id, 'Server error while editing message');
        }
    }

    async handleDeleteMessage(socket: Socket, data: MessageDeleteEvent): Promise<void> {
        try {
            const { userId } = socket.handshake.auth;


            const { message_id } = data;

            if (!message_id) {
                this.messageEmitter.emitError(socket.id, 'Message ID is required');
                return;
            }

            // Check if user can delete this message
            const canDelete = await messageService.canDeleteMessage(message_id, userId);
            if (!canDelete) {
                this.messageEmitter.emitError(socket.id, 'Cannot delete this message');
                return;
            }

            // Get original message for chat_id
            const originalMessage = await messageService.getMessageById(message_id);
            if (!originalMessage) {
                this.messageEmitter.emitError(socket.id, 'Message not found');
                return;
            }

            // Delete the message
            await messageService.deleteMessage(message_id);

            // Emit to all chat members
            this.messageEmitter.emitMessageDeleted(originalMessage.chat_id, message_id);

            

        } catch {
            
            this.messageEmitter.emitError(socket.id, 'Server error while deleting message');
        }
    }

    async handleTypingStart(socket: Socket, data: TypingStartEvent): Promise<void> {
        try {
            const { userId } = socket.handshake.auth;


            const { chat_id } = data;

            if (!chat_id) {
                this.messageEmitter.emitError(socket.id, 'Chat ID is required');
                return;
            }

            // Convert chat_id to number if it's a string
            const numericChatId = typeof chat_id === 'string' ? parseInt(chat_id, 10) : chat_id;
            
            if (Number.isNaN(numericChatId)) {
                this.messageEmitter.emitError(socket.id, 'Invalid chat ID');
                return;
            }

            // Check if user is member of the chat
            const isMember = await chatService.isUserChatMember(numericChatId, userId);
            if (!isMember) {
                this.messageEmitter.emitError(socket.id, 'Access denied to this chat');
                return;
            }

            // Get user info
            const user = await userService.getUserById(userId);
            if (!user) {
                this.messageEmitter.emitError(socket.id, 'User not found');
                return;
            }

            // Emit typing start to other chat members (exclude sender)
            socket.to(`chat:${numericChatId}`).emit(SocketEvents.ON_TYPING_START, {
                chat_id: numericChatId,
                userId,
                user_info: {
                    display_name: user.display_name,
                    username: user.username
                }
            });

        } catch {

            this.messageEmitter.emitError(socket.id, 'Server error while handling typing');
        }
    }

    async handleTypingStop(socket: Socket, data: TypingStopEvent): Promise<void> {
        try {
            const { userId } = socket.handshake.auth;


            const { chat_id } = data;

            if (!chat_id) {
                this.messageEmitter.emitError(socket.id, 'Chat ID is required');
                return;
            }

            // Convert chat_id to number if it's a string
            const numericChatId = typeof chat_id === 'string' ? parseInt(chat_id, 10) : chat_id;
            
            if (Number.isNaN(numericChatId)) {
                this.messageEmitter.emitError(socket.id, 'Invalid chat ID');
                return;
            }

            // Check if user is member of the chat
            const isMember = await chatService.isUserChatMember(numericChatId, userId);
            if (!isMember) {
                this.messageEmitter.emitError(socket.id, 'Access denied to this chat');
                return;
            }

            // Emit typing stop to other chat members (exclude sender)
            socket.to(`chat:${numericChatId}`).emit(SocketEvents.ON_TYPING_STOP, {
                chat_id: numericChatId,
                userId
            });

        } catch {

            this.messageEmitter.emitError(socket.id, 'Server error while handling typing');
        }
    }

    async handleChatLeave(socket: Socket, data: ChatLeaveEvent): Promise<void> {
        try {
            const { userId } = socket.handshake.auth;


            const { chat_id } = data;

            if (!chat_id) {
                this.messageEmitter.emitError(socket.id, 'Chat ID is required');
                return;
            }

            // Check if user is member of the chat
            const isMember = await chatService.isUserChatMember(chat_id, userId);
            if (!isMember) {
                this.messageEmitter.emitError(socket.id, 'Not a member of this chat');
                return;
            }

            // Remove user from chat
            await chatService.removeChatMembers(chat_id, [userId]);

            // Emit to all chat members
            this.messageEmitter.emitUserLeft(chat_id, userId);
        } catch {
            this.messageEmitter.emitError(socket.id, 'Server error while handling chat leave');
        }
    }

    async handleChatJoin(socket: Socket, data: ChatJoinEvent): Promise<void> {
        try {
            const { userId } = socket.handshake.auth;
            const { chat_id } = data;
            if (!chat_id) {
                this.messageEmitter.emitError(socket.id, 'Chat ID is required');
                return;
            }

            if (!userId) {
                this.messageEmitter.emitError(socket.id, 'Authentication required to join chat');
                return;
            }

            socket.join(`chat:${chat_id}`);


            // Check if user is member of the chat
            const isMember = await chatService.isUserChatMember(chat_id, userId);
            if (!isMember) {
                await chatService.addChatMembers(chat_id, [userId]);
            }

            this.messageEmitter.emitUserJoined(chat_id, userId);

        } catch {
            this.messageEmitter.emitError(socket.id, 'Server error while handling chat join');
        }
    }
    
    async handleConnection(socket: Socket, activeUsers: Map<number, Socket>): Promise<void> {
        const { userId } = socket.handshake.auth;
        if (!userId) {
            this.messageEmitter.emitError(socket.id, 'Authentication required');
            return;
        }

        // Join the user to their chat rooms
        const userChats = await chatService.getUserChats(userId);
        userChats.forEach(chat => {
            socket.join(`chat:${chat.id}`);
        });

        activeUsers.set(userId, socket);

        // Emit presence update for all existing active users
        activeUsers.forEach((_, activeUserId) => {
            this.messageEmitter.emitPresenceUpdate(activeUserId, 'online');
        });
        
    }   

    async handleDisconnection(socket: Socket, activeUsers: Map<number, Socket>): Promise<void> {
        const { userId } = socket.handshake.auth;
        if (!userId) {
            return;
        }

        activeUsers.delete(userId);

        // Emit presence update
        this.messageEmitter.emitPresenceUpdate(userId, 'offline');
    }
        
}