/**
 * Re-export of the central API-key scope catalog.
 *
 * The catalog now lives in `@/lib/api/scopes` so it can be shared by the
 * public `/api/v1/*` route handlers and the Developer / API docs page as
 * well as this projects-settings key UI. Kept as a separate (non
 * `"use server"`) module so the const values can be imported into client
 * components without tripping the server-action export rules.
 */
export { ALL_SCOPES, type Scope } from "@/lib/api/scopes";
