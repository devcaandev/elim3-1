import { WHATSAPP_CONFIG } from '../services/config/env';

// Extract actual values from secrets
const PHONE_NUMBER_ID = WHATSAPP_CONFIG.PHONE_NUMBER_ID();  // Call the secret function
const ACCESS_TOKEN = WHATSAPP_CONFIG.ACCESS_TOKEN();        // Call the secret function
const API_VERSION = WHATSAPP_CONFIG.API_VERSION;
const API_URL = WHATSAPP_CONFIG.WHATSAPP_API_URL;

// Validate configuration
if (!PHONE_NUMBER_ID) {
    throw new Error('WhatsApp Phone Number ID is not configured');
}
if (!ACCESS_TOKEN) {
    throw new Error('WhatsApp Access Token is not configured');
}

// Log configuration (with masked sensitive data)
// console.log('WhatsApp Configuration:', {
//     API_VERSION,
//     API_URL,
//     PHONE_NUMBER_ID: PHONE_NUMBER_ID,
//     ACCESS_TOKEN: '********************' // Masked for security
// });

interface MarkAsReadRequest {
    messaging_product: "whatsapp";
    status: "read";
    message_id: string;
}

/**
 * Marks a WhatsApp message as read
 * @param messageId - The ID of the message to mark as read
 * @param phoneNumberId - The WhatsApp Business Phone Number ID
 * @param accessToken - The access token for the WhatsApp Business API
 * @returns Promise<Response> - The API response
 */
export async function markAsRead(
    messageId: string | null,
): Promise<Response | null> {
    if (!messageId) {
        console.warn('No message ID provided to mark as read');
        return null;
    }

    const url = `${API_URL}/${API_VERSION}/${PHONE_NUMBER_ID}/messages`;
    
    const payload: MarkAsReadRequest = {
        messaging_product: "whatsapp",
        status: "read",
        message_id: messageId
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${ACCESS_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            const error = new Error(
                `HTTP ${response.status} ${response.statusText}: ${errorText}`
            );
            (error as any).status = response.status;
            (error as any).statusText = response.statusText;
            (error as any).responseBody = errorText;
            throw error;
        }

        await response.json(); // Consume the response body
        return response;
    } catch (error: any) {
        // Add context to network errors
        if (error.cause) {
            error.message = `Network error at ${url}: ${error.cause.message || error.cause.code || 'Unknown'}`;
        }
        (error as any).url = url;
        (error as any).phoneNumberId = PHONE_NUMBER_ID;
        throw error;
    }
}

/**
 * Helper function to extract message ID from a webhook event
 * @param webhookData - The webhook payload received from WhatsApp
 * @returns string | null - The message ID if found, null otherwise
 */
export function extractMessageId(webhookData: WhatsAppWebhook): string | null {
    try {
        const message = webhookData.entry[0]?.changes[0]?.value?.messages[0];
        return message?.id || null;
    } catch (error) {
        console.error('Error extracting message ID:', error);
        return null;
    }
}
