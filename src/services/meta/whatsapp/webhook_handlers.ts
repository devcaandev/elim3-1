export const webhookHandler = async (req: any, res: any) => {
    let body = '';

    req.on('data', (chunk: any) => {
        body += chunk.toString(); // convert Buffer to string
    });

    req.on('end', () => {
        console.log('Received webhook event:', body);
        res.status(200).send('EVENT_RECEIVED');
    });
};


export const verifyWebhookHandler = async (req: any, res: any) => {
    const VERIFY_TOKEN = "elim3";

    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('WEBHOOK_VERIFIED');
            res.status(200).send(challenge);
        } else {
            res.sendStatus(403);
        }
    } else {
        res.sendStatus(400);
    }
};