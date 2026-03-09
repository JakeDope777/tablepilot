import { useEffect, useMemo, useRef, useState } from 'react';
import { Bot, Loader2, Send, Trash2, UserCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { chatService } from '../services/api';
import { trackEvent } from '../services/analytics';
import type { ChatMessage } from '../types';
import { OpsPageHeader, OpsPanel } from '../components/ui/OpsPrimitives';

interface ActionBrief {
  what: string;
  why: string;
  nextAction: string;
}

const STARTER_PROMPTS = [
  {
    label: 'Profit Dip',
    prompt: 'Why was profit weak last week and which cost line drove the biggest impact?',
  },
  {
    label: 'Reorder Plan',
    prompt: 'What should I reorder tomorrow based on usage and low-stock risk?',
  },
  {
    label: 'Labor Pressure',
    prompt: 'Which shift is inefficient after 18:00 and what adjustment should I make?',
  },
  {
    label: 'Review Decline',
    prompt: 'Why are review scores dropping and what action should we take this week?',
  },
  {
    label: 'Menu Margin',
    prompt: 'Which dishes are hurting margin most and what repricing move should we test first?',
  },
  {
    label: 'Waste Control',
    prompt: 'What is currently driving food waste and how can we reduce it in the next 7 days?',
  },
];

function extractActionBrief(content: string): ActionBrief {
  const clean = content.replace(/[*_`>#-]/g, ' ').replace(/\s+/g, ' ').trim();
  const firstSentence =
    clean.split(/[.!?]/).find((part) => part.trim().length > 12)?.trim() ??
    (clean || 'No summary available.');

  const whyMatch = clean.match(/(?:why|because)\s*:?\s*([^.!?]{8,180})/i);
  const nextMatch = clean.match(/(?:next action|action|recommendation|should)\s*:?\s*([^.!?]{8,220})/i);

  return {
    what: firstSentence,
    why: whyMatch?.[1]?.trim() ?? 'Root cause details are in the full response.',
    nextAction: nextMatch?.[1]?.trim() ?? 'See full response for recommended next action.',
  };
}

function moduleBadge(moduleUsed?: string): string {
  if (!moduleUsed) return 'tp-badge tp-badge-notice';
  const lowered = moduleUsed.toLowerCase();
  if (lowered.includes('inventory') || lowered.includes('procurement')) return 'tp-badge tp-badge-warning';
  if (lowered.includes('margin') || lowered.includes('finance')) return 'tp-badge tp-badge-critical';
  if (lowered.includes('control') || lowered.includes('ops')) return 'tp-badge tp-badge-healthy';
  return 'tp-badge tp-badge-notice';
}

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const lastAssistantBrief = useMemo(() => {
    const lastAssistant = [...messages].reverse().find((msg) => msg.role === 'assistant');
    return lastAssistant ? extractActionBrief(lastAssistant.content) : null;
  }, [messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      await trackEvent('chat_message_sent', { length: text.length, product_surface: 'tablepilot_manager_chat' });
      const response = await chatService.sendMessage({
        message: text,
        conversation_id: conversationId,
      });

      setConversationId(response.conversation_id);

      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.reply,
        timestamp: new Date().toISOString(),
        module_used: response.module_used,
        tokens_used: response.tokens_used,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'I could not process that request. Confirm backend availability and try again.',
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    if (conversationId) {
      chatService.clearConversation(conversationId).catch(() => {});
    }
    setMessages([]);
    setConversationId(undefined);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  };

  return (
    <div className="space-y-6">
      <OpsPageHeader
        eyebrow="Manager Chat"
        title="AI Operating Partner"
        subtitle="Ask what happened, why it happened, and what to do next. Responses are routed through restaurant operation modules."
      >
        {messages.length > 0 && (
          <button onClick={clearChat} className="btn-secondary inline-flex items-center gap-2 text-sm">
            <Trash2 className="h-4 w-4" /> Clear Thread
          </button>
        )}
      </OpsPageHeader>

      <section className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <OpsPanel title="Conversation" subtitle="Operational Q&A tied to ingested restaurant data." className="min-h-[60vh]">
          <div className="flex h-full flex-col">
            <div ref={scrollRef} className="max-h-[48vh] flex-1 space-y-4 overflow-y-auto pr-1 pb-4">
              {messages.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
                  Ask a question or use one of the starter prompts to generate action-focused recommendations.
                </div>
              )}

              {messages.map((msg) => (
                <div key={msg.id} className={`chat-message-enter flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                  {msg.role === 'assistant' && (
                    <div className="mt-1 h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-orange-700" />
                    </div>
                  )}

                  <article
                    className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-slate-900 text-white rounded-br-md'
                        : 'bg-white border border-slate-200 text-slate-800 rounded-bl-md'
                    }`}
                  >
                    {msg.role === 'assistant' ? (
                      <div className="prose prose-sm max-w-none prose-p:my-1 prose-li:my-0.5">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      msg.content
                    )}

                    {msg.module_used && (
                      <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2 text-[11px]">
                        <span className={moduleBadge(msg.module_used)}>{msg.module_used}</span>
                        {msg.tokens_used ? <span className="text-slate-500">{msg.tokens_used} tokens</span> : null}
                      </div>
                    )}
                  </article>

                  {msg.role === 'user' && (
                    <div className="mt-1 h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center">
                      <UserCircle className="h-4 w-4 text-slate-600" />
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="flex gap-3 chat-message-enter">
                  <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-orange-700" />
                  </div>
                  <div className="rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-3">
                    <Loader2 className="h-5 w-5 animate-spin text-orange-600" />
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-slate-200 pt-4">
              <div className="flex gap-3">
                <textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask your AI manager..."
                  rows={1}
                  className="input-field resize-none"
                />
                <button
                  onClick={() => void sendMessage()}
                  disabled={!input.trim() || loading}
                  className="btn-primary inline-flex items-center gap-2 px-5"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </OpsPanel>

        <div className="space-y-4">
          <OpsPanel title="Starter Prompts" subtitle="Operator jobs-to-be-done for daily decision support.">
            <div className="grid grid-cols-1 gap-2">
              {STARTER_PROMPTS.map((item) => (
                <button
                  key={item.label}
                  onClick={() => setInput(item.prompt)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-700 hover:border-orange-300 hover:bg-orange-50"
                >
                  <span className="block text-xs uppercase tracking-[0.12em] text-slate-500">{item.label}</span>
                  <span className="mt-0.5 block text-sm">{item.prompt}</span>
                </button>
              ))}
            </div>
          </OpsPanel>

          <OpsPanel title="Latest Action Brief" subtitle="Auto-structured summary from the latest assistant response.">
            {lastAssistantBrief ? (
              <div className="space-y-2 text-sm">
                <article className="tp-panel-muted">
                  <p className="tp-kpi-label">What</p>
                  <p className="text-sm text-slate-800">{lastAssistantBrief.what}</p>
                </article>
                <article className="tp-panel-muted">
                  <p className="tp-kpi-label">Why</p>
                  <p className="text-sm text-slate-700">{lastAssistantBrief.why}</p>
                </article>
                <article className="tp-panel-muted">
                  <p className="tp-kpi-label">Next Action</p>
                  <p className="text-sm font-medium text-slate-800">{lastAssistantBrief.nextAction}</p>
                </article>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Send a question to generate a structured action brief.</p>
            )}
          </OpsPanel>
        </div>
      </section>
    </div>
  );
}
