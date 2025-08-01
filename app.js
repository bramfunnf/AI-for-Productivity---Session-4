import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import express from "express";
import multer from "multer";
import fs from "fs/promises";

dotenv.config();

const app = express();
const upload = multer();
const ai = new GoogleGenAI({apiKey: process.env.GEMINI_API_KEY});
const GEMINI_MODEL = "gemini-2.5-flash";

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
          text: prompt 
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
    const docBase64 = req.file.buffer.toString('base64');
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        { 
          text: prompt || "Ringkas dokumen berikut:"
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
