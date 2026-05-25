ALTER TABLE `credits` MODIFY COLUMN `creditsRemaining` int NOT NULL DEFAULT 3;--> statement-breakpoint
ALTER TABLE `credits` ADD `free_lora_used` boolean DEFAULT false NOT NULL;