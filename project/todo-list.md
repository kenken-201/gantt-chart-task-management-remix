# プロジェクト進捗 TODO リスト

## 1. 環境構築と初期設定
*   **Remix プロジェクトの初期化と基本設定**
    *   Remix プロジェクトの作成（Vite 統合）: ✅
    *   `wrangler` のインストールとバージョン調整: ✅
    *   `wrangler.toml` の作成と `wrangler@4` 形式への修正: ✅
    *   `package.json` の `scripts` 更新（`dev`, `dev:vite` スクリプトの追加、`wrangler` コマンドの調整）: ✅
    *   `vite.config.ts` の修正（ポート設定の追加、Remix プラグインオプションの調整と元に戻す作業）: ✅
    *   `tsconfig.json` の `types` 設定を `@remix-run/cloudflare` に変更: ✅
    *   `remix.config.js` の削除: ✅
*   **Drizzle ORM の導入とスキーマ定義**
    *   `drizzle-orm`, `pg`, `drizzle-kit` のインストール: ✅
    *   Drizzle ORM スキーマファイル `app/db/schema.ts` の作成: ✅
    *   `app/db/schema.ts` 内のリレーション定義の修正（`tasksRelations` の `project` リレーション）: ✅
    *   `drizzle.config.ts` の作成: ✅

## 2. 継続中の課題
*   **Drizzle ORM 設定の修正**
    *   `drizzle.config.ts` のエラー解消（`driver: 'pg'` と `dbCredentials` の問題）: ✅
*   **開発サーバーの安定稼働**
    *   `npm run dev` で `wrangler pages dev` と `remix vite:dev` が連携して正しく起動しない問題の解決: ✅ (手動での複数コマンド実行により起動可能)

## 3. 今後の主要タスク（指示書に基づく）

### 3.1 バックエンド / データベース
*   **Supabase 連携**
    *   Supabase プロジェクトのセットアップ（Auth, Postgres, Realtime Storage）: ⬜
    *   Supabase クライアントの初期化と設定: ✅
    *   Supabase RLS (Row Level Security) の実装: ⬜
    *   リアルタイムチャンネルのサブスクライブとデータ同期: ⬜

### 3.2 認証・セキュリティ
*   **Supabase Auth の実装**
    *   メール/パスワード認証フロー（サインアップ、ログイン、パスワードリセット）: ⬜
    *   OAuth (GitHub, Google) 連携: ⬜
*   **Cloudflare セキュリティ機能の統合**
    *   Cloudflare Turnstile の全フォームへの組み込み: ⬜
    *   Cloudflare WAF の設定（OWASP, Managed Ruleset, カスタムルール）: ⬜
    *   レート制限（ログイン試行、APIエンドポイント）: ⬜
    *   HTTP セキュリティヘッダーの設定（CSP, HSTS など）: ⬜
*   **データ検証と脆弱性対策**
    *   クライアントサイドとサーバーサイドでの厳格な入力値検証: ⬜
    *   依存関係スキャン（`npm audit`, Snyk）の CI/CD への組み込み: ⬜

### 3.3 フロントエンド (UI/UX)
*   **ページ構成とルーティング (Remix Nested Routes)**
    *   `/` (ランディングページ or ダッシュボード): ⬜
    *   `/dashboard` (プロジェクト一覧、マイタスク一覧): ⬜
    *   `/projects/$projectId` (タスク管理ページ - ガントチャートビュー): ⬜
    *   `/projects/$projectId/tasks` (タスクリストビュー): ⬜
    *   `/projects/$projectId/board` (カンバンボードビュー、検討): ⬜
    *   `/projects/$projectId/settings` (プロジェクト設定): ⬜
    *   `/settings/profile` (ユーザーアカウント設定): ⬜
    *   `/settings/account` (ユーザーアカウント設定): ⬜
    *   `/auth/*` (認証関連ページ): ⬜
*   **主要コンポーネントの実装 (Shadcn/UI, Lucide Icons)**
    *   `ProjectCard`, `ProjectSwitcher`: ⬜
    *   `TaskList` / `TaskTree` (ドラッグ＆ドロップ対応): ⬜
    *   `GanttChart` (インタラクティブ操作、進捗表示): ⬜
    *   `TaskFormModal` (CRUD 操作): ⬜
    *   `UserAvatar`, `AssigneeSelector`: ⬜
    *   `NotificationBell`, `CommandMenu`: ⬜
*   **UI/UX 強化**
    *   アクセシビリティ (A11y) 対応: ⬜
    *   レスポンシブデザイン: ⬜
    *   ダークモード対応: ⬜
    *   リアルタイム更新の視覚的フィードバック: ⬜
    *   エラーハンドリング（Remix ErrorBoundary）: ⬜
    *   楽観的 UI 更新の検討と実装: ⬜

### 3.4 開発ツールとインフラ
*   **DI コンテナの導入検討**
    *   `tsyringe` または `InversifyJS` の評価と導入: ⬜
*   **CI/CD パイプラインの構築 (GitHub Actions)**
    *   Lint & Format ジョブの設定: ⬜
    *   Test ジョブの設定（Vitest, Testing Library, Playwright）: ⬜
    *   Build & Deploy ジョブの設定（Cloudflare Pages への自動デプロイ）: ⬜
    *   Security Scan ジョブの設定（NPM Audit, Snyk）: ⬜
    *   通知機能（Slack/Discord）の検討: ⬜
