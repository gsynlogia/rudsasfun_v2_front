export interface DiscordErrorPayload {
  error: string;
  errorType: string;
  context?: Record<string, any>;
  url?: string;
  userAgent?: string;
  timestamp?: string;
}

