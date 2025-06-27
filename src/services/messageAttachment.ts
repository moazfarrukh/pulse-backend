import { QueryTypes } from 'sequelize';
import sequelize from '../database/sequelize';

export const messageAttachmentService = {
    async addAttachments(messageId: number, attachments: { file_url: string; file_type: string }[]) {
        if (!attachments.length) return;
        const now = new Date();
        const values = attachments.map((_, i) => `(:message_id, :file_url_${i}, :file_type_${i}, :created_at)`).join(', ');
        const replacements: { 
            message_id: number;
            created_at: Date;
            [key: `file_url_${number}`]: string;
            [key: `file_type_${number}`]: string;
        } = {
            message_id: messageId,
            created_at: now
        };
        attachments.forEach((att, i) => {
            replacements[`file_url_${i}`] = att.file_url;
            replacements[`file_type_${i}`] = att.file_type;
        });
        await sequelize.query(
            `INSERT INTO message_attachments (message_id, file_url, file_type, created_at) VALUES ${values}`,
            {
                replacements,
                type: QueryTypes.INSERT
            }
        );
    },
    async getAttachments(messageId: number) {
        const results = await sequelize.query(
            'SELECT id, file_url, file_type, created_at FROM message_attachments WHERE message_id = :message_id',
            {
                replacements: { message_id: messageId },
                type: QueryTypes.SELECT
            }
        );
        return results;
    }
};

export default messageAttachmentService; 