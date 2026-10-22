import { z } from "zod";
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (v) =>
      !Number.isNaN(Date.parse(v)) &&
      new Date(v).toISOString().slice(0, 10) === v,
    "日期无效",
  );
export const practiceSchema = z
  .object({
    id: z.string().min(1),
    date,
    subject: z.enum(["reading", "listening"]),
    book: z.string().max(100),
    test: z.string().max(100),
    part: z.string().max(100),
    repeated: z.boolean(),
    timed: z.boolean(),
    correct: z.number().int().min(0),
    total: z.number().int().min(1).max(200),
    duration: z.number().min(0).max(1440),
    replays: z.number().int().min(0).max(1000),
    errors: z.array(
      z.enum([
        "听辨",
        "拼写",
        "定位",
        "同义替换",
        "长难句",
        "语法",
        "表达",
        "时间管理",
      ]),
    ),
    source: z.enum(["manual", "csv", "excel", "ocr", "coach"]),
    confidence: z.enum(["confirmed", "self-reported"]),
    notes: z.string().max(10000),
    attachmentKey: z.string().optional(),
  })
  .refine((r) => r.correct <= r.total, {
    message: "正确题数不能超过总题数",
    path: ["correct"],
  });
export const feedbackSchema = z.object({
  summary: z.string().max(2000),
  strengths: z.array(z.string().max(1000)).max(5),
  issues: z.array(z.string().max(1000)).max(3),
  explanation: z.string().max(4000),
  example: z.string().max(2000),
  next: z.string().max(2000),
  meetsCriteria: z.boolean(),
});
export const aiRequestSchema = z.object({
  subject: z.enum(["writing", "speaking"]),
  level: z.number().int().min(1).max(5),
  text: z.string().trim().min(1).max(15000),
  prompt: z.string().max(2000),
});
const subject = z.enum([
  "writing",
  "speaking",
  "reading",
  "listening",
  "review",
]);
const feedback = feedbackSchema.extend({ source: z.enum(["local", "ai"]) });
export const stateSchema = z.object({
  version: z.literal(1),
  profile: z
    .object({
      startDate: date,
      examDate: date,
      target: z.number().min(1).max(9),
      minutes: z.literal(300),
      mode: z.enum(["foundation", "focused", "exam"]),
      name: z.string().max(100),
    })
    .refine((p) => p.examDate > p.startDate, "考试日期必须晚于开始日期"),
  days: z.record(
    z.string(),
    z.array(
      z.object({
        id: z.string(),
        date,
        subject,
        title: z.string(),
        minutes: z.number().min(1).max(300),
        seconds: z.number().min(0),
        status: z.enum(["todo", "done", "carry"]),
        difficulty: z.number().int().min(1).max(5),
        steps: z.array(z.string()),
        stepMinutes: z.array(z.number().int().min(0)).optional(),
        completedSteps: z.array(z.number().int().min(0)),
        goal: z.string(),
        material: z.string(),
        instruction: z.string(),
        example: z.string(),
        exercise: z.string(),
        criterion: z.string(),
        next: z.string(),
        reflection: z.string(),
      }),
    ),
  ),
  writing: z.array(
    z.object({
      id: z.string(),
      date,
      level: z.number().int().min(1).max(5),
      prompt: z.string(),
      original: z.string(),
      revised: z.string(),
      rewrite: z.string(),
      independent: z.boolean(),
      feedback,
      rewriteFeedback: feedback.optional(),
    }),
  ),
  speaking: z.array(
    z.object({
      id: z.string(),
      date,
      level: z.number().int().min(1).max(5),
      prompt: z.string(),
      transcript: z.string(),
      duration: z.number().min(0),
      audioKey: z.string().optional(),
      mime: z.string().optional(),
      feedback,
    }),
  ),
  errors: z.array(
    z.object({
      id: z.string(),
      date,
      subject,
      category: z.enum([
        "听辨",
        "拼写",
        "定位",
        "同义替换",
        "长难句",
        "语法",
        "表达",
        "时间管理",
      ]),
      question: z.string(),
      answer: z.string(),
      reason: z.string(),
      nextReview: date,
      interval: z.number().min(0),
      reviews: z.array(
        z.object({ date, response: z.string(), remembered: z.boolean() }),
      ),
    }),
  ),
  practices: z.array(practiceSchema),
  drills: z.array(
    z.object({
      id: z.string(),
      date,
      subject: z.enum(["reading", "listening"]),
      questionId: z.string(),
      answer: z.string(),
      correct: z.boolean(),
      plays: z.number().int().min(0),
      firstAttempt: z.boolean(),
      seconds: z.number().min(0),
      timed: z.boolean().optional(),
    }),
  ),
  drafts: z.record(z.string(), z.string()).default({}),
  levels: z.object({
    writing: z.number().int().min(1).max(5),
    speaking: z.number().int().min(1).max(5),
  }),
  updatedAt: z.string(),
});
