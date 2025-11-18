import { v4 as uuidv4 } from 'uuid';
import database from '../database/connection';
import { LearningData } from '../types';

class LearningDataModel {
    public async create(data: Omit<LearningData, 'id' | 'timestamp'>): Promise<LearningData> {
        const id = uuidv4();
        const query = `
      INSERT INTO learning_data (id, query, response, feedback, context, confidence)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

        const rows = await database.query<LearningData>(query, [
            id,
            data.query,
            data.response,
            data.feedback || null,
            JSON.stringify(data.context),
            data.confidence,
        ]);

        return rows[0];
    }

    public async findSimilar(query: string, limit: number = 5): Promise<LearningData[]> {
        const searchQuery = `
      SELECT * FROM learning_data
      WHERE to_tsvector('english', query) @@ plainto_tsquery('english', $1)
      ORDER BY confidence DESC, timestamp DESC
      LIMIT $2
    `;
        return await database.query<LearningData>(searchQuery, [query, limit]);
    }

    public async updateFeedback(id: string, feedback: 'positive' | 'negative'): Promise<void> {
        const query = 'UPDATE learning_data SET feedback = $1 WHERE id = $2';
        await database.query(query, [feedback, id]);
    }

    public async getHighConfidenceResponses(minConfidence: number = 0.8): Promise<LearningData[]> {
        const query = `
      SELECT * FROM learning_data
      WHERE confidence >= $1
      ORDER BY confidence DESC, timestamp DESC
    `;
        return await database.query<LearningData>(query, [minConfidence]);
    }
}

export default new LearningDataModel();
