import { QueryTypes } from 'sequelize';
import sequelize from '../database/sequelize';
import { Chat, ChatWithMembers, ChatWithUser, DirectChatRow } from '../types/chat';
import { User } from '../types';

export const chatService = {
    // Create a new chat
    async createChat(data: { is_group: boolean; name?: string; created_by: number }): Promise<number> {
        const [results] = await sequelize.query(
            'INSERT INTO chats (is_group, name, created_by, created_at, updated_at) VALUES (:is_group, :name, :created_by, :created_at, :updated_at) RETURNING *',
            {
                replacements: {
                    is_group: data.is_group,
                    name: data.is_group ? data.name : null,
                    created_by: data.created_by,
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

    async addChatMembers(chatId: number, userIds: number[]): Promise<number> {
            if (userIds.length === 0) return 0;

            const now = new Date();
            const values = userIds.map(() => '(?, ?, ?, ?)').join(', ');
            const replacements: (number | Date)[] = [];

            userIds.forEach(userId => {
                replacements.push(chatId, userId, now, now);
            });

            const [results] = await sequelize.query(
                `INSERT INTO chat_members (chat_id, user_id, joined_at, created_at) VALUES ${values}`,
                {
                    replacements,
                    type: QueryTypes.INSERT
                }
            );

            return results;
        },

    

    // Get chat by ID
    async getChatById(id: number): Promise<Chat | null> {
        const [results] = await sequelize.query(
            'SELECT * FROM chats WHERE id = :id',
            {
                replacements: { id },
                type: QueryTypes.SELECT
            }
        );
        return results as Chat | null;
    },

    // Get chat with members
    async getChatWithMembers(id: number): Promise<ChatWithMembers | null> {
        const chat = await this.getChatById(id);
        if (!chat) return null;

        const members = await sequelize.query(
            `SELECT cm.*, u.id as user_id, u.username, u.display_name, u.avatar_url 
             FROM chat_members cm
             JOIN users u ON cm.user_id = u.id
             WHERE cm.chat_id = :chat_id`,
            {
                replacements: { chat_id: id },
                type: QueryTypes.SELECT
            }
        );

        return {
            ...chat,
            members: members as User[]
        };
    },

    async getUnjoinedChats(userId: number): Promise<Chat[]> {
        const results = await sequelize.query(
            `SELECT c.* FROM chats c 
             WHERE c.id NOT IN (        
                SELECT chat_id FROM chat_members WHERE user_id = :user_id
             ) AND c.is_group = true
                ORDER BY c.updated_at DESC`,

            {
                replacements: { user_id: userId },
                type: QueryTypes.SELECT
            }
        );
        return results as Chat[];
    },
    async getUserChats(userId: number): Promise<Chat[]> {
        const results = await sequelize.query(
            `SELECT c.* FROM chats c 
             INNER JOIN chat_members cm ON c.id = cm.chat_id 
             WHERE cm.user_id = :user_id    
             ORDER BY c.updated_at DESC`,
            {
                replacements: { user_id: userId },
                type: QueryTypes.SELECT
            }
        );
        return results as Chat[];
    },    

    // Get all chats for a user
    async getUserGroupChats(userId: number): Promise<Chat[]> {
        const results = await sequelize.query(
            `SELECT c.* FROM chats c 
             INNER JOIN chat_members cm ON c.id = cm.chat_id 
             WHERE cm.user_id = :user_id 
             AND c.is_group = true
             ORDER BY c.updated_at DESC`,
            {
                replacements: { user_id: userId },
                type: QueryTypes.SELECT
            }
        );
        return results as Chat[];
    },async getUserDirectChats(userId: number): Promise<Chat[]> {

        const results = await sequelize.query(
            `SELECT 
                c.*,
                u.id as other_user_id,
                u.display_name as other_display_name,
                u.username as other_username,
                u.avatar_url as other_avatar_url
             FROM chats c 
             INNER JOIN chat_members cm ON c.id = cm.chat_id 
             INNER JOIN chat_members cm2 ON c.id = cm2.chat_id AND cm2.user_id != :user_id
             INNER JOIN users u ON cm2.user_id = u.id
             WHERE cm.user_id = :user_id
             AND c.is_group = false
             ORDER BY c.updated_at DESC`,
            {
                replacements: { user_id: userId },
                type: QueryTypes.SELECT
            }
        ) as DirectChatRow[];
        
        
        return results.map((row) => ({
            ...row,
            name: row.other_display_name || row.other_username,
            avatar: row.other_avatar_url
        })) as ChatWithUser[];
},

    
    async getOtherUser(chatId: number, userId: number): Promise<User | null> {
        const results = await sequelize.query(
            `SELECT u.* FROM users u 
             INNER JOIN chat_members cm ON u.id = cm.user_id 
             WHERE cm.chat_id = :chat_id AND cm.user_id != :user_id`,
            {
                replacements: { chat_id: chatId, user_id: userId },
                type: QueryTypes.SELECT
            }
        );
        return results[0] as User | null;
    },
    
    // Update chat
    async updateChat(id: number, data: { name?: string }): Promise<void> {
        const updateFields = [];
        const replacements: Partial<Chat> = { id };

        if (data.name !== undefined) {
            updateFields.push('name = :name');
            replacements.name = data.name;
        }

        if (updateFields.length === 0) return;

        updateFields.push('updated_at = :updated_at');
        replacements.updated_at = new Date();

        await sequelize.query(
            `UPDATE chats SET ${updateFields.join(', ')} WHERE id = :id`,
            {
                replacements,
                type: QueryTypes.UPDATE
            }
        );
    },

    // Remove members from chat
    async removeChatMembers(chatId: number, userIds: number[]): Promise<void> {
        await sequelize.query(
            'DELETE FROM chat_members WHERE chat_id = :chat_id AND user_id IN (:user_ids)',
            {
                replacements: { 
                    chat_id: chatId, 
                    user_ids: userIds 
                },
                type: QueryTypes.DELETE
            }
        );
    },

    // Check if user is member of chat
    async isUserChatMember(chatId: number, userId: number): Promise<boolean> {
        const [results] = await sequelize.query(
            'SELECT 1 FROM chat_members WHERE chat_id = :chat_id AND user_id = :user_id',
            {
                replacements: { chat_id: chatId, user_id: userId },
                type: QueryTypes.SELECT
            }
        );
        return results !== undefined;
    },

    // Get chat members
    async getChatMembers(chatId: number): Promise<User[]> {
        const results = await sequelize.query(
            `SELECT u.id, u.username, u.display_name, u.avatar_url 
             FROM chat_members cm   
             JOIN users u ON cm.user_id = u.id
             WHERE cm.chat_id = :chat_id`,
            {
                replacements: { chat_id: chatId },
                type: QueryTypes.SELECT
            }
        );
        return results as User[];
    },

    // Delete chat
    async deleteChat(id: number): Promise<void> {
        await sequelize.query(
            'DELETE FROM chats WHERE id = :id',
            {
                replacements: { id },
                type: QueryTypes.DELETE
            }
        );
    },

    // Get direct chat between two users
    async getDirectChat(userId1: number, userId2: number): Promise<Chat | null> {
        const results = await sequelize.query(
            `SELECT c.* FROM chats c 
             INNER JOIN chat_members cm1 ON c.id = cm1.chat_id 
             INNER JOIN chat_members cm2 ON c.id = cm2.chat_id 
             WHERE c.is_group = false 
             AND cm1.user_id = :user_id1 
             AND cm2.user_id = :user_id2`,
            {
                replacements: { user_id1: userId1, user_id2: userId2 },
                type: QueryTypes.SELECT
            }
        );
        
        return results.length > 0 ? results[0] as Chat : null;
    },

    /**
     * Efficiently find a direct chat (is_group: false) with exactly the given member IDs (no more, no less).
     * @param memberIds Array of user IDs (must be length 2 for DMs)
     * @returns Chat if found, otherwise null
     */
    async getDirectChatByMemberIds(memberIds: number[]): Promise<Chat | null> {
        if (memberIds.length !== 2) return null;
        // Sort for consistent order
        const [id1, id2] = memberIds.sort((a, b) => a - b);
        // Find a chat that is not a group, has exactly these two members, and no more
        const results = await sequelize.query(
            `SELECT c.* FROM chats c
             INNER JOIN chat_members cm1 ON c.id = cm1.chat_id AND cm1.user_id = :id1
             INNER JOIN chat_members cm2 ON c.id = cm2.chat_id AND cm2.user_id = :id2
             WHERE c.is_group = false
             AND (
                 SELECT COUNT(*) FROM chat_members cm WHERE cm.chat_id = c.id
             ) = 2
             LIMIT 1`,
            {
                replacements: { id1, id2 },
                type: QueryTypes.SELECT
            }
        );
        return results.length > 0 ? results[0] as Chat : null;
    }
};

export default chatService; 