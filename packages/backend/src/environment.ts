import dotenv from 'dotenv';

dotenv.config();

interface EnvironmentConfig {
    NODE_ENV: 'development' | 'production' | 'test';
    PORT: number;
    FRONTEND_URL: string;

    // WhatsApp
    WHATSAPP_API_VERSION: string;
    WHATSAPP_PHONE_NUMBER_ID: string;
    WHATSAPP_BUSINESS_ACCOUNT_ID: string;
    WHATSAPP_ACCESS_TOKEN: string;
    WHATSAPP_VERIFY_TOKEN: string;
    WHATSAPP_APP_SECRET: string;

    // OpenAI
    OPENAI_API_KEY: string;
    OPENAI_MODEL: string;

    // Database
    DATABASE_URL: string;

    // Qdrant
    QDRANT_URL: string;
    QDRANT_API_KEY: string;
    QDRANT_COLLECTION_NAME: string;

    // Other
    LOG_LEVEL: 'debug' | 'info' | 'warn' | 'error';
}

const getEnvVariable = (key: string, defaultValue?: string): string => {
    const value = process.env[key] || defaultValue;
    if (!value) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
};

export const config: EnvironmentConfig = {
    NODE_ENV: (process.env.NODE_ENV as any) || 'development',
    PORT: parseInt(getEnvVariable('PORT', '4000')),
    FRONTEND_URL: getEnvVariable('FRONTEND_URL', 'http://localhost:3000'),

    // WhatsApp
    WHATSAPP_API_VERSION: getEnvVariable('WHATSAPP_API_VERSION', 'v21.0'),
    WHATSAPP_PHONE_NUMBER_ID: getEnvVariable('WHATSAPP_PHONE_NUMBER_ID'),
    WHATSAPP_BUSINESS_ACCOUNT_ID: getEnvVariable('WHATSAPP_BUSINESS_ACCOUNT_ID'),
    WHATSAPP_ACCESS_TOKEN: getEnvVariable('WHATSAPP_ACCESS_TOKEN'),
    WHATSAPP_VERIFY_TOKEN: getEnvVariable('WHATSAPP_VERIFY_TOKEN'),
    WHATSAPP_APP_SECRET: getEnvVariable('WHATSAPP_APP_SECRET'),

    // OpenAI
    OPENAI_API_KEY: getEnvVariable('OPENAI_API_KEY'),
    OPENAI_MODEL: getEnvVariable('OPENAI_MODEL', 'gpt-4o'),

    // Database
    DATABASE_URL: getEnvVariable('DATABASE_URL'),

    // Qdrant
    QDRANT_URL: getEnvVariable('QDRANT_URL', 'http://localhost:6333'),
    QDRANT_API_KEY: getEnvVariable('QDRANT_API_KEY', ''),
    QDRANT_COLLECTION_NAME: getEnvVariable('QDRANT_COLLECTION_NAME', 'business_knowledge'),

    // Other
    LOG_LEVEL: (getEnvVariable('LOG_LEVEL', 'info') as any),
};
