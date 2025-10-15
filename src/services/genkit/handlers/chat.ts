import { api } from "encore.dev/api";
import { aiWithMetrics } from "../ai_config";

/**
 * Request interface for message processing
 */
interface ProcessMessageRequest {
  userId: string;
  content: string;
}

/**
 * Response interface for message processing
 */
interface ProcessMessageResponse {
  processed: boolean;
  reply?: string;
  metadata?: {
    processingTime?: number;
    fallback?: boolean;
    error?: string;
  };
}

/**
 * Enhanced chat processing endpoint with performance monitoring
 * 
 * Features:
 * - Comprehensive error handling
 * - Performance metrics
 * - Fallback responses
 * - Input validation
 */
export const processMessage = api<ProcessMessageRequest, ProcessMessageResponse>(
    {
        method: 'POST',
        path: '/chat',
        expose: false,
    },
    async (req) => {
        const startTime = Date.now();
        const { userId, content } = req;
        
        // Input validation
        if (!userId || !content) {
            console.error('❌ Invalid request parameters:', { userId: !!userId, content: !!content });
            return {
                processed: false,
                reply: "I'm sorry, I didn't receive your message properly. Please try again.",
                metadata: {
                    processingTime: Date.now() - startTime,
                    error: 'Invalid parameters'
                }
            };
        }
        
        // Sanitize and truncate input
        const sanitizedContent = content.trim().substring(0, 1000); // Limit input length
        
        if (!sanitizedContent) {
            return {
                processed: false,
                reply: "I didn't receive any text in your message. Please send me a text message.",
                metadata: {
                    processingTime: Date.now() - startTime,
                    error: 'Empty content'
                }
            };
        }
        
        console.log('💬 Processing chat message:', {
            userId,
            contentLength: sanitizedContent.length,
            timestamp: new Date().toISOString()
        });
        
        try {
            // Use the optimized AI service with metrics
            console.log('🔍 Attempting AI generation with:', {
                userId,
                contentLength: sanitizedContent.length,
                timestamp: new Date().toISOString()
            });

            const genkitResponse = await aiWithMetrics.generate({
                prompt: sanitizedContent,
                userId
            });
            
            console.log('🔍 Raw AI response:', {
                userId,
                responseType: typeof genkitResponse,
                hasText: !!genkitResponse?.text,
                textLength: genkitResponse?.text?.length,
                metadata: genkitResponse?.metadata,
                timestamp: new Date().toISOString()
            });
            
            if (!genkitResponse || !genkitResponse.text) {
                console.error('❌ AI generation failed:', {
                    userId,
                    error: 'No response generated',
                    rawResponse: JSON.stringify(genkitResponse),
                    timestamp: new Date().toISOString()
                });
                return {
                    processed: false,
                    reply: "I'm sorry, I couldn't generate a response right now. Please try again.",
                    metadata: {
                        processingTime: Date.now() - startTime,
                        fallback: true,
                        error: 'No response generated'
                    }
                };
            }
            
            const responseText = genkitResponse.text;
            const processingTime = Date.now() - startTime;
            
            console.log('✅ Chat processing completed:', {
                userId,
                processingTime: `${processingTime}ms`,
                responseLength: responseText.length,
                fallback: false,
                timestamp: new Date().toISOString()
            });
            
            return {
                processed: true,
                reply: responseText,
                metadata: {
                    processingTime,
                    fallback: genkitResponse.metadata?.fallback || false
                }
            };
            
        } catch (error: any) {
            const processingTime = Date.now() - startTime;
            
            console.error('❌ Chat processing failed:', {
                userId,
                error: error.message || error,
                processingTime: `${processingTime}ms`,
                timestamp: new Date().toISOString(),
                stack: error.stack
            });
            
            // Return fallback response instead of crashing
            return {
                processed: false,
                reply: "I'm experiencing some technical difficulties right now. Please try again in a moment.",
                metadata: {
                    processingTime,
                    error: error.message || 'Unknown error',
                    fallback: true
                }
            };
        }
    }
);
