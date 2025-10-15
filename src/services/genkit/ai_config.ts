import { googleAI } from '@genkit-ai/google-genai';
import { genkit, z } from 'genkit';
import { WHATSAPP_CONFIG } from '../config/env';

/**
 * AI Configuration optimized for WhatsApp message responses
 * 
 * Performance optimizations:
 * - Low temperature (0.3) for consistent, focused responses
 * - Limited output tokens (200) for faster generation and concise replies
 * - 8-second timeout to prevent indefinite hangs
 * - Gemini 2.5 Flash model for best speed/quality balance
 */
const API_KEY = WHATSAPP_CONFIG.GEMINI_KEY_DEVTHINJI();
if (!API_KEY) {
    throw new Error('GEMINI_KEY_DEVTHINJI is not configured');
}

// Model configuration
const MODEL_CONFIG = {
    name: 'gemini-2.5-flash',
    temperature: 0.7,
    maxOutputTokens: 1000,
    topP: 0.95,
    topK: 40
} as const;

export const ai = genkit({
    plugins: [
        googleAI({
            apiKey: API_KEY
        })
    ],
    model: googleAI.model(MODEL_CONFIG.name, {
        temperature: MODEL_CONFIG.temperature,
        maxOutputTokens: MODEL_CONFIG.maxOutputTokens,
        topP: MODEL_CONFIG.topP,
        topK: MODEL_CONFIG.topK
    })
});

/**
 * Enhanced response interface that includes both Genkit response and our custom metadata
 */
interface EnhancedGenerateResponse {
    text?: string;
    metadata?: {
        fallback?: boolean;
        error?: string;
        [key: string]: any;
    };
    [key: string]: any; // Allow other properties from GenerateResponse
}

/**
 * Performance monitoring wrapper for AI calls
 */
/**
 * Timeout wrapper for promises
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
        promise,
        new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
        )
    ]);
}

export const aiWithMetrics = {
    async generate(options: { prompt: string; userId?: string }): Promise<EnhancedGenerateResponse> {
        const startTime = Date.now();
        const { prompt, userId } = options;
        const TIMEOUT_MS = 15000; // Increased to 15 seconds
        
        try {
            // Validate API key is available
            if (!API_KEY) {
                throw new Error('API key is not configured');
            }

            // Add system context to the prompt
            const enhancedPrompt = `You are a helpful AI assistant. Please provide a clear and concise response to: ${prompt}`;
            
            console.log('🤖 Starting AI generation:', {
                prompt: enhancedPrompt.substring(0, 100) + (enhancedPrompt.length > 100 ? '...' : ''),
                userId,
                hasApiKey: !!API_KEY,
                timestamp: new Date().toISOString()
            });
            
            // Add timeout to AI generation
            const response = await withTimeout(
                ai.generate({ prompt: enhancedPrompt }).catch(error => {
                    console.error('🚨 Raw AI error:', {
                        error: error.message,
                        stack: error.stack,
                        timestamp: new Date().toISOString()
                    });
                    throw error;
                }),
                TIMEOUT_MS
            );
            const generationTime = Date.now() - startTime;
            
            console.log('✅ AI generation completed:', {
                userId,
                generationTime: `${generationTime}ms`,
                responseLength: response.text?.length || 0,
                timestamp: new Date().toISOString()
            });
            
            console.log('🔍 Raw AI response received:', {
                responseType: typeof response,
                hasText: !!response?.text,
                textLength: response?.text?.length,
                timestamp: new Date().toISOString()
            });

            // Validate response before returning
            if (!response?.text || response.text.trim().length === 0) {
                throw new Error('Empty response from AI');
            }

            const cleanedResponse = response.text.trim();
            
            // Additional validation of the response content
            if (cleanedResponse.length < 2) {
                throw new Error('Response too short');
            }

            // Return response with enhanced typing
            return {
                ...response,
                text: cleanedResponse,
                metadata: {
                    fallback: false,
                    generationTime: Date.now() - startTime,
                    responseLength: cleanedResponse.length
                }
            };
            
        } catch (error: any) {
            const generationTime = Date.now() - startTime;
            
            console.error('❌ AI generation failed:', {
                userId,
                error: error.message || error,
                generationTime: `${generationTime}ms`,
                errorType: error.name || 'Unknown',
                stack: error.stack,
                timestamp: new Date().toISOString()
            });
            
            // Return a fallback response instead of crashing
            return {
                text: "I'm sorry, I'm experiencing technical difficulties right now. Please try again in a moment.",
                metadata: {
                    fallback: true,
                    error: error.message
                }
            };
        }
    }
};

