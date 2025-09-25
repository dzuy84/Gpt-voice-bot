// testChat.js
import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function runTest() {
  try {
    const completion = await client.chat.completions.create({
      model: "gpt-5-nano", // thử gpt-5-nano, nếu lỗi thì đổi thành gpt-4o-mini
      messages: [
        { role: "system", content: "Bạn là trợ lý thân thiện, trả lời ngắn gọn bằng tiếng Việt." },
        { role: "user", content: "Xin chào, bạn khỏe không?" },
      ],
    });

    console.log("✅ Trả lời:", completion.choices[0].message.content);
  } catch (err) {
    console.error("❌ Lỗi chi tiết:", err);
  }
}

runTest();
