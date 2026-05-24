CREATE TABLE `credits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`creditsRemaining` int NOT NULL DEFAULT 5,
	`totalUsed` int NOT NULL DEFAULT 0,
	`tier` enum('free','starter','pro') NOT NULL DEFAULT 'free',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `credits_id` PRIMARY KEY(`id`),
	CONSTRAINT `credits_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `generations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`imageUrl` text NOT NULL,
	`imageKey` text NOT NULL,
	`archetype` varchar(64) NOT NULL,
	`mood` varchar(64) NOT NULL,
	`platform` enum('tiktok','reels','stories') NOT NULL,
	`sceneCategory` varchar(64),
	`hooks` text NOT NULL,
	`selectedHook` text,
	`caption` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `generations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `postability_feedback` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`generationId` int NOT NULL,
	`response` enum('yes','maybe','no') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `postability_feedback_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`archetype` enum('luxury_minimal','elegant_chaos','soft_power','dark_feminine','ethereal'),
	`mood` enum('soft','magnetic','grounded','untamed'),
	`onboardingComplete` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `profiles_userId_unique` UNIQUE(`userId`)
);
