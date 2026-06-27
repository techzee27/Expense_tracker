'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  Send, 
  X, 
  MessageSquare, 
  Minus, 
  ChevronUp, 
  Bot, 
  User, 
  Loader2,
  HelpCircle
} from 'lucide-react';

interface ChatMessage {
  role: 'assistant' | 'user';
  content: string;
  modelUsed?: string;
}

interface ChatAssistantProps {
  isInline?: boolean;
}

export function ChatAssistant({ isInline = false }: ChatAssistantProps) {
  const [isOpen, setIsOpen] = useState(isInline);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { 
      role: 'assistant', 
      content: 'Hi! I am your UniFinance AI Coach. Ask me anything about your budgets, savings goals, or spending habits!' 
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  const suggestionChips = [
    'Can I afford a laptop?',
    'Where did I overspend this month?',
    'What is my biggest expense category?',
    'Compare my spending with last month.'
  ];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleSend = async (text: string) => {
    if (!text.trim() || loading) return;
    
    const userMsg = text.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: userMsg }),
      });

      if (!res.ok) {
        throw new Error('Failed to get answer.');
      }

      const data = await res.json();
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: data.answer, 
        modelUsed: data.modelUsed 
      }]);
    } catch (err) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an issue processing that query. Please make sure GROQ_API_KEY is configured in your environment.' 
      }]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 p-4 bg-primary text-primary-foreground rounded-full shadow-[0_4px_20px_rgba(168,85,247,0.4)] border border-primary/20 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer flex items-center justify-center"
      >
        <MessageSquare className="h-6 w-6" />
      </button>
    );
  }

  return (
    <div className={isInline ? "w-full bg-card/30 border border-border backdrop-blur-md rounded-2xl shadow-xl flex flex-col h-[400px] overflow-hidden" : `fixed bottom-6 right-6 z-50 w-80 sm:w-96 bg-card/65 border border-border backdrop-blur-xl rounded-3xl shadow-2xl transition-all duration-300 flex flex-col ${
      isMinimized ? 'h-16' : 'h-[500px]'
    }`}>
      {/* Header */}
      <div className="flex justify-between items-center px-5 py-4 border-b border-border/60">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary animate-pulse" />
          <div>
            <h4 className="font-bold text-sm">AI Financial Assistant</h4>
            <p className="text-[10px] text-muted-foreground">Ask anything about your financial queries</p>
          </div>
        </div>
        
        {!isInline && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1 rounded-lg hover:bg-secondary/40 text-muted-foreground hover:text-foreground transition-all cursor-pointer"
            >
              {isMinimized ? <ChevronUp className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
            </button>
            <button
              onClick={() => {
                setIsOpen(false);
                setIsMinimized(false);
              }}
              className="p-1 rounded-lg hover:bg-secondary/40 text-muted-foreground hover:text-foreground transition-all cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {!isMinimized && (
        <>
          {/* Chat Messages */}
          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-5 space-y-4 text-sm"
          >
            {messages.map((msg, index) => (
              <div 
                key={index}
                className={`flex gap-3 items-start ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div className={`p-2 rounded-xl shrink-0 ${
                  msg.role === 'user' 
                    ? 'bg-primary/20 text-primary border border-primary/10' 
                    : 'bg-secondary/35 border border-border/80'
                }`}>
                  {msg.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </div>

                <div className="space-y-1">
                  <div className={`px-4 py-3 rounded-2xl leading-normal ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground font-medium rounded-tr-none'
                      : 'bg-secondary/20 border border-border/40 rounded-tl-none text-foreground/90'
                  }`}>
                    {msg.content}
                  </div>
                  {msg.modelUsed && (
                    <span className="text-[8px] text-muted-foreground/80 block mt-0.5 ml-2 font-mono">
                      model: {msg.modelUsed}
                    </span>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-3 items-center text-xs text-muted-foreground bg-secondary/10 border border-border/30 px-3 py-2 rounded-xl w-fit">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                Thinking...
              </div>
            )}
          </div>

          {/* Suggetions Area (If no conversation active or user finished a turn) */}
          {messages.length === 1 && !loading && (
            <div className="px-5 pb-2">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">Suggestions</span>
              <div className="flex flex-col gap-1.5">
                {suggestionChips.map((chip, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(chip)}
                    className="text-xs text-left bg-secondary/15 hover:bg-secondary/35 border border-border/60 px-3 py-2 rounded-xl text-foreground/85 transition-all duration-200 cursor-pointer hover:border-primary/20"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Form Input */}
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(input);
            }}
            className="p-4 border-t border-border/60 flex gap-2"
          >
            <input
              type="text"
              placeholder="Ask your coach..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 bg-secondary/20 border border-border/60 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all text-white"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="p-2.5 bg-primary text-primary-foreground rounded-xl hover:opacity-90 active:scale-95 transition-all disabled:opacity-40 cursor-pointer flex items-center justify-center shrink-0"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </>
      )}
    </div>
  );
}
