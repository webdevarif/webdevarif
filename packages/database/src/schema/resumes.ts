import { sql } from "drizzle-orm";
import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { users } from "./users";

/**
 * Parsed job-post info — what role the resume was tailored against.
 */
export type ResumeJobInfo = {
  title: string;
  company: string | null;
  location: string | null;
  type: string | null;
  level: string | null;
  requiredSkills: string[];
  niceToHave: string[];
  responsibilities: string[];
  summary: string;
};

/**
 * The full resume content (header / summary / experience / sidebar). Lives
 * in JSONB so the render function can produce HTML at view / PDF time
 * without hitting the AI again.
 */
export type ResumeData = {
  name: string;
  titleLine: string;
  contact: {
    location: string;
    email: string;
    phone: string;
    website: string;
    linkedin: string;
    github: string;
  };
  summary: string;
  featuredApps: Array<{
    name: string;
    href: string;
    linkLabel: string;
    iconUrl: string;
    description: string;
  }>;
  experience: Array<{
    role: string;
    period: string;
    company: string;
    location: string;
    logoUrl: string;
    bullets: string[];
    tags: string[];
  }>;
  shopifyStack: string[];
  skillGroups: Array<{
    label: string;
    items: string[];
  }>;
  education: Array<{
    school: string;
    degree: string;
    year: string;
  }>;
  languages: Array<{
    name: string;
    level: string;
  }>;
  links: Array<{
    label: string;
    href: string;
  }>;
};

export const resumes = pgTable(
  "resumes",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    /** Headline shown in the list. Pulled from jobInfo at create time. */
    title: text("title").notNull(),

    /** "text" | "screenshot" | "url" — origin of the job post info. */
    source: text("source").notNull().default("text"),
    /** Raw input the user pasted (text) or filename (screenshot). */
    sourcePreview: text("source_preview"),

    /** Parsed job-post structure used to drive the AI tailoring. */
    jobInfo: jsonb("job_info").$type<ResumeJobInfo>(),
    /** Tailored resume content. The HTML is rendered from this on demand. */
    data: jsonb("data").notNull().$type<ResumeData>(),
    modelUsed: text("model_used"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("resumes_user_id_idx").on(table.userId),
    index("resumes_created_at_idx").on(table.createdAt),
  ],
);

export type ResumeRow = typeof resumes.$inferSelect;
export type NewResumeRow = typeof resumes.$inferInsert;
