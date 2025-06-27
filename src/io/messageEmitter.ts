import { Server as SocketIOServer } from 'socket.io';
import { SocketMessage } from '../types/message';
import SocketEvents from '../constants/socketEvents';

export default class MessageEmitter {
    private io: SocketIOServer;

    constructor(io: SocketIOServer) {
        this.io = io;
    }

    
    emitNewMessage(chatId: number, message: SocketMessage): void {
        this.io.to(`chat:${chatId}`).emit(SocketEvents.ON_MESSAGE, message);
    }

    
    emitMessageEdited(chatId: number, message: SocketMessage): void {
        this.io.to(`chat:${chatId}`).emit(SocketEvents.ON_MESSAGE_EDIT, message);
    }

    
    emitMessageDeleted(chatId: number, messageId: number): void {
        this.io.to(`chat:${chatId}`).emit(SocketEvents.ON_MESSAGE_DELETE, { message_id: messageId });
    }

    emitTypingStart(chatId: number, userId: number, userInfo: { display_name: string; username: string }): void {
        this.io.to(`chat:${chatId}`).emit(SocketEvents.ON_TYPING_START, {
            chat_id: chatId,
            user_id: userId,
            user_info: userInfo
        });
    }

    
    emitTypingStop(chatId: number, userId: number): void {
        this.io.to(`chat:${chatId}`).emit(SocketEvents.ON_TYPING_STOP, {
            chat_id: chatId,
            user_id: userId
        });
    }

    
    emitError(socketId: string, error: string, details?: unknown): void {
        this.io.to(socketId).emit('error', {
            message: error,
            details
        });
    }

    emitUserJoined(chatId: number, userId: number): void {
        this.io.to(`chat:${chatId}`).emit(SocketEvents.ON_USER_JOINED, {
            chat_id: chatId,
            user_id: userId
        });
    }

    emitUserLeft(chatId: number, userId: number): void {
        this.io.to(`chat:${chatId}`).emit(SocketEvents.ON_USER_LEFT, {
            chat_id: chatId,
            user_id: userId
        });
    }

    emitPresenceUpdate(user_id: number, status: string): void {
        this.io.emit(SocketEvents.ON_PRESENCE_UPDATE, {
            user_id,
            status
        });
    }

}
