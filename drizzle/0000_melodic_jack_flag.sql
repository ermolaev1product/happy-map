CREATE TABLE `social_blocks` (
	`owner` text NOT NULL,
	`target` text NOT NULL,
	PRIMARY KEY(`owner`, `target`)
);
--> statement-breakpoint
CREATE TABLE `social_friendships` (
	`a` text NOT NULL,
	`b` text NOT NULL,
	`requester` text NOT NULL,
	`state` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`a`, `b`)
);
--> statement-breakpoint
CREATE TABLE `social_invitations` (
	`hash` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`expires_at` integer NOT NULL,
	`claimed_by` text
);
--> statement-breakpoint
CREATE INDEX `social_invite_owner` ON `social_invitations` (`owner`);--> statement-breakpoint
CREATE TABLE `social_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`bucket` integer NOT NULL,
	`hits` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `social_presences` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`city` text NOT NULL,
	`place_id` text NOT NULL,
	`kind` text NOT NULL,
	`visibility` text NOT NULL,
	`starts_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `social_presence_owner` ON `social_presences` (`owner`,`expires_at`);--> statement-breakpoint
CREATE INDEX `social_presence_place` ON `social_presences` (`city`,`place_id`,`expires_at`);--> statement-breakpoint
CREATE TABLE `social_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`subject` text NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `social_subject` ON `social_profiles` (`subject`);