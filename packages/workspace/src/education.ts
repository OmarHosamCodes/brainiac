import { trimToEmpty, truncateText } from "./shared";
import type {
  WorkspaceCohortHealth,
  WorkspaceCohortHealthCohort,
  WorkspaceCohortHealthDashboardBlock,
  WorkspaceCohortHealthSummary,
  WorkspaceCohortStatus,
  WorkspaceCourseRoadmapBlock,
  WorkspaceCourseRoadmapCourse,
  WorkspaceCourseRoadmapCourseProgress,
  WorkspaceCourseRoadmapSummary,
  WorkspaceCourseStatus,
} from "./types";

export const workspaceCourseStatusLabels: Record<WorkspaceCourseStatus, string> = {
  planning: "Planning",
  "in-progress": "In Progress",
};

export const workspaceCohortStatusLabels: Record<WorkspaceCohortStatus, string> = {
  planning: "Planning",
  selling: "Selling",
  running: "Running",
  completed: "Completed",
};

export function getCourseRoadmapCourseProgress(
  course: WorkspaceCourseRoadmapCourse,
): WorkspaceCourseRoadmapCourseProgress {
  const lessonCount = course.lessons.length;
  const recordedLessons = course.lessons.filter((lesson) => lesson.recorded).length;

  return {
    lessonCount,
    recordedLessons,
    completionPercent: lessonCount > 0 ? Math.round((recordedLessons / lessonCount) * 100) : 0,
  };
}

export function getCourseRoadmapSummary(
  block: WorkspaceCourseRoadmapBlock,
): WorkspaceCourseRoadmapSummary {
  const progressByCourse = block.courses.map((course) => getCourseRoadmapCourseProgress(course));
  const lessonCount = progressByCourse.reduce((sum, course) => sum + course.lessonCount, 0);
  const recordedLessons = progressByCourse.reduce((sum, course) => sum + course.recordedLessons, 0);

  return {
    courseCount: block.courses.length,
    lessonCount,
    recordedLessons,
    averageCompletionPercent:
      progressByCourse.length > 0
        ? Math.round(
            progressByCourse.reduce((sum, course) => sum + course.completionPercent, 0) /
              progressByCourse.length,
          )
        : 0,
    inProgressCount: block.courses.filter((course) => course.status === "in-progress").length,
    planningCount: block.courses.filter((course) => course.status === "planning").length,
  };
}

export function getCourseRoadmapCourseContext(course: WorkspaceCourseRoadmapCourse) {
  const progress = getCourseRoadmapCourseProgress(course);
  const lessonLines =
    course.lessons.length > 0
      ? course.lessons.map(
          (lesson, index) =>
            `${index + 1}. ${trimToEmpty(lesson.title) || `Lesson ${index + 1}`} (${lesson.recorded ? "recorded" : "pending"})`,
        )
      : ["No lessons defined yet."];
  const outcomeLines =
    course.outcomes.length > 0
      ? course.outcomes.map((outcome, index) => `${index + 1}. ${trimToEmpty(outcome.text)}`)
      : ["No outcomes listed yet."];

  return {
    progress,
    summary: `${course.name} is ${workspaceCourseStatusLabels[course.status].toLowerCase()} with ${progress.recordedLessons}/${progress.lessonCount} lessons recorded (${progress.completionPercent}%).`,
    lessonLines,
    outcomeLines,
  };
}

export function buildLearningOutcomesMatrixPrompt(
  course: WorkspaceCourseRoadmapCourse,
  prompt: string,
) {
  const context = getCourseRoadmapCourseContext(course);
  const request =
    trimToEmpty(prompt) || `Design a learning outcomes matrix for my ${course.name} course.`;

  return [
    request,
    "",
    "Use the course context below and respond in clean markdown.",
    "",
    `Course: ${course.name}`,
    `Status: ${workspaceCourseStatusLabels[course.status]}`,
    `Progress: ${context.progress.recordedLessons}/${context.progress.lessonCount} lessons recorded (${context.progress.completionPercent}%)`,
    "",
    "Lessons:",
    ...context.lessonLines.map((line) => `- ${line}`),
    "",
    "Current outcomes:",
    ...context.outcomeLines.map((line) => `- ${line}`),
    "",
    "Output requirements:",
    "- Start with a short overview of the course promise and audience.",
    "- Then provide a module-by-module outcomes matrix in a markdown table with these columns: Module, Skills, Knowledge, Behaviors, Assessment Ideas.",
    "- End with gaps, sequencing advice, and two concrete improvements.",
  ].join("\n");
}

export function getCohortFillPercent(cohort: WorkspaceCohortHealthCohort) {
  if (cohort.capacity <= 0) {
    return 0;
  }

  return Math.round((Math.min(cohort.seatsSold, cohort.capacity) / cohort.capacity) * 100);
}

export function getCohortHealthScore(cohort: WorkspaceCohortHealthCohort) {
  const fillPercent = getCohortFillPercent(cohort);
  let score = Math.round(fillPercent * 0.75);

  switch (cohort.status) {
    case "completed":
      score += 20;
      break;
    case "running":
      score += 12;
      break;
    case "selling":
      score += 4;
      break;
    default:
      break;
  }

  if (cohort.refundRisk) {
    score -= 18;
  }

  if (cohort.completionRisk) {
    score -= 18;
  }

  if (cohort.status !== "planning" && fillPercent < 50) {
    score -= 12;
  }

  return Math.max(0, Math.min(100, score));
}

export function getCohortHealth(cohort: WorkspaceCohortHealthCohort): WorkspaceCohortHealth {
  const score = getCohortHealthScore(cohort);

  if (score >= 70) {
    return "healthy";
  }

  if (score >= 45) {
    return "watch";
  }

  return "at-risk";
}

export function getCohortHealthSummary(
  block: WorkspaceCohortHealthDashboardBlock,
): WorkspaceCohortHealthSummary {
  const totalSeatsSold = block.cohorts.reduce((sum, cohort) => sum + cohort.seatsSold, 0);
  const totalCapacity = block.cohorts.reduce((sum, cohort) => sum + cohort.capacity, 0);

  return {
    cohortCount: block.cohorts.length,
    totalSeatsSold,
    totalCapacity,
    fillPercent: totalCapacity > 0 ? Math.round((totalSeatsSold / totalCapacity) * 100) : 0,
    bookedRevenueEgp: block.cohorts.reduce((sum, cohort) => sum + cohort.revenueEgp, 0),
    atRiskCount: block.cohorts.filter((cohort) => getCohortHealth(cohort) === "at-risk").length,
    runningCount: block.cohorts.filter((cohort) => cohort.status === "running").length,
  };
}

export function summarizeCourseRoadmapForPreview(block: WorkspaceCourseRoadmapBlock) {
  const summary = getCourseRoadmapSummary(block);

  if (summary.courseCount === 0) {
    return "No courses mapped yet.";
  }

  const leadCourse = block.courses
    .slice()
    .sort(
      (left, right) =>
        getCourseRoadmapCourseProgress(right).completionPercent -
        getCourseRoadmapCourseProgress(left).completionPercent,
    )[0];

  if (!leadCourse) {
    return "No courses mapped yet.";
  }

  const leadProgress = getCourseRoadmapCourseProgress(leadCourse);

  return truncateText(
    `${summary.recordedLessons}/${summary.lessonCount} lessons recorded across ${summary.courseCount} courses. Leading course: ${leadCourse.name} at ${leadProgress.completionPercent}% completion.`,
    180,
  );
}
