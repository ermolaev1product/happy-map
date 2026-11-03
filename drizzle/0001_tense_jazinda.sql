CREATE TABLE `traffic_events` (
	`id` text PRIMARY KEY NOT NULL,
	`day` text NOT NULL,
	`visitor` text NOT NULL,
	`path` text NOT NULL,
	`source` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `traffic_day` ON `traffic_events` (`day`);--> statement-breakpoint
CREATE TABLE `traffic_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`bucket` integer NOT NULL,
	`hits` integer NOT NULL
);
