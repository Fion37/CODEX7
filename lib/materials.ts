export const readingItems = [
  {
    id: "r-free",
    title: "一个安静的学习空间",
    passage:
      "The Elm Library opened a quiet study room in March. Students can use the room free of charge. On weekdays, it closes at 8 p.m. The library has not published its weekend opening times.",
    sentence: "Students can use the room free of charge.",
    question: "Students do not need to pay to use the study room.",
    answer: "TRUE",
    skill: "识别同义替换",
    explanation:
      "do not need to pay 与 free of charge 意思相同。原文明确支持题目，所以是 TRUE。",
    structure:
      "Students（主语）+ can use（谓语）+ the room（宾语）+ free of charge（方式）。",
    transfer: {
      passage:
        "A community centre offers free language workshops to local residents.",
      question: "Local residents must pay to attend the language workshops.",
      answer: "FALSE",
      explanation:
        "free 与 must pay 直接矛盾。不是信息缺失，而是原文明确否定题目。",
    },
  },
  {
    id: "r-time",
    title: "时间信息如何定位",
    passage:
      "The Elm Library opened a quiet study room in March. Students can use the room free of charge. On weekdays, it closes at 8 p.m. The library has not published its weekend opening times.",
    sentence: "On weekdays, it closes at 8 p.m.",
    question: "The study room closes at 9 p.m. on weekdays.",
    answer: "FALSE",
    skill: "精确定位与矛盾判断",
    explanation:
      "题目和原文都谈工作日关闭时间，9 p.m. 与 8 p.m. 矛盾，所以是 FALSE。",
    structure:
      "On weekdays（时间）+ it（主语）+ closes（谓语）+ at 8 p.m.（时间）。",
    transfer: {
      passage: "The Lakeside Museum opens at ten in the morning on Saturdays.",
      question: "The museum opens at nine on Saturdays.",
      answer: "FALSE",
      explanation: "同一个日期条件下，ten 与 nine 矛盾。",
    },
  },
  {
    id: "r-ng",
    title: "没有提及，不等于错误",
    passage:
      "The Elm Library opened a quiet study room in March. Students can use the room free of charge. On weekdays, it closes at 8 p.m. The library has not published its weekend opening times.",
    sentence: "The library has not published its weekend opening times.",
    question: "The study room opens at 9 a.m. on Sundays.",
    answer: "NOT GIVEN",
    skill: "区分 FALSE 与 NOT GIVEN",
    explanation:
      "原文只说明周末时间未公布，没有提供周日9点开门或否定这个时间的证据，所以是 NOT GIVEN。不能凭常识猜。",
    structure:
      "The library（主语）+ has not published（谓语）+ its weekend opening times（宾语）。",
    transfer: {
      passage:
        "A new café serves tea and coffee. It is popular with local students.",
      question: "The café sells fresh sandwiches every morning.",
      answer: "NOT GIVEN",
      explanation: "原文提到饮品和客人，但没有提到三明治。没有足够信息判断。",
    },
  },
];
export const listeningItems = [
  {
    id: "l-time",
    part: "Section 1 · 时间听辨",
    audio: "The class starts at nine thirty in the morning.",
    question: "What time does the class start?",
    answers: ["nine thirty", "9:30", "9.30", "09:30", "9 30"],
    explanation:
      "starts at 连接紧密，nine thirty 的重音帮助定位时间。若听到了却写错，记录拼写；若完全没捕捉到，记录听辨或定位。",
    transfer: {
      audio: "The meeting begins at ten fifteen.",
      question: "What time does the meeting begin?",
      answers: ["ten fifteen", "10:15", "10.15", "10 15"],
    },
  },
  {
    id: "l-price",
    part: "Section 1 · 数字与拼写",
    audio: "A student ticket costs fifteen pounds.",
    question: "How many pounds does a student ticket cost?",
    answers: ["15", "fifteen", "15 pounds", "fifteen pounds"],
    explanation:
      "fifteen 的重音通常在后音节；注意不要与 fifty 混淆。costs 提示接下来是价格信息。",
    transfer: {
      audio: "An adult ticket costs fifty pounds.",
      question: "How many pounds does an adult ticket cost?",
      answers: ["50", "fifty", "50 pounds", "fifty pounds"],
    },
  },
  {
    id: "l-place",
    part: "Section 2 · 场所定位",
    audio: "Please leave your bags in the library before the tour.",
    question: "Where should visitors leave their bags?",
    answers: ["library", "the library"],
    explanation:
      "leave your bags 是定位线索，in the library 给出地点。your 在自然语流中可能弱读。",
    transfer: {
      audio: "Please put your coats in the office before the lesson.",
      question: "Where should students put their coats?",
      answers: ["office", "the office"],
    },
  },
  {
    id: "l-phrase",
    part: "Section 3–4 · 同义替换起步",
    audio:
      "Students need to review their notes every day to remember new information.",
    question: "What should students review every day?",
    answers: ["notes", "their notes"],
    explanation:
      "问题用 What should ...，原句用 Students need to ...。need to 和 should 在这个语境中都提示建议/需要做的动作。",
    transfer: {
      audio:
        "Learners should check their spelling before submitting their work.",
      question: "What do learners need to check?",
      answers: ["spelling", "their spelling"],
    },
  },
];
export function normalizeAnswer(text: string) {
  return text
    .toLowerCase()
    .replace(/[.!?,]$/, "")
    .replace(/\s+/g, " ")
    .trim();
}
