import dotenv from 'dotenv';
dotenv.config();

export interface ServerConfig {
  nodeEnv: string;
  port: number;
  appUrl: string;
  geminiApiKey: string | undefined;
  databaseUrl: string | undefined;
  slackWebhookUrl: string | undefined;
  ghlWebhookUrl: string | undefined;
  ghlApiKey: string | undefined;
  sessionSecret: string;
}

export const config: ServerConfig = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: 3000,
  appUrl: process.env.APP_URL || 'http://localhost:3000',
  geminiApiKey: process.env.GEMINI_API_KEY,
  databaseUrl: process.env.DATABASE_URL,
  slackWebhookUrl: process.env.SLACK_WEBHOOK_URL,
  ghlWebhookUrl: process.env.GHL_WEBHOOK_URL,
  ghlApiKey: process.env.GHL_API_KEY,
  sessionSecret: process.env.SESSION_SECRET || 'greenscape-pro-p0-session-token',
};
