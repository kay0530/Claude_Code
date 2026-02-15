# Shingo AI Chatbot - Architecture Design Document

## 1. Project Overview

**Project Name:** Shingo AI Chatbot
**Purpose:** オルテナジー代表取締役社長 髙橋 眞剛氏の考え方・哲学を学習したAI Chatbot
**Key Principle:** フロントエンド非依存 - Chrome拡張、Slackbot、その他のインターフェースに対応可能

## 2. Data Sources

### Primary Source: Slack
| Channel | ID | Description | Data Quality |
|---------|-----|-------------|-------------|
| #社長の呟き | C0879M558EB | CEO's primary communication channel (81 members) | **High** - CEO's direct thoughts, philosophy, business strategy |
| #org_部長会 | C0824BFK886 | Department head meetings | **Medium** - CEO's directives and management decisions |

**CEO User:** Takahashi Shingo (U082DDT76NQ / shingo.takahashi@altenergy.co.jp)

### Secondary Source: Salesforce
| Source | Description | Data Quality |
|--------|-------------|-------------|
| Chatter Groups | CEO Message group (22 members), management group | **Low** - Minimal direct CEO posts |
| Reports/Approvals | CEO-related business approvals | **Supplementary** |

### Data Volume Estimate (from investigation)

| Metric | Estimate |
|--------|----------|
| Channel active period | 2025-12 ~ present (~2-3 months) |
| CEO post frequency | ~2-3 posts/week |
| Estimated total CEO posts | ~30-50 posts |
| Average post length | Long (500-2000+ chars per post) |
| Thread engagement | High (avg 5-10 replies, 20-50 reactions) |
| Estimated total text | ~50,000-100,000 chars of CEO content |
| After chunking (~500 tokens) | ~100-300 chunks |

**Note:** Channel #社長の呟き is relatively new (created late 2025). Future data volume will grow steadily as the CEO continues posting. The periodic update mechanism will capture new posts automatically.

### Content Topics Identified
- Compensation/salary reform (market-based approach)
- Organizational growth strategy
- Marketing & DM strategy
- AI adoption (manus, AI agents)
- Business partnerships (HUAWEI battery)
- Knowledge management & company culture
- Career communication systems

## 3. System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend Layer                        │
│  (Pluggable - Chrome Extension / Slackbot / Web App)    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌───────────────┐   │
│  │   Chrome     │  │  Slackbot   │  │   Web App     │   │
│  │  Extension   │  │  Interface  │  │  (Future)     │   │
│  └──────┬──────┘  └──────┬──────┘  └───────┬───────┘   │
│         │                │                  │           │
│         └────────────────┼──────────────────┘           │
│                          │                              │
│                    ┌─────▼─────┐                        │
│                    │  Shingo   │                        │
│                    │  Core API │                        │
│                    └─────┬─────┘                        │
│                          │                              │
├──────────────────────────┼──────────────────────────────┤
│                    Core Layer                           │
│                          │                              │
│  ┌───────────────────────▼───────────────────────────┐  │
│  │              RAG Engine                           │  │
│  │  ┌─────────────┐  ┌──────────┐  ┌─────────────┐  │  │
│  │  │   Query     │  │ Context  │  │  Response    │  │  │
│  │  │  Processor  │  │ Builder  │  │  Generator   │  │  │
│  │  └──────┬──────┘  └────┬─────┘  └──────┬──────┘  │  │
│  │         │              │               │          │  │
│  │         ▼              ▼               ▼          │  │
│  │  ┌─────────────┐  ┌──────────┐  ┌─────────────┐  │  │
│  │  │  Embedding  │  │  Vector  │  │  Claude API  │  │  │
│  │  │   Service   │  │  Search  │  │  (LLM)       │  │  │
│  │  └─────────────┘  └──────────┘  └─────────────┘  │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                    Data Layer                           │
│                                                         │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │   Vector DB  │  │  Document   │  │  Metadata    │   │
│  │  (Embeddings)│  │   Store     │  │   Store      │   │
│  └─────────────┘  └──────────────┘  └──────────────┘   │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                Data Collection Pipeline                 │
│                                                         │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │   Slack     │  │  Salesforce  │  │  Text        │   │
│  │  Collector  │  │  Collector   │  │  Processor   │   │
│  └──────┬──────┘  └──────┬───────┘  └──────┬───────┘   │
│         │                │                  │           │
│         ▼                ▼                  ▼           │
│  ┌─────────────────────────────────────────────────┐    │
│  │            Ingestion Pipeline                   │    │
│  │  Collect → Clean → Chunk → Embed → Store       │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## 4. Module Design

### 4.1 Data Collection Pipeline (`/packages/data-collector`)

Slack/SalesforceからCEOの投稿データを収集・前処理するモジュール。

```
data-collector/
├── src/
│   ├── collectors/
│   │   ├── slack-collector.ts      # Slack API integration
│   │   └── salesforce-collector.ts # Salesforce API integration
│   ├── processors/
│   │   ├── text-cleaner.ts         # Remove formatting, normalize text
│   │   ├── chunker.ts              # Split long posts into chunks
│   │   └── metadata-extractor.ts   # Extract dates, topics, reactions
│   ├── storage/
│   │   ├── document-store.ts       # Raw document storage
│   │   └── vector-store.ts         # Embedding storage interface
│   ├── scheduler.ts                # Periodic update scheduler
│   └── index.ts
├── package.json
└── tsconfig.json
```

**Key Design Decisions:**
- Slack Web API (conversations.history) for channel message retrieval
- Thread replies included via conversations.replies
- Text chunking: ~500 tokens per chunk with overlap
- Metadata preserved: timestamp, channel, reactions count, thread replies

### 4.2 RAG Core Engine (`/packages/rag-core`)

質問に対して関連するCEOの投稿を検索し、回答を生成するコアモジュール。

```
rag-core/
├── src/
│   ├── embeddings/
│   │   └── embedding-service.ts    # Text → Vector embedding
│   ├── search/
│   │   └── vector-search.ts        # Similarity search
│   ├── context/
│   │   └── context-builder.ts      # Build prompt context from results
│   ├── llm/
│   │   └── claude-client.ts        # Claude API client
│   ├── prompts/
│   │   └── system-prompt.ts        # Shingo persona prompt template
│   ├── rag-engine.ts               # Main RAG orchestrator
│   └── index.ts
├── package.json
└── tsconfig.json
```

**System Prompt Strategy:**
```
あなたは「髙橋 眞剛」（オルテナジー代表取締役社長）の考え方を体現するAIアシスタントです。
以下の参考情報をもとに、髙橋社長の視点・価値観・口調で回答してください。

【参考情報】
{retrieved_context}

【回答ルール】
- 髙橋社長の実際の発言や考え方に基づいて回答する
- 推測で回答する場合は「社長の考え方から推察すると」と明示する
- 具体的な数値や事実が参考情報にある場合はそれを引用する
- ビジネス判断に関わる重大な質問には慎重に回答する
```

### 4.3 Shingo API (`/packages/shingo-api`)

フロントエンドから呼び出される統一API。

```
shingo-api/
├── src/
│   ├── api/
│   │   ├── chat.ts                 # Chat endpoint (question → answer)
│   │   ├── health.ts               # Health check
│   │   └── admin.ts                # Data refresh triggers
│   ├── types/
│   │   └── index.ts                # Shared type definitions
│   ├── server.ts                   # Express/Hono server
│   └── index.ts
├── package.json
└── tsconfig.json
```

**API Interface:**
```typescript
// POST /api/chat
interface ChatRequest {
  message: string;
  conversationId?: string;  // For multi-turn conversations
}

interface ChatResponse {
  answer: string;
  sources: Array<{
    text: string;        // Original CEO quote snippet
    channel: string;     // Source channel name
    date: string;        // Post date
    reactions: number;   // Engagement indicator
  }>;
  confidence: 'high' | 'medium' | 'low';
}
```

### 4.4 Frontend Adapters

#### Option A: Chrome Extension (`/packages/chrome-extension`)
```
chrome-extension/
├── src/
│   ├── popup/           # Popup UI (React)
│   ├── sidepanel/       # Side panel UI (React)
│   ├── background/      # Service worker
│   └── content/         # Content scripts
├── manifest.json        # Manifest V3
├── vite.config.ts
└── package.json
```

#### Option B: Slackbot (`/packages/slackbot`)
```
slackbot/
├── src/
│   ├── app.ts           # Slack Bolt app
│   ├── handlers/
│   │   ├── message.ts   # Message handler
│   │   ├── mention.ts   # App mention handler
│   │   └── command.ts   # Slash command handler
│   └── index.ts
├── package.json
└── tsconfig.json
```

## 5. Technology Stack

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| Language | TypeScript | Type safety, cross-platform |
| Runtime | Node.js | Universal JS runtime |
| Build | Vite / tsx | Fast builds |
| LLM | Claude API (claude-sonnet-4-5-20250929) | High quality, Japanese support |
| Embedding | OpenAI text-embedding-3-small or Voyage AI | Cost-effective, multilingual |
| Vector DB | ChromaDB (local) or Pinecone (cloud) | Depends on deployment model |
| API Server | Hono | Lightweight, TypeScript-native |
| Monorepo | npm workspaces | Simple, built-in |

## 6. Data Schema

### Document Record
```typescript
interface ShingoDocument {
  id: string;                    // Unique document ID
  sourceType: 'slack' | 'salesforce';
  sourceChannel: string;         // Channel name or Chatter group
  sourceChannelId: string;       // Channel/Group ID
  authorId: string;              // User ID
  authorName: string;            // Display name
  originalText: string;          // Full original message text
  cleanedText: string;           // Cleaned/normalized text
  postedAt: Date;                // Original post timestamp
  collectedAt: Date;             // Data collection timestamp
  metadata: {
    reactions: number;           // Total reaction count
    threadReplies: number;       // Number of thread replies
    hasAttachments: boolean;
    mentionedUsers: string[];    // @mentioned user IDs
    topics: string[];            // Auto-extracted topics
  };
}
```

### Chunk Record (for Vector DB)
```typescript
interface ShingoChunk {
  id: string;                    // Chunk ID
  documentId: string;            // Parent document ID
  chunkIndex: number;            // Position in document
  text: string;                  // Chunk text (~500 tokens)
  embedding: number[];           // Vector embedding
  metadata: {
    sourceChannel: string;
    postedAt: Date;
    topics: string[];
  };
}
```

## 7. Data Flow

### Initial Data Collection
```
1. Slack API → conversations.history (C0879M558EB)
2. Filter by author (U082DDT76NQ = CEO)
3. For each message:
   a. Fetch thread replies (conversations.replies)
   b. Clean text (remove Slack formatting, URLs, etc.)
   c. Extract metadata (reactions, mentions, date)
   d. Split into chunks (~500 tokens, 100 token overlap)
   e. Generate embeddings for each chunk
   f. Store in Vector DB + Document Store
```

### Query Flow (RAG)
```
1. User sends question
2. Generate embedding for question
3. Vector similarity search → top-k relevant chunks
4. Build context from matched chunks + metadata
5. Construct prompt with system prompt + context + question
6. Call Claude API for response generation
7. Return response with source citations
```

### Periodic Update
```
1. Scheduler triggers (e.g., daily at 3:00 AM)
2. Check last collected timestamp
3. Fetch new messages since last collection
4. Process and store new chunks
5. Log update status
```

## 8. Project Structure (Monorepo)

```
shingo-ai/
├── packages/
│   ├── data-collector/      # Data collection pipeline
│   ├── rag-core/            # RAG engine (embedding, search, LLM)
│   ├── shingo-api/          # Unified API server
│   ├── chrome-extension/    # Chrome Extension frontend (optional)
│   ├── slackbot/            # Slackbot frontend (optional)
│   └── shared/              # Shared types and utilities
├── scripts/
│   ├── collect-data.ts      # Manual data collection script
│   ├── setup-db.ts          # Initialize vector DB
│   └── test-rag.ts          # Test RAG pipeline
├── docs/
│   └── architecture.md      # This document
├── .env.example             # Environment variables template
├── package.json             # Root package.json (workspaces)
├── tsconfig.json             # Root TypeScript config
└── README.md
```

## 9. Environment Variables

```env
# Claude API
ANTHROPIC_API_KEY=sk-ant-...

# Embedding Service
EMBEDDING_API_KEY=...
EMBEDDING_MODEL=text-embedding-3-small

# Slack
SLACK_BOT_TOKEN=xoxb-...
SLACK_SIGNING_SECRET=...

# Salesforce (optional)
SALESFORCE_INSTANCE_URL=...
SALESFORCE_ACCESS_TOKEN=...

# Vector DB
VECTOR_DB_TYPE=chroma    # chroma | pinecone
CHROMA_DB_PATH=./data/chroma
# PINECONE_API_KEY=...
# PINECONE_INDEX=shingo

# Server
API_PORT=3000
```

## 10. Implementation Phases

### Phase 1: Data Collection & RAG Core (Current)
- [ ] Project scaffolding (monorepo setup)
- [ ] Slack data collector implementation
- [ ] Text processor (cleaning, chunking)
- [ ] Vector DB setup (ChromaDB local)
- [ ] Embedding pipeline
- [ ] Basic RAG engine with Claude API
- [ ] CLI-based testing

### Phase 2: API Server
- [ ] Shingo API server (Hono)
- [ ] Chat endpoint implementation
- [ ] Source citation in responses
- [ ] Conversation history support

### Phase 3: Frontend (Choose one or both)
- [ ] Option A: Chrome Extension (Manifest V3 + React)
- [ ] Option B: Slackbot (Slack Bolt)
- [ ] UI/UX design and implementation

### Phase 4: Production Readiness
- [ ] Periodic data update scheduler
- [ ] Error handling and logging
- [ ] Performance optimization
- [ ] Deployment configuration

## 11. Key Design Principles

1. **Frontend Agnostic**: Core logic is completely separated from UI layer
2. **Pluggable Architecture**: Each component can be swapped independently
3. **Source Attribution**: Every response includes traceable sources
4. **Confidence Signaling**: System indicates certainty level of responses
5. **Incremental Updates**: Only new data is processed during updates
6. **Privacy Aware**: CEO's internal communications are handled securely
