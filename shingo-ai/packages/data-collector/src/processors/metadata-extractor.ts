import type { ShingoDocument } from "@shingo/shared";

/**
 * Topic keywords for automatic categorization
 */
const TOPIC_KEYWORDS: Record<string, string[]> = {
  "compensation": ["給与", "報酬", "賞与", "昇給", "ベースアップ", "年収", "手当"],
  "organization": ["組織", "体制", "部門", "チーム", "人事", "採用", "退職"],
  "strategy": ["戦略", "方針", "ビジョン", "目標", "計画", "事業"],
  "marketing": ["マーケティング", "DM", "広告", "ブランド", "PR", "プロモーション"],
  "ai-technology": ["AI", "人工知能", "manus", "ChatGPT", "Claude", "自動化", "DX"],
  "culture": ["文化", "価値観", "行動指針", "理念", "フィロソフィー", "マインド"],
  "sales": ["営業", "売上", "受注", "商談", "顧客", "案件"],
  "energy": ["太陽光", "蓄電池", "O&M", "発電", "エネルギー", "パネル", "HUAWEI"],
  "management": ["経営", "マネジメント", "管理", "KPI", "評価", "制度"],
  "knowledge": ["ナレッジ", "知見", "共有", "学び", "成長", "教育", "研修"],
};

/**
 * Extract metadata and topics from documents
 */
export class MetadataExtractor {
  /**
   * Extract topics from document text
   */
  extractTopics(text: string): string[] {
    const topics: string[] = [];

    for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
      if (keywords.some((keyword) => text.includes(keyword))) {
        topics.push(topic);
      }
    }

    return topics;
  }

  /**
   * Enrich a document with extracted metadata
   */
  enrichDocument(doc: ShingoDocument): ShingoDocument {
    const topics = this.extractTopics(doc.cleanedText);
    return {
      ...doc,
      metadata: {
        ...doc.metadata,
        topics,
      },
    };
  }

  /**
   * Enrich multiple documents
   */
  enrichDocuments(docs: ShingoDocument[]): ShingoDocument[] {
    return docs.map((doc) => this.enrichDocument(doc));
  }
}
