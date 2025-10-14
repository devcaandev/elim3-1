// Global type declarations
declare global {
    interface Window {
        // Add global window properties here
    }

    // WhatsApp Webhook Types
    interface WhatsAppWebhook {
        object: "whatsapp_business_account";
        entry: Array<{
            id: string;
            changes: Array<{
                value: {
                    messaging_product: "whatsapp";
                    metadata: {
                        display_phone_number: string;
                        phone_number_id: string;
                    };
                    contacts?: Array<{
                        profile: {
                            name: string;
                        };
                        wa_id: string;
                    }>;
                    messages?: Array<WhatsAppMessage>;
                    statuses?: Array<{
                        id: string;
                        status: "sent" | "delivered" | "read" | "failed";
                        timestamp: string;
                        recipient_id: string;
                    }>;
                };
                field: string;
            }>;
        }>;
    }

    interface WhatsAppMessage {
        from: string;
        id: string;
        timestamp: string;
        type: "text" | string;
        text?: {
            body: string;
        };
    }

    // API Response type
    interface ApiResponse<T> {
        data: T;
        status: number;
        message: string;
    }
}

// This export is necessary to make the file a module
export { WhatsAppWebhook };
