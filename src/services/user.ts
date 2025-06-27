import { QueryTypes } from 'sequelize';
import sequelize from '../database/sequelize';

import { User } from '../types/user';

export const userService = {
    async getUserById(id: number):Promise<User | null> {
        const [results] = await sequelize.query(
            'SELECT * FROM users WHERE id = :id',
            {
                replacements: { id },
                type: QueryTypes.SELECT
            }
        );
        return results as User | null;
    },
    async getAllUsers(): Promise<User[]> {
        const results = await sequelize.query(
            'SELECT * FROM users',
            {
                type: QueryTypes.SELECT
            }
        );
        return results as User[];
    },
    async createUser(data: Partial<User>) {
        const [results] = await sequelize.query(
            'INSERT INTO users (email, display_name, username, password, created_at, updated_at) VALUES (:email, :display_name, :username, :password, :created_at, :updated_at) returning *',
            {
                replacements: {
                    email: data.email,
                    display_name: data.display_name,
                    username: data.username,
                    password: data.password,
                    created_at: new Date(),
                    updated_at: new Date()
                },
                type: QueryTypes.INSERT
            }
        );
        if (Array.isArray(results)) {
            return results[0];
        }
        return results;
    },
    async getUserByEmail(email: string)  {
        const results = await sequelize.query(
            'SELECT * FROM users WHERE email = :email',
            {
                replacements: { email },
                type: QueryTypes.SELECT
            }
        );
        return Array.isArray(results) && results.length > 0 ? results[0] as User : null;
    },
    async updateUser(id: number, data: Partial<User>) {
        // Build SET clause and replacements dynamically
        const updates: string[] = [];
        const replacements: Partial<User> = { id };
        
        // Only include fields that are defined
        if (data.email !== undefined) {
            updates.push('email = :email');
            replacements.email = data.email;
        }
        if (data.display_name !== undefined) {
            updates.push('display_name = :display_name');
            replacements.display_name = data.display_name;
        }
        if (data.username !== undefined) {
            updates.push('username = :username');
            replacements.username = data.username;
        }
        if (data.phone !== undefined) {
            updates.push('phone = :phone');
            replacements.phone = data.phone;
        }
        if (data.avatar_url !== undefined) {
            updates.push('avatar_url = :avatar_url');
            replacements.avatar_url = data.avatar_url;
        }
        if (data.bio !== undefined) {
            updates.push('bio = :bio');
            replacements.bio = data.bio;
        }
        
        // Always update the updated_at timestamp
        updates.push('updated_at = :updated_at');
        replacements.updated_at = new Date();
        
        // If no updates, return early
        if (updates.length === 1) { // Only updated_at
            return null;
        }
        
        const [results] = await sequelize.query(
            `UPDATE users SET ${updates.join(', ')} WHERE id = :id`,
            {
                replacements,
                type: QueryTypes.UPDATE
            }
        );
        return results;
    },
    async deleteUser(id: number) {
        await sequelize.query(
            'DELETE FROM users WHERE id = :id',
            {
                replacements: { id },
                type: QueryTypes.DELETE
            }
        );

        return { message: 'User deleted successfully' };
    },
    async updateUserAvatar(id: number, avatarUrl: string) {
        const [results] = await sequelize.query(
            'UPDATE users SET avatar_url = :avatar_url, updated_at = :updated_at WHERE id = :id',
            {
                replacements: {
                    id,
                    avatar_url: avatarUrl,
                    updated_at: new Date()
                },
                type: QueryTypes.UPDATE
            }
        );
        return results;
    }
};

export default userService;