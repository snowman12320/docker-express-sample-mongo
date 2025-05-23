const express = require("express");
const router = express.Router();
const { GoogleGenerativeAI } = require("@google/generative-ai");

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is not set in environment variables");
}
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

router.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  const origin = "*";
  res.header("Access-Control-Allow-Origin", origin);
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Strict-Transport-Security", "max-age=31536000");
  res.set("Cache-Control", "no-store, no-cache, must-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

router.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "請提供訊息內容" });
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash-latest",
    });

    (async () => {
      try {
        await model.getGenerativeModelInfo();
        console.log("Successfully connected to Gemini AI");
      } catch (error) {
        console.error("Failed to initialize Gemini AI:", error.message);
      }
    })();

    const chat = model.startChat({
      history: [
        {
          role: "user",
          parts: [{ text: "你好，我需要幫助翻譯中文到英文。" }],
        },
        {
          role: "model",
          parts: [
            {
              text: "當然可以！請提供您需要翻譯的中文內容，我會幫您翻譯成英文。",
            },
          ],
        },
      ],
      generationConfig: {
        maxOutputTokens: 8192,
        temperature: 0.3, // 降低溫度以獲得更準確的翻譯結果
        topP: 0.9,
        topK: 40,
      },
    });

    const translationPrompt =
      "Translate the following Chinese text to English, providing only the English translation: ";
    const result = await chat.sendMessage(translationPrompt + message);
    const response = await result.response;
    const text = response.text();

    res.json({ response: text });
  } catch (error) {
    console.error("Gemini API 錯誤:", error);
    if (error.message.includes("API key not valid")) {
      return res.status(401).json({
        error: "Gemini API 金鑰無效，請檢查您的 .env 檔案中的 GEMINI_API_KEY",
      });
    }
    res.status(500).json({ error: "與 Gemini API 通訊時發生錯誤" });
  }
});

router.get("/", (req, res) => {
  res.render("gemini", { title: "Gemini AI 聊天室" });
});

module.exports = router;
