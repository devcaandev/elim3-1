import { googleAI } from '@genkit-ai/google-genai';
import { genkit, z } from 'genkit';
import { WHATSAPP_CONFIG } from '../config/env';

export const ai = genkit({
    plugins: [
        googleAI({
            apiKey: WHATSAPP_CONFIG.GEMINI_KEY_DEVTHINJI()
        })
    ],
    model: googleAI.model('gemini-2.5-flash',{
        // temperature: 0.5,
        // maxOutputTokens: 500
    })
});

