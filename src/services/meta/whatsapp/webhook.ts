import {api} from "encore.dev/api";
import { verifyWebhookHandler, webhookHandler } from "./webhook_handlers";


export const verifyWebhook = api.raw(
    {
        expose: true,
        method: "GET",
        path: "/whatsapp/webhook",
    },
    verifyWebhookHandler
);

export const receivedPost = api.raw(
    {
        expose: true,
        method: "POST",
        path: "/whatsapp/webhook",
    },
    webhookHandler
);