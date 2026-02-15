/**
 * API client for Shingo AI backend
 */

const API_BASE = "http://localhost:3000";

export interface ChatResponse {
  answer: string;
  sources: Array<{
    text: string;
    channel: string;
    date: string;
    reactions: number;
  }>;
  confidence: "high" | "medium" | "low";
  conversationId: string;
}

export interface HealthResponse {
  status: string;
  service: string;
}

export interface StatsResponse {
  totalChunks: number;
}

/**
 * Send a chat message to the Shingo AI backend
 */
export async function sendChat(
  message: string,
  conversationId?: string
): Promise<ChatResponse> {
  const response = await fetch(`${API_BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, conversationId }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      (error as { error?: string }).error ?? `Server error: ${response.status}`
    );
  }

  return response.json();
}

/**
 * Check if the backend is healthy
 */
export async function checkHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/api/health`);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Get backend stats
 */
export async function getStats(): Promise<StatsResponse> {
  const response = await fetch(`${API_BASE}/api/stats`);
  if (!response.ok) throw new Error("Failed to fetch stats");
  return response.json();
}
