CREATE TABLE "fee_group_fee_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"fee_group_id" integer NOT NULL,
	"fee_item_id" integer NOT NULL,
	"fee_item_group_id" integer,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_required" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "fee_group_fee_items_fee_group_id_fee_item_id_unique" UNIQUE("fee_group_id","fee_item_id")
);
--> statement-breakpoint
ALTER TABLE "fee_items" DROP CONSTRAINT "fee_items_fee_group_id_name_unique";--> statement-breakpoint
ALTER TABLE "fee_items" DROP CONSTRAINT "fee_items_fee_group_id_fee_groups_id_fk";
--> statement-breakpoint
ALTER TABLE "fee_items" DROP CONSTRAINT "fee_items_fee_item_group_id_fee_item_groups_id_fk";
--> statement-breakpoint
ALTER TABLE "campaign_fee_values" ADD COLUMN "fee_group_fee_item_id" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "phone" varchar NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "communication_preference" text DEFAULT 'email' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "roles" text[] DEFAULT '{merchant}' NOT NULL;--> statement-breakpoint
ALTER TABLE "fee_group_fee_items" ADD CONSTRAINT "fee_group_fee_items_fee_group_id_fee_groups_id_fk" FOREIGN KEY ("fee_group_id") REFERENCES "public"."fee_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_group_fee_items" ADD CONSTRAINT "fee_group_fee_items_fee_item_id_fee_items_id_fk" FOREIGN KEY ("fee_item_id") REFERENCES "public"."fee_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_group_fee_items" ADD CONSTRAINT "fee_group_fee_items_fee_item_group_id_fee_item_groups_id_fk" FOREIGN KEY ("fee_item_group_id") REFERENCES "public"."fee_item_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_fee_values" ADD CONSTRAINT "campaign_fee_values_fee_group_fee_item_id_fee_group_fee_items_id_fk" FOREIGN KEY ("fee_group_fee_item_id") REFERENCES "public"."fee_group_fee_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_items" DROP COLUMN "fee_group_id";--> statement-breakpoint
ALTER TABLE "fee_items" DROP COLUMN "fee_item_group_id";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "role";--> statement-breakpoint
ALTER TABLE "fee_items" ADD CONSTRAINT "fee_items_name_unique" UNIQUE("name");