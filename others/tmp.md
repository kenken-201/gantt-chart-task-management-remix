以下の指示書をもとに、最高のアプリケーション開発を行っていただきたいです
アプリケーション開発とはソースコードやmdファイル（READMEや設計書）作成やコマンド実行などを指します

## タスク管理＋ガントチャートツール 開発指示書 (改訂版)

### 1. プロジェクト概要

**目的**: プロジェクト／タスクを階層管理し、ガントチャートで可視化できるリアルタイム共同編集ツール。効率的なプロジェクト遂行とチームコラボレーションを支援する。

**主要技術**:
*   **フロントエンド**: Remix (v2), TypeScript, TailwindCSS, Shadcn/UI (Headless UI + Tailwind CSSによるアクセシブルなコンポーネント群、推奨), Lucide Icons
*   **バックエンド/DB**: Supabase (Auth, Postgres, Realtime Storage), Drizzle ORM
*   **インフラ**: Cloudflare Pages, Cloudflare Workers, Cloudflare Turnstile
*   **開発ツール**:
    *   **リンター/フォーマッター**: ESLint, Prettier (設定ファイルと husky による pre-commit hook 導入推奨)
    *   **テスト**: Vitest, Testing Library, Playwright
    *   **状態管理**: Remix の loader/action を基本とし、必要に応じて Zustand や Jotai (クライアント側の複雑なUI状態管理用、導入は慎重に検討)
    *   **APIドキュメンテーション**: (任意) OpenAPI (Swagger) - loader/actionをAPIと見立てて記述

**Cloudflare 無料プラン活用機能 (拡張)**:
*   **DDoS保護**: レイヤー7保護、レート制限 (詳細設定)
*   **CDN**: グローバルエッジキャッシュ (静的アセット、API応答キャッシュ検討)
*   **WAF**: 無料ルールセット (OWASP ModSecurity Core Rule Set, Cloudflare Managed Ruleset の無料版)、カスタムルール
*   **SSL/TLS**: フルSSL (Strict 推奨)
*   **DNS**: 高速・高信頼性 DNS リゾルバ
*   **Workers**: エッジでのリクエスト/レスポンス改変 (セキュリティヘッダー挿入、リダイレクト)、A/Bテスト基盤、カスタムエラーページ
*   **Pages**: 自動デプロイ、プレビュー環境、カスタムドメイン
*   **Turnstile**: ボット対策
*   **(検討) Email Routing**: カスタムドメインでのメール受信 (例: support@yourdomain.com)
*   **(検討) R2**: アバター画像やプロジェクト添付ファイル等のストレージ (無料枠とSupabase Storageとの比較検討)

### 2. 機能要件詳細

#### 2.1 認証・セキュリティ (強化)

*   **Supabase Auth**:
    *   メール/パスワード認証 (パスワード強度ポリシー設定、パスワードリセットフロー)
    *   OAuth (GitHub, Google)
    *   **ロールベースアクセス制御 (RBAC)**: プロジェクトレベルでの権限管理 (オーナー, 編集者, 閲覧者など)。Drizzle スキーマと Supabase RLS (Row Level Security) で実装。
*   **Cloudflare Turnstile**:
    *   全フォーム (サインアップ/ログイン/タスク作成・編集/プロジェクト作成・編集など) に組み込み。
*   **Cloudflare WAF**:
    *   OWASP ModSecurity Core Rule Set (適切なパラノイアレベル設定)。
    *   Cloudflare Managed Ruleset (無料版) の活用。
    *   不審なIPアドレスや特定の攻撃パターンをブロックするカスタムルール。
    *   レート制限:
        *   ログイン試行回数制限 (アカウントロックアウト機能検討)。
        *   APIエンドポイントごとの詳細なレート制限 (例: タスク作成APIは 10req/分/ユーザー)。
*   **HTTPセキュリティヘッダー**:
    *   Cloudflare Workers または Remix のレスポンスヘッダーで設定 (CSP, HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy)。
*   **依存関係スキャン**:
    *   `npm audit` や Snyk (無料枠) を CI/CD パイプラインに組み込み、定期的な脆弱性チェック。
*   **データバリデーション**:
    *   クライアントサイド (Remixフォームバリデーション) とサーバーサイド (Remix action内、Drizzle-Zod連携など) での厳格な入力値検証。

#### 2.2 データモデル & リアルタイム (詳細化・改善)

*   **Drizzle ORMスキーマ (改善版)**:
    *   UUIDの採用: 主キーには `uuid` を使用し、Supabase Auth の `auth.users` テーブルとの連携を容易にする。
    *   タイムスタンプ: `createdAt` と `updatedAt` を標準装備。
    *   列挙型 (Enum): ステータスや優先度など、固定値を持つカラムには Drizzle の `pgEnum` を使用。
    *   `profiles` テーブル: Supabase Authの `auth.users` テーブルに紐づく公開プロフィール情報（ユーザー名、アバターURLなど）を格納。`id` は `auth.users.id` と同一。

    ```typescript
    // 想定パス: app/db/schema.ts
    import { pgTable, text, timestamp, uuid, integer, date, primaryKey, pgEnum } from 'drizzle-orm/pg-core';
    import { relations } from 'drizzle-orm';

    // --- Enums ---
    export const projectStatusEnum = pgEnum('project_status', ['active', 'archived', 'on_hold']);
    export const taskStatusEnum = pgEnum('task_status', ['todo', 'in_progress', 'done', 'canceled']);
    export const taskPriorityEnum = pgEnum('task_priority', ['low', 'medium', 'high']);
    export const projectRoleEnum = pgEnum('project_role', ['owner', 'editor', 'viewer']);

    // --- Tables ---

    // ユーザープロフィール情報 (Supabase Authユーザーに紐づく)
    export const profiles = pgTable('profiles', {
      id: uuid('id').primaryKey(), // Supabase auth.users.id と同じIDを使用
      username: text('username').unique(), // アプリケーション内でのユニークな表示名
      fullName: text('full_name'),
      avatarUrl: text('avatar_url'),
      createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
      updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    });

    export const projects = pgTable('projects', {
      id: uuid('id').defaultRandom().primaryKey(),
      name: text('name').notNull(),
      description: text('description'),
      ownerId: uuid('owner_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }), // profiles.id (auth.users.id) を参照
      // status: projectStatusEnum('status').default('active'), // 必要に応じてプロジェクトの状態を追加
      createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
      updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    });

    export const projectMembers = pgTable('project_members', {
      projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
      userId: uuid('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }), // profiles.id (auth.users.id) を参照
      role: projectRoleEnum('role').notNull().default('viewer'),
      joinedAt: timestamp('joined_at', { withTimezone: true }).defaultNow().notNull(),
    }, (table) => ({
      pk: primaryKey({ columns: [table.projectId, table.userId] }),
    }));

    export const tasks = pgTable('tasks', {
      id: uuid('id').defaultRandom().primaryKey(),
      projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
      title: text('title').notNull(),
      description: text('description'),
      startDate: date('start_date'),
      endDate: date('end_date'),
      dueDate: date('due_date'), // endDateとは別に純粋な締切日
      status: taskStatusEnum('status').default('todo').notNull(),
      priority: taskPriorityEnum('priority').default('medium'),
      assigneeId: uuid('assignee_id').references(() => profiles.id, { onDelete: 'set null' }), // profiles.id (auth.users.id) を参照 (NULL許容)
      parentTaskId: uuid('parent_task_id').references((): any => tasks.id, { onDelete: 'set null' }), // anyで自己参照の型問題を回避
      displayOrder: integer('display_order').default(0), // 同階層内での表示順
      createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
      updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
      completedAt: timestamp('completed_at', { withTimezone: true }),
    });

    // --- Relations ---
    export const profilesRelations = relations(profiles, ({ many }) => ({
      projectsOwned: many(projects, { relationName: 'ProfileToProjectsOwned' }), // project.ownerId で紐づく
      projectMemberships: many(projectMembers), // projectMember.userId で紐づく
      assignedTasks: many(tasks, { relationName: 'ProfileToTasksAssigned' }), // task.assigneeId で紐づく
    }));

    export const projectsRelations = relations(projects, ({ one, many }) => ({
      owner: one(profiles, {
        fields: [projects.ownerId],
        references: [profiles.id],
        relationName: 'ProfileToProjectsOwned'
      }),
      tasks: many(tasks),
      projectMembers: many(projectMembers),
    }));

    export const projectMembersRelations = relations(projectMembers, ({ one }) => ({
      project: one(projects, {
        fields: [projectMembers.projectId],
        references: [projects.id],
      }),
      user: one(profiles, {
        fields: [projectMembers.userId],
        references: [profiles.id],
      }),
    }));

    export const tasksRelations = relations(tasks, ({ one, many }) => ({
      project: one(projects, {
        fields: [tasks.projectId],
        references: [projects.id],
      }),
      assignee: one(profiles, {
        fields: [tasks.assigneeId],
        references: [profiles.id],
        relationName: 'ProfileToTasksAssigned'
      }),
      parentTask: one(tasks, {
        fields: [tasks.parentTaskId],
        references: [tasks.id],
        relationName: 'ParentChildTasks',
      }),
      childTasks: many(tasks, {
        relationName: 'ParentChildTasks',
      }),
    }));
    ```
    *   **Supabase RLS (Row Level Security)**:
        *   `profiles`: 自分のプロフィール情報のみ更新可能。全ユーザーが他者の公開プロフィール情報（ユーザー名、アバターなど）を閲覧可能。
        *   `projects`: 自分がオーナーであるか、`project_members` テーブルに所属するプロジェクトのみアクセス可能。`owner_id` と `project_members` テーブルを参照。
        *   `tasks`: 所属プロジェクトのタスクのみアクセス可能。
        *   `project_members`: 自分のメンバーシップ情報、またはプロジェクトのオーナーであればプロジェクトの全メンバー情報にアクセス可能。
        *   認証されたユーザーのみが書き込み操作（INSERT, UPDATE, DELETE）を行えるようにポリシーを設定。RLSポリシーは `auth.uid()` を使用して現在のユーザーIDを取得する。
*   **Realtimeチャンネル**:
    *   `projects:id=eq.{projectId}`: プロジェクト詳細情報 (名前、説明など) の変更をサブスクライブ。
    *   `project_members:project_id=eq.{projectId}`: プロジェクトメンバーの増減やロール変更をサブスクライブ。
    *   `tasks:project_id=eq.{projectId}`: プロジェクト内のタスク (作成, 更新, 削除, 移動) をサブスクライブ。
    *   Realtime イベントに基づいた、きめ細かいUI更新と楽観的UI更新の検討。

#### 2.3 フロントエンド (UI/UX強化)

*   **ページ構成 (Remix nested routes)**
    *   `/` (ランディングページ or ダッシュボード)
    *   `/dashboard` プロジェクト一覧、マイタスク一覧など
    *   `/projects/$projectId` タスク管理ページ (デフォルトはガントチャートビュー)
        *   `/projects/$projectId/tasks` (タスクリストビュー)
        *   `/projects/$projectId/board` (カンバンボードビュー、検討)
        *   `/projects/$projectId/settings` (プロジェクト設定: メンバー管理、プロジェクト情報編集)
    *   `/settings/profile` (ユーザーアカウント設定: プロフィール編集)
    *   `/settings/account` (ユーザーアカウント設定: メールアドレス変更、パスワード変更、アカウント削除など)
    *   `/auth/login`, `/auth/signup`, `/auth/forgot-password` 等
*   **主要コンポーネント (Shadcn/UI ベース推奨)**:
    *   `ProjectCard` (プロジェクト一覧表示用)
    *   `ProjectSwitcher` (ヘッダー等でのプロジェクト切り替え)
    *   `TaskList` / `TaskTree` (ドラッグ＆ドロップによる並び替え、親子関係変更対応)
    *   `GanttChart` (SVG/Canvasベース、インタラクティブ操作: タスク期間変更、依存関係線描画、進捗表示)
        *   パフォーマンスを考慮し、表示タスク数が多い場合は仮想化レンダリングを検討。
        *   Frappe Gantt, DHTMLX Gantt などのライブラリ利用も検討（ただしカスタマイズ性とバンドルサイズに注意）。
    *   `TaskFormModal` (タスクのCRUD操作、担当者割り当て、期日設定)
    *   `UserAvatar`, `AssigneeSelector` (プロフィール情報と連携)
    *   `NotificationBell` (リアルタイム通知表示)
    *   `CommandMenu` (Cmd+Kなどでアクセスできるコマンドパレット、検討)
*   **UI/UX**:
    *   **アクセシビリティ (A11y)**: Shadcn/UI と ARIA属性を最大限活用。キーボードナビゲーション対応。
    *   **レスポンシブデザイン**: 全てのデバイスで快適に利用可能。
    *   **ダークモード対応**: OS設定に追従、または手動切り替え。
    *   **Realtime更新**: ローディングスピナー、トースト通知、UI要素のハイライトなどで視覚的フィードバック。
    *   **エラーハンドリング**: Remix の ErrorBoundary を活用し、ユーザーフレンドリーなエラー表示。
    *   **楽観的UI更新**: ネットワーク遅延を感じさせないスムーズな操作感を目指す。

#### 2.4 DIコンテナ (導入検討)

*   **目的**: 大規模化した場合の依存関係管理の複雑化を軽減、モジュールの疎結合化、テスタビリティ向上。
*   **導入箇所候補**: Remix の `loader`/`action` 内で使用するサービスクラス群。
*   **候補ライブラリ**: `tsyringe`, `InversifyJS`。
*   **判断基準**:
    *   プロジェクトの初期段階では、Remixの機能 (context, servicesディレクトリでの手動インスタンス化) で十分な場合が多い。
    *   機能追加に伴い、依存関係が複雑になりテストが書きにくくなった時点で導入を検討。
    *   ポートフォリオの目的としてDIコンテナの経験を示したい場合は積極的に導入。
    *   導入する場合、学習コストと開発速度への影響を考慮。

### 3. インフラ & CI/CD (強化)

#### 3.1 Cloudflare Pages / Workers

*   **デプロイ**: GitHub Actions から Cloudflare Pages への自動デプロイ。
    *   Productionブランチ (例: `main`) と Previewブランチ (例: `develop`, PRブランチ) で環境を分離。
*   **Workers**:
    *   Edge での認証チェック (一部、Supabase Auth と連携)。
    *   セキュリティヘッダー (CSP, HSTS等) の付与・上書き。
    *   リクエスト/レスポンスのロギング (一部サンプリングして分析基盤へ送信検討)。
    *   パスに応じたキャッシュ戦略の制御。
*   **CDN設定**:
    *   アセット (JS, CSS, 画像) のキャッシュTTLを長く設定。
    *   API応答のキャッシュ: `loader` の応答を Cloudflare Edge でキャッシュ検討 (`Cache-Control`, `s-maxage`)。データ更新時は適切にパージ。
*   **DNS**: `your-app.example.com` を Cloudflare DNS で管理。

#### 3.2 GitHub Actions ワークフロー (拡張)

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  lint-and-format:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20' # LTS推奨
          cache: 'npm'
      - name: Install dependencies
        run: npm ci
      - name: Lint
        run: npm run lint
      - name: Format Check
        run: npm run format:check

  test:
    runs-on: ubuntu-latest
    needs: lint-and-format
    strategy:
      matrix:
        node-version: [18.x, 20.x] # 複数のNode.jsバージョンでテスト
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'
      - name: Install dependencies
        run: npm ci
      - name: Run Unit & Integration Tests
        run: npm run test -- --coverage # Vitestでカバレッジも生成
      - name: Upload coverage reports to Codecov
        uses: codecov/codecov-action@v4
        with:
          token: ${{ secrets.CODECOV_TOKEN }} # Codecovのトークン
          fail_ci_if_error: true

  # (オプション) E2E Tests
  # e2e-tests:
  #   runs-on: ubuntu-latest
  #   needs: lint-and-format
  #   if: github.event_name == 'pull_request' # PR時に実行
  #   steps:
  #     - uses: actions/checkout@v4
  #     - name: Setup Node.js
  #       uses: actions/setup-node@v4
  #       with:
  #         node-version: '20'
  #         cache: 'npm'
  #     - name: Install dependencies
  #       run: npm ci
  #     - name: Install Playwright Browsers
  #       run: npx playwright install --with-deps
  #     - name: Build Remix App (for Playwright)
  #       run: npm run build
  #     - name: Run Playwright tests
  #       run: npm run test:e2e

  build-and-deploy:
    runs-on: ubuntu-latest
    needs: test # E2Eテストも入れる場合は needs: [test, e2e-tests]
    if: (github.ref == 'refs/heads/main' || github.ref == 'refs/heads/develop') && github.event_name == 'push'
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - name: Install dependencies
        run: npm ci
      # - name: Run Drizzle migrations (if applicable, requires DB connection from CI)
      #   # 注意: CIからのマイグレーション実行は慎重に。手動または別の安全な仕組みを推奨
      #   env:
      #     DATABASE_URL: ${{ secrets.DATABASE_URL_FOR_MIGRATIONS }} # 事前にCI用にDB接続情報を設定
      #   run: npm run db:migrate # package.jsonに "db:migrate": "drizzle-kit push:pg" のようなスクリプトを定義
      - name: Build
        run: npm run build
      - name: Publish to Cloudflare Pages
        uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          projectName: 'gantt-portfolio' # Cloudflare Pagesのプロジェクト名
          directory: 'build/client' # Remix v2 (Vite) のビルド出力ディレクトリ (public/build の場合あり、確認)
          # Remix v2 (classic compiler) の場合は 'public/build' と 'functions' ディレクトリ
          branch: ${{ github.ref_name }} # デプロイ先のブランチ (main or develop)
          # wranglerVersion: '3' # 必要に応じて

  security-scan:
    runs-on: ubuntu-latest
    needs: lint-and-format
    # mainブランチへのpush時や、定期実行 (schedule) を推奨
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - name: Install dependencies
        run: npm ci
      - name: NPM Audit
        run: npm audit --audit-level=high
      # (オプション) Snyk Scan
      # - name: Snyk Security Scan
      #   uses: snyk/actions/node@master
      #   env:
      #     SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
      #   with:
      #     command: monitor

  # (オプション) Slack/Discord Notification
  # notify:
  #   runs-on: ubuntu-latest
  #   needs: build-and-deploy # or other critical jobs
  #   if: always() # 常に実行 (成功時も失敗時も)
  #   steps:
  #     - name: Send notification to Slack/Discord
  #       # Slack or Discord Webhookを利用した通知アクション
