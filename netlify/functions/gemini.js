// Netlify Function to proxy Gemini API requests securely
// The API key is stored in Netlify environment variables

const fetch = require('node-fetch');

exports.handler = async (event, context) => {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    // Get API key from environment variable
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    if (!GEMINI_API_KEY) {
        console.error('GEMINI_API_KEY environment variable is not set');
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Server configuration error' })
        };
    }

    try {
        // Parse the request body
        const requestData = JSON.parse(event.body);

        // Validate request has required fields
        if (!requestData.contents || !Array.isArray(requestData.contents)) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Invalid request format' })
            };
        }

        // Get model from request or use default
        const model = requestData.model || 'gemini-1.5-flash';

        // Build Gemini API URL
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;

        // Forward request to Gemini API
        const response = await fetch(geminiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: requestData.contents,
                generationConfig: requestData.generationConfig || {},
                safetySettings: requestData.safetySettings || []
            })
        });

        const data = await response.json();

        // Check if Gemini API returned an error
        if (!response.ok) {
            console.error('Gemini API error:', data);
            return {
                statusCode: response.status,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    error: data.error?.message || 'API request failed',
                    details: data
                })
            };
        }

        // Return successful response
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify(data)
        };

    } catch (error) {
        console.error('Function error:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                error: 'Internal server error',
                message: error.message
            })
        };
    }
};
