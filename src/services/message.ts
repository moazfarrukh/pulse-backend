import { QueryTypes } from 'sequelize';
import sequelize from '../database/sequelize';
import {  MessageAttachment, MessageWithSender, MessageWithSenderAndAttachments } from '../types/message';
import { messageAttachmentService } from './messageAttachment';

export const messageService = {
    // Create a new message
    async createMessage(data: { chat_id: number; sender_id: number; content: string ; attachments?: string[] }): Promise<number> {
        const [results] = await sequelize.query(
            'INSERT INTO messages (chat_id, sender_id, content, created_at, updated_at) VALUES (:chat_id, :sender_id, :content, :created_at, :updated_at) RETURNING *',
            {
                replacements: {
                    chat_id: data.chat_id,
                    sender_id: data.sender_id,
                    content: data.content,
                    created_at: new Date(),
                    updated_at: new Date()
                },
                type: QueryTypes.INSERT
            }
        );
        if (Array.isArray(results)) {
            return results[0].id ;
        }
        return results;
    },

    // Get message by ID with sender info
    async getMessageById(id: number): Promise<MessageWithSenderAndAttachments | null> {
        const [results] = await sequelize.query(
            `SELECT m.*, u.id as sender_id, u.display_name, u.username, u.avatar_url 
             FROM messages m 
             LEFT JOIN users u ON m.sender_id = u.id 
             WHERE m.id = :id AND m.deleted_at IS NULL`,
            {
                replacements: { id },
                type: QueryTypes.SELECT
            }
        );
        
        if (!results) return null;
        
        const message = results as MessageWithSender;
        const attachments = await messageAttachmentService.getAttachments(message.id);
        return {
            id: message.id,
            chat_id: message.chat_id,
            sender_id: message.sender_id,
            content: message.content,
            created_at: message.created_at,
            updated_at: message.updated_at,
            edited_at: message.edited_at,
            deleted_at: message.deleted_at,
            display_name: message.display_name || '',
            username: message.username || '',
            avatar_url: message.avatar_url,
            attachments: attachments as MessageAttachment[]
        };
    },

    // Get messages from a chat
    async getChatMessages(chatId: number): Promise<MessageWithSenderAndAttachments[]> {
        const results = await sequelize.query(
            `SELECT m.*, u.id as sender_id, u.display_name, u.username, u.avatar_url 
             FROM messages m 
             LEFT JOIN users u ON m.sender_id = u.id 
             WHERE m.chat_id = :chat_id AND m.deleted_at IS NULL 
             ORDER BY m.created_at ASC`,
            {
                replacements: { chat_id: chatId },
                type: QueryTypes.SELECT
            }
        );
        
        // Fetch attachments for each message
        const messages = await Promise.all((results as MessageWithSenderAndAttachments[]).map(async message => {
            const attachments = await messageAttachmentService.getAttachments(message.id);
            return {
                id: message.id,
                chat_id: message.chat_id,
                sender_id: message.sender_id,
                content: message.content,
                created_at: message.created_at,
                updated_at: message.updated_at,
                edited_at: message.edited_at,
                deleted_at: message.deleted_at,
                display_name: message.display_name || '',
                username: message.username || '',
                avatar_url: message.avatar_url,
                attachments: attachments as MessageAttachment[] // MessageAttachment[]
            };
        }));
        return messages;
    },

    // Update message
    async updateMessage(id: number, content: string): Promise<void> {
        await sequelize.query(
            'UPDATE messages SET content = :content, edited_at = :edited_at, updated_at = :updated_at WHERE id = :id',
            {
                replacements: {
                    id,
                    content,
                    edited_at: new Date(),
                    updated_at: new Date()
                },
                type: QueryTypes.UPDATE
            }
        );
    },

    // Soft delete message
    async deleteMessage(id: number): Promise<void> {
        await sequelize.query(
            'UPDATE messages SET deleted_at = :deleted_at, updated_at = :updated_at WHERE id = :id',
            {
                replacements: {
                    id,
                    deleted_at: new Date(),
                    updated_at: new Date()
                },
                type: QueryTypes.UPDATE
            }
        );
    },

    // Get last message in a chat
    async getLastMessage(chatId: number): Promise<MessageWithSender | null> {
        const [results] = await sequelize.query(
            `SELECT m.*, u.id as sender_id, u.display_name, u.username, u.avatar_url 
             FROM messages m 
             LEFT JOIN users u ON m.sender_id = u.id 
             WHERE m.chat_id = :chat_id AND m.deleted_at IS NULL 
             ORDER BY m.created_at DESC 
             LIMIT 1`,
            {
                replacements: { chat_id: chatId },
                type: QueryTypes.SELECT
            }
        );
        
        if (!results) return null;
        
        const message = results as MessageWithSender;
        return {
            id: message.id,
            chat_id: message.chat_id,
            sender_id: message.sender_id,
            content: message.content,
            created_at: message.created_at,
            updated_at: message.updated_at,
            edited_at: message.edited_at,
            deleted_at: message.deleted_at,
            display_name: message.display_name,
            username: message.username,
            avatar_url: message.avatar_url
        };
    },

    // Check if user can edit message (sender and within time limit)
    async canEditMessage(messageId: number, userId: number, timeLimitMinutes: number = 5): Promise<boolean> {
        const [results] = await sequelize.query(
            `SELECT created_at FROM messages 
             WHERE id = :message_id AND sender_id = :sender_id AND deleted_at IS NULL`,
            {
                replacements: { message_id: messageId, sender_id: userId },
                type: QueryTypes.SELECT
            }
        );
        
        if (!results) return false;
        
        const message = results as MessageWithSender;
        const messageTime = new Date(message.created_at);
        const timeLimit = new Date(Date.now() - timeLimitMinutes * 60 * 1000);
        
        return messageTime > timeLimit;
    },

    // Check if user can delete message (sender or admin)
    async canDeleteMessage(messageId: number, userId: number): Promise<boolean> {
        const [results] = await sequelize.query(
            `SELECT m.sender_id, c.created_by 
             FROM messages m 
             JOIN chats c ON m.chat_id = c.id 
             WHERE m.id = :message_id AND m.deleted_at IS NULL`,
            {
                replacements: { message_id: messageId },
                type: QueryTypes.SELECT
            }
        );
        
        if (!results) return false;

        const data = results as { sender_id: number; created_by: number };
        return data.sender_id === userId || data.created_by === userId;
    }
};

export default messageService; 