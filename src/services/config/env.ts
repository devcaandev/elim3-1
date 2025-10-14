import { secret } from "encore.dev/config";

// Define secrets using Encore's secret management
export const WHATSAPP_CONFIG = {
    // Access token for the WhatsApp Business API
    ACCESS_TOKEN: secret("WHATSAPP_ACCESS_TOKEN"),
    
    // WhatsApp Business Phone Number ID
    PHONE_NUMBER_ID: secret("WHATSAPP_PHONE_NUMBER_ID"),
    
    // API Version (not a secret, but kept here for consistency)
    API_VERSION: "v23.0",
    
    // Base URL for the WhatsApp API
    WHATSAPP_API_URL: "https://graph.facebook.com",
    
    // WhatsApp Business Account ID
    BUSINESS_ACCOUNT_ID: secret("WHATSAPP_BUSINESS_ACCOUNT_ID"),

    // Webhook Verify Token
    VERIFY_TOKEN: secret("WHATSAPP_VERIFY_TOKEN")
} as const;

// // Other application secrets
// export const APP_SECRETS = {
//     // GitHub API token for deployments
//     GITHUB_API_TOKEN: secret("GITHUB_API_TOKEN"),
    
//     // SSH Private Key for server access
//     SSH_PRIVATE_KEY: secret("SSH_PRIVATE_KEY")
// } as const;