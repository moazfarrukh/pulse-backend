export interface MessageRead {
    id: number;
    message_id: number;
    user_id: number;
    read_at: Date;
    created_at: Date;
    updated_at: Date;
}
export interface MessageAttachment {
    file_url: string;
    file_type: string;
    created_at: Date;
}

// In src/types/Message.ts

export interface AttachmentPayload {
    buffer: ArrayBuffer;
    type: string;
    name: string;
  }
  
  export interface MessagePayload {
    id: number;
    chat_id: number;
    sender_id?: number;
    content: string;
    attachments?: AttachmentPayload[];
    created_at: Date;
    updated_at: Date;
    edited_at?: Date;
    deleted_at?: Date;
  }

// Update Message interface to include attachments
export interface Message {
    id: number;
    chat_id: number;
    sender_id?: number;
    content: string;
    attachments?: MessageAttachment[];
    created_at: Date;
    updated_at: Date;
    edited_at?: Date;
    deleted_at?: Date;
}

export interface MessageWithSender extends Message {
            display_name?: string;
            username?: string;
            avatar_url?: string;
            
    }



export interface MessageWithSenderAndAttachments extends MessageWithSender {
    attachments: MessageAttachment[];
}

export interface SendMessageRequest {
    chat_id: number;
    content: string;
    attachments?: File[];
    sender_id: number;
}

export interface EditMessageRequest {
    content: string;
    attachments?: File[];
}

export interface DeleteMessageRequest {
    message_id: number;
}

export interface MarkAsReadRequest {
    message_ids: number[];
}

export interface SocketMessage {
    id: number;
    chat_id: number;
    sender_id?: number;
    content: string;
    created_at: Date;
    sender?: {
        id: number;
        display_name: string;
        username: string;
        avatar_url?: string;
    };
}

export interface MessageSendEvent {
    chat_id: number;
    content: string;
    attachments?: File[];
    sender_id: number;
}

export interface MessageEditEvent {
    message_id: number;
    content: string;
    attachments?: File[];
}

export interface MessageDeleteEvent {
    message_id: number;
}

export interface TypingStartEvent {
    chat_id: number;
    user_id: number;
    user_info: { display_name: string; username: string };
}

export interface TypingStopEvent {
    chat_id: number;
    user_id: number;
}

export interface ChatJoinEvent {
    chat_id: number;
    user_id: number;
}

export interface ChatLeaveEvent {
    chat_id: number;
    user_id: number;
}

