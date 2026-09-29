import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import axios from 'axios';
import { Bot, Send, X } from 'lucide-react';
import { BACKEND_URL } from '../config';

interface ChatMsg {
  role: 'user' | 'assistant';
  content: string;
}

const WELCOME: ChatMsg = {
  role: 'assistant',
  content:
    'Halo! Saya Cher, asisten virtual SIM Mall. Ada yang bisa saya bantu seputar tenant, fasilitas, parkir, jam buka, atau acara di mall ini?',
};

function cleanAiText(raw: string): string {
  return raw
    .split('\n')
    .map((line) => {
      if (/^\s*\|?[\s:-]+\|[\s:-]*\|?\s*$/.test(line) && line.includes('|')) return '';
      const l = line.replace(/[|]/g, '').replace(/\*/g, '');
      if (/^\s*[-_]{3,}\s*$/.test(l)) return '';
      return l;
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open, loading]);

  const send = async (e: FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;
    const userMsg: ChatMsg = { role: 'user', content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput('');
    setLoading(true);
    try {
      const res = await axios.post<{ content: string }>(`${BACKEND_URL}/chat`, {
        messages: next,
      });
      setMessages([...next, { role: 'assistant', content: cleanAiText(res.data.content) }]);
    } catch {
      setMessages([
        ...next,
        {
          role: 'assistant',
          content: 'Maaf, layanan AI sedang tidak tersedia. Silakan coba lagi sebentar lagi.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className={`chat-fab ${open ? 'hidden' : ''}`}
        onClick={() => setOpen(true)}
        aria-label="Open chat assistant"
      >
        <Bot size={22} />
        <span className="chat-fab-tooltip">Chatbot</span>
      </button>

      {open && (
        <div className="chat-widget" role="dialog" aria-label="Chat assistant">
          <div className="chat-header">
            <div className="chat-header-title">
              <div>
                <strong>Cher</strong>
              </div>
            </div>
            <button
              type="button"
              className="chat-close"
              onClick={() => setOpen(false)}
              aria-label="Close chat assistant"
            >
              <X size={18} />
            </button>
          </div>

          <div className="chat-body" ref={scrollRef}>
            {messages.map((m, i) => (
              <div key={i} className={`chat-msg ${m.role}`}>
                <span className="chat-bubble">{m.content}</span>
              </div>
            ))}
            {loading && (
              <div className="chat-msg assistant">
                <span className="chat-bubble chat-typing">
                  <span className="chat-typing-dot" />
                  <span className="chat-typing-dot" />
                  <span className="chat-typing-dot" />
                </span>
              </div>
            )}
          </div>

          <form className="chat-footer" onSubmit={send}>
            <input
              className="chat-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Tanya tentang mall... (mis. jam buka, parkir)"
              aria-label="Type a message"
            />
            <button type="submit" className="chat-send" disabled={!input.trim() || loading} aria-label="Send message">
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}

export default ChatWidget;
