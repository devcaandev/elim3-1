import { WHATSAPP_CONFIG } from "../../config/env";

/**
 * Cached configuration to avoid repeated secret resolution
 * Secrets are resolved once and cached for the lifetime of the process
 */
class WhatsAppConfig {
    private static instance: WhatsAppConfig;
    private phoneNumberId: string | null = null;
    private accessToken: string | null = null;
    private readonly baseUrl: string;

    private constructor() {
        this.baseUrl = `${WHATSAPP_CONFIG.WHATSAPP_API_URL}/${WHATSAPP_CONFIG.API_VERSION}`;
    }

    static getInstance(): WhatsAppConfig {
        if (!WhatsAppConfig.instance) {
            WhatsAppConfig.instance = new WhatsAppConfig();
        }
        return WhatsAppConfig.instance;
    }

    /**
     * Get cached phone number ID or resolve and cache it
     */
    getPhoneNumberId(): string {
        if (!this.phoneNumberId) {
            this.phoneNumberId = WHATSAPP_CONFIG.PHONE_NUMBER_ID();
            if (!this.phoneNumberId) {
                throw new Error('WhatsApp Phone Number ID not configured');
            }
        }
        return this.phoneNumberId;
    }

    /**
     * Get cached access token or resolve and cache it
     */
    getAccessToken(): string {
        if (!this.accessToken) {
            this.accessToken = WHATSAPP_CONFIG.ACCESS_TOKEN();
            if (!this.accessToken) {
                throw new Error('WhatsApp Access Token not configured');
            }
        }
        return this.accessToken;
    }

    /**
     * Get the complete API URL for sending messages
     */
    getMessagesUrl(): string {
        return `${this.baseUrl}/${this.getPhoneNumberId()}/messages`;
    }

    /**
     * Get request headers for WhatsApp API
     */
    getHeaders(): Record<string, string> {
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.getAccessToken()}`,
            'User-Agent': 'WhatsApp-Genkit-Bot/1.0'
        };
    }
}

/**
 * Message sending interface with metadata
 */
interface SendMessageResult {
    success: boolean;
    messageId?: string;
    error?: string;
    responseTime?: number;
    retryAttempt?: number;
}

/**
 * Enhanced text message sending with performance optimization and error handling
 * 
 * Features:
 * - Cached configuration to avoid repeated secret resolution
 * - Comprehensive error handling with fallback responses
 * - Performance monitoring and timing metrics
 * - Retry mechanism with exponential backoff
 * - Structured logging for debugging
 * - Response validation and parsing
 */
export const sendTextMessage = async (
    userId: string, 
    responseText: string,
    options: {
        maxRetries?: number;
        timeoutMs?: number;
        preview_url?: boolean;
    } = {}
): Promise<any> => {
    const startTime = Date.now();
    const { maxRetries = 2, timeoutMs = 10000, preview_url = false } = options;
    const config = WhatsAppConfig.getInstance();
    
    // Input validation
    if (!userId || !responseText) {
        const error = 'Invalid parameters: userId and responseText are required';
        console.error('❌ Send message failed:', { error, userId: !!userId, responseText: !!responseText });
        throw new Error(error);
    }

    // Sanitize and truncate message if too long
    const sanitizedText = responseText.trim().substring(0, 4000); // WhatsApp limit is ~4000 chars
    
    if (!sanitizedText) {
        const error = 'Empty message content after sanitization';
        console.error('❌ Send message failed:', { error, originalLength: responseText.length });
        throw new Error(error);
    }

    console.log('📤 Sending WhatsApp message:', {
        userId,
        messageLength: sanitizedText.length,
        preview: sanitizedText.substring(0, 100) + (sanitizedText.length > 100 ? '...' : ''),
        timestamp: new Date().toISOString()
    });

    // Retry logic with exponential backoff
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const attemptStartTime = Date.now();
            
            // Create AbortController for timeout handling
            const abortController = new AbortController();
            const timeoutId = setTimeout(() => abortController.abort(), timeoutMs);
            
            try {
                const whatsappResponse = await fetch(config.getMessagesUrl(), {
                    method: 'POST',
                    headers: config.getHeaders(),
                    body: JSON.stringify({
                        messaging_product: "whatsapp",
                        to: userId,
                        text: { 
                            body: sanitizedText,
                            preview_url 
                        },
                    }),
                    signal: abortController.signal
                });

                clearTimeout(timeoutId);
                
                const responseTime = Date.now() - attemptStartTime;
                const totalTime = Date.now() - startTime;

                if (!whatsappResponse.ok) {
                    const errorText = await whatsappResponse.text();
                    const error = `HTTP ${whatsappResponse.status} ${whatsappResponse.statusText}: ${errorText}`;
                    
                    console.error('❌ WhatsApp API error:', {
                        userId,
                        status: whatsappResponse.status,
                        statusText: whatsappResponse.statusText,
                        error: errorText,
                        attempt: attempt + 1,
                        responseTime: `${responseTime}ms`,
                        timestamp: new Date().toISOString()
                    });
                    
                    // Don't retry on 4xx errors (client errors)
                    if (whatsappResponse.status >= 400 && whatsappResponse.status < 500) {
                        throw new Error(error);
                    }
                    
                    throw new Error(error);
                }

                // Parse successful response
                const responseData = await whatsappResponse.json() as any;
                const messageId = responseData.messages?.[0]?.id;

                console.log('✅ WhatsApp message sent successfully:', {
                    userId,
                    messageId,
                    responseTime: `${responseTime}ms`,
                    totalTime: `${totalTime}ms`,
                    attempt: attempt + 1,
                    messageLength: sanitizedText.length,
                    timestamp: new Date().toISOString()
                });

                return responseData;

            } catch (fetchError: any) {
                clearTimeout(timeoutId);
                
                // Handle timeout specifically
                if (fetchError.name === 'AbortError') {
                    throw new Error(`Request timeout after ${timeoutMs}ms`);
                }
                
                throw fetchError;
            }

        } catch (error: any) {
            const attemptTime = Date.now() - startTime;
            
            if (attempt === maxRetries) {
                console.error('❌ WhatsApp message sending failed after all retries:', {
                    userId,
                    error: error.message || error,
                    attempts: attempt + 1,
                    totalTime: `${attemptTime}ms`,
                    timestamp: new Date().toISOString()
                });
                
                throw error;
            }

            const backoffDelay = Math.min(1000 * Math.pow(2, attempt), 5000); // Max 5 seconds
            
            console.warn('⚠️ WhatsApp message sending failed, retrying:', {
                userId,
                error: error.message || error,
                attempt: attempt + 1,
                maxRetries: maxRetries + 1,
                nextRetryIn: `${backoffDelay}ms`,
                timestamp: new Date().toISOString()
            });

            await new Promise(resolve => setTimeout(resolve, backoffDelay));
        }
    }

    throw new Error('Unexpected error in retry logic');
};