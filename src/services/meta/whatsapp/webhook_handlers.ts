import { extractMessageId, markAsRead } from "../../../types/whatsapp";
import { WhatsAppWebhook } from "../../../types/types"
import { processMessage } from "../handlers/incoming";

export const webhookHandler = async (req: any, res: any) => {
    let body = '';

    req.on('data', (chunk: any) => {
        body += chunk.toString(); // convert Buffer to string
    });

    req.on('end', () => {
        try {
            const WhatsAppWebhook = JSON.parse(body) as WhatsAppWebhook;
            
            // Log the parsed webhook data nicely formatted
            console.log('WhatsApp webhook received:', JSON.stringify(WhatsAppWebhook, null, 2));
            
            const messageId = extractMessageId(WhatsAppWebhook);
            
            if (messageId) {
                markAsRead(messageId).then(() => {
                    console.log('✅ Message marked as read:', messageId);
                }).catch(error => {
                    console.error('❌ Failed to mark message as read:', {
                        messageId,
                        error: error.message || error,
                        url: error.url,
                        phoneNumberId: error.phoneNumberId,
                        status: error.status,
                        statusText: error.statusText,
                        responseBody: error.responseBody,
                        cause: error.cause?.code || error.cause?.message
                    });
                });

                processMessage(WhatsAppWebhook);

            } else {
                console.log('ℹ️ No message ID found in webhook (likely a status update)');
            }
        } catch (e:any) {
            console.error('❌ Failed to parse webhook JSON:', {
                error: e.message || e,
                rawBody: body
            });
        }
        // Use Node.js HTTP response methods
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('EVENT_RECEIVED');
    });
};


export const verifyWebhookHandler = async (req: any, res: any) => {
    const VERIFY_TOKEN = "elim3";

    // console.log('Received verification request:', {
    //     url: req.url,
    //     rawQuery: req.url?.split('?')[1],
    //     headers: req.headers
    // });

    // Parse query parameters manually
    const urlSearchParams = new URLSearchParams(req.url?.split('?')[1] || '');
    const mode = urlSearchParams.get('hub.mode');
    const token = urlSearchParams.get('hub.verify_token');
    const challenge = urlSearchParams.get('hub.challenge');

    if (mode && token) {
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('✅ Webhook verification successful');
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end(challenge);
        } else {
            console.error('❌ Webhook verification failed - token mismatch:', { 
                receivedToken: token,
                expectedToken: VERIFY_TOKEN,
                mode 
            });
            res.writeHead(403, { 'Content-Type': 'text/plain' });
            res.end('Forbidden');
        }
    } else {
        console.error('❌ Webhook verification failed - missing parameters:', { mode, token, challenge });
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Bad Request');
    }
};