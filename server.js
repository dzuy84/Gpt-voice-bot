// server.js
import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import OpenAI from "openai";
import axios from 'axios';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

if (!process.env.OPENAI_API_KEY || !process.env.SAPO_API_KEY || !process.env.SAPO_API_SECRET) {
  console.error("❌ Lỗi: Vui lòng kiểm tra lại các biến môi trường trong phần Environment của Render.");
  process.exit(1);
}

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

// =============================================================
// HÀM GỌI API SAPO (CẬP NHẬT THEO CÁCH MỚI)
// =============================================================
async function searchSapoProducts(query) {
  const storeName = process.env.SAPO_STORE_NAME;
  const apiKey = process.env.SAPO_API_KEY;
  const apiSecret = process.env.SAPO_API_SECRET;
  const apiVersion = "2025-09"; 
  const apiUrl = `https://${storeName}.mysapo.net/admin/api/${apiVersion}/products.json`;

  // TẠO HEADER AUTHORIZATION BẰNG TAY
  const authHeader = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');

  console.log(`🔎 Đang tìm kiếm sản phẩm trên Sapo với từ khóa: "${query}"`);

  try {
    const response = await axios.get(apiUrl, {
      // THAY ĐỔI QUAN TRỌNG:
      // Bỏ trường 'auth' và thay bằng 'headers' tự tạo
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Content-Type': 'application/json'
      },
      params: {
        query: query,
        limit: 5
      }
    });

    if (response.data && response.data.products.length > 0) {
      console.log(`✅ Tìm thấy ${response.data.products.length} sản phẩm.`);
      return response.data.products;
    } else {
      console.log('❌ Không tìm thấy sản phẩm nào.');
      return [];
    }
  } catch (error) {
    console.error('❌ Lỗi khi gọi API Sapo:', error.response ? error.response.data : error.message);
    return [];
  }
}

// API Chat Endpoint
app.post("/api/chat", async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Message is required." });
    }

    const products = await searchSapoProducts(message);

    let systemContent = `
      Bạn là một trợ lý ảo tư vấn sản phẩm của website lyuongruouvang.com, nói chuyện thân thiện, giọng nữ miền Nam.
      Chỉ trả lời các câu hỏi liên quan đến sản phẩm ly uống rượu vang và các phụ kiện liên quan.
      Nếu khách hỏi ngoài phạm vi, hãy trả lời lịch sự: "Dạ, em xin lỗi, em chỉ có thể hỗ trợ các thông tin về sản phẩm tại lyuongruouvang.com thôi ạ."
    `;

    if (products.length > 0) {
      const productInfo = products.map(p => `- ${p.name} (Giá: ${p.variants[0].price}đ)`).join('\n');
      systemContent += `
        Dựa vào thông tin các sản phẩm tìm thấy sau đây để trả lời câu hỏi của khách hàng. Hãy tư vấn một cách tự nhiên.
        Thông tin sản phẩm:
        ${productInfo}
      `;
    } else {
      systemContent += `
        Không tìm thấy sản phẩm nào phù hợp với từ khóa của khách hàng. Hãy trả lời một cách lịch sự rằng bạn không tìm thấy và gợi ý họ tìm kiếm với từ khóa khác hoặc hỏi về công dụng chung của các loại ly.
      `;
    }

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemContent },
        { role: "user", content: message },
      ],
    });

    const reply = completion.choices[0].message.content;
    res.json({ reply });

  } catch (err) {
    console.error("❌ Chat error:", err);
    res.status(500).json({ error: "Đã có lỗi xảy ra khi kết nối với AI." });
  }
});

// API Voice Endpoint
app.post("/api/voice", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: "Text is required." });
    }
    const speech = await client.audio.speech.create({
      model: "tts-1",
      voice: "nova",
      input: text,
      response_format: "mp3",
    });
    const buffer = Buffer.from(await speech.arrayBuffer());
    res.setHeader("Content-Type", "audio/mpeg");
    res.send(buffer);
  } catch (err) {
    console.error("❌ Voice error:", err);
    res.status(500).json({ error: "Đã có lỗi xảy ra khi tạo giọng nói." });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server đang chạy tại cổng ${PORT}`);
});
