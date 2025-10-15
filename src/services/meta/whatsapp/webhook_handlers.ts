import { extractMessageId, markAsRead } from "../../../types/whatsapp";
import { WhatsAppWebhook } from "../../../types/types"
import { processMessage } from "../handlers/incoming";

export const webhookHandler = async (req: any, res: any) => {
    let body = '';

    req.on('data', (chunk: any) => {
        body += chunk.toString(); // convert Buffer to string
    });

    req.on('end', () => {
        // OPTIMIZATION: Acknowledge webhook immediately to reduce perceived latency
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('EVENT_RECEIVED');
        
        // Process webhook asynchronously
        processWebhookAsync(body).catch(error => {
            console.error('❌ Async webhook processing failed:', {
                error: error.message || error,
                stack: error.stack,
                timestamp: new Date().toISOString()
            });
        });
    });
};

/**
 * Processes webhook data asynchronously after acknowledging receipt
 * This prevents WhatsApp from timing out while we process the message
 */
async function processWebhookAsync(body: string): Promise<void> {
    const startTime = Date.now();
    
    try {
        const WhatsAppWebhook = JSON.parse(body) as WhatsAppWebhook;
        
        // Log the parsed webhook data with timing
        console.log('📨 WhatsApp webhook processing started:', {
            timestamp: new Date().toISOString(),
            messageCount: WhatsAppWebhook.entry?.[0]?.changes?.[0]?.value?.messages?.length || 0
        });
        
        const messageId = extractMessageId(WhatsAppWebhook);
        
        if (messageId) {
            // Process message with error handling and performance tracking
            await processMessageWithTracking(WhatsAppWebhook, messageId, startTime);
        } else {
            console.log('ℹ️ No message ID found in webhook (likely a status update)', {
                processingTime: `${Date.now() - startTime}ms`
            });
        }
        
    } catch (e: any) {
        console.error('❌ Failed to parse webhook JSON:', {
            error: e.message || e,
            rawBody: body.substring(0, 500) + (body.length > 500 ? '...' : ''), // Truncate for logging
            processingTime: `${Date.now() - startTime}ms`,
            timestamp: new Date().toISOString()
        });
    }
}

/**
 * Processes a WhatsApp message with performance tracking and error handling
 */
async function processMessageWithTracking(webhook: WhatsAppWebhook, messageId: string, startTime: number): Promise<void> {
    try {
        // OPTIMIZATION: Run mark-as-read and message processing in parallel
        const [, processingResult] = await Promise.allSettled([
            markAsRead(messageId),
            processMessage(webhook)
        ]);
        
        // Log mark-as-read result
        const markAsReadResult = (await Promise.allSettled([markAsRead(messageId)]))[0];
        if (markAsReadResult.status === 'fulfilled') {
            console.log('✅ Message marked as read:', messageId);
        } else {
            console.error('❌ Failed to mark message as read:', {
                messageId,
                error: markAsReadResult.reason?.message || markAsReadResult.reason,
                timestamp: new Date().toISOString()
            });
        }
        
        // Log processing result
        const totalTime = Date.now() - startTime;
        if (processingResult.status === 'fulfilled') {
            console.log('✅ Message processing completed:', {
                messageId,
                totalTime: `${totalTime}ms`,
                timestamp: new Date().toISOString()
            });
        } else {
            console.error('❌ Message processing failed:', {
                messageId,
                error: processingResult.reason?.message || processingResult.reason,
                totalTime: `${totalTime}ms`,
                timestamp: new Date().toISOString()
            });
        }
        
    } catch (error: any) {
        console.error('❌ Unexpected error in message processing:', {
            messageId,
            error: error.message || error,
            stack: error.stack,
            processingTime: `${Date.now() - startTime}ms`,
            timestamp: new Date().toISOString()
        });
    }
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