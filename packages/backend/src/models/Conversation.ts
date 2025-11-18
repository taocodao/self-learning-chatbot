import { v4 as uuidv4 } from 'uuid';
import database from '../database/connection';
import { Conversation } from '../types';

class ConversationModel {
    public async create(userId: string, platform: 'web' | 'whatsapp' = 'web'): Promise<Conversation> {
        const id = uuidv4();
        const query = `
      INSERT INTO conversations (id, user_id, platform)
      VALUES ($1, $2, $3)
      RETURNING *
    `;

        const rows = await database.query<Conversation>(query, [id, userId, platform]);
        return rows[0];
    }

    public async findById(id: string): Promise<Conversation | null> {
        const query = 'SELECT * FROM conversations WHERE id = $1';
        const rows = await database.query<Conversation>(query, [id]);
        return rows[0] || null;
    }

    public async findByUserId(userId: string): Promise<Conversation[]> {
        const query = 'SELECT * FROM conversations WHERE user_id = $1 ORDER BY start_time DESC';
        return await database.query<Conversation>(query, [userId]);
    }

    public async update(id: string, data: Partial<Conversation>): Promise<Conversation | null> {
        const fields = Object.keys(data)
            .map((key, index) => `${key} = $${index + 2}`)
            .join(', ');

        const values = Object.values(data);
        const query = `
      UPDATE conversations 
      SET ${fields}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

        const rows = await database.query<Conversation>(query, [id, ...values]);
        return rows[0] || null;
    }

    public async endSession(id: string): Promise<void> {
        const query = `
      UPDATE conversations 
      SET is_active = false, end_time = CURRENT_TIMESTAMP
      WHERE id = $1
    `;
        await database.query(query, [id]);
    }
}

export default new ConversationModel();
