CREATE TABLE "alert_incidents" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"rule_id" uuid NOT NULL,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	"peak_value" numeric,
	"notified_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "alert_rules" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"key" text NOT NULL,
	"threshold" numeric NOT NULL,
	"window_minutes" integer NOT NULL,
	"severity" text NOT NULL,
	"channels" text[] DEFAULT '{email}'::text[] NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "alert_rules_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "analytics_daily" (
	"day" date NOT NULL,
	"dimension" text NOT NULL,
	"dimension_id" text NOT NULL,
	"visitors" integer DEFAULT 0 NOT NULL,
	"sessions" integer DEFAULT 0 NOT NULL,
	"page_views" integer DEFAULT 0 NOT NULL,
	"job_views" integer DEFAULT 0 NOT NULL,
	"apply_clicks" integer DEFAULT 0 NOT NULL,
	"apply_starts" integer DEFAULT 0 NOT NULL,
	"submissions" integer DEFAULT 0 NOT NULL,
	"median_complete_ms" integer
);
--> statement-breakpoint
CREATE TABLE "analytics_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"session_id" text NOT NULL,
	"path" text,
	"props" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"job_id" uuid,
	"drive_id" uuid,
	"device_type" text,
	"os" text,
	"browser" text,
	"viewport_bucket" text,
	"connection_type" text,
	"country" text,
	"region" text,
	"city" text,
	"referrer" text,
	"utm" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"ip_hash" text,
	"ua_hash" text,
	"ts" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "console_sessions" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"user_id" uuid NOT NULL,
	"ip_hash" text,
	"ua_hash" text,
	"device_label" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "content_block_versions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"block_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"body" jsonb NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_blocks" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"slug" text NOT NULL,
	"body" jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "content_blocks_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "field_analytics_daily" (
	"day" date NOT NULL,
	"field" text NOT NULL,
	"focused" integer DEFAULT 0 NOT NULL,
	"completed" integer DEFAULT 0 NOT NULL,
	"abandoned" integer DEFAULT 0 NOT NULL,
	"errored" integer DEFAULT 0 NOT NULL,
	"median_focus_ms" integer,
	"top_error_code" text
);
--> statement-breakpoint
CREATE TABLE "funnel_daily" (
	"day" date NOT NULL,
	"step" text NOT NULL,
	"segment" text DEFAULT 'all' NOT NULL,
	"segment_value" text DEFAULT 'all' NOT NULL,
	"entered" integer DEFAULT 0 NOT NULL,
	"completed" integer DEFAULT 0 NOT NULL,
	"median_ms" integer
);
--> statement-breakpoint
CREATE TABLE "saved_views" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"user_id" uuid NOT NULL,
	"screen" text NOT NULL,
	"name" text NOT NULL,
	"query" jsonb NOT NULL,
	"is_pinned" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scheduled_reports" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"name" text NOT NULL,
	"cadence" text NOT NULL,
	"recipients" text[] NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_run_at" timestamp with time zone,
	"last_run_status" text,
	"last_run_error" text,
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "security_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"layer" text NOT NULL,
	"outcome" text NOT NULL,
	"reason" text,
	"path" text,
	"ip_hash" text,
	"ua_hash" text,
	"email_attempted" text,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"ts" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "web_vitals" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"metric" text NOT NULL,
	"value" numeric NOT NULL,
	"path" text NOT NULL,
	"device_type" text,
	"connection_type" text,
	"ts" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "must_change_password" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password_changed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "failed_login_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "locked_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "assigned_drive_ids" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "prefs" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "alert_incidents" ADD CONSTRAINT "alert_incidents_rule_id_alert_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."alert_rules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_drive_id_campus_drives_id_fk" FOREIGN KEY ("drive_id") REFERENCES "public"."campus_drives"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "console_sessions" ADD CONSTRAINT "console_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_block_versions" ADD CONSTRAINT "content_block_versions_block_id_content_blocks_id_fk" FOREIGN KEY ("block_id") REFERENCES "public"."content_blocks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_block_versions" ADD CONSTRAINT "content_block_versions_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_blocks" ADD CONSTRAINT "content_blocks_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_views" ADD CONSTRAINT "saved_views_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_reports" ADD CONSTRAINT "scheduled_reports_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;