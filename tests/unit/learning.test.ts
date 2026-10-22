import { describe, it, expect } from "vitest";
import {
  addDays,
  allocations,
  daysBetween,
  generateTasks,
  initialState,
  localFeedback,
  localDate,
  phaseFor,
  practiceStats,
  recommendMode,
  simplifyTask,
  writingUpgrade,
  type WritingRecord,
} from "../../lib/model";
import { blankPractice, parseImportRow } from "../../lib/imports";
import { practiceSchema, stateSchema } from "../../lib/validation";
describe("真实备考日程", () => {
  it("70天训练到12月30日，不把考试日算作额外训练日", () => {
    expect(daysBetween("2026-10-22", "2026-12-31")).toBe(70);
    expect(addDays("2026-10-22", 69)).toBe("2026-12-30");
  });
  it("使用上海日期边界", () => {
    expect(localDate(new Date("2026-10-21T16:01:00Z"))).toBe("2026-10-22");
  });
  it("按14/35/55天分阶段", () => {
    expect([14, 15, 35, 36, 55, 56].map(phaseFor)).toEqual([1, 2, 2, 3, 3, 4]);
  });
  it("日期到后期不会自动强推模考", () =>
    expect(recommendMode(initialState())).toBe("foundation"));
});
describe("可以完成的任务", () => {
  it("每天五项合计300分钟，首日不布置完整作文", () => {
    const tasks = generateTasks(initialState(), "2026-10-22");
    expect(tasks.map((t) => t.minutes)).toEqual([90, 75, 60, 60, 15]);
    expect(tasks.reduce((a, t) => a + t.minutes, 0)).toBe(300);
    expect(tasks[0].exercise).toContain("造句");
  });
  it("每天的任务具有完整教学内容", () => {
    for (const task of generateTasks(initialState(), "2026-10-22"))
      for (const key of [
        "goal",
        "material",
        "instruction",
        "example",
        "exercise",
        "criterion",
        "next",
      ] as const)
        expect(task[key].length).toBeGreaterThan(5);
  });
  it("降低难度保留计时，不判失败", () => {
    const task = {
      ...generateTasks(initialState(), "2026-10-22")[0],
      seconds: 120,
    };
    const easier = simplifyTask(task);
    expect(easier.steps).toHaveLength(3);
    expect(easier.seconds).toBe(120);
    expect(easier.status).toBe("todo");
  });
  it("未完成任务提供续学提示，不堆叠双倍时长", () => {
    const state = initialState();
    state.days["2026-10-22"] = generateTasks(state, "2026-10-22");
    const next = generateTasks(state, "2026-10-23");
    expect(next[0].reflection).toContain("续学");
    expect(next.reduce((s, t) => s + t.minutes, 0)).toBe(300);
  });
  it("诊断后按错因与新材料表现调时，仍合计300分钟", () => {
    const state = initialState();
    state.practices = [
      { ...blankPractice(), date: "2026-11-06", correct: 2, total: 13 },
      { ...blankPractice(), date: "2026-11-07", correct: 3, total: 13 },
    ];
    const plan = allocations(state, "2026-11-08");
    expect(plan.reading).toBe(75);
    expect(Object.values(plan).reduce((a, b) => a + b, 0)).toBe(300);
    expect(
      Math.min(plan.writing, plan.speaking, plan.listening, plan.reading),
    ).toBeGreaterThanOrEqual(45);
  });
});
describe("证据与成绩分离", () => {
  it("重复不限时成绩不进入首次限时统计，且不覆盖首次", () => {
    const first = { ...blankPractice(), correct: 4, total: 13, timed: true };
    const second = {
      ...first,
      id: "second",
      correct: 8,
      repeated: true,
      timed: false,
    };
    const stats = practiceStats([first, second], "reading");
    expect(stats.fresh).toBe(31);
    expect(stats.learning).toBe(62);
    expect(first.correct).toBe(4);
  });
  it("听力多次播放与播放条件未知不能进入考试表现", () => {
    const first = {
      ...blankPractice(),
      subject: "listening" as const,
      correct: 8,
      total: 10,
      timed: true,
    };
    const stats = practiceStats(
      [
        { ...first, replays: 2 },
        { ...first, id: "other", replays: 0 },
      ],
      "listening",
    );
    expect(stats.fresh).toBeNull();
    expect(stats.learning).toBe(80);
  });
  it("不会从“没有发现规则错误”推断正式分数", () => {
    const feedback = localFeedback(
      "I study English every day because I enjoy it.",
      "writing",
      1,
    );
    expect(feedback.source).toBe("local");
    expect(feedback.explanation).toContain("不能确认");
    expect(feedback).not.toHaveProperty("band");
  });
  it("抓住常见错误，每次最多3点", () => {
    const feedback = localFeedback("i am agree people is", "writing", 1);
    expect(feedback.issues).toHaveLength(3);
    expect(feedback.meetsCriteria).toBe(false);
  });
  it("升级需要至少两天、三次独立重写证据", () => {
    const state = initialState();
    const row: WritingRecord = {
      id: "1",
      date: "2026-10-22",
      level: 1,
      prompt: "why",
      original: "I study.",
      revised: "",
      rewrite: "I study English because I want to travel.",
      independent: true,
      feedback: localFeedback("I study.", "writing", 1),
      rewriteFeedback: localFeedback(
        "I study English because I want to travel.",
        "writing",
        1,
      ),
    };
    state.writing = [row, { ...row, id: "2" }, { ...row, id: "3" }];
    expect(writingUpgrade(state)).toBe(false);
    state.writing[2] = { ...row, id: "3", date: "2026-10-23" };
    expect(writingUpgrade(state)).toBe(true);
  });
});
describe("输入验证", () => {
  it("拒绝正确题数大于总题数", () =>
    expect(
      practiceSchema.safeParse({ ...blankPractice(), correct: 14, total: 13 })
        .success,
    ).toBe(false));
  it("拒绝无效日期与负耗时", () => {
    expect(
      practiceSchema.safeParse({ ...blankPractice(), date: "2026-02-30" })
        .success,
    ).toBe(false);
    expect(
      practiceSchema.safeParse({ ...blankPractice(), duration: -1 }).success,
    ).toBe(false);
  });
  it("CSV false字符串不会当成true", () => {
    const row = parseImportRow(
      {
        subject: "reading",
        correct: "4",
        total: "13",
        timed: "false",
        repeated: "false",
      },
      "csv",
    );
    expect(row.timed).toBe(false);
    expect(row.repeated).toBe(false);
  });
  it("拒绝只有雅思分数而没有正确题数的行", () =>
    expect(() =>
      parseImportRow({ subject: "reading", band: 6 }, "csv"),
    ).toThrow("正确题数"));
  it("拒绝无效科目而不静默归到阅读", () =>
    expect(() =>
      parseImportRow({ subject: "other", correct: 4, total: 13 }, "csv"),
    ).toThrow("subject"));
  it("有效状态可往返验证，损坏备份被拒绝", () => {
    const state = initialState();
    state.days["2026-10-22"] = generateTasks(state, "2026-10-22");
    expect(stateSchema.parse(JSON.parse(JSON.stringify(state)))).toEqual(state);
    expect(
      stateSchema.safeParse({ ...state, levels: { writing: 99, speaking: 1 } })
        .success,
    ).toBe(false);
  });
});
