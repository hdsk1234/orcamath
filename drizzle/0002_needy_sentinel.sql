ALTER TABLE `invitations` ADD `teacher_id` text;--> statement-breakpoint
ALTER TABLE `invitations` ADD `staff_name` text;--> statement-breakpoint
ALTER TABLE `registrations` ADD `child_name` text DEFAULT '' NOT NULL;