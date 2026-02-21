# 日本AIニュース 週次チェックボット

毎週月曜 09:00 (JST) に、日本におけるAI関連の最新ニュース・政策動向を自動チェックし、
Slackチャンネルに投稿するボットです。

## アーキテクチャ

```
GitHub Actions (cron) → Claude Code CLI → Web調査 → Slack Webhook
```

需給調整市場ボットと同じアーキテクチャを採用しています。

## チェック対象の情報源

1. **経済産業省 / デジタル庁** - AI関連政策・ガイドライン
2. **総務省** - AI関連の通信・情報政策
3. **内閣府 AI戦略会議** - AI戦略・規制方針
4. **IPA（情報処理推進機構）** - AI安全性・評価
5. **主要AIニュースメディア** - ITmedia AI+、日経クロステック、Ledge.ai、AI-SCHOLAR
6. **主要AI企業の日本向け発表** - OpenAI、Google、Anthropic、PFN、Sakana AI 等

## チェック観点

- 日本政府のAI規制・政策動向
- 国内企業のAI活用事例・新サービス
- 海外AI企業の日本市場参入
- AI関連の資金調達・M&A
- 生成AI著作権・法的問題
- AI人材育成・教育
- AI安全性・倫理

## セットアップ手順

### 1. GitHub Secrets の設定

リポジトリの Settings → Secrets and variables → Actions で以下を設定：

| Secret名 | 説明 |
|-----------|------|
| `ANTHROPIC_API_KEY` | Anthropic APIキー（Claude利用） |
| `SLACK_WEBHOOK_URL` | Slack Incoming Webhook URL |

※ 需給調整市場ボットと共通のSecretsを使用できます。

### 2. Slack Incoming Webhook の取得

既に需給調整市場ボット用にWebhookを設定済みの場合、同じURLを使用できます。
別チャンネルに投稿したい場合は新しいWebhookを作成してください。

1. https://api.slack.com/apps にアクセス
2. 既存のSlackアプリを選択（または新規作成）
3. 「Incoming Webhooks」を有効化
4. 「Add New Webhook to Workspace」をクリック
5. 投稿先チャンネルを選択
6. 生成されたWebhook URLをコピー
7. GitHub Secrets に `SLACK_WEBHOOK_URL` として登録

### 3. 動作確認（手動実行）

1. GitHub リポジトリの「Actions」タブを開く
2. 「AI News Weekly Check (Japan)」ワークフローを選択
3. 「Run workflow」ボタンで手動実行
4. Slackにメッセージが届くことを確認

### 4. ローカル実行（Windows）

```powershell
# ドライラン（Slack投稿なし）
.\ai-news-bot\run-local.ps1 -DryRun

# 本番実行
.\ai-news-bot\run-local.ps1
```

事前に `config.local.json` のWebhook URLを設定してください。

## ファイル構成

```
ai-news-bot/
├── README.md           # このファイル
├── prompt.md           # Claude Codeに送るプロンプト
├── run.sh              # GitHub Actions用実行スクリプト
├── run-local.ps1       # Windows用ローカル実行スクリプト
├── config.local.json   # ローカル用設定（Webhook URL）
└── output.txt          # 実行結果（自動生成）

.github/workflows/
└── ai-news-check.yml   # GitHub Actions定義
```

## スケジュール

- **実行タイミング**: 毎週月曜 09:00 JST（UTC 00:00）
- **手動実行**: GitHub Actions の workflow_dispatch から随時可能

## トラブルシューティング

### ボットが実行されない
- GitHub Actions のスケジュールは最大15分程度遅延することがあります
- リポジトリに60日以上アクティビティがないとスケジュール実行が無効化されます

### Slack投稿に失敗する
- `SLACK_WEBHOOK_URL` が正しく設定されているか確認
- Webhook URLが無効化されていないか確認
- GitHub Actions のログで HTTP ステータスコードを確認

### Claude Codeの実行に失敗する
- `ANTHROPIC_API_KEY` が正しく設定されているか確認
- APIの利用制限に達していないか確認

## コスト目安

- GitHub Actions: 無料枠（パブリックリポジトリ）/ 月2,000分（プライベート）
- Claude API: 1回の実行あたり約$0.02〜$0.10（Web検索の量による）
- 月額目安: 約$0.10〜$0.50（週1回実行）
