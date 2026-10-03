export default async function handler(req, res) {
    // 1. Method verification
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed. Only POST requests are accepted.' });
    }

    // 2. Fetch the Secret Key securely from Vercel Environment Variables
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        console.error("GEMINI_API_KEY is missing in Vercel.");
        return res.status(500).json({ 
            error: 'Server Configuration Error: API key is not set.' 
        });
    }

    // 3. Extract payload from Frontend (Supports both Text and Base64 Files)
    const { message, fileData, fileMime } = req.body;

    if (!message && !fileData) {
        return res.status(400).json({ error: 'Message or File payload is required.' });
    }

    // 4. Secure System Prompt (Hidden from user)
    const systemPrompt = `You are a highly intelligent, professional, and friendly AI Study Assistant exclusively for Polytechnic (Diploma Engineering) students. 
    You provide accurate answers related to engineering branches, syllabus, and career. You can analyze uploaded documents and images if provided. 
    Always answer politely and use easy-to-understand language. If the user asks in Hindi, reply in Hindi.`;

    // 5. Construct the dynamic parts for Gemini API (Multimodal capability)
    let partsArray = [];
    
    // Add text message
    if (message) {
        partsArray.push({ text: message });
    } else if (fileData) {
        partsArray.push({ text: "Please analyze this uploaded file/image." });
    }

    // Add file data if it exists
    if (fileData && fileMime) {
        partsArray.push({
            inlineData: {
                mimeType: fileMime,
                data: fileData
            }
        });
    }

    // Using Gemini 1.5 Flash as it handles multimodal inputs (text + images/documents) perfectly.
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const payload = {
        contents: [{ role: "user", parts: partsArray }],
        systemInstruction: { parts: [{ text: systemPrompt }] }
    };

    try {
        // 6. Make the API Call to Google
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        // 7. Handle Google API Errors
        if (!response.ok) {
            console.error("Gemini API Error:", data.error);
            return res.status(response.status).json({ 
                error: data.error?.message || 'Error communicating with AI service.' 
            });
        }

        // 8. Send text back to frontend
        if (data.candidates && data.candidates[0].content && data.candidates[0].content.parts) {
            const reply = data.candidates[0].content.parts[0].text;
            return res.status(200).json({ reply });
        } else {
            return res.status(500).json({ error: 'Unexpected response from AI.' });
        }

    } catch (error) {
        console.error('Server-side Error:', error);
        return res.status(500).json({ error: 'Internal Server Error.' });
    }
}
