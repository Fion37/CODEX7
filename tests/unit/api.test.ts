import { afterEach, describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "../../app/api/coach/route";
const request = (body: unknown, origin = "http://localhost:3000") =>
  new NextRequest("http://localhost:3000/api/coach", {
    method: "POST",
    headers: { "Content-Type": "application/json", origin },
    body: JSON.stringify(body),
  });
const payload = {
  subject: "writing",
  level: 1,
  text: "I study English because I want to travel.",
  prompt: "Why study English?",
};
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
describe("server-only AI adapter", () => {
  it("拒绝跨站请求", async () => {
    const response = await POST(request(payload, "https://other.example"));
    expect(response.status).toBe(403);
  });
  it("没有API配置时明确返回离线降级说明", async () => {
    vi.stubEnv("AI_API_KEY", "");
    const response = await POST(request(payload));
    expect(response.status).toBe(503);
    expect((await response.json()).message).toContain("离线");
  });
  it("生产环境没有认证配置时不调用收费服务", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AI_API_KEY", "test-only-not-a-secret");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const response = await POST(request(payload));
    expect(response.status).toBe(503);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("检查输入，拒绝越界等级", async () => {
    vi.stubEnv("AI_API_KEY", "test-only-not-a-secret");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    expect((await POST(request({ ...payload, level: 99 }))).status).toBe(400);
  });
  it("校验模型JSON并保留教学反馈，不泄露密钥", async () => {
    vi.stubEnv("AI_API_KEY", "test-only-not-a-secret");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    const feedback = {
      summary: "完整表达了学习原因。",
      strengths: ["表达清楚"],
      issues: [],
      explanation: "先保留主谓宾。",
      example: "I learn English to travel.",
      next: "遮住示范再写一句。",
      meetsCriteria: true,
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          choices: [{ message: { content: JSON.stringify(feedback) } }],
        }),
      ),
    );
    const response = await POST(request(payload));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.feedback).toEqual(feedback);
    expect(JSON.stringify(body)).not.toContain("test-only-not-a-secret");
  });
  it("模型格式不合法时不展示伪反馈", async () => {
    vi.stubEnv("AI_API_KEY", "test-only-not-a-secret");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          choices: [{ message: { content: "not valid JSON" } }],
        }),
      ),
    );
    expect((await POST(request(payload))).status).toBe(503);
  });
});
