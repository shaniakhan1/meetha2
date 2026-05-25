ALTER TABLE `generations` ADD `archived` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `generations` ADD `archivedAt` timestamp;