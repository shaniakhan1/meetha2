CREATE TABLE `recovery_emails` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`credits_added` int NOT NULL DEFAULT 3,
	`sentAt` timestamp NOT NULL DEFAULT (now()),
	`bonus_on_purchase_used` boolean NOT NULL DEFAULT false,
	CONSTRAINT `recovery_emails_id` PRIMARY KEY(`id`),
	CONSTRAINT `recovery_emails_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
ALTER TABLE `profiles` ADD `body_descriptor` text;