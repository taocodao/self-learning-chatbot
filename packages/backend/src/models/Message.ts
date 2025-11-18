import { v4 as uuidv4 } from 'uuid';
import database from '../database/connection';
import { Message } from '../types';

class MessageModel {
    public async create(messageData: Omit<Message, 'id' | 'timestamp'>): Promise<Message> {
        const id = uuidv4();
        const query = `
      INSERT INTO messages (id, session_id, content, sender, type, metadata)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

        const rows = await database.query<Message>(query, [
            id,
            messageData.sessionId,
            messageData.content,
            messageData.sender,
            messageData.type || 'text',
            JSON.stringify(messageData.metadata || {}),
        ]);

        return rows[0];
    }

    public async findBySessionId(sessionId: string, limit: number = 100): Promise<Message[]> {
        const query = `
      SELECT * FROM messages 
      WHERE session_id = $1 
      ORDER BY timestamp ASC 
      LIMIT $2
    `;
        return await database.query<Message>(query, [sessionId, limit]);
    }

    public async findById(id: string): Promise<Message | null> {
        const query = 'SELECT * FROM messages WHERE id = $1';
        const rows = await database.query<Message>(query, [id]);
        return rows[0] || null;
    }

    public async getRecentMessages(sessionId: string, count: number = 10): Promise<Message[]> {
        const query = `
      SELECT * FROM messages 
      WHERE session_id = $1 
      ORDER BY timestamp DESC 
      LIMIT $2
    `;
        const rows = await database.query<Message>(query, [sessionId, count]);
        return rows.reverse();
    }
}

export default new MessageModel();
