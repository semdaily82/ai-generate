import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const apiKey = process.env.GEMINI_API_KEY || '';

function getAIClient() {
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Status check endpoint
app.get('/api/status', (req: Request, res: Response) => {
  res.json({
    status: 'online',
    hasApiKey: Boolean(apiKey),
    demoModeAvailable: true,
    capabilities: {
      scriptGeneration: 'gemini-3.8-flash',
      imageGeneration: 'gemini-3.1-flash-lite-image',
      videoGeneration: 'veo-3.1-generate-preview',
      tts: 'gemini-3.8-flash-lite-tts',
    },
  });
});

// Helper to strip base64 header
function cleanBase64(dataUriOrBase64: string): { mimeType: string; data: string } {
  if (dataUriOrBase64.startsWith('data:')) {
    const match = dataUriOrBase64.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      return { mimeType: match[1], data: match[2] };
    }
  }
  return { mimeType: 'image/jpeg', data: dataUriOrBase64 };
}

// 1. Analyze Product & Create Product Lock
app.post('/api/analyze-product', async (req: Request, res: Response) => {
  try {
    const { productName, productDescription, productImage } = req.body;

    if (!apiKey) {
      return res.json({
        success: true,
        isDemo: true,
        productLock: {
          productName: productName || 'ENCHEN K8 Mini Shaver',
          category: 'Personal Grooming / Portable Shaver',
          shape: 'Compact cylindrical rounded ergonomic shape',
          primaryColor: 'Matte black & silver chrome accents',
          keyFeatures: [
            'Precision rotary blade mesh',
            'Pocket size design',
            'Minimalist power button with LED ring',
            'USB-C port on the bottom',
          ],
          lockPrompt:
            'Use the exact same product from the uploaded product reference. Preserve product shape, proportions, color, logo, buttons, surface details and overall appearance. Do not redesign or replace the product.',
        },
      });
    }

    const ai = getAIClient();
    if (!ai) throw new Error('Gemini API client not initialized');

    const parts: any[] = [];
    if (productImage) {
      const { mimeType, data } = cleanBase64(productImage);
      parts.push({
        inlineData: {
          mimeType,
          data,
        },
      });
    }

    parts.push({
      text: `Analisis produk ini untuk konsistensi visual video TikTok Affiliate.
Nama Produk: ${productName || 'Produk'}
Deskripsi: ${productDescription || '-'}

Instruksi Kritis:
- Gunakan HANYA informasi yang diberikan, jangan membuat klaim medis, nomor 1, rating palsu, harga diskon palsu, atau klaim yang tidak berdasar.
- Berikan JSON dengan struktur:
{
  "productName": "${productName}",
  "category": "Kategori produk",
  "shape": "Bentuk fisik dan dimensi",
  "primaryColor": "Warna dominan & aksen",
  "keyFeatures": ["fitur 1", "fitur 2", "fitur 3"],
  "lockPrompt": "Use the exact same product from the uploaded product reference. Preserve product shape, proportions, color, logo, buttons, surface details and overall appearance. Do not redesign or replace the product."
}`,
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: { parts },
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json({ success: true, productLock: parsed, isDemo: false });
  } catch (error: any) {
    console.error('Error analyzing product:', error);
    // Return graceful fallback so user flow continues
    res.json({
      success: true,
      isDemo: true,
      error: error.message,
      productLock: {
        productName: req.body.productName || 'Produk',
        category: 'Affiliate Product',
        shape: 'Sleek modern form factor',
        primaryColor: 'Neutral high contrast',
        keyFeatures: ['Portable design', 'Premium finish', 'Easy to use'],
        lockPrompt:
          'Use the exact same product from the uploaded product reference. Preserve product shape, proportions, color, logo, buttons, surface details and overall appearance. Do not redesign or replace the product.',
      },
    });
  }
});

// 2. Analyze Model & Create Character Lock
app.post('/api/analyze-model', async (req: Request, res: Response) => {
  try {
    const { modelImage, modelUsage } = req.body;

    if (!apiKey || !modelImage) {
      return res.json({
        success: true,
        isDemo: true,
        characterLock: {
          modelUsage: modelUsage || 'same_model',
          genderPresentation: 'Indonesian creator in 20s',
          faceStructure: 'Warm expressive face, natural friendly smile',
          hairStyle: 'Neat modern hairstyle, natural black hair',
          skinAppearance: 'Warm Southeast Asian skin tone, natural texture',
          clothing: 'Casual stylish creator t-shirt / minimalist daily wear',
          lockPrompt:
            'Use the exact same person from the uploaded model reference image. Preserve facial identity, facial structure, hairstyle, skin appearance, body proportions, clothing and overall appearance. Do not replace the person.',
        },
      });
    }

    const ai = getAIClient();
    if (!ai) throw new Error('Gemini API client not initialized');

    const { mimeType, data } = cleanBase64(modelImage);
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: {
        parts: [
          {
            inlineData: { mimeType, data },
          },
          {
            text: `Analisis foto model ini untuk konsistensi karakter (MASTER CHARACTER LOCK) di 6 scene video TikTok Affiliate:
Berikan output JSON dengan format:
{
  "modelUsage": "${modelUsage || 'same_model'}",
  "genderPresentation": "...",
  "faceStructure": "...",
  "hairStyle": "...",
  "skinAppearance": "...",
  "clothing": "...",
  "lockPrompt": "Use the exact same person from the uploaded model reference image. Preserve facial identity, facial structure, hairstyle, skin appearance, body proportions, clothing and overall appearance. Do not replace the person."
}`,
          },
        ],
      },
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json({ success: true, characterLock: parsed, isDemo: false });
  } catch (error: any) {
    console.error('Error analyzing model:', error);
    res.json({
      success: true,
      isDemo: true,
      error: error.message,
      characterLock: {
        modelUsage: req.body.modelUsage || 'same_model',
        genderPresentation: 'Indonesian TikTok Creator',
        faceStructure: 'Natural friendly expression',
        hairStyle: 'Natural dark hair',
        skinAppearance: 'Natural creator look',
        clothing: 'Casual modern daily wear',
        lockPrompt:
          'Use the exact same person from the uploaded model reference image. Preserve facial identity, facial structure, hairstyle, skin appearance, body proportions, clothing and overall appearance. Do not replace the person.',
      },
    });
  }
});

// 3. Generate Complete 6-Scene Script & Prompts
app.post('/api/generate-script', async (req: Request, res: Response) => {
  try {
    const {
      productName,
      productDescription,
      productLock,
      characterLock,
      videoStyle,
      tone,
      useOnlyProvidedInfo,
      avoidUnsupportedClaims,
    } = req.body;

    if (!apiKey) {
      return res.json({
        success: true,
        isDemo: true,
        scenes: getFallbackScenes(productName, productDescription),
      });
    }

    const ai = getAIClient();
    if (!ai) throw new Error('Gemini API client not initialized');

    const prompt = `Anda adalah TikTok Affiliate Video Director & Copywriter handal di Indonesia.
Buat struktur 6 scene WAJIB untuk video TikTok Affiliate berdurasi 30 detik dalam Bahasa Indonesia.

INPUT PRODUK:
- Nama Produk: ${productName}
- Deskripsi Produk: ${productDescription}

KARAKTER & PRODUK KONSISTENSI:
- Master Character Lock: ${characterLock?.lockPrompt || 'Same model creator throughout all scenes'}
- Master Product Lock: ${productLock?.lockPrompt || 'Same exact product throughout all scenes'}
- Video Style: ${videoStyle || 'TikTok Affiliate'}
- Tone: ${tone || 'Natural, friendly, not too salesy'}

ATURAN KETAT SKRIP (COMPLIANCE TIKTOK):
1. Bahasa Indonesia natural seperti creator TikTok asli, santai tapi jelas.
2. Panjang voice over harus pas dengan durasi detik tiap scene.
3. ${useOnlyProvidedInfo ? 'Gunakan HANYA informasi yang diberikan dalam deskripsi produk.' : ''}
4. ${avoidUnsupportedClaims ? 'JANGAN membuat klaim medis, klaim 100% ampuh, jangan mengarang rating palsu, harga diskon palsu, jangan sebut "nomor 1" atau "paling terbaik".' : ''}
5. CTA Scene 6 WAJIB mengarahkan secara natural, contoh: "Cek produknya di keranjang kuning sekarang!"

STRUKTUR 6 SCENE WAJIB:
- Scene 1: HOOK (0-3 detik)
- Scene 2: PROBLEM (3-7 detik)
- Scene 3: PRODUCT (7-12 detik)
- Scene 4: DEMONSTRATION (12-18 detik)
- Scene 5: BENEFIT (18-24 detik)
- Scene 6: CTA (24-30 detik)

Keluarkan response JSON HANYA berupa array of 6 scene objects dengan schema:
[
  {
    "scene_number": 1,
    "title": "HOOK",
    "duration": 3,
    "voice_over": "Kalimat voice over Indonesia natural",
    "text_overlay": "Teks singkat 1-3 kata untuk caption TikTok",
    "visual": "Deskripsi visual adegan",
    "action": "Aksi model atau produk di scene",
    "camera": "Gerakan kamera (e.g. handheld selfie close-up, push in, panning)",
    "image_prompt": "Prompt detail untuk photorealistic 9:16 vertical TikTok UGC image, including character lock and product lock",
    "video_prompt": "Prompt detail untuk Veo 9:16 vertical video prompt"
  },
  ...
]`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '[]');
    res.json({ success: true, scenes: parsed, isDemo: false });
  } catch (error: any) {
    console.error('Error generating script:', error);
    res.json({
      success: true,
      isDemo: true,
      error: error.message,
      scenes: getFallbackScenes(req.body.productName, req.body.productDescription),
    });
  }
});

// 4. Generate Scene Image (9:16)
app.post('/api/generate-image', async (req: Request, res: Response) => {
  try {
    const { prompt, productReferenceImage, modelReferenceImage, sceneNumber } = req.body;

    if (!apiKey) {
      return res.json({
        success: true,
        isDemo: true,
        imageUrl: getFallbackImageUrl(sceneNumber),
      });
    }

    const ai = getAIClient();
    if (!ai) throw new Error('Gemini API client not initialized');

    const parts: any[] = [];

    if (modelReferenceImage) {
      const { mimeType, data } = cleanBase64(modelReferenceImage);
      parts.push({
        inlineData: { mimeType, data },
      });
    }

    if (productReferenceImage) {
      const { mimeType, data } = cleanBase64(productReferenceImage);
      parts.push({
        inlineData: { mimeType, data },
      });
    }

    parts.push({
      text: `${prompt}. Photorealistic TikTok UGC portrait 9:16 aspect ratio, natural lighting, sharp focus, Indonesian creator aesthetic. Do not distort hands or products.`,
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite-image',
      contents: { parts },
      config: {
        imageConfig: {
          aspectRatio: '9:16',
        },
      },
    });

    let generatedImageUrl = '';
    const candidates = response.candidates || [];
    if (candidates[0]?.content?.parts) {
      for (const part of candidates[0].content.parts) {
        if (part.inlineData?.data) {
          generatedImageUrl = `data:image/png;base64,${part.inlineData.data}`;
          break;
        }
      }
    }

    if (!generatedImageUrl) {
      generatedImageUrl = getFallbackImageUrl(sceneNumber);
    }

    res.json({ success: true, imageUrl: generatedImageUrl, isDemo: false });
  } catch (error: any) {
    console.error('Error generating image:', error);
    res.json({
      success: true,
      isDemo: true,
      error: error.message,
      imageUrl: getFallbackImageUrl(req.body.sceneNumber || 1),
    });
  }
});

// 5. Generate Scene Video (Veo)
app.post('/api/generate-video', async (req: Request, res: Response) => {
  try {
    const { videoPrompt, sceneImage, sceneNumber } = req.body;

    if (!apiKey) {
      return res.json({
        success: true,
        isDemo: true,
        operationName: `demo-operation-scene-${sceneNumber}`,
        done: true,
        videoUrl: getFallbackVideoUrl(sceneNumber),
      });
    }

    const ai = getAIClient();
    if (!ai) throw new Error('Gemini API client not initialized');

    try {
      const videoOptions: any = {
        model: 'veo-3.1-lite-generate-preview',
        prompt: `${videoPrompt}. Natural TikTok UGC movement, 9:16 vertical ratio, realistic creator motion.`,
        config: {
          numberOfVideos: 1,
          resolution: '720p',
          aspectRatio: '9:16',
        },
      };

      if (sceneImage) {
        const { mimeType, data } = cleanBase64(sceneImage);
        videoOptions.image = {
          imageBytes: data,
          mimeType: mimeType,
        };
      }

      const operation = await (ai.models as any).generateVideos(videoOptions);
      return res.json({
        success: true,
        operationName: operation.name,
        done: false,
        isDemo: false,
      });
    } catch (veoError: any) {
      console.warn('Veo API call did not complete or quota limit reached, using fallback video:', veoError.message);
      return res.json({
        success: true,
        isDemo: true,
        operationName: `fallback-scene-${sceneNumber}`,
        done: true,
        videoUrl: getFallbackVideoUrl(sceneNumber),
      });
    }
  } catch (error: any) {
    console.error('Error in generate-video endpoint:', error);
    res.json({
      success: true,
      isDemo: true,
      error: error.message,
      videoUrl: getFallbackVideoUrl(req.body.sceneNumber || 1),
    });
  }
});

// 6. Polling Video Status
app.post('/api/video-status', async (req: Request, res: Response) => {
  try {
    const { operationName } = req.body;

    if (!operationName || operationName.startsWith('demo-') || operationName.startsWith('fallback-')) {
      return res.json({
        done: true,
        isDemo: true,
        videoUrl: getFallbackVideoUrl(1),
      });
    }

    const ai = getAIClient();
    if (!ai) {
      return res.json({ done: true, isDemo: true, videoUrl: getFallbackVideoUrl(1) });
    }

    const { GenerateVideosOperation } = await import('@google/genai');
    const op = new (GenerateVideosOperation as any)();
    op.name = operationName;
    const updated = await (ai.operations as any).getVideosOperation({ operation: op });

    if (updated.done) {
      const uri = updated.response?.generatedVideos?.[0]?.video?.uri;
      return res.json({
        done: true,
        hasUri: Boolean(uri),
        isDemo: false,
      });
    }

    res.json({ done: false, isDemo: false });
  } catch (error: any) {
    console.error('Error checking video status:', error);
    res.json({ done: true, isDemo: true, videoUrl: getFallbackVideoUrl(1) });
  }
});

// 7. Video Download Stream
app.post('/api/video-download', async (req: Request, res: Response) => {
  try {
    const { operationName } = req.body;
    if (!operationName || operationName.startsWith('demo-') || operationName.startsWith('fallback-')) {
      return res.redirect(getFallbackVideoUrl(1));
    }

    const ai = getAIClient();
    if (!ai) return res.status(400).send('API client not ready');

    const { GenerateVideosOperation } = await import('@google/genai');
    const op = new (GenerateVideosOperation as any)();
    op.name = operationName;
    const updated = await (ai.operations as any).getVideosOperation({ operation: op });
    const uri = updated.response?.generatedVideos?.[0]?.video?.uri;

    if (!uri) {
      return res.redirect(getFallbackVideoUrl(1));
    }

    const videoRes = await fetch(uri, {
      headers: { 'x-goog-api-key': apiKey },
    });

    res.setHeader('Content-Type', 'video/mp4');
    const arrayBuffer = await videoRes.arrayBuffer();
    res.send(Buffer.from(arrayBuffer));
  } catch (error: any) {
    console.error('Error downloading video:', error);
    res.redirect(getFallbackVideoUrl(1));
  }
});

// 8. Generate Voice Over (TTS)
app.post('/api/generate-tts', async (req: Request, res: Response) => {
  try {
    const { text } = req.body;
    if (!apiKey) {
      return res.json({
        success: true,
        isDemo: true,
        useBrowserSpeech: true,
        message: 'Speech synthesis using client-side audio engine',
      });
    }

    const ai = getAIClient();
    if (!ai) throw new Error('Gemini API client not initialized');

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash-lite-tts',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: text,
                speechMetadata: {
                  style: 'Natural, friendly, energetic Indonesian creator speaking to phone camera',
                },
              },
            ],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        return res.json({
          success: true,
          audioData: `data:audio/wav;base64,${base64Audio}`,
          isDemo: false,
        });
      }
    } catch (ttsErr: any) {
      console.warn('Gemini TTS fallback:', ttsErr.message);
    }

    res.json({
      success: true,
      isDemo: true,
      useBrowserSpeech: true,
    });
  } catch (error: any) {
    res.json({
      success: true,
      isDemo: true,
      useBrowserSpeech: true,
    });
  }
});

// Fallback Generators for High-Fidelity Demo Experience
function getFallbackScenes(productName = 'ENCHEN K8 Mini Shaver', productDescription = '') {
  return [
    {
      scene_number: 1,
      title: 'HOOK',
      duration: 3,
      voice_over: 'Kalian masih ribet ngerapiin kumis atau jenggot pas lagi di jalan?',
      text_overlay: 'Masih ribet cukuran di jalan? 😱',
      visual: 'Close-up ekspresi creator menatap kamera dengan rasa penasaran, memegang dagu.',
      action: 'Creator melambaikan tangan ke kamera dan menunjuk dagu dengan ekspresi relatable.',
      camera: 'Handheld selfie camera, slight push-in ke ekspresi wajah.',
      image_prompt:
        'Portrait 9:16 vertical TikTok UGC, Indonesian creator looking into camera holding chin with questioning relatable expression, warm natural indoor lighting, character lock applied.',
      video_prompt:
        'Handheld selfie camera movement, Indonesian creator looks at phone camera with curious expression, natural head nod and blink, TikTok lifestyle aesthetic.',
    },
    {
      scene_number: 2,
      title: 'PROBLEM',
      duration: 4,
      voice_over: 'Apalagi kalau lagi buru-buru mau meeting atau hangout, alat cukur biasa tuh kegedean.',
      text_overlay: 'Alat cukur biasa kegedean & ribet 😣',
      visual: 'Creator memperlihatkan tas kecilnya dan gesture kerepotan mencari barang.',
      action: 'Creator membuka saku atau tas kecil, menggelengkan kepala pelan.',
      camera: 'Medium selfie shot, natural camera tilt mengikuti gerakan tangan.',
      image_prompt:
        'Portrait 9:16 vertical shot of Indonesian creator checking pocket and shaking head slightly, authentic TikTok UGC video frame, modern casual outfit, character lock applied.',
      video_prompt:
        'Indonesian creator sighs softly and checks pocket, authentic TikTok creator body language, subtle camera movement, 9:16 ratio.',
    },
    {
      scene_number: 3,
      title: 'PRODUCT',
      duration: 5,
      voice_over: `Nah nemu ${productName}! Bentuknya beneran sekecil ini dan enteng banget.`,
      text_overlay: `Nemu ${productName}! Super mini ✨`,
      visual: `Creator mengeluarkan ${productName} dari saku dan menunjukkannya pas di depan kamera.`,
      action: `Tangan creator memegang ${productName} secara presisi, menunjukkan desain compact dan premiumnya.`,
      camera: 'Focus transition dari wajah creator ke produk di telapak tangan.',
      image_prompt: `Close-up shot in 9:16 format of ${productName} held proudly in hand by Indonesian creator, sleek miniature cylindrical shaver with rotary mesh, soft bokeh background, product lock applied.`,
      video_prompt: `Hand brings ${productName} into focus right in front of camera, turning it slightly to reveal compact metal finish and rotary head, product lock active.`,
    },
    {
      scene_number: 4,
      title: 'DEMONSTRATION',
      duration: 6,
      voice_over: 'Tinggal pencet satu tombol, langsung siap dipakai buat rapiin area wajah dengan halus.',
      text_overlay: 'Sekali klik langsung rapi & halus ⚡',
      visual: `Creator menyalakan ${productName} dan memperagakan gerakan merapikan kumis atau dagu dengan nyaman.`,
      action: `Creator menekan tombol power, mengarahkan shaver mini ke area dagu secara natural tanpa rasa sakit.`,
      camera: 'Slight low angle close-up, dynamic and engaging handheld motion.',
      image_prompt: `Indonesian creator gently using the miniature ${productName} along the jawline in front of bathroom mirror, satisfying grooming action, 9:16 vertical frame, character and product lock applied.`,
      video_prompt: `Creator smoothly guides the ${productName} across lower chin with a satisfied slight smile, soft motor vibration simulation, natural handheld motion.`,
    },
    {
      scene_number: 5,
      title: 'BENEFIT',
      duration: 6,
      voice_over: 'Ukurannya pas banget di kantong, praktis dibawa ke kantor, kampus, atau traveling.',
      text_overlay: 'Praktis masuk saku kemana aja! 🎒',
      visual: `Creator memasukkan ${productName} ke dalam saku celana atau pouch kecil dengan senyum puas.`,
      action: `Creator menyelipkan produk ke dalam saku, lalu memberikan pose jempol ke kamera.`,
      camera: 'Medium shot showing how effortlessly the mini shaver slides into a pocket.',
      image_prompt: `Indonesian creator sliding the ${productName} effortlessly into jeans pocket, smiling confidently at camera with thumbs up, 9:16 TikTok creator composition.`,
      video_prompt: `Creator slips ${productName} smoothly into pocket, smiles directly at camera and gives a quick thumbs up, crisp TikTok lifestyle lighting.`,
    },
    {
      scene_number: 6,
      title: 'CTA',
      duration: 6,
      voice_over: 'Biar penampilan selalu rapi on the go, langsung cek produknya di keranjang kuning ya!',
      text_overlay: 'Cek di keranjang kuning sekarang! 👇🛒',
      visual: 'Creator tersenyum ramah dan menunjuk ke arah pojok kiri bawah (lokasi icon keranjang kuning TikTok).',
      action: 'Creator membuat gesture menunjuk ke keranjang kuning di layar dengan senyum ceria.',
      camera: 'Medium close-up selfie shot, animated pointing gesture.',
      image_prompt:
        'Indonesian creator smiling warmly and pointing downward toward the yellow cart position with enthusiasm, bright friendly TikTok creator portrait 9:16, character lock applied.',
      video_prompt:
        'Creator smiles brightly, nods, and points finger downward towards bottom-left corner with friendly inviting TikTok affiliate gesture, 9:16 vertical.',
    },
  ];
}

function getFallbackImageUrl(sceneNumber: number) {
  const images = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=720&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=720&q=80',
    'https://images.unsplash.com/photo-1621607512214-68297480165e?auto=format&fit=crop&w=720&q=80',
    'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=720&q=80',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=720&q=80',
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=720&q=80',
  ];
  return images[(sceneNumber - 1) % images.length];
}

function getFallbackVideoUrl(sceneNumber: number) {
  // Free sample 9:16 / portrait MP4 clips from reliable video CDNs
  const videos = [
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4',
  ];
  return videos[(sceneNumber - 1) % videos.length];
}

// Mount Vite or static files
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`AI Affiliate Video Factory server running on http://0.0.0.0:${port}`);
  });
}

startServer();
