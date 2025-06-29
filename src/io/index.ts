import { Server, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { config } from '../config';
import MessageHandler from './messageHandler';
import MessageEmitter from './messageEmitter';
import SocketEvents from '../constants/socketEvents';
import { MessageSendEvent, MessageEditEvent, MessageDeleteEvent, TypingStartEvent, TypingStopEvent, ChatJoinEvent, ChatLeaveEvent } from '../types/message';


export class SocketIOSetup {
    private io: Server;
    
    private messageEmitter: MessageEmitter;

    private messageHandler: MessageHandler;

    private activeUsers: Map<number, Socket> = new Map();

    constructor(server: HttpServer) {
        this.io = new Server(server, {
            cors: {
                origin: config.FRONTEND_URL,
                credentials: true,
            },
        });

        this.messageEmitter = new MessageEmitter(this.io);
        this.messageHandler = new MessageHandler(this.messageEmitter);

        this.setupMiddleware();
        this.setupEventHandlers();
    }

    private setupMiddleware() {
        // Authentication middleware
        this.io.use(async (socket: Socket, next: (err?: Error) => void):Promise<void>  => {
            try {
                const { userId } = socket.handshake.auth;
                if (!userId) {
                    next( Error('Authentication required'));
                }

                next();
            } catch  {
                next(new Error('Authentication failed'));
            }
        });

    }

    private setupEventHandlers() {
        this.io.on('connection', (socket: Socket) => {
            this.messageHandler.handleConnection(socket,this.activeUsers);
           // Handle chat room joining
            socket.on(SocketEvents.ON_JOIN_CHAT, (data:ChatJoinEvent) => {
                this.messageHandler.handleChatJoin(socket, data);
            });

            // Handle chat room leaving
            socket.on(SocketEvents.ON_LEAVE_CHAT, (data:ChatLeaveEvent) => {
                this.messageHandler.handleChatLeave(socket, data);
            });

            // Handle message events
            socket.on(SocketEvents.ON_MESSAGE_SEND, (data: MessageSendEvent) => {
                this.messageHandler.handleSendMessage(socket, data);
            });

            socket.on(SocketEvents.ON_MESSAGE_EDIT, (data: MessageEditEvent) => {
                this.messageHandler.handleEditMessage(socket, data);
            });

            socket.on(SocketEvents.ON_MESSAGE_DELETE, (data: MessageDeleteEvent) => {
                this.messageHandler.handleDeleteMessage(socket, data);
            });

            // Handle typing events
            socket.on(SocketEvents.ON_TYPING_START, (data: TypingStartEvent) => {
                this.messageHandler.handleTypingStart(socket, data);
            });

            socket.on(SocketEvents.ON_TYPING_STOP, (data: TypingStopEvent) => {
                this.messageHandler.handleTypingStop(socket, data);
            });

            socket.on(SocketEvents.ON_DISCONNECT, () => {
                this.messageHandler.handleDisconnection(socket,this.activeUsers);
            });
        });
    }

    public getIO(): Server {
        return this.io;
    }

    public getMessageEmitter(): MessageEmitter {
        return this.messageEmitter;
    }
}

export default SocketIOSetup;