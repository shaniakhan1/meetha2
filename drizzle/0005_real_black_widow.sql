CREATE TABLE `retrain_purchases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`stripeSessionId` varchar(255) NOT NULL,
	`paidAt` timestamp NOT NULL DEFAULT (now()),
	`usedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `retrain_purchases_id` PRIMARY KEY(`id`),
	CONSTRAINT `retrain_purchases_stripeSessionId_unique` UNIQUE(`stripeSessionId`)
);
