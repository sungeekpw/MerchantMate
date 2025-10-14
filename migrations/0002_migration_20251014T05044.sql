ALTER TABLE "users" ALTER COLUMN "phone" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "communication_preference" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "resource_type" text;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "details" jsonb;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "timestamp" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "severity" text DEFAULT 'info';--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "category" text;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "outcome" text;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "error_message" text;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "request_id" varchar;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "correlation_id" varchar;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "metadata" jsonb;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "geolocation" jsonb;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "device_info" jsonb;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "retention_policy" text;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "encryption_key_id" varchar;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "updated_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "equipment_items" ADD COLUMN "model" text;--> statement-breakpoint
ALTER TABLE "equipment_items" ADD COLUMN "price" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "equipment_items" ADD COLUMN "status" text DEFAULT 'available';--> statement-breakpoint
ALTER TABLE "fee_items" ADD COLUMN "fee_item_group_id" integer;--> statement-breakpoint
ALTER TABLE "merchant_prospects" ADD COLUMN "agent_signature" text;--> statement-breakpoint
ALTER TABLE "merchant_prospects" ADD COLUMN "agent_signature_type" text;--> statement-breakpoint
ALTER TABLE "merchant_prospects" ADD COLUMN "agent_signed_at" timestamp;--> statement-breakpoint
ALTER TABLE "merchants" ADD COLUMN "business_name" text;--> statement-breakpoint
ALTER TABLE "merchants" ADD COLUMN "business_type" text;--> statement-breakpoint
ALTER TABLE "merchants" ADD COLUMN "email" text;--> statement-breakpoint
ALTER TABLE "merchants" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "merchants" ADD COLUMN "dba_name" text;--> statement-breakpoint
ALTER TABLE "merchants" ADD COLUMN "legal_name" text;--> statement-breakpoint
ALTER TABLE "merchants" ADD COLUMN "ein" text;--> statement-breakpoint
ALTER TABLE "merchants" ADD COLUMN "website" text;--> statement-breakpoint
ALTER TABLE "merchants" ADD COLUMN "industry" text;--> statement-breakpoint
ALTER TABLE "merchants" ADD COLUMN "updated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "commission_rate" numeric(5, 4) DEFAULT '0.025';--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "commission_amount" numeric(12, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "transaction_date" timestamp with time zone DEFAULT now();--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "reference_number" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "location_id" integer;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "transaction_type" text DEFAULT 'payment' NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "processed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "fee_items" ADD CONSTRAINT "fee_items_fee_item_group_id_fee_item_groups_id_fk" FOREIGN KEY ("fee_item_group_id") REFERENCES "public"."fee_item_groups"("id") ON DELETE cascade ON UPDATE no action;