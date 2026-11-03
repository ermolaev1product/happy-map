import { sqliteTable, text, integer, primaryKey, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
export const profiles=sqliteTable('social_profiles',{id:text('id').primaryKey(),subject:text('subject').notNull(),name:text('name').notNull(),createdAt:integer('created_at').notNull()},t=>[uniqueIndex('social_subject').on(t.subject)]);
export const friendships=sqliteTable('social_friendships',{a:text('a').notNull(),b:text('b').notNull(),requester:text('requester').notNull(),state:text('state').notNull(),createdAt:integer('created_at').notNull()},t=>[primaryKey({columns:[t.a,t.b]})]);
export const invitations=sqliteTable('social_invitations',{hash:text('hash').primaryKey(),owner:text('owner').notNull(),expiresAt:integer('expires_at').notNull(),claimedBy:text('claimed_by')},t=>[index('social_invite_owner').on(t.owner)]);
export const blocks=sqliteTable('social_blocks',{owner:text('owner').notNull(),target:text('target').notNull()},t=>[primaryKey({columns:[t.owner,t.target]})]);
export const presences=sqliteTable('social_presences',{id:text('id').primaryKey(),owner:text('owner').notNull(),city:text('city').notNull(),placeId:text('place_id').notNull(),kind:text('kind').notNull(),visibility:text('visibility').notNull(),startsAt:integer('starts_at').notNull(),expiresAt:integer('expires_at').notNull(),createdAt:integer('created_at').notNull()},t=>[index('social_presence_owner').on(t.owner,t.expiresAt),index('social_presence_place').on(t.city,t.placeId,t.expiresAt)]);
export const limits=sqliteTable('social_limits',{key:text('key').primaryKey(),bucket:integer('bucket').notNull(),hits:integer('hits').notNull()});

export const trafficEvents=sqliteTable('traffic_events',{id:text('id').primaryKey(),day:text('day').notNull(),visitor:text('visitor').notNull(),path:text('path').notNull(),source:text('source').notNull()},t=>[index('traffic_day').on(t.day)]);
export const trafficLimits=sqliteTable('traffic_limits',{key:text('key').primaryKey(),bucket:integer('bucket').notNull(),hits:integer('hits').notNull()});

export const privatePlans=sqliteTable('private_plans',{owner:text('owner').notNull(),city:text('city').notNull(),eventId:text('event_id').notNull(),payload:text('payload').notNull(),updatedAt:integer('updated_at').notNull()},t=>[primaryKey({columns:[t.owner,t.city,t.eventId]})]);
