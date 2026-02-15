import { useState, useRef, useEffect, useCallback } from "react";
import { sendChat, checkHealth, type ChatResponse } from "./api";

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: ChatResponse["sources"];
  confidence?: ChatResponse["confidence"];
  timestamp: Date;
}

export function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [showSources, setShowSources] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Check backend connection on mount
  useEffect(() => {
    checkHealth().then(setIsConnected);
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-focus input
  useEffect(() => {
    inputRef.current?.focus();
  }, [isLoading]);

  const handleSubmit = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMessage: Message = {
      role: "user",
      content: trimmed,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await sendChat(trimmed, conversationId);
      setConversationId(response.conversationId);

      const assistantMessage: Message = {
        role: "assistant",
        content: response.answer,
        sources: response.sources,
        confidence: response.confidence,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        role: "assistant",
        content: `エラーが発生しました: ${error instanceof Error ? error.message : "不明なエラー"}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, conversationId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const confidenceBadge = (confidence: string) => {
    const colors: Record<string, string> = {
      high: "badge-high",
      medium: "badge-medium",
      low: "badge-low",
    };
    const labels: Record<string, string> = {
      high: "高",
      medium: "中",
      low: "低",
    };
    return (
      <span className={`badge ${colors[confidence] ?? ""}`}>
        確信度: {labels[confidence] ?? confidence}
      </span>
    );
  };

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-left">
          <div className="avatar">S</div>
          <div>
            <h1 className="title">Shingo AI</h1>
            <p className="subtitle">髙橋社長の考え方アシスタント</p>
          </div>
        </div>
        <div className={`status ${isConnected === true ? "connected" : isConnected === false ? "disconnected" : "checking"}`}>
          {isConnected === true ? "接続中" : isConnected === false ? "未接続" : "確認中..."}
        </div>
      </header>

      {/* Messages */}
      <main className="messages">
        {messages.length === 0 && (
          <div className="welcome">
            <div className="welcome-icon">🎯</div>
            <h2>Shingo AIへようこそ</h2>
            <p>髙橋眞剛社長の考え方・哲学について質問してください。</p>
            <div className="suggestions">
              {[
                "給与に対する考え方は？",
                "会社の文化について教えて",
                "マーケティング戦略は？",
                "AIの活用をどう考えていますか？",
              ].map((q) => (
                <button
                  key={q}
                  className="suggestion"
                  onClick={() => {
                    setInput(q);
                    inputRef.current?.focus();
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.role}`}>
            {msg.role === "assistant" && <div className="msg-avatar">S</div>}
            <div className="msg-content">
              <div className="msg-text">{msg.content}</div>
              {msg.role === "assistant" && msg.confidence && (
                <div className="msg-meta">
                  {confidenceBadge(msg.confidence)}
                  {msg.sources && msg.sources.length > 0 && (
                    <button
                      className="sources-toggle"
                      onClick={() =>
                        setShowSources(showSources === i ? null : i)
                      }
                    >
                      📎 ソース ({msg.sources.length})
                    </button>
                  )}
                </div>
              )}
              {showSources === i && msg.sources && (
                <div className="sources">
                  {msg.sources.map((s, si) => (
                    <div key={si} className="source-item">
                      <div className="source-header">
                        <span className="source-channel">#{s.channel}</span>
                        <span className="source-date">
                          {new Date(s.date).toLocaleDateString("ja-JP")}
                        </span>
                      </div>
                      <div className="source-text">{s.text}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="message assistant">
            <div className="msg-avatar">S</div>
            <div className="msg-content">
              <div className="typing">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </main>

      {/* Input */}
      <footer className="input-area">
        <textarea
          ref={inputRef}
          className="input"
          placeholder={
            isConnected === false
              ? "サーバー未接続..."
              : "社長の考え方について質問してください..."
          }
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading || isConnected === false}
          rows={1}
        />
        <button
          className="send-btn"
          onClick={handleSubmit}
          disabled={!input.trim() || isLoading || isConnected === false}
        >
          送信
        </button>
      </footer>
    </div>
  );
}
