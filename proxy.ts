import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isOwner, privateAccessConfig } from "@/lib/private-access";
const lock = (response: NextResponse) => {
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  return response;
};
export async function proxy(request: NextRequest) {
  const config = privateAccessConfig(process.env);
  if (!config.enabled) return NextResponse.next();
  if (!config.configured) {
    return lock(
      NextResponse.json(
        {
          message:
            "私人网站尚未完成配置，访问已关闭。请由所有者配置Supabase和APP_OWNER_EMAIL。",
        },
        { status: 503 },
      ),
    );
  }
  let response = NextResponse.next({ request });
  const client = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (values) => {
          for (const c of values) request.cookies.set(c.name, c.value);
          response = NextResponse.next({ request });
          for (const c of values)
            response.cookies.set(c.name, c.value, c.options);
        },
      },
    },
  );
  let allowed = false,
    authenticated = false;
  try {
    const {
      data: { user },
      error,
    } = await client.auth.getUser();
    if (!error) {
      authenticated = Boolean(user);
      allowed = isOwner(user, config.owner);
    }
  } catch {
    return lock(
      NextResponse.json(
        { message: "暂时无法验证身份，私人网站保持关闭，请稍后重试。" },
        { status: 503 },
      ),
    );
  }
  if (request.nextUrl.pathname === "/login") {
    if (allowed) {
      const next = NextResponse.redirect(new URL("/", request.url));
      for (const cookie of response.cookies.getAll()) next.cookies.set(cookie);
      return lock(next);
    }
    return lock(response);
  }
  if (!allowed) {
    if (request.nextUrl.pathname.startsWith("/api/"))
      return lock(
        NextResponse.json(
          {
            message: authenticated
              ? "此账号不是网站所有者。"
              : "请先登录网站所有者账号。",
          },
          { status: authenticated ? 403 : 401 },
        ),
      );
    const next = NextResponse.redirect(new URL("/login", request.url));
    for (const cookie of response.cookies.getAll()) next.cookies.set(cookie);
    return lock(next);
  }
  return lock(response);
}
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|ocr/|audio/).*)"],
};
