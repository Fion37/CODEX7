import type { SpeakingContext } from "./resource-model";
import type { Feedback } from "./model";
// Each pair answers the corresponding question, rather than reusing a topic-wide script.
// Part 2 examples are openings, not complete two-minute answers to memorise.
const openings: Record<
  string,
  Record<SpeakingContext["part"], [string, string][]>
> = {
  study: {
    1: [
      [
        "At the moment, I am preparing for my IELTS test.",
        "I study English every day because I want to communicate more confidently.",
      ],
      [
        "I enjoy learning useful expressions.",
        "For example, I like finding a new way to explain my ideas.",
      ],
      [
        "I would like to spend more time speaking.",
        "I need more chances to use the words I already know.",
      ],
    ],
    2: [
      [
        "I would like to learn to speak English more confidently.",
        "I would practise with a partner because I need experience using it in real conversations.",
      ],
    ],
    3: [
      [
        "People need to keep learning because their work and lives change.",
        "For example, a new job may require skills they did not learn at school.",
      ],
      [
        "Both are useful, but practical experience helps people apply what they know.",
        "Books can explain a method before someone tries it.",
      ],
      [
        "Technology may make lessons more flexible.",
        "For example, people could practise at home and ask for feedback straight away.",
      ],
    ],
  },
  home: {
    1: [
      [
        "My hometown is a small city in China.",
        "It is a quiet place with several parks.",
      ],
      [
        "I like my neighbourhood because it is convenient.",
        "For example, I can walk to the shops in ten minutes.",
      ],
      [
        "I would like to live there in the future.",
        "Being close to my family is important to me.",
      ],
    ],
    2: [
      [
        "I would like to live in a quiet flat near a park.",
        "It would be close to public transport, so getting to work would be easy.",
      ],
    ],
    3: [
      [
        "Many people move to cities to find better jobs.",
        "Cities may offer more opportunities, although living costs can be higher.",
      ],
      [
        "A good neighbourhood should be safe and convenient.",
        "For example, residents need access to shops and public transport.",
      ],
      [
        "Cities could build more affordable housing.",
        "They could also improve transport so people have more areas to choose from.",
      ],
    ],
  },
  routine: {
    1: [
      [
        "I usually study English in the morning.",
        "I start with a small writing task while I feel focused.",
      ],
      [
        "I prefer mornings because I can concentrate better.",
        "I often feel tired in the evening.",
      ],
      [
        "I would like to take more short breaks.",
        "They could help me stay focused during a long study day.",
      ],
    ],
    2: [
      [
        "I remember a day when I had several study tasks to finish.",
        "I made a short list and started with the most important task.",
      ],
    ],
    3: [
      [
        "Some people find it hard to decide which tasks matter most.",
        "They may spend too long on small jobs and have little time left for urgent work.",
      ],
      [
        "I think schools should teach basic time-management skills.",
        "Learning to plan homework could help students become more independent.",
      ],
      [
        "Some people may be busier because work can follow them home.",
        "For example, messages can make it difficult to switch off in the evening.",
      ],
    ],
  },
  travel: {
    1: [
      [
        "I enjoy short trips to nearby places.",
        "For example, I sometimes visit a museum at the weekend.",
      ],
      [
        "I usually take the bus.",
        "It is affordable and the stop is near my home.",
      ],
      [
        "I would like to visit a city by the sea.",
        "I enjoy walking outdoors and trying local food.",
      ],
    ],
    2: [
      [
        "I remember a short train journey I took with my family.",
        "We visited a nearby city and spent the day exploring its old streets.",
      ],
    ],
    3: [
      [
        "Faster transport has made distant places easier to reach.",
        "However, more travel can also put pressure on the environment.",
      ],
      [
        "Tourism can create jobs for local people.",
        "However, too many visitors may damage popular places or increase living costs.",
      ],
      [
        "Governments should make public transport a practical choice.",
        "Reliable services could encourage people to leave their cars at home.",
      ],
    ],
  },
  technology: {
    1: [
      [
        "I use my phone every day.",
        "I often use it to listen to English and review new words.",
      ],
      [
        "I usually learn to use new technology by trying it.",
        "Simple instructions help me when I get stuck.",
      ],
      [
        "I prefer reading on paper when I need to concentrate.",
        "It is easier for me to take notes without distractions.",
      ],
    ],
    2: [
      [
        "My phone is a piece of technology I find useful.",
        "I use it to listen to English when I have a few spare minutes.",
      ],
    ],
    3: [
      [
        "People can become dependent on technology if they stop practising basic skills.",
        "For example, always using navigation may make it harder to remember a route.",
      ],
      [
        "Schools should use technology when it supports a clear learning goal.",
        "A short video may explain an idea, but students still need time to discuss it.",
      ],
      [
        "Some people have had fewer chances to practise digital skills.",
        "Clear instructions and patient support could help them become more confident.",
      ],
    ],
  },
  health: {
    1: [
      [
        "I walk regularly to stay healthy.",
        "It also helps me relax after studying.",
      ],
      [
        "I enjoyed simple ball games when I was a child.",
        "I liked playing with my friends after school.",
      ],
      [
        "I prefer exercising with another person.",
        "Having someone to talk to makes it more enjoyable.",
      ],
    ],
    2: [
      [
        "Walking is a healthy activity I enjoy.",
        "I usually walk near my home after studying because it helps me clear my mind.",
      ],
    ],
    3: [
      [
        "Healthy habits can be difficult to maintain when people are busy.",
        "For example, someone working long hours may have little time to cook.",
      ],
      [
        "Both individuals and governments have a role in promoting health.",
        "People make daily choices, while governments can provide reliable information and accessible services.",
      ],
      [
        "Cities could create safer places to walk and cycle.",
        "Convenient parks may also encourage residents to spend more time outdoors.",
      ],
    ],
  },
};
export function speakingModel(
  topicId: string,
  part: SpeakingContext["part"],
  index: number,
  level: number,
) {
  const examples = openings[topicId]?.[part] || openings.study[part];
  const pair = examples[index % examples.length];
  return level <= 2 ? pair[0] : pair.join(" ");
}
export const speakingTopics = [
  {
    id: "study",
    title: "学习与工作",
    part1: [
      "Do you work or are you a student?",
      "What do you enjoy about your studies?",
      "Is there anything you would like to change about the way you study?",
    ],
    cue: "Describe a useful skill you would like to learn.",
    bullets: [
      "what the skill is",
      "why you want to learn it",
      "how you would learn it",
      "and explain how it could help you in the future",
    ],
    part3: [
      "Why do people need to keep learning throughout their lives?",
      "Is practical experience more valuable than studying from books?",
      "How might technology change education in the future?",
    ],
    basic: "At the moment, I am preparing for my IELTS test.",
    extended:
      "I study English every day because I want to communicate more confidently. For example, I practise answering one simple question each morning.",
  },
  {
    id: "home",
    title: "家乡与居住",
    part1: [
      "Where is your hometown?",
      "What do you like about the area where you live?",
      "Would you like to live there in the future?",
    ],
    cue: "Describe a place where you would like to live.",
    bullets: [
      "where it is",
      "what the place is like",
      "who you would live with",
      "and explain why you would like to live there",
    ],
    part3: [
      "Why do people move from the countryside to cities?",
      "What makes a neighbourhood a good place to live?",
      "How can cities provide more affordable accommodation?",
    ],
    basic: "I live in a quiet area near the city centre.",
    extended:
      "I like my neighbourhood because it is convenient. For example, I can walk to the shops in ten minutes.",
  },
  {
    id: "routine",
    title: "日常安排",
    part1: [
      "What do you usually do in the morning?",
      "Do you prefer mornings or evenings?",
      "Would you like to change your daily routine?",
    ],
    cue: "Describe a day when you were particularly busy.",
    bullets: [
      "when it was",
      "what you had to do",
      "how you organised your time",
      "and explain how you felt at the end of the day",
    ],
    part3: [
      "Why do some people find it difficult to manage their time?",
      "Should schools teach time-management skills?",
      "Do you think people are busier now than in the past?",
    ],
    basic: "I usually study in the morning because I feel focused.",
    extended:
      "I start with a small writing task. After that, I take a short break and practise listening.",
  },
  {
    id: "travel",
    title: "旅行与交通",
    part1: [
      "Do you enjoy travelling?",
      "What kind of transport do you usually use?",
      "Is there a place you would like to visit?",
    ],
    cue: "Describe a journey that you remember well.",
    bullets: [
      "where you went",
      "how you travelled",
      "who you went with",
      "and explain why the journey was memorable",
    ],
    part3: [
      "How has transport changed the way people travel?",
      "What are the benefits and problems of tourism?",
      "Should governments encourage people to use public transport?",
    ],
    basic: "I usually take the bus because it is affordable.",
    extended:
      "I enjoy short trips to nearby places. For example, I sometimes visit a museum at the weekend.",
  },
  {
    id: "technology",
    title: "科技与工具",
    part1: [
      "What technology do you use every day?",
      "Do you find it easy to learn to use new technology?",
      "Do you prefer reading on a screen or on paper?",
    ],
    cue: "Describe a piece of technology that you find useful.",
    bullets: [
      "what it is",
      "when you started using it",
      "what you use it for",
      "and explain why it is useful to you",
    ],
    part3: [
      "Can technology make people too dependent on machines?",
      "How should schools use technology in lessons?",
      "Why do some people find it hard to learn new digital skills?",
    ],
    basic: "I use my phone to listen to English every day.",
    extended:
      "It is useful because I can practise anywhere. For example, I review a few words while I am waiting for the bus.",
  },
  {
    id: "health",
    title: "运动与健康",
    part1: [
      "What do you do to stay healthy?",
      "Did you enjoy sport when you were a child?",
      "Do you prefer exercising alone or with other people?",
    ],
    cue: "Describe a healthy activity that you enjoy.",
    bullets: [
      "what the activity is",
      "when and where you do it",
      "who you do it with",
      "and explain why you enjoy it",
    ],
    part3: [
      "Why do some people find it difficult to maintain healthy habits?",
      "Who should be responsible for promoting public health?",
      "How can cities encourage people to be more active?",
    ],
    basic: "I enjoy walking because it helps me relax.",
    extended:
      "I usually walk near my home after studying. It gives me a chance to take a break and clear my mind.",
  },
];
export const speakingCriteria: Record<SpeakingContext["part"], string> = {
  1: "直接回答熟悉问题，再用一个原因或具体细节扩展；不背长篇答案。",
  2: "围绕提示卡组织经历或描述，利用1分钟写关键词，逐步练到连续表达1–2分钟。",
  3: "对较抽象的问题给观点、解释原因、举例或比较，避免只回答个人喜好。",
};
export function speakingFeedbackContext(
  feedback: Feedback,
  context: SpeakingContext,
  text: string,
): Feedback {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const next =
    context.mode === "guided" && words < 12
      ? "先用一句话回答当前问题，再加because引出一个自己的原因。"
      : context.part === "3"
        ? "再给一个具体例子，并说明是否存在不同情况。"
        : context.part === "2"
          ? "按提示卡关键词再讲一次；先保持叙述清楚，再逐步延长时间。"
          : "再加一个与问题直接相关的具体细节，不必机械使用高级连接词。";
  return {
    ...feedback,
    explanation: `Part ${context.part}训练目标：${speakingCriteria[context.part]} ${feedback.explanation} 雅思口语考查流利与连贯、词汇、语法和发音；当前仅能核对转写文本，发音与声学流利度尚未评估。`,
    next: feedback.source === "ai" ? feedback.next : next,
  };
}
