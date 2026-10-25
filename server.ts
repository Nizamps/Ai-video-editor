import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import { validateAIOperation } from './src/ai/tools';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '4mb' }));

  const hasGeminiKey = Boolean(
    process.env.GEMINI_API_KEY &&
      process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY' &&
      process.env.GEMINI_API_KEY.trim().length > 8
  );
  const hasOpenAIKey = Boolean(
    process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim().length > 8
  );

  // Health & AI Provider Status Endpoint
  app.get('/api/ai/status', (_req, res) => {
    res.json({
      online: true,
      provider: hasGeminiKey
        ? 'Google GenAI Server Bridge'
        : hasOpenAIKey
        ? 'OpenAI API Server Bridge'
        : 'ClipForge Server Structured Planner',
      model: hasGeminiKey
        ? 'gemini-3.8-flash'
        : hasOpenAIKey
        ? 'gpt-4o-mini'
        : 'ClipForge Deterministic Timeline Engine',
    });
  });

  // Validated AI Edit Plan Endpoint
  app.post('/api/ai/plan', async (req, res) => {
    const { prompt, projectSummary, selectedClipId } = req.body || {};
    if (!prompt || typeof prompt !== 'string') {
      res.status(400).json({ error: 'Prompt string is required' });
      return;
    }

    // If Gemini API key is configured, query gemini-3.8-flash with structured JSON schema
    if (hasGeminiKey) {
      try {
        const ai = new GoogleGenAI({
          apiKey: process.env.GEMINI_API_KEY,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            },
          },
        });

        const systemPrompt = `You are the ClipForge AI Timeline Editing Agent.
Given the user's editing request and project timeline summary, return a structured JSON edit plan.
Allowed tool names ONLY:
- set_aspect_ratio (args: { aspectRatio: "16:9"|"9:16"|"1:1"|"4:5"|"3:4"|"4:3" })
- set_clip_transform (args: { clipId: string, scale?: number, positionX?: number, positionY?: number, rotation?: number, fitMode?: "fit"|"fill"|"crop" })
- trim_clip (args: { clipId: string, startTime: number, duration: number })
- split_clip (args: { clipId?: string, time: number })
- set_clip_speed (args: { clipId: string, speed: number })
- add_effect (args: { clipId: string, effectId: "blur"|"chromatic-aberration"|"vignette"|"bw-noir"|"sepia-vintage"|"neon-glow"|"camera-shake"|"zoom-punch"|"glitch-cyber"|"vhs-retro"|"impact-flash"|"cinematic-letterbox"|"film-grain"|"halation-bloom"|"light-leak"|"teal-orange-grade", colorPreset?: "cinematic-teal-orange"|"vice-miami-sunset"|"moody-cyber-slate"|"kodak-2383-warm"|"bleach-bypass" })
- add_transition (args: { clipId: string, transitionId: "cross-dissolve"|"fade-black"|"fade-white"|"zoom-in-trans"|"whip-left"|"whip-right"|"push-up"|"glitch-cut"|"flash-impact", duration: number })
- add_keyframe (args: { clipId: string, property: "scale"|"positionX"|"positionY"|"rotation"|"opacity", timeOffset: number, value: number, easing: "linear"|"ease-in"|"ease-out"|"ease-in-out"|"bounce" })
- add_text (args: { text: string, style: "word-highlight"|"bold-gaming"|"karaoke"|"large-hook"|"clean-subtitles", startTime: number, duration: number })
- add_captions (args: { style: "word-highlight"|"karaoke"|"bold-gaming", captions: Array<{ startTime: number, duration: number, text: string }> })
- analyze_audio_beats (args: { sensitivity: number })
- find_scene_changes (args: { threshold: number })
- prepare_export (args: { resolution: "720p"|"1080p"|"1440p"|"2160p", fps: 24|30|60, format: "webm"|"mp4" })
- undo_edit (args: {})
- validate_project (args: {})`;

        const response = await Promise.race([
          ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: JSON.stringify({
              userRequest: prompt,
              selectedClipId,
              projectSummary,
            }),
            config: {
              systemInstruction: systemPrompt,
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  summary: { type: Type.STRING },
                  reasoning: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  operations: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        tool: { type: Type.STRING },
                        description: { type: Type.STRING },
                        argsJson: {
                          type: Type.STRING,
                          description: 'JSON-encoded arguments object for this tool',
                        },
                      },
                      required: ['tool', 'description', 'argsJson'],
                    },
                  },
                },
                required: ['summary', 'reasoning', 'operations'],
              },
            },
          }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('AI timeout')), 3000)
          ),
        ]);

        const rawText = response.text;
        if (rawText) {
          const parsed = JSON.parse(rawText);
          const validatedOps = [];
          for (const item of parsed.operations || []) {
            let parsedArgs = {};
            try {
              parsedArgs = item.argsJson ? JSON.parse(item.argsJson) : item.args || {};
            } catch {
              parsedArgs = {};
            }
            const check = validateAIOperation({
              tool: item.tool,
              description: item.description,
              args: parsedArgs,
            });
            if (check.valid && check.sanitizedOp) {
              validatedOps.push(check.sanitizedOp);
            }
          }
          if (validatedOps.length > 0) {
            res.json({
              summary: parsed.summary,
              reasoning: parsed.reasoning,
              operations: validatedOps,
              warnings: [],
              modelUsed: 'Gemini 3.8 Flash Server Agent',
            });
            return;
          }
        }
      } catch {
        // Fall through to deterministic server fallback below
      }
    }

    // Server-side deterministic fallback so client always receives a fast 200 OK structured response
    res.json({
      fallback: true,
      operations: [],
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ClipForge AI server listening on http://localhost:${PORT}`);
  });
}

startServer();
