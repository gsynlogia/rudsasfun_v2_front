/**
 * Discord Error Reporting for Frontend
 * Sends frontend errors to Discord webhook with "FRONT" flag
 */

const DISCORD_WEBHOOK_URL = process.env.NEXT_PUBLIC_DISCORD_WEBHOOK_URL || '';

interface DiscordErrorPayload {
  error: string;
  errorType: string;
  context?: Record<string, any>;
  url?: string;
  userAgent?: string;
  timestamp?: string;
}

/**
 * Send error to Discord webhook
 * Flags error as coming from frontend
 */
export async function sendErrorToDiscord(
  error: Error | string,
  context?: Record<string, any>
): Promise<void> {
  // Don't send if webhook URL is not configured
  if (!DISCORD_WEBHOOK_URL) {
    console.warn('[Discord] Webhook URL not configured, skipping error report');
    return;
  }

  try {
    const errorMessage = typeof error === 'string' ? error : error.message;
    const errorType = typeof error === 'string' ? 'UnknownError' : error.constructor.name;
    const stack = typeof error === 'string' ? undefined : error.stack;

    const payload: DiscordErrorPayload = {
      error: errorMessage,
      errorType,
      context: {
        ...context,
        stack,
        source: 'FRONTEND', // Flag as frontend error
      },
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
      timestamp: new Date().toISOString(),
    };

    // Create Discord embed
    const embed = {
      title: '🚨 Frontend Error',
      description: `**Error Type:** ${errorType}\n**Message:** ${errorMessage}`,
      color: 0xff0000, // Red
      fields: [
        {
          name: 'Source',
          value: 'FRONTEND',
          inline: true,
        },
        {
          name: 'URL',
          value: payload.url || 'N/A',
          inline: false,
        },
        {
          name: 'Timestamp',
          value: payload.timestamp || 'N/A',
          inline: true,
        },
      ],
      footer: {
        text: 'Radsas Fun - Frontend Error Monitor',
      },
    };

    // Add context fields if available
    if (context && Object.keys(context).length > 0) {
      const contextStr = JSON.stringify(context, null, 2);
      // Discord field value limit is 1024 characters
      if (contextStr.length <= 1024) {
        embed.fields.push({
          name: 'Context',
          value: `\`\`\`json\n${contextStr}\n\`\`\``,
          inline: false,
        });
      } else {
        embed.fields.push({
          name: 'Context',
          value: `\`\`\`json\n${contextStr.substring(0, 1000)}...\n\`\`\``,
          inline: false,
        });
      }
    }

    // Add stack trace if available
    if (stack && stack.length <= 1024) {
      embed.fields.push({
        name: 'Stack Trace',
        value: `\`\`\`\n${stack}\n\`\`\``,
        inline: false,
      });
    }

    const response = await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        embeds: [embed],
      }),
    });

    if (!response.ok) {
      console.error('[Discord] Failed to send error:', response.status, response.statusText);
    }
  } catch (err) {
    // Don't throw - we don't want Discord errors to break the app
    console.error('[Discord] Error sending to Discord:', err);
  }
}


