# SnappySnag Model Context Protocol (MCP) Server (日本語)

[English README](README.md)

[SnappySnag](https://snappysnag.com) の公式 **Model Context Protocol (MCP)** インテグレーションです。  
Flutter アプリ上で報告されたバグチケット、ピン留めコメント、スクリーンショット、端末診断ログを、**Cursor**、**Windsurf**、**Claude Desktop** などの AI コーディングアシスタントに直接連携します。

---

## ⚡ SnappySnag MCP とは？

Flutter アプリのテスト中にテスターやユーザーが指摘した画面上の不具合情報を、AI が直接コンテキストとして読み込みます。

- 画面上のピン位置・指摘内容コメント
- ピン番号が焼き込まれた高解像度スクリーンショット
- 該当画面の Flutter クラス名・Widget 階層情報
- OS、プラットフォーム、バージョンなどの端末情報
- AI による原因分析およびコード修正プロンプト

AI エディタ（Cursor や Windsurf 等）に本 MCP を登録すると、開発者はダッシュボードを見に行かなくても、**エディタ内で「SnappySnagの最新バグを確認して修正して」と指示するだけ** で該当コードの特定・修正・チケット解決まで完了します。

---

## 🛠️ 提供ツール一覧

| ツール名 | 説明 | 主なパラメータ |
| :--- | :--- | :--- |
| `get_latest_feedback` | 最新のバグ報告やユーザーフィードバックを全詳細（アクティブなピン、スクショ、端末情報）付きで取得します。 | `status` (`open` \| `all`), `include_screenshot` (`true` \| `false`) |
| `list_feedbacks` | 条件（ステータス、重要度、キーワード）に合致するフィードバック一覧（軽量サマリー）を検索・取得します。 | `status`, `severity`, `source`, `keyword`, `limit` |
| `get_feedback_detail` | 指定したフィードバック ID の完全な詳細情報（画像、ピン、ディスカッション履歴）を取得します。 | `feedback_id` (必須), `include_screenshot` |
| `update_feedback_status` | チケットのステータス（`resolved` / `ignored` / `open`）を更新し、修正内容のメモを記録します。 | `feedback_id` (必須), `status` (必須), `comment` |

---

## 🚀 クイックスタート設定手順

SnappySnag MCP は **リモート Streamable HTTP (Remote SSE)** 方式でホストされています。Node.js などのローカル実行環境は不要です。

### 1. MCP Secret Key の取得
1. [SnappySnag 管理画面](https://snappysnag.com/dashboard) にログインします。
2. 左上のプロジェクト設定（歯車アイコン）から **MCP** または **外部連携** タブを開きます。
3. **MCP Secret Key を生成** をクリックし、表示されたキー（`snag_mcp_...`）をコピーします。

---

### 2. 各 AI エディタへの設定

#### 🔹 Cursor
プロジェクト直下の `.cursor/mcp.json`（または Cursor の Settings -> MCP）に以下を追加します：

```json
{
  "mcpServers": {
    "snappysnag": {
      "url": "https://snappysnag.com/api/mcp",
      "headers": {
        "Authorization": "Bearer あなたのMCP_SECRET_KEY"
      }
    }
  }
}
```

#### 🔹 Windsurf
`~/.codeium/windsurf/mcp_config.json` に以下を追加します：

```json
{
  "mcpServers": {
    "snappysnag": {
      "serverUrl": "https://snappysnag.com/api/mcp",
      "headers": {
        "Authorization": "Bearer あなたのMCP_SECRET_KEY"
      }
    }
  }
}
```

---

## 💡 AI への指示例（ワークフロー）

設定完了後、Cursor などのチャット欄で以下のように話しかけるだけで動作します：

> **「SnappySnag の最新の未対応バグを確認して、コードを修正してください。」**

AI の動作フロー：
1. `get_latest_feedback(status: "open")` を呼び出して不具合画面・指摘内容・端末情報を取得
2. 該当する Flutter の Widget ファイルを特定・読み込み
3. 不具合を解消するコード修正を実施
4. `update_feedback_status(feedback_id: "...", status: "resolved", comment: "〇〇のオーバーフローを修正")` でチケットを自動クローズ

---

## 📄 ライセンス

このプロジェクトは [MIT License](LICENSE) のもとで公開されています。
