import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageSquare, Smile, X, Sparkles } from 'lucide-react';
import { ChatMessage } from '../types';

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  onSendReaction: (emoji: string) => void;
  isHost: boolean;
  isOpen: boolean;
  onToggle: () => void;
}

const EMOJI_REACTIONS = ['🔥', '❤️', '👏', '🚀', '🎉', '💡', '😂', '👀'];

export const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  onSendMessage,
  onSendReaction,
  isHost,
  isOpen,
  onToggle,
}) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  if (!isOpen) return null;

  return (
    <div className="flex flex-col h-full bg-slate-900/95 border-l border-slate-800 text-slate-100 w-full sm:w-80 md:w-96 shadow-2xl backdrop-blur-md">
      {/* Header */}
      <div className="flex items-center justify-between p-3.5 border-b border-slate-800 bg-slate-950/40">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-indigo-400" />
          <h3 className="text-sm font-semibold">Live Room Chat</h3>
          <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded-full font-mono">
            {messages.length}
          </span>
        </div>
        <button
          onClick={onToggle}
          className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition"
          aria-label="Close Chat"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Emoji Reaction Bar */}
      <div className="px-3 py-2 bg-slate-950/20 border-b border-slate-800/80 flex items-center justify-between gap-1 overflow-x-auto">
        <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mr-1 flex items-center gap-1 shrink-0">
          <Sparkles className="w-3 h-3 text-amber-400" /> React:
        </span>
        <div className="flex items-center gap-1.5">
          {EMOJI_REACTIONS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => onSendReaction(emoji)}
              className="text-base hover:scale-125 active:scale-95 transition-transform p-1 rounded hover:bg-slate-800/80"
              title={`React ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
            <Smile className="w-10 h-10 mb-2 stroke-1 text-slate-600" />
            <p className="text-xs font-medium text-slate-400">No messages yet</p>
            <p className="text-[11px] text-slate-500 mt-1">
              Say hello or tap an emoji to react to the live broadcast!
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col text-xs rounded-xl p-2.5 max-w-[85%] ${
                msg.isHost
                  ? 'ml-auto bg-indigo-600/20 border border-indigo-500/30 text-indigo-100'
                  : 'mr-auto bg-slate-800/70 border border-slate-700/50 text-slate-200'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="font-semibold text-[11px] flex items-center gap-1">
                  {msg.sender}
                  {msg.isHost && (
                    <span className="text-[9px] px-1 py-0.2 rounded bg-indigo-500 text-white font-bold uppercase">
                      HOST
                    </span>
                  )}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-xs break-words leading-relaxed">{msg.text}</p>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-slate-800 bg-slate-950/60 flex items-center gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={isHost ? 'Message viewers...' : 'Send a message...'}
          className="flex-1 bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          maxLength={300}
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white transition shadow-md shadow-indigo-600/20"
          aria-label="Send"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
