ALTER TABLE `credits` ADD `free_retry_used` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `credits` ADD `stripe_customer_id` varchar(255);--> statement-breakpoint
ALTER TABLE `profiles` ADD `identity_brief_card_url` text;