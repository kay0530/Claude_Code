import { useState, useRef, useEffect, useCallback } from "react";
import { sendChat, checkHealth } from "./api";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [conversationId, setConversationId] = useState<string | undefined>();
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

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-left">
          <div className="avatar">眞</div>
          <div>
            <h1 className="title">髙橋 眞剛</h1>
            <p className="subtitle">オルテナジー代表</p>
          </div>
        </div>
        <div className={`status ${isConnected === true ? "connected" : isConnected === false ? "disconnected" : "checking"}`}>
          {isConnected === true ? "オンライン" : isConnected === false ? "オフライン" : "..."}
        </div>
      </header>

      {/* Messages */}
      <main className="messages">
        {messages.length === 0 && (
          <div className="welcome">
            <div className="welcome-icon">👋</div>
            <h2>何でも聞いてください</h2>
            <p>普段考えていることを、できるだけ自分の言葉でお話しします。</p>
            <div className="suggestions">
              {[
                "給与ってどう決めてるの？",
                "会社の文化で大事にしてることは？",
                "週報って何のために書くの？",
                "コミュニケーションで気をつけてることは？",
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
            {msg.role === "assistant" && <div className="msg-avatar">眞</div>}
            <div className="msg-content">
              <div className="msg-text">{msg.content}</div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="message assistant">
            <div className="msg-avatar">眞</div>
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
              : "何でも聞いてください..."
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
