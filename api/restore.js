// api/restore.js
export default async function handler(req, res) {
    // 1. Kiểm tra nếu không phải phương thức POST thì từ chối
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Chỉ chấp nhận phương thức POST' });
    }

    const { image, prompt } = req.body;
    const apiKey = process.env.GEMINI_API_KEY; // Lấy key từ "két sắt" Vercel

    try {
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key=${apiKey}`;

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: prompt },
                        { inlineData: { mimeType: "image/png", data: image } }
                    ]
                }],
                generationConfig: { responseModalities: ['IMAGE'] }
            })
        });

        const result = await response.json();
        const base64Data = result?.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;

        if (!base64Data) {
            return res.status(500).json({ error: "AI không trả về ảnh. Thử lại sau." });
        }

        // Trả kết quả về cho giao diện (Frontend)
        res.status(200).json({ restoredImage: base64Data });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
