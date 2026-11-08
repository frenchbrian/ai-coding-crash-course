import { eq, and, sql, inArray } from "drizzle-orm";
import { db } from "~/db";
import { courseRatings } from "~/db/schema";
import { isUserEnrolled } from "~/services/enrollmentService";

// ─── Rating Service ───
// Students rate courses 1–5 stars. One rating per student per course;
// rating again replaces the previous value. Only enrolled students may rate.

export const MIN_RATING = 1;
export const MAX_RATING = 5;

export type RatingSummary = {
  average: number | null;
  count: number;
};

const EMPTY_SUMMARY: RatingSummary = { average: null, count: 0 };

export function rateCourse(userId: number, courseId: number, rating: number) {
  if (!Number.isInteger(rating) || rating < MIN_RATING || rating > MAX_RATING) {
    throw new Error(`Rating must be a whole number from ${MIN_RATING} to ${MAX_RATING}`);
  }

  if (!isUserEnrolled(userId, courseId)) {
    throw new Error("Only enrolled students can rate this course");
  }

  const now = new Date().toISOString();
  return db
    .insert(courseRatings)
    .values({ userId, courseId, rating, createdAt: now, updatedAt: now })
    .onConflictDoUpdate({
      target: [courseRatings.userId, courseRatings.courseId],
      set: { rating, updatedAt: now },
    })
    .returning()
    .get();
}

export function getUserRatingForCourse(userId: number, courseId: number) {
  const row = db
    .select({ rating: courseRatings.rating })
    .from(courseRatings)
    .where(
      and(eq(courseRatings.userId, userId), eq(courseRatings.courseId, courseId))
    )
    .get();
  return row?.rating ?? null;
}

export function getCourseRatingSummary(courseId: number): RatingSummary {
  return getRatingSummariesForCourses([courseId]).get(courseId) ?? EMPTY_SUMMARY;
}

export function getRatingSummariesForCourses(
  courseIds: number[]
): Map<number, RatingSummary> {
  const summaries = new Map<number, RatingSummary>();
  if (courseIds.length === 0) return summaries;

  const rows = db
    .select({
      courseId: courseRatings.courseId,
      average: sql<number>`avg(${courseRatings.rating})`,
      count: sql<number>`count(*)`,
    })
    .from(courseRatings)
    .where(inArray(courseRatings.courseId, courseIds))
    .groupBy(courseRatings.courseId)
    .all();

  for (const row of rows) {
    summaries.set(row.courseId, { average: row.average, count: row.count });
  }
  return summaries;
}
