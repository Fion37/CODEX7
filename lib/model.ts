export type Subject =
  | "writing"
  | "listening"
  | "reading"
  | "speaking"
  | "review";
export type Mode = "foundation" | "focused" | "exam";
export const subjects: Record<Subject, string> = {
  writing: "写作",
  listening: "听力",
  reading: "阅读",
  speaking: "口语",
  review: "复盘",
};
export const modes: Record<Mode, string> = {
  foundation: "基础学习",
  focused: "专项提高",
  exam: "考试冲刺",
};
export interface Profile {
  startDate: string;
  examDate: string;
  target: number;
  minutes: number;
  mode: Mode;
  name: string;
}
export interface Task {
  id: string;
  date: string;
  subject: Subject;
  title: string;
  minutes: number;
  seconds: number;
  status: "todo" | "done" | "carry";
  difficulty: number;
  steps: string[];
  stepMinutes?: number[];
  completedSteps: number[];
  goal: string;
  material: string;
  instruction: string;
  example: string;
  exercise: string;
  criterion: string;
  next: string;
  reflection: string;
}
export interface Feedback {
  summary: string;
  strengths: string[];
  issues: string[];
  explanation: string;
  example: string;
  next: string;
  source: "local" | "ai";
  meetsCriteria: boolean;
}
export interface WritingRecord {
  id: string;
  date: string;
  level: number;
  prompt: string;
  original: string;
  revised: string;
  rewrite: string;
  independent: boolean;
  feedback: Feedback;
  rewriteFeedback?: Feedback;
}
export interface SpeakingRecord {
  id: string;
  date: string;
  level: number;
  prompt: string;
  transcript: string;
  duration: number;
  audioKey?: string;
  mime?: string;
  feedback: Feedback;
}
export type ErrorCategory =
  | "听辨"
  | "拼写"
  | "定位"
  | "同义替换"
  | "长难句"
  | "语法"
  | "表达"
  | "时间管理";
export const errorCategories: ErrorCategory[] = [
  "听辨",
  "拼写",
  "定位",
  "同义替换",
  "长难句",
  "语法",
  "表达",
  "时间管理",
];
export interface ErrorRecord {
  id: string;
  date: string;
  subject: Subject;
  category: ErrorCategory;
  question: string;
  answer: string;
  reason: string;
  nextReview: string;
  interval: number;
  reviews: { date: string; response: string; remembered: boolean }[];
}
export interface PracticeRecord {
  id: string;
  date: string;
  subject: "reading" | "listening";
  book: string;
  test: string;
  part: string;
  repeated: boolean;
  timed: boolean;
  correct: number;
  total: number;
  duration: number;
  replays: number;
  errors: ErrorCategory[];
  source: "manual" | "csv" | "excel" | "ocr" | "coach";
  confidence: "confirmed" | "self-reported";
  notes: string;
  attachmentKey?: string;
}
export interface DrillRecord {
  id: string;
  date: string;
  subject: "reading" | "listening";
  questionId: string;
  answer: string;
  correct: boolean;
  plays: number;
  firstAttempt: boolean;
  seconds: number;
  timed?: boolean;
}
export interface StudyState {
  version: 1;
  profile: Profile;
  days: Record<string, Task[]>;
  writing: WritingRecord[];
  speaking: SpeakingRecord[];
  errors: ErrorRecord[];
  practices: PracticeRecord[];
  drills: DrillRecord[];
  drafts: Record<string, string>;
  levels: { writing: number; speaking: number };
  updatedAt: string;
}
export const uid = () => crypto.randomUUID();
export function localDate(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
export function daysBetween(a: string, b: string) {
  return Math.round(
    (Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86400000,
  );
}
export function addDays(date: string, days: number) {
  return new Date(Date.parse(date + "T00:00:00Z") + days * 86400000)
    .toISOString()
    .slice(0, 10);
}
export function initialState(): StudyState {
  return {
    version: 1,
    profile: {
      startDate: "2026-10-22",
      examDate: "2026-12-31",
      target: 7,
      minutes: 300,
      mode: "foundation",
      name: "学习者",
    },
    days: {},
    writing: [],
    speaking: [],
    errors: [],
    practices: [],
    drills: [],
    drafts: {},
    levels: { writing: 1, speaking: 1 },
    updatedAt: new Date().toISOString(),
  };
}
export function phaseFor(day: number) {
  return day <= 14 ? 1 : day <= 35 ? 2 : day <= 55 ? 3 : 4;
}
export function phaseName(phase: number) {
  return [
    "基础诊断与方法建立",
    "专项能力突破",
    "综合训练与速度提升",
    "模考与考前准备",
  ][phase - 1];
}
export function recommendMode(state: StudyState): Mode {
  const independent = state.writing.filter(
    (r) => r.independent && r.rewriteFeedback?.meetsCriteria,
  ).length;
  if (state.levels.writing < 3 || state.levels.speaking < 3 || independent < 3)
    return "foundation";
  const fresh = state.practices.filter(
    (r) =>
      !r.repeated && r.timed && (r.subject !== "listening" || r.replays === 1),
  );
  return state.levels.writing >= 4 &&
    state.levels.speaking >= 4 &&
    fresh.length >= 4 &&
    fresh.slice(-4).every((r) => r.correct / r.total >= 0.7)
    ? "exam"
    : "focused";
}
export function allocations(
  state: StudyState,
  date = localDate(),
): Record<Subject, number> {
  const base: Record<Subject, number> = {
    writing: 90,
    listening: 75,
    reading: 60,
    speaking: 60,
    review: 15,
  };
  if (daysBetween(state.profile.startDate, date) < 14) return base;
  const cutoff = addDays(date, -14);
  const recent = state.practices
    .filter((r) => r.date >= cutoff && r.date <= date)
    .slice(-20);
  const errors = state.errors.filter((e) => e.date >= cutoff && e.date <= date);
  const drills = state.drills.filter(
    (d) => d.date >= cutoff && d.date <= date && d.firstAttempt,
  );
  const previous = Object.values(state.days)
    .flat()
    .filter((t) => t.date >= cutoff && t.date < date);
  if (
    recent.length +
      drills.length +
      errors.length +
      previous.filter((t) => t.status === "carry").length <
    2
  )
    return base;
  const needs: Record<Subject, number> = {
    writing: (6 - state.levels.writing) / 5,
    listening: 0.5,
    reading: 0.5,
    speaking: (6 - state.levels.speaking) / 5,
    review: 0,
  };
  for (const subject of ["reading", "listening"] as const) {
    const rows = recent.filter((r) => r.subject === subject);
    if (rows.length >= 2) {
      const weighted = rows.map((r) => ({
        accuracy: r.correct / r.total,
        weight: r.repeated ? 0.25 : r.timed ? 1 : 0.5,
      }));
      needs[subject] =
        1.5 -
        weighted.reduce((n, r) => n + r.accuracy * r.weight, 0) /
          weighted.reduce((n, r) => n + r.weight, 0);
    }
  }
  for (const subject of ["reading", "listening"] as const) {
    const rows = drills.filter(
      (d) =>
        d.subject === subject && (subject !== "listening" || d.plays === 1),
    );
    if (
      recent.filter((r) => r.subject === subject).length < 2 &&
      rows.length >= 2
    )
      needs[subject] = 1.5 - rows.filter((r) => r.correct).length / rows.length;
  }
  for (const subject of [
    "writing",
    "listening",
    "reading",
    "speaking",
  ] as const) {
    needs[subject] +=
      Math.min(0.5, errors.filter((e) => e.subject === subject).length * 0.1) +
      Math.min(
        0.3,
        previous.filter((t) => t.subject === subject && t.status === "carry")
          .length * 0.1,
      );
  }
  const ranked = (["writing", "listening", "reading", "speaking"] as const)
    .slice()
    .sort((a, b) => needs[b] - needs[a]);
  const weakest = ranked[0],
    donor = ranked.at(-1)!;
  if (needs[weakest] - needs[donor] >= 0.3 && base[donor] >= 60) {
    base[weakest] += 15;
    base[donor] -= 15;
  }
  return base;
}
const templates: Record<
  Subject,
  Omit<
    Task,
    | "id"
    | "date"
    | "subject"
    | "minutes"
    | "seconds"
    | "status"
    | "difficulty"
    | "completedSteps"
    | "reflection"
  >
> = {
  writing: {
    title: "从一个想法，到一个完整句子",
    goal: "独立写出主谓完整的句子，并用 because 解释原因。",
    material: "本站原创：学习与科技主题；AI写作教师 Level 1",
    instruction:
      "先读结构与示范，口头说出一个想法。写3–5个简单句，检查主语、动词和原因，再尝试连接成短段。",
    example: "I study English every day because I want to study abroad.",
    exercise:
      "用 study / English / every day 造句，再为自己的学习目标写一个原因。",
    criterion: "完成5个句子，修改最重要的问题，并独立重写至少1句。",
    next: "若仍有困难，只练 I + verb + object；掌握后扩展时间和原因。",
    steps: [
      "理解一个学习主题",
      "学习3个基础句型",
      "写5个简单句",
      "检查与修改",
      "独立重写1句",
    ],
  },
  listening: {
    title: "让认识的单词，成为听得出的单词",
    goal: "分清听辨、拼写与定位困难，保留首次作答证据。",
    material: "本站原创语音小练习；可另行使用你合法获得的音频",
    instruction:
      "第一次完整听，不暂停，先作答。再逐句回听，比较声音与文字。只在第二次之后看讲解。",
    example: "The class starts at nine thirty. → 注意 starts at 的衔接。",
    exercise: "在听力教师页记录首次答案，回听并标注一个没听出的词。",
    criterion: "完成2个短句听辨；记录播放次数及一个错因。",
    next: "连续漏听则缩短到一个词组；再用不同句子检查迁移。",
    steps: ["首次听音并作答", "逐句精听", "辨音与拼写", "同义替换", "换句复测"],
  },
  reading: {
    title: "慢一点，读懂句子真正说了什么",
    goal: "找到句子主干，区分矛盾与未提及。",
    material: "本站原创短文与判断题；阅读教师精读模式",
    instruction:
      "先找主谓，再找定位信息；把题目和原文的对应词连起来。每个判断都写出证据。",
    example: "Some students prefer quiet rooms. 不代表所有学生都喜欢安静。",
    exercise: "完成一组原创判断题，说明 TRUE / FALSE / NOT GIVEN 的证据。",
    criterion: "完成原题和迁移题，能解释答案，不要求20分钟一篇。",
    next: "若定位困难，缩短到一句；理解稳定后再记录解题速度。",
    steps: [
      "找句子主干",
      "圈出定位词",
      "分析同义替换",
      "回答并解释",
      "相似题独立复测",
    ],
  },
  speaking: {
    title: "把熟悉的词，说成自己的回答",
    goal: "用完整句回答一个日常问题。",
    material: "本站原创：Do you enjoy learning English?；口语教师 Level 1",
    instruction:
      "先学 I enjoy ... because ...，录制一个短回答，听回放，只改1–3个关键问题。再录一次比较。",
    example: "I enjoy learning English because I can meet new people.",
    exercise: "先说一句，再加一个具体原因。无需完成Part 2。",
    criterion: "保存一次录音或确认转写，完成一次跟读和复录。",
    next: "仍卡住就先说 I enjoy English，再加入 because。",
    steps: [
      "理解问题",
      "听基础示范",
      "录制自己的回答",
      "听回放与改进",
      "重新录制",
    ],
  },
  review: {
    title: "把今天的错，变成下次的线索",
    goal: "主动提取今天最重要的错因。",
    material: "个人错题本与词汇；优先到期复习",
    instruction:
      "遮住答案先回想，再看反馈。用不同的例句复练；没掌握就缩短间隔。",
    example: "people are（复数）→ Many people are interested in languages.",
    exercise: "复习3个到期条目，记录一条可执行的改进。",
    criterion: "每条先尝试再对照，并记录是否独立完成。",
    next: "明天先复习仍不确定的条目。",
    steps: ["回想今天的困难", "复习到期错题", "写下明天的提示"],
  },
};
export function generateTasks(state: StudyState, date: string): Task[] {
  const allocation = allocations(state, date);
  return (Object.keys(templates) as Subject[]).map((subject) => {
    const previous = Object.values(state.days)
      .flat()
      .filter(
        (t) => t.subject === subject && t.date < date && t.status !== "done",
      )
      .sort((a, b) => b.date.localeCompare(a.date))[0];
    const level =
      subject === "writing"
        ? state.levels.writing
        : subject === "speaking"
          ? state.levels.speaking
          : 1;
    const template = { ...templates[subject] };
    if (level === 2 && subject === "writing") {
      template.title = "给句子增加场景与原因";
      template.exercise =
        "把 Technology is important. 扩展成一个包含具体领域和原因的句子。";
      template.steps = [
        "找到主语和动词",
        "补充具体场景",
        "增加原因或比较",
        "检查句子结构",
        "用新主题独立模仿",
      ];
    }
    if (level === 3 && subject === "writing") {
      template.title = "把想法展开成一个清楚的段落";
      template.goal = "独立组织观点、原因和具体例子。";
      template.exercise = "写出观点句、原因、一个具体例子与总结。";
      template.criterion = "独立写一个4–6句段落，修改并重写。";
      template.steps = [
        "理解题目与观点",
        "写主题句",
        "解释原因与例子",
        "组合并修改段落",
        "独立重写薄弱部分",
      ];
    }
    if (level >= 4 && subject === "writing") {
      template.title =
        level === 5
          ? "独立限时输出，再有针对性修改"
          : "从提纲到自己的Task 2文章";
      template.goal = "完成独立输出，检查审题、论证与时间分配。";
      template.exercise =
        level === 5
          ? "完成原创Task 1（20分钟）和Task 2（40分钟），其余时间复盘。"
          : "审题并列提纲，独立写作，再逐段修改。";
      template.criterion = "不复制范文，保留原稿、修改和独立重写。";
      template.steps = [
        "审题与列提纲",
        "整理观点和证据",
        "独立成文",
        "按反馈修改",
        "重写一个薄弱段落",
      ];
    }
    if (level >= 3 && subject === "speaking") {
      template.title = "把回答扩展到3–5句话";
      template.exercise = "用观点、原因和例子回答同一个熟悉问题。";
    }
    const weights: Record<Subject, number[]> = {
      writing: [10, 20, 25, 20, 15],
      listening: [15, 25, 10, 15, 10],
      reading: [10, 10, 15, 10, 15],
      speaking: [5, 10, 20, 10, 15],
      review: [3, 9, 3],
    };
    const total = weights[subject].reduce((a, b) => a + b, 0);
    const stepMinutes = weights[subject].map((n) =>
      Math.floor((n / total) * allocation[subject]),
    );
    stepMinutes[stepMinutes.length - 1] +=
      allocation[subject] - stepMinutes.reduce((a, b) => a + b, 0);
    return {
      ...template,
      id: `${date}-${subject}`,
      date,
      subject,
      minutes: allocation[subject],
      stepMinutes,
      seconds: 0,
      status: "todo",
      difficulty: level,
      completedSteps: [],
      reflection: previous
        ? `续学提示：上次「${previous.title}」尚未完成。先完成未掌握的步骤，今天无需补双倍任务。`
        : "",
      steps: [...template.steps],
    };
  });
}
export function simplifyTask(task: Task): Task {
  const easy: Record<Subject, string[]> = {
    writing: [
      "读懂 I study English. 的主谓宾",
      "照结构写自己的1句话",
      "遮住示范再写一次",
    ],
    speaking: [
      "先跟读 I enjoy English.",
      "说出自己的1句回答",
      "回放后再录一次",
    ],
    reading: ["只读定位句", "标出主语和动词", "对一道题给出原文证据"],
    listening: ["只听一个词组", "写出听到的单词", "再听新词组检验"],
    review: ["只选一道错题", "先回想再看答案", "写一个新例子"],
  };
  return {
    ...task,
    difficulty: Math.max(1, task.difficulty - 1),
    steps: easy[task.subject],
    stepMinutes: [
      Math.floor(task.minutes / 3),
      Math.floor(task.minutes / 3),
      task.minutes - 2 * Math.floor(task.minutes / 3),
    ],
    completedSteps: [],
    criterion: "独立完成这个缩小后的练习，并记录仍有困难的地方。",
    reflection:
      task.reflection +
      "\n已主动降低难度；原定学习时段保留，可用于讲解和复练。",
  };
}
export const writingLessons = [
  {
    name: "基础造句",
    prompt: "用一个完整英文句子说明：你为什么学习英语？",
    concept:
      "主语 + 动词 + 宾语。先说清谁做什么，再用 because 加一个完整原因。",
    example: "I study English because I want to travel.",
    steps: [
      "I study English. → 主语 I，动词 study，宾语 English。",
      "I study English every day. → 加入频率。",
      "I study English every day because I want to travel. → 加入原因。",
    ],
    min: 6,
  },
  {
    name: "句子扩展",
    prompt: "扩展 Technology is important.：说明在哪个领域重要，以及为什么。",
    concept: "每次只增加一种信息：作用、场景、原因。保留清楚的句子主干。",
    example:
      "Technology plays an important role in modern education because it gives students access to resources.",
    steps: [
      "Technology is important. → 一个基础判断。",
      "Technology plays an important role in education. → 明确作用和领域。",
      "加入 modern 和 because 从句 → 增加场景与解释。",
    ],
    min: 12,
  },
  {
    name: "段落写作",
    prompt: "写一个4–6句的段落：每天少量学习是否比周末集中学习更有帮助？",
    concept:
      "观点句 → 原因 → 具体例子 → 回扣观点。先把一个观点展开，不急着写完整作文。",
    example:
      "Daily practice helps me remember new words. For example, I can review five words each morning.",
    steps: [
      "先写一个清楚的观点。",
      "解释为什么，并给一个自己的具体例子。",
      "用一句话回扣观点，避免引入新话题。",
    ],
    min: 40,
  },
  {
    name: "Task 2 独立成文",
    prompt:
      "原创题：Some people prefer studying alone, while others prefer studying in groups. Discuss both views and give your opinion.",
    concept: "先审题并列出双方观点和自己的立场。独立成文后再请求反馈。",
    example: "提纲：独自学习的专注 → 小组讨论的帮助 → 我的选择及适用场景。",
    steps: [
      "圈出 both views 与 your opinion。",
      "为两方各列一个原因和例子。",
      "先写提纲，再完成自己的文章。",
    ],
    min: 250,
  },
  {
    name: "Task 1 / Task 2 限时",
    prompt:
      "原创 Task 1：某图书馆2020/2025年日均访客分别为120/180人，线上借阅为40/100次。描述主要特点并比较（至少150词）。",
    concept:
      "Task 1 先找总览，再比较细节；Task 2 单独分配40分钟。只有独立输出稳定后再增加时间压力。",
    example: "提纲：两项均增长；线上借阅增长比例更大；用数字支持比较。",
    steps: [
      "Task 1：20分钟，至少150词。",
      "另开Task 2训练：40分钟，至少250词。",
      "在不看范例的情况下重写一个薄弱段落。",
    ],
    min: 150,
  },
];
export function dailyWritingLesson(
  level: number,
  date: string,
  startDate: string,
) {
  const base = writingLessons[level - 1];
  if (level > 2) return base;
  const index = ((daysBetween(startDate, date) % 4) + 4) % 4;
  if (index === 0) return base;
  const prompts =
    level === 1
      ? [
          {
            prompt: "用一个完整句子说明：你平时在早上做什么？再解释一个原因。",
            example:
              "I read English articles in the morning because I feel focused.",
          },
          {
            prompt: "用一个完整句子说明：你喜欢在哪里学习？再解释一个原因。",
            example: "I study in the library because it is quiet.",
          },
          {
            prompt: "用一个完整句子说明：你喜欢什么活动？再解释一个原因。",
            example: "I enjoy walking because it helps me relax.",
          },
        ]
      : [
          {
            prompt: "扩展 Reading is useful.：说明对谁有用，以及为什么。",
            example:
              "Reading is useful for language learners because it introduces new expressions.",
          },
          {
            prompt: "扩展 Exercise is important.：增加时间、对象或原因。",
            example:
              "Regular exercise is important for students because it helps them stay healthy.",
          },
          {
            prompt: "扩展 Libraries are helpful.：增加一个具体功能和原因。",
            example:
              "Libraries provide a quiet space for students to concentrate on difficult tasks.",
          },
        ];
  return { ...base, ...prompts[index - 1] };
}
export function localFeedback(
  text: string,
  subject: "writing" | "speaking",
  level: number,
): Feedback {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const issues: string[] = [];
  if (/\bi am agree\b/i.test(text))
    issues.push("agree 本身是动词：把 I am agree 改成 I agree。");
  if (/\bpeople is\b/i.test(text))
    issues.push("people 通常作复数：使用 people are。");
  if (/\bi\b/.test(text)) issues.push("代词 I 需要大写。");
  const min =
    subject === "writing"
      ? writingLessons[level - 1].min
      : level === 1
        ? 3
        : level === 2
          ? 6
          : 20;
  if (words.length < min)
    issues.push(
      `这次先补充一个完整想法；当前练习参考长度为 ${min} 个词，无需追求复杂表达。`,
    );
  if (!/[.!?]$/.test(text.trim()) && subject === "writing")
    issues.push("检查句末标点，让句子边界更清楚。");
  const complete = words.length >= min && issues.length === 0;
  return {
    summary: complete
      ? "基础形式检查已完成，下一步独立重写并核对含义。"
      : "已经留下了可改进的初稿；我们先改最重要的地方。",
    strengths: [
      `你完成了 ${words.length} 个词的${subject === "writing" ? "书面" : "口头转写"}表达。`,
    ],
    issues: issues.slice(0, 3),
    explanation:
      "这是离线规则教学，只检查部分形式与常见搭配，不能确认所有语法、论证、语义或发音。没有检测到问题不等于完全正确。",
    example:
      subject === "writing"
        ? writingLessons[level - 1].example
        : "I enjoy learning English because I can meet new people.",
    next: "先遮住示范，用自己的想法再表达一次；如果困难，缩短到主语 + 动词 + 宾语。",
    source: "local",
    meetsCriteria: complete,
  };
}
export function writingUpgrade(state: StudyState) {
  const qualified = state.writing.filter(
    (r) =>
      r.level === state.levels.writing &&
      r.independent &&
      r.rewriteFeedback?.meetsCriteria,
  );
  return (
    qualified.length >= 3 && new Set(qualified.map((r) => r.date)).size >= 2
  );
}
export function practiceStats(
  records: PracticeRecord[],
  subject: "reading" | "listening",
) {
  const subset = records.filter((r) => r.subject === subject);
  const fresh = subset.filter(
    (r) =>
      !r.repeated && r.timed && (subject !== "listening" || r.replays === 1),
  );
  const learning = subset.filter(
    (r) =>
      r.repeated || !r.timed || (subject === "listening" && r.replays !== 1),
  );
  const rate = (rows: PracticeRecord[]) =>
    rows.length
      ? Math.round(
          (rows.reduce((s, r) => s + r.correct, 0) /
            rows.reduce((s, r) => s + r.total, 0)) *
            100,
        )
      : null;
  return {
    fresh: rate(fresh),
    learning: rate(learning),
    freshCount: fresh.length,
    learningCount: learning.length,
  };
}
