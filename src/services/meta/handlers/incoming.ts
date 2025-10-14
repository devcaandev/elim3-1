import {genkit} from "~encore/clients"
import { sendTextMessage } from "./outgoing";

export const processMessage = async (payload:WhatsAppWebhook) => {
    // Implementation for processing the incoming WhatsApp message
    // check payload message type and handle accordingly
    

    // If text message, extract text and send to Genkit for response generation
    const message = payload?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    const textMessage = message?.text?.body;
    const userId = message?.from;
    
    if (textMessage && userId) {
        console.log('Processing text message:', textMessage, 'from user:', userId);
        
        // Call Genkit API to generate a response
        const response = await genkit.processMessage({
            userId: userId,
            content: textMessage
        });

        console.log('Generated response from Genkit:', response);

        // Send the response back via WhatsApp Business API
        if (response.reply) {
            await sendTextMessage(userId, response.reply);
        }

    } else {
        console.log('No text message found to process.');
    }
};
