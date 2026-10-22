import data from "@/data/personal-curriculum.json";
import type { VocabularyItem, ListeningQuestion } from "./resource-model";
import type { StudyState } from "./model";
export const curriculumSources = data.sources;
export const seedVocabulary = data.items as VocabularyItem[];
export function allVocabulary(
  state: Pick<StudyState, "resources" | "vocabularyOverrides">,
): VocabularyItem[] {
  const items = [
    ...seedVocabulary,
    ...state.resources.flatMap((r) => r.vocabulary),
  ];
  return items.map((item) => ({
    ...item,
    ...state.vocabularyOverrides[item.id],
  }));
}
export function dueVocabulary(state: StudyState, date: string) {
  return allVocabulary(state)
    .filter((v) => v.status === "checked")
    .map((v) => ({
      item: v,
      attempt: state.vocabularyAttempts.filter((a) => a.itemId === v.id).at(-1),
    }))
    .filter(({ attempt }) => !attempt || attempt.nextReview <= date)
    .sort(
      (a, b) =>
        Number(Boolean(b.attempt && !b.attempt.correct)) -
        Number(Boolean(a.attempt && !a.attempt.correct)),
    );
}
export function normalizeListeningAnswer(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[.,!?;:]$/, "")
    .replace(/[’‘]/g, "'")
    .replace(/\s+/g, " ");
}
export function gradeListening(question: ListeningQuestion, value: string) {
  const answer = normalizeListeningAnswer(value);
  const words = answer.split(/\s+/).filter(Boolean).length;
  if (!answer) return { correct: false, reason: "尚未作答。" };
  if (words > question.wordLimit)
    return {
      correct: false,
      reason: `超过题目字数要求：最多${question.wordLimit}个词或数字。`,
    };
  const correct = question.answers.some(
    (a) => normalizeListeningAnswer(a) === answer,
  );
  return {
    correct,
    reason: correct
      ? "答案及字数符合本题要求。"
      : "请先核对定位句、改写与拼写；具体错因需结合你实际听到的内容确认。",
  };
}
export function extractVocabularyCandidates(
  pages: { page: number; text: string }[],
  source: string,
  prefix: string,
): VocabularyItem[] {
  const found = new Map<string, VocabularyItem>();
  for (const page of pages)
    for (const line of page.text.split(/\n/)) {
      if (/课程主页|私人微信|公众微信|内部资料|微博@|禁止外传/.test(line))
        continue;
      const match = line
        .trim()
        .match(
          /^([A-Za-z][A-Za-z '\-]{1,65})\s+([\u4e00-\u9fff][\u4e00-\u9fff，、；（）]{0,80})/,
        );
      if (!match || match[1].trim().split(/\s+/).length > 6) continue;
      const term = match[1].trim();
      if (found.has(term.toLowerCase())) continue;
      found.set(term.toLowerCase(), {
        id: `${prefix}-${found.size}`,
        term,
        meaning: match[2],
        category: "我的导入词汇",
        kind: "word",
        source,
        page: page.page,
        status: "review",
        note: "本机提取的候选词条，确认释义后才能进入每日训练。",
      });
      if (found.size >= 5000) break;
    }
  return [...found.values()];
}
