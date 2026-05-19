"use client";
import { useState, useRef, useEffect } from "react";
import { streamChat } from "@/lib/api";
import type { ChatMessage } from "@/lib/api";
import { Sidebar } from "@/components/Sidebar";
import { Send, Dumbbell, Zap, Users, CreditCard, TrendingUp } from "lucide-react";
import clsx from "clsx";

const SUGGESTIONS = [
  { icon: Users, text: "Show me members expiring this week" },
  { icon: CreditCard, text: "How much revenue did we collect this month?" },
  { icon: TrendingUp, text: "Who are the overdue members?" },
  { icon: Zap, text: "Add member: Priya Sharma, 9876543210, Premium plan, ₹2500/month" },
];

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === "user";
  return (
    <div className={clsx("flex", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="w-8 h-8 bg-brand-500 rounded-xl flex items-center justify-center mr-3 mt-1 shrink-0">
          <Dumbbell size={14} className="text-white" />
        </div>
      )}
      <div
        className={clsx(
          "max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
          isUser
            ? "bg-brand-500 text-white rounded-br-sm"
            : "bg-white text-slate-800 shadow-sm border border-slate-100 rounded-bl-sm"
        )}
        style={{ whiteSpace: "pre-wrap" }}
      >
        {msg.content}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-start">
      <div className="w-8 h-8 bg-brand-500 rounded-xl flex items-center justify-center mr-3 shrink-0">
        <Dumbbell size={14} className="text-white" />
      </div>
      <div className="bg-white border border-slate-100 shadow-sm rounded-2xl rounded-bl-sm px-4 py-3">
        <div className="flex gap-1 items-center h-4">
          <div className="w-2 h-2 bg-slate-400 rounded-full typing-dot" />
          <div className="w-2 h-2 bg-slate-400 rounded-full typing-dot" />
          <div className="w-2 h-2 bg-slate-400 rounded-full typing-dot" />
        </div>
      </div>
    </div>
  );
}

function ToolCallChip({ tool }: { tool: string }) {
  const labels: Record<string, string> = {
    search_members: "🔍 Searching members",
    get_member_detail: "👤 Loading member details",
    create_member: "✅ Creating member",
    update_member: "✏️ Updating member",
    record_payment: "💳 Recording payment",
    get_billing_summary: "📊 Loading billing data",
    get_gym_stats: "📈 Fetching gym stats",
    get_overdue_members: "⚠️ Checking overdue members",
  };
  return (
    <div className="flex justify-start pl-11">
      <div className="text-xs text-slate-400 bg-slate-100 rounded-full px-3 py-1 flex items-center gap-1.5">
        <div className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-pulse" />
        {labels[tool] || `Using ${tool}`}
      </div>
    </div>
  );
}

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [toolInProgress, setToolInProgress] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, toolInProgress]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: ChatMessage = { role: "user", content: text.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    setToolInProgress(null);

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    let assistantText = "";

    try {
      const res = await streamChat(newMessages);
      if (!res.body) throw new Error("No stream");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));

            if (event.type === "text") {
              assistantText += event.content;
              setMessages([
                ...newMessages,
                { role: "assistant", content: assistantText },
              ]);
              setToolInProgress(null);
            } else if (event.type === "tool_call") {
              setToolInProgress(event.tool);
            } else if (event.type === "done") {
              setToolInProgress(null);
            }
          } catch {}
        }
      }
    } catch (err) {
      setMessages([
        ...newMessages,
        { role: "assistant", content: "Sorry, something went wrong. Please check your API key and try again." },
      ]);
    } finally {
      setLoading(false);
      setToolInProgress(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="ml-60 flex-1 flex flex-col h-screen">
        {/* Header */}
        <div className="px-8 py-4 border-b bg-white flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 bg-brand-500 rounded-xl flex items-center justify-center">
            <Dumbbell size={18} className="text-white" />
          </div>
          <div>
            <div className="font-semibold text-slate-900">GymOS AI Agent</div>
            <div className="text-xs text-slate-400">Powered by Claude — knows your entire gym</div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-xs text-slate-400">Online</span>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-4">
          {isEmpty ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center mb-5">
                <Dumbbell size={28} className="text-brand-500" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">What can I help with?</h2>
              <p className="text-slate-500 max-w-sm mb-8 text-sm">
                Ask me anything about your gym — members, billing, renewals, or add new data.
                I have full access to your gym&apos;s information.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
                {SUGGESTIONS.map(({ icon: Icon, text }) => (
                  <button
                    key={text}
                    onClick={() => sendMessage(text)}
                    className="flex items-start gap-3 p-4 bg-white border border-slate-200 rounded-xl hover:border-brand-500 hover:shadow-sm transition-all text-left"
                  >
                    <div className="bg-brand-50 p-2 rounded-lg shrink-0">
                      <Icon size={16} className="text-brand-600" />
                    </div>
                    <span className="text-sm text-slate-700">{text}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg, i) => (
                <MessageBubble key={i} msg={msg} />
              ))}
              {toolInProgress && <ToolCallChip tool={toolInProgress} />}
              {loading && !toolInProgress && messages[messages.length - 1]?.role === "user" && (
                <TypingIndicator />
              )}
            </>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-8 py-4 border-t bg-white shrink-0">
          <div className="flex items-end gap-3 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100 transition-all">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything… e.g. 'Who hasn't paid this month?' or 'Add new member: Arjun Mehta'"
              className="flex-1 bg-transparent text-sm resize-none focus:outline-none placeholder-slate-400 min-h-[24px] max-h-40"
              rows={1}
              disabled={loading}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || loading}
              className="w-9 h-9 bg-brand-500 hover:bg-brand-600 disabled:opacity-40 text-white rounded-xl flex items-center justify-center shrink-0 transition-colors"
            >
              <Send size={16} />
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-2 text-center">
            Enter to send · Shift+Enter for new line · AI can create and update records
          </p>
        </div>
      </main>
    </div>
  );
}
