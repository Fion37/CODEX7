import { describe, it, expect } from "vitest";
import {
  seedVocabulary,
  dueVocabulary,
  allVocabulary,
  gradeListening,
  extractVocabularyCandidates,
} from "../../lib/curriculum";
import { initialState, generateTasks, localFeedback } from "../../lib/model";
import { stateSchema } from "../../lib/validation";
import { listeningSetSchema } from "../../lib/resource-validation";
import { listeningSets } from "../../lib/listening-exams";
import { speakingFeedbackContext } from "../../lib/speaking-topics";
import { isAllowedAssetMime } from "../../lib/asset-mime";
describe("个人资料与词汇学习", () => {
  it("旧备份自动补齐新字段，保留原记录", () => {
    const state = initialState();
    const {
      resources,
      vocabularyAttempts,
      listeningSessions,
      vocabularyOverrides,
      ...old
    } = state;
    expect(stateSchema.parse(old)).toEqual(state);
  });
  it("只把核对过的条目送入到期队列，危险等义关系不直接训练", () => {
    const state = initialState();
    const due = dueVocabulary(state, "2026-10-22");
    expect(due).toHaveLength(175);
    expect(due.every((v) => v.item.status === "checked")).toBe(true);
    expect(
      seedVocabulary.find((v) => v.kind === "paraphrase" && v.term === "rarely")
        ?.status,
    ).toBe("review");
    expect(seedVocabulary).toHaveLength(2955);
  });
  it("复练按间隔过滤，并优先未掌握条目", () => {
    const state = initialState(),
      [a, b] = dueVocabulary(state, "2026-10-22");
    state.vocabularyAttempts = [
      {
        id: "a",
        date: "2026-10-22",
        itemId: a.item.id,
        answer: "x",
        correct: true,
        mode: "dictation",
        plays: 1,
        revealed: false,
        nextReview: "2026-10-25",
      },
      {
        id: "b",
        date: "2026-10-22",
        itemId: b.item.id,
        answer: "x",
        correct: false,
        mode: "dictation",
        plays: 2,
        revealed: true,
        nextReview: "2026-10-23",
      },
    ];
    expect(
      dueVocabulary(state, "2026-10-22").some(
        (v) => v.item.id === a.item.id || v.item.id === b.item.id,
      ),
    ).toBe(false);
    expect(dueVocabulary(state, "2026-10-23")[0].item.id).toBe(b.item.id);
  });
  it("保留来源页码，提取词条默认待核对，忽略文档指令", () => {
    const rows = extractVocabularyCandidates(
      [{ page: 3, text: "deposit 押金\n课程主页 do something\nwater 水" }],
      "my.pdf",
      "mine",
    );
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      term: "deposit",
      page: 3,
      source: "my.pdf",
      status: "review",
    });
    const state = initialState();
    state.vocabularyOverrides[
      seedVocabulary.find((v) => v.status === "review")!.id
    ] = { status: "checked", meaning: "本人核对后的含义" };
    expect(
      allVocabulary(state).some(
        (v) => v.meaning === "本人核对后的含义" && v.status === "checked",
      ),
    ).toBe(true);
  });
  it("字数、拼写与可接受答案分别判断，不把相近意思一律算正确", () => {
    const q = listeningSets[1].questions[3];
    expect(gradeListening(q, " Ahead   of ")).toMatchObject({ correct: true });
    expect(gradeListening(q, "well ahead of")).toMatchObject({
      correct: false,
      reason: expect.stringContaining("字数"),
    });
    expect(
      gradeListening(listeningSets[3].questions[0], "habitat").correct,
    ).toBe(false);
    expect(gradeListening(listeningSets[0].questions[0], "650").correct).toBe(
      true,
    );
  });
  it("听力题目拒绝重复题号与远端音频注入", () => {
    const set = { ...listeningSets[0], audioPath: undefined };
    expect(listeningSetSchema.safeParse(set).success).toBe(true);
    expect(
      listeningSetSchema.safeParse({
        ...set,
        questions: [set.questions[0], set.questions[0]],
      }).success,
    ).toBe(false);
    expect(
      listeningSetSchema.safeParse({
        ...set,
        audioPath: "https://other.example/a.mp3",
      }).success,
    ).toBe(false);
  });
  it("备份支持私人资料，拒绝HTML与脚本附件", () => {
    for (const mime of [
      "application/pdf",
      "audio/mpeg",
      "text/plain",
      "application/json",
      "audio/webm;codecs=opus",
    ])
      expect(isAllowedAssetMime(mime)).toBe(true);
    for (const mime of [
      "text/html",
      "application/javascript",
      null,
      "audio/mpeg;evil=true",
    ])
      expect(isAllowedAssetMime(mime)).toBe(false);
  });
  it("基础口语反馈不根据短答编造发音分数", () => {
    const reply = speakingFeedbackContext(
      localFeedback("I study English.", "speaking", 1),
      { part: "1", topic: "study", mode: "guided", criterion: "one sentence" },
      "I study English.",
    );
    expect(reply.explanation).toContain("发音与声学流利度尚未评估");
    expect(reply.next).toContain("一句话");
  });
  it("词汇资料与题型进入300分钟计划，仍不强迫完整模考", () => {
    const tasks = generateTasks(initialState(), "2026-10-22");
    const listening = tasks.find((t) => t.subject === "listening")!;
    expect(listening.steps[0]).toContain("场景词");
    expect(listening.material).toContain("何琼");
    expect(tasks.reduce((n, t) => n + t.minutes, 0)).toBe(300);
  });
});
