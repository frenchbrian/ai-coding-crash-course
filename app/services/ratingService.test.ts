import { describe, it, expect, beforeEach, vi } from "vitest";
import { createTestDb, seedBaseData } from "~/test/setup";
import * as schema from "~/db/schema";

let testDb: ReturnType<typeof createTestDb>;
let base: ReturnType<typeof seedBaseData>;

vi.mock("~/db", () => ({
  get db() {
    return testDb;
  },
}));

import {
  rateCourse,
  getUserRatingForCourse,
  getCourseRatingSummary,
  getRatingSummariesForCourses,
} from "./ratingService";

function addStudent(email: string) {
  return testDb
    .insert(schema.users)
    .values({ name: email, email, role: schema.UserRole.Student })
    .returning()
    .get();
}

function enroll(userId: number, courseId: number) {
  testDb.insert(schema.enrollments).values({ userId, courseId }).run();
}

describe("ratingService", () => {
  beforeEach(() => {
    testDb = createTestDb();
    base = seedBaseData(testDb);
  });

  describe("rateCourse", () => {
    it("records a rating for an enrolled student", () => {
      enroll(base.user.id, base.course.id);
      rateCourse(base.user.id, base.course.id, 4);
      expect(getUserRatingForCourse(base.user.id, base.course.id)).toBe(4);
    });

    it("replaces a student's previous rating instead of adding another", () => {
      enroll(base.user.id, base.course.id);
      rateCourse(base.user.id, base.course.id, 2);
      rateCourse(base.user.id, base.course.id, 5);

      expect(getUserRatingForCourse(base.user.id, base.course.id)).toBe(5);
      expect(getCourseRatingSummary(base.course.id)).toEqual({ average: 5, count: 1 });
    });

    it("rejects students who are not enrolled", () => {
      expect(() => rateCourse(base.user.id, base.course.id, 3)).toThrowError(
        "Only enrolled students can rate this course"
      );
    });

    it.each([0, 6, 3.5, NaN])("rejects invalid rating %s", (rating) => {
      enroll(base.user.id, base.course.id);
      expect(() => rateCourse(base.user.id, base.course.id, rating)).toThrowError(
        "Rating must be a whole number from 1 to 5"
      );
    });
  });

  describe("getUserRatingForCourse", () => {
    it("returns null when the student has not rated", () => {
      expect(getUserRatingForCourse(base.user.id, base.course.id)).toBeNull();
    });
  });

  describe("getCourseRatingSummary", () => {
    it("returns no average when there are no ratings", () => {
      expect(getCourseRatingSummary(base.course.id)).toEqual({ average: null, count: 0 });
    });

    it("averages ratings across all students", () => {
      const other = addStudent("other@example.com");
      enroll(base.user.id, base.course.id);
      enroll(other.id, base.course.id);
      rateCourse(base.user.id, base.course.id, 5);
      rateCourse(other.id, base.course.id, 2);

      expect(getCourseRatingSummary(base.course.id)).toEqual({ average: 3.5, count: 2 });
    });
  });

  describe("getRatingSummariesForCourses", () => {
    it("returns summaries keyed by course id, omitting unrated courses", () => {
      const second = testDb
        .insert(schema.courses)
        .values({
          title: "Second",
          slug: "second",
          description: "x",
          instructorId: base.instructor.id,
          categoryId: base.category.id,
          status: schema.CourseStatus.Published,
        })
        .returning()
        .get();
      enroll(base.user.id, base.course.id);
      rateCourse(base.user.id, base.course.id, 4);

      const summaries = getRatingSummariesForCourses([base.course.id, second.id]);
      expect(summaries.get(base.course.id)).toEqual({ average: 4, count: 1 });
      expect(summaries.has(second.id)).toBe(false);
    });

    it("returns an empty map for no course ids", () => {
      expect(getRatingSummariesForCourses([]).size).toBe(0);
    });
  });
});
