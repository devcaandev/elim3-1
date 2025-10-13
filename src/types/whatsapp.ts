// WhatsApp API Configuration
const API_VERSION = 'v17.0';
const WHATSAPP_API_URL = 'https://graph.facebook.com';

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
    messageId: string,
    phoneNumberId: string,
    accessToken: string
): Promise<Response> {
    const url = `${WHATSAPP_API_URL}/${API_VERSION}/${phoneNumberId}/messages`;
    
    const payload: MarkAsReadRequest = {
        messaging_product: "whatsapp",
        status: "read",
        message_id: messageId
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`Failed to mark message as read: ${response.statusText}`);
        }

        return response;
    } catch (error) {
        console.error('Error marking message as read:', error);
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
