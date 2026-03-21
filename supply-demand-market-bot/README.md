# 需給調整市場 週次チェックボット

毎週月曜 09:00 (JST) に、電力需給調整市場関連の情報源を自動チェックし、
新着・更新情報をSlackの `#88_with_ai` チャンネルに投稿するボットです。

## アーキテクチャ

```
旧構成（廃止）:
  タスクスケジューラ → AutoHotkey → Chrome → ChatGPT GPTs → Slack Webhook
  問題: PC起動必須、UI操作依存で不安定

新構成:
  GitHub Actions (cron) → Claude Code CLI → Web調査 → Slack Webhook
  利点: クラウド実行（PC不要）、安定稼働、ログ保存
```

## セットアップ手順

### 1. GitHub Secrets の設定

リポジトリの Settings → Secrets and variables → Actions で以下を設定：

| Secret名 | 説明 |
|-----------|------|
| `ANTHROPIC_API_KEY` | Anthropic APIキー（Claude利用） |
| `SLACK_WEBHOOK_URL` | Slack Incoming Webhook URL（`#88_with_ai`チャンネル向け） |

### 2. Slack Incoming Webhook の取得

1. https://api.slack.com/apps にアクセス
2. 既存のSlackアプリを選択（または新規作成）
3. 「Incoming Webhooks」を有効化
4. 「Add New Webhook to Workspace」をクリック
5. `#88_with_ai` チャンネルを選択
6. 生成されたWebhook URLをコピー
7. GitHub Secrets に `SLACK_WEBHOOK_URL` として登録

### 3. Anthropic API Key の取得

1. https://console.anthropic.com/ にアクセス
2. API Keys セクションでキーを生成
3. GitHub Secrets に `ANTHROPIC_API_KEY` として登録

### 4. 動作確認（手動実行）

1. GitHub リポジトリの「Actions」タブを開く
2. 「Supply-Demand Market Weekly Check」ワークフローを選択
3. 「Run workflow」ボタンで手動実行
4. Slackにメッセージが届くことを確認

## ファイル構成

```
supply-demand-market-bot/
├── README.md         # このファイル
├── prompt.md         # Claude Codeに送るプロンプト
├── run.sh            # 実行スクリプト
└── output.txt        # 実行結果（gitignore対象）

.github/workflows/
└── supply-demand-market-check.yml  # GitHub Actions定義
```

## スケジュール

- **実行タイミング**: 毎週月曜 09:00 JST（UTC 00:00）
- **手動実行**: GitHub Actions の workflow_dispatch から随時可能

## チェック対象の情報源

1. **EPRX（電力需給調整力取引所）** - 新着/更新
2. **OCCTO（広域機関）** - 調整力・需給調整関連の委員会ページ
3. **OCCTO** - 新着・更新一覧
4. **経産省 / 資エネ庁** - 関連ガイドライン・告示

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

## 旧ボット（AutoHotkey版）からの移行

旧タスクスケジューラの「需給調整市場チェック」タスクは無効化してください：
1. タスクスケジューラを開く
2. 「需給調整市場チェック」を右クリック → 「無効」

## コスト目安

- GitHub Actions: 無料枠（パブリックリポジトリ）/ 月2,000分（プライベート）
- Claude API: 1回の実行あたり約$0.02〜$0.10（Web検索の量による）
- 月額目安: 約$0.10〜$0.50（週1回実行）
