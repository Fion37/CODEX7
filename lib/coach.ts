import { Feedback, localFeedback } from "./model";
import type { SpeakingContext, ListeningQuestion } from "./resource-model";
export async function getFeedback(
  text: string,
  subject: "writing" | "speaking",
  level: number,
  prompt: string,
  examContext?: SpeakingContext,
): Promise<{ feedback: Feedback; notice: string }> {
  try {
    const response = await fetch("/api/coach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, subject, level, prompt, examContext }),
      signal: AbortSignal.timeout(35000),
    });
    if (response.ok) {
      const data = await response.json();
      return { feedback: { ...data.feedback, source: "ai" }, notice: "" };
    }
    const data = await response.json().catch(() => ({}));
    return {
      feedback: localFeedback(text, subject, level),
      notice: data.message || "AI暂时不可用，已使用离线规则教学。",
    };
  } catch {
    return {
      feedback: localFeedback(text, subject, level),
      notice: "AI连接超时或离线，初稿仍已保留；以下是离线规则教学。",
    };
  }
}
export async function getListeningFeedback(
  part: number,
  question: ListeningQuestion,
  answer: string,
): Promise<{ feedback: Feedback; notice: string }> {
  const fallback: Feedback = {
    summary: "先定位，再核对改写与答案格式。",
    strengths: ["你保留了自己的真实答案，便于比较与复练。"],
    issues: [
      question.type === "map"
        ? "把方向与地图中的位置一一对应。"
        : "确认最后被说话人确认的信息，留意更正和干扰项。",
      `本题最多${question.wordLimit}个词或数字。`,
    ],
    explanation: `考点：${question.paraphrase} 定位句：${question.evidence} 具体错因需要结合你听到的内容确认。`,
    example: question.evidence,
    next: "用一个不同数字、地点或人物的相似句再试一次；不只背这道原题的答案。",
    source: "local",
    meetsCriteria: question.answers.some(
      (a) => a.toLowerCase() === answer.trim().toLowerCase(),
    ),
  };
  try {
    const response = await fetch("/api/coach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject: "listening",
        level: 1,
        text: answer || "（未作答）",
        prompt: question.prompt,
        listeningContext: { part, question },
      }),
      signal: AbortSignal.timeout(35000),
    });
    if (response.ok) {
      const data = await response.json();
      return { feedback: { ...data.feedback, source: "ai" }, notice: "" };
    }
    const error = await response.json().catch(() => ({}));
    return {
      feedback: fallback,
      notice: error.message || "已使用离线定位与改写讲解。",
    };
  } catch {
    return {
      feedback: fallback,
      notice: "AI暂不可用，下面是离线定位与改写讲解。",
    };
  }
}
