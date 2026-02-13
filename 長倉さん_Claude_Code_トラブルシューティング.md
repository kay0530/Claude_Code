# Claude Code CLI 起動問題 トラブルシューティング記録

## 問題の概要

**対象者**: 長倉玲美さん
**症状**: Windows で `claude` コマンドを実行すると、テーマ選択画面が表示されず、すぐに終了するか、キャッシュエラーが出る
**根本原因**: Windowsユーザー名に日本語（`長倉玲美`）が含まれているため、内部のElectron/Chromiumがキャッシュパスのエンコーディングに失敗する

---

## エラーの詳細

### 症状1: DeprecationWarning のみ表示されて即終了（PowerShell）

```
(node:XXXX) [DEP0180] DeprecationWarning: fs.Stats constructor is deprecated.
(Use `Claude --trace-deprecation ...` to show where the warning was created)
PS C:\Users\長倉玲美\Desktop\Claude_Code_Demo>
```

テーマ選択画面が出ずにPSプロンプトに戻る。

### 症状2: キャッシュエラー（コマンドプロンプト）

```
(node:XXXX) [DEP0180] DeprecationWarning: fs.Stats constructor is deprecated.
[XXXX:0212/XXXXXX.XXX:ERROR:net\disk_cache\cache_util_win.cc:25] Unable to move the cache: 經｢經ｯ經#經ｹ經梧拠嶢？經輯｜經勵●繰・ (0x5)
[XXXX:0212/XXXXXX.XXX:ERROR:net\disk_cache\disk_cache.cc:236] Unable to create cache
```

日本語パス（`C:\Users\長倉玲美\AppData\Local\...`）が文字化けしてキャッシュ作成に失敗。

---

## 環境情報

- **OS**: Windows 10/11（ユーザー名: `長倉玲美`）
- **Node.js**: v24.13.0
- **PowerShell**: 7.5.4（Windows PowerShell 5.1 でも同じ症状）
- **Claude Code CLI**: インストール済み（`claude --version` は動作する）
- **Git for Windows**: インストール済み
- **ユーザープロファイルパス**: `C:\Users\長倉玲美`

---

## これまでに試したこと（すべて効果なし）

### 試行1: CLAUDE_CONFIG_DIR + TEMP/TMP の変更

```powershell
$env:CLAUDE_CONFIG_DIR = "C:\claude-config"
$env:TEMP = "C:\temp"
$env:TMP = "C:\temp"
mkdir "C:\temp" -Force
claude
```

**結果**: DeprecationWarning のみ表示されて即終了。キャッシュエラーは表示されないが、UIも表示されない。

---

### 試行2: HOME + LOCALAPPDATA も追加

```powershell
$env:CLAUDE_CONFIG_DIR = "C:\claude-config"
$env:HOME = "C:\claude-home"
$env:LOCALAPPDATA = "C:\claude-local"
$env:TEMP = "C:\temp"
$env:TMP = "C:\temp"
mkdir "C:\claude-config", "C:\claude-home", "C:\claude-local", "C:\temp" -Force
cd "$env:USERPROFILE\Desktop\Claude_Code_Demo"
claude
```

**結果**: PowerShell → DeprecationWarning 後に何も表示されず待機状態（プロセスは生きているがUI描画なし）。コマンドプロンプトではキャッシュエラーが引き続き出る。

---

### 試行3: APPDATA も追加（全環境変数をASCIIパスに）

```powershell
$env:CLAUDE_CONFIG_DIR = "C:\claude-config"
$env:HOME = "C:\claude-home"
$env:LOCALAPPDATA = "C:\claude-local"
$env:APPDATA = "C:\claude-appdata"
$env:TEMP = "C:\temp"
$env:TMP = "C:\temp"
mkdir "C:\claude-config", "C:\claude-home", "C:\claude-local", "C:\claude-appdata", "C:\temp" -Force
cd "$env:USERPROFILE\Desktop\Claude_Code_Demo"
claude
```

**結果**: Claude Desktopアプリが起動してしまった（CLIのUIではなくデスクトップアプリが開く）。APPDATAを変えたことでClaude Desktopの設定が初期化状態になった模様。

---

### 試行4: APPDATA を元に戻す

```powershell
$env:CLAUDE_CONFIG_DIR = "C:\claude-config"
$env:HOME = "C:\claude-home"
$env:LOCALAPPDATA = "C:\claude-local"
$env:TEMP = "C:\temp"
$env:TMP = "C:\temp"
$env:APPDATA = "$env:USERPROFILE\AppData\Roaming"
cd "$env:USERPROFILE\Desktop\Claude_Code_Demo"
claude
```

**結果**: DeprecationWarning のみ表示されて待機状態。UI描画なし。

---

### 試行5: Windows PowerShell 5.1（青いアイコン）で試行

PowerShell 7.5.4 ではなく標準の Windows PowerShell 5.1 で同じコマンドを実行。

**結果**: 同じ症状。PowerShellのバージョンは関係なし。

---

### 試行6: コマンドプロンプト（cmd）で試行

```cmd
set CLAUDE_CONFIG_DIR=C:\claude-config
set HOME=C:\claude-home
set LOCALAPPDATA=C:\claude-local
set TEMP=C:\temp
set TMP=C:\temp
cd /d "%USERPROFILE%\Desktop\Claude_Code_Demo"
claude
```

**結果**: キャッシュエラーが明確に表示された。`Unable to move the cache` + 文字化けしたパス + `Unable to create cache`。LOCALAPPDATAを変更してもElectronが元の日本語パスを参照し続けている。

---

### 試行7: ELECTRON_CACHE + XDG_CACHE_HOME を追加

```cmd
set CLAUDE_CONFIG_DIR=C:\claude-config
set HOME=C:\claude-home
set LOCALAPPDATA=C:\claude-local
set TEMP=C:\temp
set TMP=C:\temp
set ELECTRON_CACHE=C:\claude-electron
set XDG_CACHE_HOME=C:\claude-cache
mkdir C:\claude-electron
mkdir C:\claude-cache
cd /d "%USERPROFILE%\Desktop\Claude_Code_Demo"
claude
```

**結果**: 同じキャッシュエラー。Electronのキャッシュ環境変数では解決せず。

---

## 次に試すべきこと（未実施）

### 試行8: USERPROFILE 自体を変更する

Electronが最終的に `%USERPROFILE%\AppData\Local` からキャッシュパスをハードコードで組み立てている可能性が高い。`USERPROFILE` 自体をASCIIのみのパスに変えることで根本解決を試みる。

**コマンドプロンプト（cmd）で実行**：

```cmd
set USERPROFILE=C:\claude-user
set CLAUDE_CONFIG_DIR=C:\claude-config
set HOME=C:\claude-home
set LOCALAPPDATA=C:\claude-user\AppData\Local
set APPDATA=C:\claude-user\AppData\Roaming
set TEMP=C:\temp
set TMP=C:\temp
mkdir C:\claude-user
mkdir C:\claude-user\AppData
mkdir C:\claude-user\AppData\Local
mkdir C:\claude-user\AppData\Roaming
mkdir C:\claude-config
mkdir C:\claude-home
mkdir C:\temp
cd /d "C:\Users\長倉玲美\Desktop\Claude_Code_Demo"
claude
```

**注意点**:
- `cd` は `%USERPROFILE%` を使わず直接パスを指定（USERPROFILEを変更した後なので）
- このセッション限定の変更（cmd を閉じれば元に戻る）
- 他のアプリに影響しないよう、このcmdウィンドウでは他のアプリを起動しないこと

---

### 試行9（試行8がダメな場合）: Node.js v20 LTS にダウングレード

同じ環境（Node.js v24.13.0）で動作している別ユーザー（田中さん）がいるためNode.jsは主原因ではないが、日本語パスとの複合的な問題の可能性がある。

1. コントロールパネル → プログラムのアンインストール → Node.js をアンインストール
2. https://nodejs.org/ から **v20 LTS** をダウンロード・インストール
3. PowerShellを開き直して `node -v` で `v20.x.x` を確認
4. `claude` を再試行

---

### 試行10（試行8・9がダメな場合）: Windowsユーザーアカウントの作成

最終手段として、日本語を含まないWindowsユーザーアカウントを新規作成する。

1. 設定 → アカウント → 家族とその他のユーザー → アカウントの追加
2. ユーザー名を **英数字のみ**（例: `nagakura`）で作成
3. 新しいアカウントでログイン
4. Node.js、Git、Claude Code CLI を再インストール
5. `claude` を実行

---

## 技術的な分析

### 原因の特定

- Claude Code CLI は内部で **Electron（Chromium ベース）** を使用している
- Electron/Chromium の **disk_cache** モジュールが `C:\Users\長倉玲美\AppData\Local\...` パスを処理する際、日本語文字のエンコーディングに失敗する
- `cache_util_win.cc:25` でキャッシュの移動に失敗し、`disk_cache.cc:236` でキャッシュ作成自体が失敗する
- 環境変数 `LOCALAPPDATA` を変更しても、Electron内部で別の方法（Windows API や `USERPROFILE` ベースの組み立て）でパスを取得しているため、無視される

### 田中さん（動作する）との違い

- 田中さんのユーザー名: `田中　圭亮`（日本語 + 全角スペース）
- 長倉さんのユーザー名: `長倉玲美`（日本語）
- 両者とも日本語だが、Shift_JIS での特定のバイトシーケンスが Chromium のパス処理でトリガーとなる可能性がある
- 「倉」「玲」「美」のいずれかがShift_JISでバックスラッシュ(`\`)やその他の特殊バイトと衝突している可能性

### Node.js v24 の影響

- `fs.Stats constructor is deprecated` は Node.js v24 の既知の警告
- この警告自体は致命的ではないが、Electron との互換性に影響する可能性がある
- 田中さんも同じ v24.13.0 で動作しているため、単独の原因ではない

---

## 現在のステータス

**未解決** — 試行8（USERPROFILE の変更）を次に試す段階。
