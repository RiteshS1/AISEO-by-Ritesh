import { NextResponse } from 'next/server';

const SYSTEM_PROMPT = `You are the AI Assistant for AISEO, created by Ritesh Sharma. 
AISEO helps brands optimize visibility on AI search engines (ChatGPT, Perplexity, Gemini) through AIEO (AI Engine Optimization).
Pricing: Free Starter (2 free audits), Pro Pack (₹99 for 3 extra audits), Agency Pack (₹299 for 10 audits). 
Audits include human-in-the-loop verification, crawlability checks, and engine analytics.
Keep replies very short (1-2 sentences), friendly, direct, and encourage running a free audit. Do not use markdown headers.`;

const GROQ_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';

type ChatMessage = { role: string; content: string };

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const messages = Array.isArray(body?.messages) ? (body.messages as ChatMessage[]) : [];

    // Keep only last 4 messages to save tokens
    const recentMessages = messages
      .filter((m) => m && typeof m.content === 'string' && (m.role === 'user' || m.role === 'assistant'))
      .slice(-4)
      .map((m) => ({ role: m.role, content: m.content }));

    const groqMessages = [{ role: 'system', content: SYSTEM_PROMPT }, ...recentMessages];

    // 1. TRY GROQ PRIMARY
    try {
      const groqKey = process.env.GROQ_API_KEY;
      if (groqKey) {
        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${groqKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: GROQ_MODEL,
            messages: groqMessages,
            max_tokens: 150,
            temperature: 0.3,
          }),
        });

        if (groqRes.ok) {
          const data = await groqRes.json();
          const reply = data?.choices?.[0]?.message?.content;
          if (typeof reply === 'string' && reply.trim()) {
            return NextResponse.json({ reply });
          }
        }
        console.warn('Groq failed, falling back to Gemini...');
      } else {
        console.warn('GROQ_API_KEY missing, falling back to Gemini...');
      }
    } catch (e) {
      console.warn('Groq threw an error, falling back to Gemini...', e);
    }

    // 2. TRY GEMINI FALLBACK
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      throw new Error('Both providers failed.');
    }

    const geminiPrompt = `${SYSTEM_PROMPT}\n\nUser History:\n${recentMessages.map((m) => `${m.role}:${m.content}`).join('\n')}`;
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: geminiPrompt }] }],
          generationConfig: { maxOutputTokens: 150, temperature: 0.3 },
        }),
      }
    );

    if (geminiRes.ok) {
      const data = await geminiRes.json();
      const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (typeof reply === 'string' && reply.trim()) {
        return NextResponse.json({ reply });
      }
    }

    throw new Error('Both providers failed.');
  } catch (error) {
    console.error('Chat API failure:', error);
    return NextResponse.json({ error: 'Provider failure' }, { status: 500 });
  }
}
