import { Request, Response } from 'express';
import { chatService } from '../services/chat';
import { userService } from '../services/user';
import { CreateChatRequest, UpdateChatRequest, AddMembersRequest, RemoveMembersRequest } from '../types/chat';
import { HTTP_CONSTANTS } from '../constants';

// Get all chats for current user
const getUserChats = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            res.status(HTTP_CONSTANTS.STATUS.UNAUTHORIZED).json({ message: HTTP_CONSTANTS.MESSAGES.NOT_AUTHENTICATED });
            return;
        }

        const [groupChats, directChats] = await Promise.all([
            chatService.getUserGroupChats(userId),
            chatService.getUserDirectChats(userId),

        ]);

        res.status(HTTP_CONSTANTS.STATUS.OK).json({
            groupChats,
            directChats
        });

    } catch {
        res.status(HTTP_CONSTANTS.STATUS.INTERNAL_SERVER_ERROR).json({ message: HTTP_CONSTANTS.MESSAGES.SERVER_ERROR });
    }
};

const getUnjoinedChats = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(HTTP_CONSTANTS.STATUS.UNAUTHORIZED).json({ message: HTTP_CONSTANTS.MESSAGES.NOT_AUTHENTICATED });
            return;
        }   
        // Get all chats that the user is not a member of
        const unjoinedChats = await chatService.getUnjoinedChats(userId);
        res.status(HTTP_CONSTANTS.STATUS.OK).json(unjoinedChats);
    } catch {
        res.status(HTTP_CONSTANTS.STATUS.INTERNAL_SERVER_ERROR).json({ message: HTTP_CONSTANTS.MESSAGES.SERVER_ERROR });

    }
};

// Get members of a chat
const getChatMembers = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        const chatId = parseInt(req.params.id, 10);

        if (!userId) {
            res.status(HTTP_CONSTANTS.STATUS.UNAUTHORIZED).json({ message: HTTP_CONSTANTS.MESSAGES.NOT_AUTHENTICATED });
            return;
        }

        // Check if user is member of the chat
        const isMember = await chatService.isUserChatMember(chatId, userId);
        if (!isMember) {
            res.status(HTTP_CONSTANTS.STATUS.FORBIDDEN).json({ message: HTTP_CONSTANTS.MESSAGES.ACCESS_DENIED });
            return;
        }

        const members = await chatService.getChatMembers(chatId);

        res.status(HTTP_CONSTANTS.STATUS.OK).json(members);
    } catch {
        res.status(HTTP_CONSTANTS.STATUS.INTERNAL_SERVER_ERROR).json({ message: HTTP_CONSTANTS.MESSAGES.SERVER_ERROR });
    }
};

// Get chat by ID
const getChatById = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        const chatId = parseInt(req.params.id, 10);

        if (!userId) {
            res.status(HTTP_CONSTANTS.STATUS.UNAUTHORIZED).json({ message: HTTP_CONSTANTS.MESSAGES.NOT_AUTHENTICATED });
            return;
        }

        const isMember = await chatService.isUserChatMember(chatId, userId);
        if (!isMember) {
            res.status(HTTP_CONSTANTS.STATUS.FORBIDDEN).json({ message: HTTP_CONSTANTS.MESSAGES.ACCESS_DENIED });
            return;
        }

        const chat = await chatService.getChatWithMembers(chatId);

        if (!chat) {
            res.status(HTTP_CONSTANTS.STATUS.NOT_FOUND).json({ message: HTTP_CONSTANTS.MESSAGES.CHAT_NOT_FOUND });
            return;
        }

        res.status(HTTP_CONSTANTS.STATUS.OK).json(chat);
    } catch {

        res.status(HTTP_CONSTANTS.STATUS.INTERNAL_SERVER_ERROR).json({ message: HTTP_CONSTANTS.MESSAGES.SERVER_ERROR });
    }
};

// Create a new chat
const createChat = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        const { is_group, name, member_ids }: CreateChatRequest = req.body;

        if (!userId) {
            res.status(HTTP_CONSTANTS.STATUS.UNAUTHORIZED).json({ message: HTTP_CONSTANTS.MESSAGES.NOT_AUTHENTICATED });
            return;
        }

        // Validate that all member IDs exist
        const userValidationPromises = member_ids.map(async (memberId) => {
            const user = await userService.getUserById(memberId);
            return { memberId, user };
        });

        const userValidationResults = await Promise.all(userValidationPromises);

        const invalidUser = userValidationResults.find(({ user }) => !user);
        if (invalidUser) {
            res.status(HTTP_CONSTANTS.STATUS.BAD_REQUEST).json({ message: `User with ID ${invalidUser.memberId} not found` });
            return;
        }

        // Add current user to member list if not already included
        const allMemberIds = member_ids.includes(userId) ? member_ids : [...member_ids, userId];

        // Prevent duplicate DMs: if not a group, check if a chat with the same members exists
        if (!is_group) {
            const sortedIds = [...allMemberIds].sort((a, b) => a - b);
            const existingChat = await chatService.getDirectChatByMemberIds(sortedIds);
            if (existingChat) {
                const chatWithMembers = await chatService.getChatWithMembers(existingChat.id);
                res.status(HTTP_CONSTANTS.STATUS.OK).json(chatWithMembers);
                return;
            }
        }

        // Create the chat
        const chatId = await chatService.createChat({
            is_group,
            name: name?.trim(),
            created_by: userId
        });

        // // Add members to the chat
        await chatService.addChatMembers(chatId, allMemberIds);

        // // Return the created chat with members
        const chatWithMembers = await chatService.getChatWithMembers(chatId);
        res.status(HTTP_CONSTANTS.STATUS.CREATED).json(chatWithMembers);
    } catch {

        res.status(HTTP_CONSTANTS.STATUS.INTERNAL_SERVER_ERROR).json({ message: HTTP_CONSTANTS.MESSAGES.SERVER_ERROR });
    }
};

// Create or get direct chat with another user
const createDirectChat = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        const otherUserId = parseInt(req.params.userId, 10);

        if (!userId) {
            res.status(HTTP_CONSTANTS.STATUS.UNAUTHORIZED).json({ message: HTTP_CONSTANTS.MESSAGES.NOT_AUTHENTICATED });
            return;
        }

        if (userId === otherUserId) {
            res.status(HTTP_CONSTANTS.STATUS.BAD_REQUEST).json({ message: 'Cannot create direct chat with yourself' });
            return;
        }

        // Check if other user exists
        const otherUser = await userService.getUserById(otherUserId);
        if (!otherUser) {
            res.status(HTTP_CONSTANTS.STATUS.NOT_FOUND).json({ message: HTTP_CONSTANTS.MESSAGES.USER_NOT_FOUND });
            return;
        }

        // Check if direct chat already exists
        let chat = await chatService.getDirectChat(userId, otherUserId);

        if (!chat) {
            // Create new direct chat
            const chatId = await chatService.createChat({
                is_group: false,
                created_by: userId
            });

            // Add both users to the chat
            await chatService.addChatMembers(chatId, [userId, otherUserId]);

            // Get the created chat
            chat = await chatService.getChatById(chatId);

            if (!chat) {
                throw new Error('Failed to retrieve newly created chat');
            }
        }

        // Return the chat with members
        const chatWithMembers = await chatService.getChatWithMembers(chat.id);

        res.status(HTTP_CONSTANTS.STATUS.OK).json(chatWithMembers);
    } catch {

        res.status(HTTP_CONSTANTS.STATUS.INTERNAL_SERVER_ERROR).json({ message: HTTP_CONSTANTS.MESSAGES.SERVER_ERROR });
    }
};

// Update chat
const updateChat = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        const chatId = parseInt(req.params.id, 10);
        const { name }: UpdateChatRequest = req.body;

        if (!userId) {
            res.status(HTTP_CONSTANTS.STATUS.UNAUTHORIZED).json({ message: HTTP_CONSTANTS.MESSAGES.NOT_AUTHENTICATED });
            return;
        }

        // Check if user is member of the chat
        const isMember = await chatService.isUserChatMember(chatId, userId);
        if (!isMember) {
            res.status(HTTP_CONSTANTS.STATUS.FORBIDDEN).json({ message: HTTP_CONSTANTS.MESSAGES.ACCESS_DENIED });
            return;
        }

        // Get the chat to check if it's a group chat
        const chat = await chatService.getChatById(chatId);
        if (!chat) {
            res.status(404).json({ message: 'Chat not found' });
            return;
        }

        // Only group chats can be updated
        if (!chat.is_group) {
            res.status(400).json({ message: 'Direct chats cannot be updated' });
            return;
        }

        await chatService.updateChat(chatId, { name: name?.trim() });

        res.status(200).json({ message: 'Chat updated successfully' });
    } catch {

        res.status(500).json({ message: 'Server error while updating chat' });
    }
};

// Add members to chat
const addMembers = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        const chatId = parseInt(req.params.id, 10);
        const { member_ids }: AddMembersRequest = req.body;

        if (!userId) {
            res.status(HTTP_CONSTANTS.STATUS.UNAUTHORIZED).json({ message: HTTP_CONSTANTS.MESSAGES.NOT_AUTHENTICATED });
            return;
        }

        // Check if user is member of the chat
        const isMember = await chatService.isUserChatMember(chatId, userId);
        if (!isMember) {
            res.status(HTTP_CONSTANTS.STATUS.FORBIDDEN).json({ message: HTTP_CONSTANTS.MESSAGES.ACCESS_DENIED });
            return;
        }

        // Get the chat to check if it's a group chat
        const chat = await chatService.getChatById(chatId);
        if (!chat) {
            res.status(HTTP_CONSTANTS.STATUS.NOT_FOUND).json({ message: HTTP_CONSTANTS.MESSAGES.CHAT_NOT_FOUND });
            return;
        }

        // Only group chats can have members added
        if (!chat.is_group) {
            res.status(HTTP_CONSTANTS.STATUS.BAD_REQUEST).json({ message: HTTP_CONSTANTS.MESSAGES.CANNOT_ADD_TO_DM });
            return;
        }

        // Validate that all member IDs exist
        const userValidationPromises = member_ids.map(async (memberId) => {
            const user = await userService.getUserById(memberId);
            return { memberId, user };
        });

        const userValidationResults = await Promise.all(userValidationPromises);

        const invalidUser = userValidationResults.find(({ user }) => !user);
        if (invalidUser) {
            res.status(HTTP_CONSTANTS.STATUS.BAD_REQUEST).json({ message: `User with ID ${invalidUser.memberId} not found` });
            return;
        }

        // Check if users are already members
        const existingMembers = await chatService.getChatMembers(chatId);
        const existingMemberIds = existingMembers.map(member => member.id);
        const newMemberIds = member_ids.filter(id => !existingMemberIds.includes(id));

        if (newMemberIds.length === 0) {
            res.status(HTTP_CONSTANTS.STATUS.BAD_REQUEST).json({ message: 'All users are already members of this chat' });
            return;
        }

        // Add new members
        await chatService.addChatMembers(chatId, newMemberIds);

        res.status(HTTP_CONSTANTS.STATUS.OK).json({ message: 'Members added successfully' });
    } catch {

        res.status(HTTP_CONSTANTS.STATUS.INTERNAL_SERVER_ERROR).json({ message: HTTP_CONSTANTS.MESSAGES.SERVER_ERROR });
    }
};

// Remove members from chat
const removeMembers = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        const chatId = parseInt(req.params.id, 10);
        const { member_ids }: RemoveMembersRequest = req.body;

        if (!userId) {
            res.status(HTTP_CONSTANTS.STATUS.UNAUTHORIZED).json({ message: HTTP_CONSTANTS.MESSAGES.NOT_AUTHENTICATED });
            return;
        }

        // Check if user is member of the chat
        const isMember = await chatService.isUserChatMember(chatId, userId);
        if (!isMember) {
            res.status(HTTP_CONSTANTS.STATUS.FORBIDDEN).json({ message: HTTP_CONSTANTS.MESSAGES.ACCESS_DENIED });
            return;
        }

        // Get the chat to check if it's a group chat
        const chat = await chatService.getChatById(chatId);
        if (!chat) {
            res.status(HTTP_CONSTANTS.STATUS.NOT_FOUND).json({ message: HTTP_CONSTANTS.MESSAGES.CHAT_NOT_FOUND });
            return;
        }

        // Only group chats can have members removed
        if (!chat.is_group) {
            res.status(HTTP_CONSTANTS.STATUS.BAD_REQUEST).json({ message: HTTP_CONSTANTS.MESSAGES.CANNOT_REMOVE_FROM_DM });
            return;
        }

        // Check if users are actually members
        const existingMembers = await chatService.getChatMembers(chatId);
        const existingMemberIds = existingMembers.map(member => member.id);
        const validMemberIds = member_ids.filter(id => existingMemberIds.includes(id));

        if (validMemberIds.length === 0) {
            res.status(HTTP_CONSTANTS.STATUS.BAD_REQUEST).json({ message: 'None of the specified users are members of this chat' });
            return;
        }

        // Remove members
        await chatService.removeChatMembers(chatId, validMemberIds);

        res.status(HTTP_CONSTANTS.STATUS.OK).json({ message: 'Members removed successfully' });
    } catch {

        res.status(HTTP_CONSTANTS.STATUS.INTERNAL_SERVER_ERROR).json({ message: HTTP_CONSTANTS.MESSAGES.SERVER_ERROR });
    }
};

// Leave chat
const leaveChat = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        const chatId = parseInt(req.params.id, 10);

        if (!userId) {
            res.status(HTTP_CONSTANTS.STATUS.UNAUTHORIZED).json({ message: HTTP_CONSTANTS.MESSAGES.NOT_AUTHENTICATED });
            return;
        }

        // Check if user is member of the chat
        const isMember = await chatService.isUserChatMember(chatId, userId);
        if (!isMember) {
            res.status(HTTP_CONSTANTS.STATUS.FORBIDDEN).json({ message: HTTP_CONSTANTS.MESSAGES.NOT_CHAT_MEMBER });
            return;
        }

        // Remove user from chat
        await chatService.removeChatMembers(chatId, [userId]);

        res.status(HTTP_CONSTANTS.STATUS.OK).json({ message: 'Successfully left the chat' });
    } catch {

        res.status(HTTP_CONSTANTS.STATUS.INTERNAL_SERVER_ERROR).json({ message: HTTP_CONSTANTS.MESSAGES.SERVER_ERROR });
    }
};

// Delete chat
const deleteChat = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        const chatId = parseInt(req.params.id, 10);

        if (!userId) {
            res.status(HTTP_CONSTANTS.STATUS.UNAUTHORIZED).json({ message: HTTP_CONSTANTS.MESSAGES.NOT_AUTHENTICATED });
            return;
        }

        // Check if user is member of the chat
        const isMember = await chatService.isUserChatMember(chatId, userId);
        if (!isMember) {
            res.status(HTTP_CONSTANTS.STATUS.FORBIDDEN).json({ message: HTTP_CONSTANTS.MESSAGES.ACCESS_DENIED });
            return;
        }

        // Get the chat to check if user is the creator
        const chat = await chatService.getChatById(chatId);
        if (!chat) {
            res.status(HTTP_CONSTANTS.STATUS.NOT_FOUND).json({ message: HTTP_CONSTANTS.MESSAGES.CHAT_NOT_FOUND });
            return;
        }

        // Only the creator can delete the chat
        if (chat.created_by !== userId) {
            res.status(HTTP_CONSTANTS.STATUS.FORBIDDEN).json({ message: HTTP_CONSTANTS.MESSAGES.ONLY_CREATOR_DELETE });
            return;
        }

        await chatService.deleteChat(chatId);

        res.status(HTTP_CONSTANTS.STATUS.OK).json({ message: 'Chat deleted successfully' });
    } catch {

        res.status(HTTP_CONSTANTS.STATUS.INTERNAL_SERVER_ERROR).json({ message: HTTP_CONSTANTS.MESSAGES.SERVER_ERROR });
    }
};

export {
    getUserChats,
    getChatMembers,
    getChatById,
    createChat,
    createDirectChat,
    updateChat,
    addMembers,
    removeMembers,
    leaveChat,
    getUnjoinedChats,
    deleteChat
};
