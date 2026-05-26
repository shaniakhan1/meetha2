ALTER TABLE `profiles` ADD `body_type` text;--> statement-breakpoint
ALTER TABLE `profiles` ADD `share_badge_enabled` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `profiles` ADD `aesthetic_brief` json;