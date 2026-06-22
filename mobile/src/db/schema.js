import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  role: text('role').notNull().default('teen'),
  legalName: text('legal_name').notNull(),
  displayName: text('display_name').notNull().default(''),
  email: text('email'),
  dateOfBirth: text('date_of_birth'),
  stateCode: text('state_code').notNull().default('IL'),
  permitIssueDate: text('permit_issue_date'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const links = sqliteTable('links', {
  id: text('id').primaryKey(),
  teenUserId: text('teen_user_id').notNull(),
  adultUserId: text('adult_user_id').notNull(),
  status: text('status').notNull(),
  createdAt: text('created_at').notNull(),
});

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  teenUserId: text('teen_user_id').notNull(),
  stateCode: text('state_code').notNull().default('IL'),
  status: text('status').notNull(),
  startedAt: text('started_at').notNull(),
  endedAt: text('ended_at'),
  durationMinutes: integer('duration_minutes'),
  nightMinutes: integer('night_minutes'),
  /** Highway minutes; local derived as durationMinutes − highwayRoadMinutes. */
  highwayRoadMinutes: integer('highway_road_minutes'),
  notes: text('notes'),
  requestHash: text('request_hash'),
  payloadJson: text('payload_json'),
  activeSupervisorId: text('active_supervisor_id'),
  deletedAt: text('deleted_at'),
  /** True when saved session times overlap another saved session for this teen. */
  timeInvalid: integer('time_invalid', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const submissions = sqliteTable('submissions', {
  requestHash: text('request_hash').primaryKey(),
  sessionId: text('session_id').notNull(),
  payloadJson: text('payload_json').notNull(),
  submittedAt: text('submitted_at').notNull(),
  submittedByUserId: text('submitted_by_user_id').notNull(),
  superseded: integer('superseded', { mode: 'boolean' }).notNull().default(false),
});

export const approvals = sqliteTable('approvals', {
  id: text('id').primaryKey(),
  requestHash: text('request_hash').notNull(),
  sessionId: text('session_id').notNull(),
  approvedByUserId: text('approved_by_user_id').notNull(),
  approvedAt: text('approved_at').notNull(),
  joinedSession: integer('joined_session', { mode: 'boolean' }),
  supervisorInVehicleName: text('supervisor_in_vehicle_name'),
  approverPresent: text('approver_present'),
});

export const outbox = sqliteTable('outbox', {
  id: text('id').primaryKey(),
  operation: text('operation').notNull(),
  payloadJson: text('payload_json').notNull(),
  userId: text('user_id'),
  createdAt: text('created_at').notNull(),
  syncedAt: text('synced_at'),
});

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

export const userAliases = sqliteTable('user_aliases', {
  ownerUserId: text('owner_user_id').notNull(),
  targetUserId: text('target_user_id').notNull(),
  nickname: text('nickname').notNull(),
  syncStatus: text('sync_status').notNull().default('synced'),
});

/** Foreground GPS samples during active sessions — local only, not synced. */
export const sessionLocationSamples = sqliteTable('session_location_samples', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').notNull(),
  recordedAt: text('recorded_at').notNull(),
  latitude: text('latitude').notNull(),
  longitude: text('longitude').notNull(),
  speedMps: text('speed_mps'),
  accuracyM: text('accuracy_m'),
  roadCategory: text('road_type'),
});
