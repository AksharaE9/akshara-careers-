CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

CREATE TABLE "application_notes" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"application_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "applications" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"public_id" text NOT NULL,
	"status_token" text NOT NULL,
	"candidate_id" uuid NOT NULL,
	"job_id" uuid NOT NULL,
	"drive_id" uuid,
	"college_id" uuid,
	"college_raw" text NOT NULL,
	"course_id" uuid,
	"course_raw" text NOT NULL,
	"academic_status" text NOT NULL,
	"academic_note" text,
	"experience_type" text NOT NULL,
	"experience_note" text,
	"has_driving_licence" boolean NOT NULL,
	"has_two_wheeler" text NOT NULL,
	"resume_key" text NOT NULL,
	"resume_filename" text NOT NULL,
	"resume_size_bytes" integer NOT NULL,
	"resume_mime" text NOT NULL,
	"source" text DEFAULT 'organic' NOT NULL,
	"utm" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"referrer" text,
	"stage" text DEFAULT 'received' NOT NULL,
	"duplicate_of" uuid,
	"consent_given_at" timestamp with time zone NOT NULL,
	"consent_version" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"ip_hash" text,
	"ua_hash" text,
	"bot_score" numeric(3, 2),
	"time_on_form_ms" integer,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "applications_public_id_unique" UNIQUE("public_id"),
	CONSTRAINT "applications_status_token_unique" UNIQUE("status_token"),
	CONSTRAINT "applications_idempotency_key_unique" UNIQUE("idempotency_key"),
	CONSTRAINT "apps_academic_status_check" CHECK ("applications"."academic_status" IN ('sem_1','sem_2','sem_3','sem_4','sem_5','sem_6','sem_7','sem_8','final_year_results_awaited','graduated')),
	CONSTRAINT "apps_experience_type_check" CHECK ("applications"."experience_type" IN ('fresher','experienced')),
	CONSTRAINT "apps_two_wheeler_check" CHECK ("applications"."has_two_wheeler" IN ('yes','no','can_arrange')),
	CONSTRAINT "apps_source_check" CHECK ("applications"."source" IN ('organic','campus_drive','referral','job_board','social')),
	CONSTRAINT "apps_stage_check" CHECK ("applications"."stage" IN ('received','under_review','shortlisted','interview_scheduled','interviewed','offered','hired','rejected','withdrawn','duplicate'))
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"actor_id" uuid,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid,
	"before" jsonb,
	"after" jsonb,
	"ip_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campus_drives" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"code" text NOT NULL,
	"college_id" uuid NOT NULL,
	"drive_date" date NOT NULL,
	"venue" text,
	"job_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
	"seats" integer,
	"recruiter_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
	"status" text DEFAULT 'upcoming' NOT NULL,
	"view_count" integer DEFAULT 0 NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "campus_drives_code_unique" UNIQUE("code"),
	CONSTRAINT "drives_status_check" CHECK ("campus_drives"."status" IN ('upcoming','live','closed','cancelled'))
);
--> statement-breakpoint
CREATE TABLE "candidates" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"email_normalised" text NOT NULL,
	"phone_e164" text NOT NULL,
	"full_name" text NOT NULL,
	"gender" text,
	"home_city" text,
	"home_state" text,
	"languages" text[] DEFAULT '{}'::text[] NOT NULL,
	"whatsapp_opt_in" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "candidates_email_normalised_unique" UNIQUE("email_normalised"),
	CONSTRAINT "candidates_phone_e164_unique" UNIQUE("phone_e164")
);
--> statement-breakpoint
CREATE TABLE "colleges" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"name" text NOT NULL,
	"city" text,
	"state" text DEFAULT 'Karnataka' NOT NULL,
	"aliases" text[] DEFAULT '{}'::text[] NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"merged_into" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "courses" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"name" text NOT NULL,
	"specialisation" text,
	"level" text NOT NULL,
	"aliases" text[] DEFAULT '{}'::text[] NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	CONSTRAINT "courses_level_check" CHECK ("courses"."level" IN ('undergraduate','postgraduate','diploma','other'))
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"family" text NOT NULL,
	"summary" text NOT NULL,
	"description_html" text NOT NULL,
	"responsibilities" text[] DEFAULT '{}'::text[] NOT NULL,
	"requirements" text[] DEFAULT '{}'::text[] NOT NULL,
	"nice_to_have" text[] DEFAULT '{}'::text[] NOT NULL,
	"benefits" text[] DEFAULT '{}'::text[] NOT NULL,
	"employment_type" text NOT NULL,
	"work_mode" text NOT NULL,
	"location_city" text NOT NULL,
	"location_state" text NOT NULL,
	"experience_min_years" numeric(3, 1) DEFAULT '0' NOT NULL,
	"experience_max_years" numeric(3, 1),
	"salary_min" integer,
	"salary_max" integer,
	"salary_currency" text DEFAULT 'INR' NOT NULL,
	"salary_unit" text DEFAULT 'YEAR' NOT NULL,
	"salary_is_public" boolean DEFAULT false NOT NULL,
	"requires_two_wheeler" boolean DEFAULT false NOT NULL,
	"requires_driving_licence" boolean DEFAULT false NOT NULL,
	"openings" integer DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"posted_at" timestamp with time zone,
	"valid_through" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "jobs_slug_unique" UNIQUE("slug"),
	CONSTRAINT "jobs_employment_type_check" CHECK ("jobs"."employment_type" IN ('FULL_TIME','PART_TIME','INTERN','CONTRACTOR')),
	CONSTRAINT "jobs_work_mode_check" CHECK ("jobs"."work_mode" IN ('onsite','hybrid','remote','field')),
	CONSTRAINT "jobs_status_check" CHECK ("jobs"."status" IN ('draft','open','paused','closed'))
);
--> statement-breakpoint
CREATE TABLE "talent_pool" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"email_normalised" text NOT NULL,
	"full_name" text NOT NULL,
	"interest_family" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "talent_pool_email_normalised_unique" UNIQUE("email_normalised")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text NOT NULL,
	"totp_secret" text,
	"role" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp with time zone,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "application_notes" ADD CONSTRAINT "application_notes_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_notes" ADD CONSTRAINT "application_notes_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_drive_id_campus_drives_id_fk" FOREIGN KEY ("drive_id") REFERENCES "public"."campus_drives"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_college_id_colleges_id_fk" FOREIGN KEY ("college_id") REFERENCES "public"."colleges"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campus_drives" ADD CONSTRAINT "campus_drives_college_id_colleges_id_fk" FOREIGN KEY ("college_id") REFERENCES "public"."colleges"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "apps_stage_submitted" ON "applications" USING btree ("stage","submitted_at");--> statement-breakpoint
CREATE INDEX "apps_job" ON "applications" USING btree ("job_id","submitted_at");--> statement-breakpoint
CREATE INDEX "apps_drive" ON "applications" USING btree ("drive_id");--> statement-breakpoint
CREATE INDEX "drives_date" ON "campus_drives" USING btree ("drive_date");--> statement-breakpoint
CREATE INDEX "colleges_name_trgm" ON "colleges" USING gin ("name" gin_trgm_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "colleges_name_city_uq" ON "colleges" USING btree (lower(btrim("name")),lower(coalesce("city", '')));--> statement-breakpoint
CREATE INDEX "courses_name_trgm" ON "courses" USING gin ("name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "jobs_status_posted" ON "jobs" USING btree ("status","posted_at");