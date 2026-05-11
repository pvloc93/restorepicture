export default async function handler(req, res) {
    // --- 1. CẤU HÌNH BIỂN BÁO CORS (CHO PHÉP TẤT CẢ TRUY CẬP) ---
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*'); 
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    // --- 2. XỬ LÝ "PREFLIGHT" KIỂM TRA BẢO MẬT CỦA TRÌNH DUYỆT ---
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // --- 3. BẮT ĐẦU XỬ LÝ LÕI PHỤC HỒI ẢNH ---
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { image } = req.body;
    const REPLICATE_TOKEN = process.env.REPLICATE_API_TOKEN;

    if (!REPLICATE_TOKEN) {
        return res.status(500).json({ error: "Chưa cấu hình REPLICATE_API_TOKEN trên Vercel." });
    }

    if (!image) {
        return res.status(400).json({ error: "Không tìm thấy dữ liệu ảnh." });
    }

    try {
        // Gửi ảnh sang AI CodeFormer
        const response = await fetch("https://api.replicate.com/v1/predictions", {
            method: "POST",
            headers: {
                "Authorization": `Token ${REPLICATE_TOKEN}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                version: "7de2ea26c616d5bf2245ad0d5e24f0ff9a6204578a5c876db53142edd9d2cd56",
                input: {
                    image: `data:image/jpeg;base64,${image}`, // Đổi sang jpeg vì Frontend đang gửi jpeg
                    codeformer_fidelity: 0.95, 
                    background_enhance: true,
                    face_upsample: true,
                    upscale: 2
                }
            })
        });

        let prediction = await response.json();
        
        // Bắt lỗi nếu Replicate từ chối (Vd: sai token)
        if (prediction.error) {
             throw new Error(prediction.error);
        }

        // Chờ AI xử lý xong
        const predictionId = prediction.id;
        while (prediction.status !== "succeeded" && prediction.status !== "failed") {
            await new Promise(resolve => setTimeout(resolve, 1000));
            const checkResponse = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
                headers: { "Authorization": `Token ${REPLICATE_TOKEN}` }
            });
            prediction = await checkResponse.json();
        }

        if (prediction.status === "failed") {
            throw new Error("AI Replicate xử lý thất bại.");
        }

        // Trả link ảnh đã làm nét về cho Frontend
        res.status(200).json({ restoredImageUrl: prediction.output });

    } catch (error) {
        console.error("Lỗi Backend:", error);
        res.status(500).json({ error: error.message });
    }
}

// --- 4. CẤU HÌNH QUAN TRỌNG: TĂNG GIỚI HẠN DUNG LƯỢNG PAYLOAD ---
// Mặc định Vercel chỉ cho phép 1MB. Đoạn này tăng lên 4MB để nhận chuỗi Base64
export const config = {
    api: {
        bodyParser: {
            sizeLimit: '4mb', 
        },
    },
};
