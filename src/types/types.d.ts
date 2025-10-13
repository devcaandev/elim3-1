// Global type declarations
declare global {
    interface Window {
        // Add global window properties here
    }

    // Add other global interfaces or types here
    type WhatsAppMessage = {
        id: string;
        timestamp: number;
        content: string;
    }

    interface ApiResponse<T> {
        data: T;
        status: number;
        message: string;
    }
}

// This export is necessary to make the file a module
export {};
