export interface User {
    id: number;
    email: string;
    display_name: string;
    username: string;
    password: string;
    phone?: string;
    avatar_url?: string;
    bio?: string;
    created_at: Date;
    updated_at: Date;
}

