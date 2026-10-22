"use client";
import { useState } from "react";
import { LockKeyhole, BookOpen } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const login = async () => {
    const client = getSupabase();
    if (!client) {
      setMessage("网站的登录服务尚未配置。");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const { error } = await client.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setMessage("登录未成功，请检查邮箱和密码。");
        return;
      }
      const response = await fetch("/", { cache: "no-store" });
      if (new URL(response.url).pathname === "/login" || !response.ok) {
        await client.auth.signOut();
        setMessage("此账号无法访问。仅已验证邮箱的网站所有者可以进入。");
        return;
      }
      window.location.assign("/");
    } catch {
      setMessage("暂时无法连接登录服务，请稍后重试。");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="private-login">
      <section className="private-login-card">
        <div className="row">
          <span className="brand-icon">
            <BookOpen size={22} />
          </span>
          <strong>IELTS Study OS</strong>
        </div>
        <div className="private-lock">
          <LockKeyhole size={27} />
        </div>
        <span className="eyebrow">YOUR PRIVATE STUDY SPACE</span>
        <h1>只属于你的学习空间</h1>
        <p>使用网站所有者账号登录后，继续今天的学习。</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void login();
          }}
        >
          <label className="field">
            邮箱
            <input
              type="email"
              value={email}
              required
              autoComplete="username"
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="field">
            密码
            <input
              type="password"
              value={password}
              required
              autoComplete="current-password"
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <button className="button primary full" disabled={busy} type="submit">
            {busy ? "正在验证身份…" : "登录我的学习空间"}
          </button>
        </form>
        {message && (
          <p className="private-message" role="alert">
            {message}
          </p>
        )}
        <p className="tiny">
          此网站不开放注册。网址本身不是通行证，其他账号无法进入。
        </p>
      </section>
    </div>
  );
}
