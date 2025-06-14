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
