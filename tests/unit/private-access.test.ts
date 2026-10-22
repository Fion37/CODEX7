import { describe, it, expect, vi, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { privateAccessConfig, isOwner } from "../../lib/private-access";
const mocked = vi.hoisted(() => ({ getUser: vi.fn() }));
vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({ auth: { getUser: mocked.getUser } }),
}));
import { proxy } from "../../proxy";
afterEach(() => {
  vi.unstubAllEnvs();
  mocked.getUser.mockReset();
});
const configured = () => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("APP_PRIVATE_MODE", "true");
  vi.stubEnv("APP_OWNER_EMAIL", "owner@example.test");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "public-test-key");
};
describe("private owner access", () => {
  it("production defaults to private and missing settings never open the site", () => {
    expect(privateAccessConfig({ NODE_ENV: "production" })).toMatchObject({
      enabled: true,
      configured: false,
    });
  });
  it("development remains available for local learning", () =>
    expect(privateAccessConfig({ NODE_ENV: "development" }).enabled).toBe(
      false,
    ));
  it("matches only a verified owner email", () => {
    expect(
      isOwner(
        { email: "OWNER@example.test", email_confirmed_at: "2026-10-22" },
        "owner@example.test",
      ),
    ).toBe(true);
    expect(
      isOwner(
        { email: "other@example.test", email_confirmed_at: "2026-10-22" },
        "owner@example.test",
      ),
    ).toBe(false);
    expect(isOwner({ email: "owner@example.test" }, "owner@example.test")).toBe(
      false,
    );
  });
  it("missing configuration returns503", async () => {
    vi.stubEnv("APP_PRIVATE_MODE", "true");
    vi.stubEnv("APP_OWNER_EMAIL", "");
    expect(
      (await proxy(new NextRequest("https://study.example/writing"))).status,
    ).toBe(503);
  });
  it("anonymous page visitors go to login; APIs return401", async () => {
    configured();
    mocked.getUser.mockResolvedValue({ data: { user: null }, error: null });
    const response = await proxy(
      new NextRequest("https://study.example/writing"),
    );
    expect(response.headers.get("location")).toBe(
      "https://study.example/login",
    );
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(
      (await proxy(new NextRequest("https://study.example/api/coach"))).status,
    ).toBe(401);
  });
  it("signed-in non-owner cannot use API or pages", async () => {
    configured();
    mocked.getUser.mockResolvedValue({
      data: {
        user: { email: "other@example.test", email_confirmed_at: "2026-10-22" },
      },
      error: null,
    });
    expect(
      (await proxy(new NextRequest("https://study.example/api/coach"))).status,
    ).toBe(403);
    expect(
      (await proxy(new NextRequest("https://study.example/"))).headers.get(
        "location",
      ),
    ).toContain("/login");
  });
  it("verified owner can enter while responses cannot be shared-cached", async () => {
    configured();
    mocked.getUser.mockResolvedValue({
      data: {
        user: { email: "owner@example.test", email_confirmed_at: "2026-10-22" },
      },
      error: null,
    });
    const response = await proxy(
      new NextRequest("https://study.example/writing"),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("private");
    expect(response.headers.get("x-robots-tag")).toContain("noindex");
  });
  it("identity service failure keeps the site closed", async () => {
    configured();
    mocked.getUser.mockRejectedValue(new Error("offline"));
    expect(
      (await proxy(new NextRequest("https://study.example/writing"))).status,
    ).toBe(503);
  });
});
