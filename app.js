import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import express from "express";
import multer from "multer";
import cors from 'cors';

dotenv.config();

const app = express();
const upload = multer();
const ai = new GoogleGenAI({apiKey: process.env.GEMINI_API_KEY});
const GEMINI_MODEL = "gemini-2.5-flash";

app.use(cors());
app.use(express.json());

async function extractText(resp) {
  try {
    console.log("--- Construct Result ---")
    const text = resp?.candidates?.[0]?.content?.parts?.[0]?.text;
    return text ?? JSON.stringify(resp, null, 2);
  } catch (error) {
    console.error("Error extracting text:", error);
    return JSON.stringify(resp, null, 2);
  }
}

//1. Generate from Text
app.post('/generate-text', async (req,res) => {
  try {
    const { prompt } = req.body;
    console.log("--- Generate Text Start ----");
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt
    });
    
    res.json({ result: await extractText(response) })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
});

//2. Generate from Image
app.post('/generate-from-image', upload.single('image'), async (req, res) => {
  try {
    console.log("--- Generate from Image Start ----");
    const { prompt } = req.body;
    const imageBase64 = req.file.buffer.toString('base64');
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        { 
          text: prompt + "\n tolong jawab dalam format markdown, termasuk heading, bold, dan bullet points."
        },
        { 
          inlineData: { 
            mimeType: req.file.mimetype, data: imageBase64 
           }
        }
      ]
    });

    res.json({ result: await extractText(response) })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
});

//3. Generate from Document
app.post('/generate-from-document', upload.single('document'), async (req, res) => {
  try {
    console.log("--- Generate from Document Start ----");
    const { prompt } = req.body;
    const finalPrompt = prompt ||  "Ringkas dokumen berikut:";
    const docBase64 = req.file.buffer.toString('base64');
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        { 
          text: finalPrompt + "\n tolong jawab dalam format markdown, termasuk heading, bold, dan bullet points."
        },
        { 
          inlineData: { 
            mimeType: req.file.mimetype, data: docBase64 
           }
        }
      ]
    });

    res.json({ result: await extractText(response) })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
});

//4. API Chat
app.post('/api/chat', async (req,res) => {
  try {
    console.log("--- Process API Chat ----");
    const { messages } = req.body;
    if (!Array.isArray(messages)) throw new Error("messages must be an array");
    const contents = messages.map(msg => ({
      role: msg.role,
      parts: [{ text: msg.content + "\n tolong jawab dalam format markdown, termasuk heading, bold, dan bullet points." }]
    }));
    
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents
    });
    
    res.json({ result: await extractText(response) })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
