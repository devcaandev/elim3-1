import { genkit } from "~encore/clients";
import { sendTextMessage } from "./outgoing";

/**
 * Helper function to extract message ID from a webhook event
 */
function extractMessageId(webhookData: WhatsAppWebhook): string | null {
    try {
        const message = webhookData.entry[0]?.changes[0]?.value?.messages?.[0];
        return message?.id || null;
    } catch (error) {
        console.error('Error extracting message ID:', error);
        return null;
    }
}

/**
 * Message processing cache to prevent duplicate processing
 * In production, this should be replaced with Redis or similar distributed cache
 */
const messageProcessingCache = new Set<string>();
const CACHE_CLEANUP_INTERVAL = 10 * 60 * 1000; // 10 minutes

// Clean up cache periodically to prevent memory leaks
setInterval(() => {
    messageProcessingCache.clear();
    console.log('🧹 Message processing cache cleared');
}, CACHE_CLEANUP_INTERVAL);

/**
 * Enhanced message processing with performance optimizations
 * 
 * Features:
 * - Message deduplication
 * - Parallel processing where possible
 * - Comprehensive error handling
 * - Performance monitoring
 * - Graceful degradation
 */
export const processMessage = async (payload: WhatsAppWebhook): Promise<void> => {
    const startTime = Date.now();
    let messageId: string | null = null;
    
    try {
        // Extract message information
        const message = payload?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
        const textMessage = message?.text?.body;
        const userId = message?.from;
        messageId = extractMessageId(payload);
        
        // Message validation
        if (!message || !textMessage || !userId) {
            console.log('ℹ️ Skipping non-text message or missing data:', {
                hasMessage: !!message,
                hasText: !!textMessage,
                hasUserId: !!userId,
                messageType: message?.type || 'unknown',
                timestamp: new Date().toISOString()
            });
            return;
        }
        
        // Deduplication check
        const deduplicationKey = `${userId}_${messageId}_${textMessage.substring(0, 50)}`;
        if (messageProcessingCache.has(deduplicationKey)) {
            console.log('⚠️ Duplicate message detected, skipping:', {
                userId,
                messageId,
                deduplicationKey: deduplicationKey.substring(0, 100),
                timestamp: new Date().toISOString()
            });
            return;
        }
        
        // Mark message as being processed
        messageProcessingCache.add(deduplicationKey);
        
        console.log('📝 Processing text message:', {
            userId,
            messageId,
            messageLength: textMessage.length,
            preview: textMessage.substring(0, 100) + (textMessage.length > 100 ? '...' : ''),
            timestamp: new Date().toISOString()
        });
        
        // OPTIMIZATION: Process AI generation (this is the main bottleneck)
        const response = await processWithRetry(async () => {
            return await genkit.processMessage({
                userId: userId,
                content: textMessage
            });
        }, 2); // Retry up to 2 times
        
        const aiProcessingTime = Date.now() - startTime;
        
        console.log('🤖 AI response generated:', {
            userId,
            messageId,
            aiProcessingTime: `${aiProcessingTime}ms`,
            hasReply: !!response.reply,
            replyLength: response.reply?.length || 0,
            fallback: response.metadata?.fallback || false,
            timestamp: new Date().toISOString()
        });
        
        // Send response if available
        if (response.reply && response.processed) {
            // OPTIMIZATION: Send message without waiting, just log the result
            sendTextMessage(userId, response.reply)
                .then(() => {
                    const totalTime = Date.now() - startTime;
                    console.log('✅ Message processing completed successfully:', {
                        userId,
                        messageId,
                        totalTime: `${totalTime}ms`,
                        aiTime: `${aiProcessingTime}ms`,
                        timestamp: new Date().toISOString()
                    });
                })
                .catch(error => {
                    console.error('❌ Failed to send WhatsApp message:', {
                        userId,
                        messageId,
                        error: error.message || error,
                        reply: response.reply?.substring(0, 100),
                        timestamp: new Date().toISOString()
                    });
                });
        } else {
            console.warn('⚠️ No valid response generated:', {
                userId,
                messageId,
                processed: response.processed,
                hasReply: !!response.reply,
                error: response.metadata?.error,
                timestamp: new Date().toISOString()
            });
        }
        
    } catch (error: any) {
        const processingTime = Date.now() - startTime;
        
        console.error('❌ Message processing failed:', {
            messageId,
            userId: payload?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.from,
            error: error.message || error,
            errorType: error.name || 'Unknown',
            processingTime: `${processingTime}ms`,
            timestamp: new Date().toISOString(),
            stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
        });
        
        // Don't throw - we don't want to crash the webhook handler
        // The error is already logged for debugging
    }
};

/**
 * Retry wrapper for unreliable operations
 */
async function processWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 2,
    delayMs: number = 1000
): Promise<T> {
    let lastError: any;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error: any) {
            lastError = error;
            
            if (attempt === maxRetries) {
                console.error(`❌ Operation failed after ${maxRetries + 1} attempts:`, {
                    error: error.message || error,
                    attempts: attempt + 1,
                    timestamp: new Date().toISOString()
                });
                throw error;
            }
            
            console.warn(`⚠️ Operation failed, retrying (${attempt + 1}/${maxRetries + 1}):`, {
                error: error.message || error,
                nextRetryIn: `${delayMs}ms`,
                timestamp: new Date().toISOString()
            });
            
            // Exponential backoff
            await new Promise(resolve => setTimeout(resolve, delayMs * Math.pow(2, attempt)));
        }
    }
    
    throw lastError;
}
