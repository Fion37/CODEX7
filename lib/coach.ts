import { Feedback, localFeedback } from "./model";
export async function getFeedback(
  text: string,
  subject: "writing" | "speaking",
  level: number,
  prompt: string,
): Promise<{ feedback: Feedback; notice: string }> {
  try {
    const response = await fetch("/api/coach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, subject, level, prompt }),
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
