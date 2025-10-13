export const webhookHandler = async (req: any, res: any) => {
    let body = '';

    req.on('data', (chunk: any) => {
        body += chunk.toString(); // convert Buffer to string
    });

    req.on('end', () => {
        console.log('Received webhook event:', body);
        
        // Parse the JSON to display it nicely formatted
        try {
            const parsedBody = JSON.parse(body);
            console.log('Parsed webhook data:', JSON.stringify(parsedBody, null, 2));
        } catch (e) {
            console.log('Could not parse JSON:', e);
        }


        // This is where we determine which type of WhatsApp event it is
        // and handle it accordingly using types from src/types/types.d.ts








        
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

    console.log('Verification parameters:', { mode, token, challenge });

    if (mode && token) {
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('WEBHOOK_VERIFIED - sending challenge:', challenge);
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end(challenge);
        } else {
            console.log('Verification failed - token mismatch:', { 
                receivedToken: token,
                expectedToken: VERIFY_TOKEN,
                mode 
            });
            res.writeHead(403, { 'Content-Type': 'text/plain' });
            res.end('Forbidden');
        }
    } else {
        console.log('Verification failed - missing parameters');
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Bad Request');
    }
};