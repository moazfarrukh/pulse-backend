    import { User } from './user';

    export interface Chat {
        id: number;
        is_group: boolean;
        name?: string;
        avatar?: string;
        created_by?: number;
        created_at: Date;
        updated_at: Date;
    }

    export interface ChatMember {
        id: number;
        chat_id: number;
        user_id: number;
        joined_at: Date;
        created_at: Date;
        updated_at: Date;
    }

    export interface ChatWithMembers extends Chat {
        members?: User[];
    }

    export interface CreateChatRequest {
        is_group: boolean;
        name?: string;
        member_ids: number[];
    }

    export interface UpdateChatRequest {
        name?: string;
    }

    export interface AddMembersRequest {
        member_ids: number[];
    }

    export interface RemoveMembersRequest {
        member_ids: number[];
    } 

export interface DirectChatRow extends Chat {
        other_display_name?: string;
        other_username?: string;
        other_avatar_url?: string;
    }