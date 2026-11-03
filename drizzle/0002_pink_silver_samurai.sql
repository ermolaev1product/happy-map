CREATE TABLE `private_plans` (
	`owner` text NOT NULL,
	`city` text NOT NULL,
	`event_id` text NOT NULL,
	`payload` text NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`owner`, `city`, `event_id`)
);
