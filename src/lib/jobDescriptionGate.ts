/**
 * Centralised gate for AI features that depend on a usable job description
 * (ATS Check, Cover Letter, Tailored Resume).
 *
 * A description is "usable" when it has at least 200 characters OR enrichment
 * has been completed successfully (description_enriched = true).
 */
import { Job } from "@/types/job";

export const MIN_USABLE_DESCRIPTION_LENGTH = 200;

export function hasUsableDescription(
  job: Pick<Job, "description" | "description_enriched"> | null | undefined
): boolean {
  if (!job) return false;
  if (job.description_enriched === true) return true;
  return (job.description || "").length >= MIN_USABLE_DESCRIPTION_LENGTH;
}

export const NO_DESCRIPTION_TOOLTIP =
  "Job description is unavailable for this listing — please try another one.";
