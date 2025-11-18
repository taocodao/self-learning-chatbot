import dotenv from 'dotenv';

dotenv.config();

interface Config {
    port: number;
    nodeEnv: string;
    frontendUrl: string;
    database: {
        url: string;
    };
    whatsapp: {
        apiToken: string;
        phoneId: string;
        accountId: string;
        webhookVerifyToken: string;
    };
    ai: {
        openaiApiKey: string;
        model: string;
    };
}

const config: Config = {
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:8080',
    database: {
        url: process.env.DATABASE_URL || 'postgresql://localhost:5432/chatbot_db',
    },
    whatsapp: {
        apiToken: process.env.WHATSAPP_API_TOKEN || '',
        phoneId: process.env.WHATSAPP_PHONE_ID || '',
        accountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '',
        webhookVerifyToken: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'your_verify_token',
    },
    ai: {
        openaiApiKey: process.env.OPENAI_API_KEY || '',
        model: process.env.AI_MODEL || 'gpt-4',
    },
};

export default config;
