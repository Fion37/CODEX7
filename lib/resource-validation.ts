import { z } from "zod";
export const vocabularySchema = z.object({
  id: z.string(),
  term: z.string().min(1).max(250),
  meaning: z.string().max(500),
  category: z.string().max(100),
  kind: z.enum(["word", "paraphrase", "connector"]),
  source: z.string().max(250),
  page: z.number().int().min(1),
  status: z.enum(["checked", "review"]),
  note: z.string().max(1000),
  alternative: z.string().max(1000).optional(),
  example: z.string().max(1000).optional(),
});
export const listeningQuestionSchema = z.object({
  id: z.string().min(1).max(100),
  prompt: z.string().min(1).max(2000),
  answers: z.array(z.string().min(1).max(300)).min(1).max(20),
  wordLimit: z.number().int().min(1).max(5),
  type: z.enum(["form", "note", "multiple-choice", "matching", "map"]),
  choices: z.array(z.string().max(500)).max(12).optional(),
  evidence: z.string().max(2500),
  paraphrase: z.string().max(1500),
});
export const listeningSetSchema = z
  .object({
    id: z.string().min(1).max(100),
    title: z.string().max(300),
    part: z.number().int().min(1).max(4),
    topic: z.string().max(200),
    transcript: z.string().max(100000),
    questions: z.array(listeningQuestionSchema).min(1).max(40),
    audioPath: z
      .string()
      .regex(/^\/audio\/(?:[\w-]+\/)*[\w-]+\.(?:mp3|wav|ogg)$/)
      .optional(),
    audioResourceId: z.string().optional(),
    origin: z.enum(["original", "personal"]),
    answerKeyConfirmed: z.boolean(),
  })
  .refine(
    (s) => new Set(s.questions.map((q) => q.id)).size === s.questions.length,
    "题号不可重复",
  );
export const resourceSchema = z.object({
  id: z.string(),
  name: z.string().max(400),
  source: z.enum(["idictation", "jiufen", "cambridge", "heqiong", "personal"]),
  kind: z.enum(["pdf", "document", "audio", "text", "questions", "image"]),
  assetKey: z.string(),
  textKey: z.string().optional(),
  checksum: z.string(),
  mime: z.string(),
  size: z.number().min(0).max(15728640),
  addedAt: z.string(),
  pages: z.number().int().min(1).max(200).optional(),
  preview: z.string().max(2000),
  notes: z.string().max(10000),
  section: z.number().int().min(1).max(4),
  confirmed: z.boolean(),
  questionSet: listeningSetSchema.optional(),
  vocabulary: z.array(vocabularySchema).max(5000),
});
export const vocabularyAttemptSchema = z.object({
  id: z.string(),
  date: z.string(),
  itemId: z.string(),
  answer: z.string(),
  correct: z.boolean(),
  mode: z.enum(["dictation", "paraphrase", "usage"]),
  plays: z.number().int().min(0),
  revealed: z.boolean(),
  nextReview: z.string(),
});
export const listeningSessionSchema = z.object({
  id: z.string(),
  date: z.string(),
  setId: z.string(),
  title: z.string(),
  mode: z.enum(["learn", "once"]),
  plays: z.number().int().min(0),
  paused: z.boolean(),
  seeked: z.boolean(),
  transcriptViewed: z.boolean(),
  firstAttempt: z.boolean(),
  answers: z.record(z.string(), z.string()),
  results: z.array(
    z.object({
      questionId: z.string(),
      correct: z.boolean(),
      reason: z.string(),
    }),
  ),
  seconds: z.number().min(0),
});
export const speakingContextSchema = z.object({
  part: z.enum(["1", "2", "3"]),
  topic: z.string().max(200),
  mode: z.enum(["guided", "exam"]),
  criterion: z.string().max(1500),
  duration: z.number().min(0).max(120).optional(),
});
export const listeningContextSchema = z.object({
  part: z.number().int().min(1).max(4),
  question: listeningQuestionSchema,
});
