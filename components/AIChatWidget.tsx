'use client';

import { useState, useRef, useEffect } from 'react';

type Message = { role: 'user' | 'assistant'; content: string };

const FALLBACK_EMAIL =
  process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'riteshs.connect@gmail.com';

export default function AIChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hey there! Ask me anything about AISEO audits, pricing, or how AIEO works.',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput('');
    const newHistory: Message[] = [...messages, { role: 'user', content: userMsg }];
    setMessages(newHistory);
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newHistory }),
      });

      if (!res.ok) throw new Error('API Error');
      const data = await res.json();

      if (typeof data?.reply !== 'string' || !data.reply.trim()) {
        throw new Error('Empty reply');
      }

      setMessages([...newHistory, { role: 'assistant', content: data.reply }]);
    } catch {
      setMessages([
        ...newHistory,
        {
          role: 'assistant',
          content: `There's some issues on our side, please connect with ${FALLBACK_EMAIL} to resolve your query.`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isOpen ? (
        <div className="flex flex-col w-[340px] h-[480px] max-h-[calc(100vh-5rem)] bg-slate-950 border border-lime-400/20 rounded-2xl shadow-2xl overflow-hidden shadow-lime-400/10">
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-slate-900 border-b border-lime-400/20">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-lime-400 animate-pulse" />
              <span className="font-medium text-white text-sm">AISEO Assistant</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-white transition-colors rounded-md hover:bg-white/5"
                aria-label="Minimize chat"
                title="Minimize"
              >
                <span className="text-lg leading-none font-medium">−</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setMessages([
                    {
                      role: 'assistant',
                      content:
                        'Hey there! Ask me anything about AISEO audits, pricing, or how AIEO works.',
                    },
                  ]);
                  setInput('');
                }}
                className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-white transition-colors rounded-md hover:bg-white/5"
                aria-label="Close chat"
                title="Close"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Chat Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`p-3 max-w-[85%] rounded-xl text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-lime-400/10 text-lime-400 rounded-tr-sm border border-lime-400/30'
                      : 'bg-slate-900 text-slate-300 rounded-tl-sm border border-white/10'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="p-3 bg-slate-900 border border-white/10 rounded-xl rounded-tl-sm text-sm text-slate-400 flex gap-1">
                  <span className="animate-bounce">.</span>
                  <span className="animate-bounce [animation-delay:100ms]">.</span>
                  <span className="animate-bounce [animation-delay:200ms]">.</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-3 bg-slate-900 border-t border-lime-400/20 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Ask a question..."
              className="flex-1 bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-lime-400 transition-colors"
            />
            <button
              type="button"
              onClick={sendMessage}
              disabled={isLoading || !input.trim()}
              className="px-4 py-2 bg-lime-400 text-black rounded-lg text-sm font-semibold hover:bg-lime-300 disabled:opacity-50 transition-colors"
            >
              Send
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 bg-lime-400 text-black rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(163,230,53,0.3)] hover:scale-105 transition-transform focus:outline-none"
          aria-label="Open AISEO Assistant"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
