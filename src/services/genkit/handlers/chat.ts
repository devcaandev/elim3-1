import { api } from "encore.dev/api";
import { ai } from "../ai_config";
// import { sendTextMessage } from "../../meta/handlers/outgoing";


interface ProcessMessageRequest {
  userId: string;
  content: string;
}

interface ProcessMessageResponse {
  processed: boolean;
  reply?: string;
}



export const processMessage = api<ProcessMessageRequest, ProcessMessageResponse>(
    {
        method: 'POST',
        path: '/chat',
        expose: false,
    },
    async (req) => {
        const { userId, content } = req;
        console.log(`Received message from user ${userId}: ${content}`);
        const genkitResponse = await ai.generate({prompt: content});
        let responseText = genkitResponse.text || "Sorry, I couldn't generate a response.";
        
        // Only return the response, let the caller handle sending it
        return { processed: true, reply: responseText };
    }
);