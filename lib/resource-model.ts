export type ResourceSource =
  | "idictation"
  | "jiufen"
  | "cambridge"
  | "heqiong"
  | "personal";
export const resourceSources: Record<ResourceSource, string> = {
  idictation: "爱听写网页记录",
  jiufen: "九分学长资料",
  cambridge: "本人持有的剑桥资料",
  heqiong: "何琼词汇与改写",
  personal: "个人学习资料",
};
export type ResourceKind =
  | "pdf"
  | "document"
  | "audio"
  | "text"
  | "questions"
  | "image";
export interface VocabularyItem {
  id: string;
  term: string;
  meaning: string;
  category: string;
  kind: "word" | "paraphrase" | "connector";
  source: string;
  page: number;
  status: "checked" | "review";
  note: string;
  alternative?: string;
  example?: string;
}
export interface LearningResource {
  id: string;
  name: string;
  source: ResourceSource;
  kind: ResourceKind;
  assetKey: string;
  textKey?: string;
  checksum: string;
  mime: string;
  size: number;
  addedAt: string;
  pages?: number;
  preview: string;
  notes: string;
  section: number;
  confirmed: boolean;
  questionSet?: ListeningSet;
  vocabulary: VocabularyItem[];
}
export interface VocabularyAttempt {
  id: string;
  date: string;
  itemId: string;
  answer: string;
  correct: boolean;
  mode: "dictation" | "paraphrase" | "usage";
  plays: number;
  revealed: boolean;
  nextReview: string;
}
export interface ListeningQuestion {
  id: string;
  prompt: string;
  answers: string[];
  wordLimit: number;
  type: "form" | "note" | "multiple-choice" | "matching" | "map";
  choices?: string[];
  evidence: string;
  paraphrase: string;
}
export interface ListeningSet {
  id: string;
  title: string;
  part: number;
  topic: string;
  transcript: string;
  questions: ListeningQuestion[];
  audioPath?: string;
  audioResourceId?: string;
  origin: "original" | "personal";
  answerKeyConfirmed: boolean;
}
export interface ListeningSession {
  id: string;
  date: string;
  setId: string;
  title: string;
  mode: "learn" | "once";
  plays: number;
  paused: boolean;
  seeked: boolean;
  transcriptViewed: boolean;
  firstAttempt: boolean;
  answers: Record<string, string>;
  results: { questionId: string; correct: boolean; reason: string }[];
  seconds: number;
}
export interface SpeakingContext {
  part: "1" | "2" | "3";
  topic: string;
  mode: "guided" | "exam";
  criterion: string;
  duration?: number;
}
