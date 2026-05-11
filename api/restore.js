// api/restore.js
export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { image } = req.body; // Nhận ảnh Base64 từ web
    const REPLICATE_TOKEN = process.env.REPLICATE_API_TOKEN;

    try {
        // Bước 1: Gửi yêu cầu phục chế tới Replicate (Model CodeFormer)
        const response = await fetch("https://api.replicate.com/v1/predictions", {
            method: "POST",
            headers: {
                "Authorization": `Token ${REPLICATE_TOKEN}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                version: "7de2ea26c616d5bf2245ad0d5e24f0ff9a6204578a5c876db53142edd9d2cd56",
                input: {
                    image: `data:image/png;base64,${image}`,
                    codeformer_fidelity: 0.9, // Giữ 90% nét mặt gốc (Cực kỳ quan trọng)
                    background_enhance: true,
                    face_upsample: true,
                    upscale: 2
                }
            })
        });

        let prediction = await response.json();

        // Bước 2: Chờ AI xử lý (vì phục chế ảnh chất lượng cao mất vài giây)
        const predictionId = prediction.id;
        while (prediction.status !== "succeeded" && prediction.status !== "failed") {
            await new Promise(resolve => setTimeout(resolve, 1000)); // Đợi 1 giây rồi hỏi lại
            const checkResponse = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
                headers: { "Authorization": `Token ${REPLICATE_TOKEN}` }
            });
            prediction = await checkResponse.json();
        }

        if (prediction.status === "failed") throw new Error("AI xử lý thất bại.");

        // Trả link ảnh đã phục chế về cho web
        res.status(200).json({ restoredImageUrl: prediction.output });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
