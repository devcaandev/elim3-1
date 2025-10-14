import {WHATSAPP_CONFIG} from "../../config/env"

export const sendTextMessage = async (userId: string, responseText: string) => {
    // Implementation for sending a text message via WhatsApp Business API

    const whatsappApiUrl = WHATSAPP_CONFIG.WHATSAPP_API_URL;
    const apiVersion = WHATSAPP_CONFIG.API_VERSION;
    const phoneNumberId = WHATSAPP_CONFIG.PHONE_NUMBER_ID();
    const accessToken = WHATSAPP_CONFIG.ACCESS_TOKEN();




    const whatsappResponse = await fetch(
        `${whatsappApiUrl}/${apiVersion}/${phoneNumberId}/messages`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
                messaging_product: "whatsapp",
                to: userId,
                text: { body: responseText },
            }),
        }
    );

    if (!whatsappResponse.ok) {
        console.error('Failed to send message via WhatsApp:', await whatsappResponse.text());
    } else {
        console.log('Message sent successfully via WhatsApp');
    }
    return await whatsappResponse.json(
    )
};