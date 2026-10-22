"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  PenLine,
  AudioLines,
  Headphones,
  ListTodo,
  CalendarDays,
  ChartNoAxesCombined,
  Database,
  Settings2,
  ArrowUpRight,
  PanelLeftClose,
  X,
  Sprout,
  Bell,
  ChevronRight,
  Pause,
  NotebookPen,
  LibraryBig,
  Languages,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { useStudy } from "./store";
import { Badge, clock } from "./ui";
import { localDate } from "@/lib/model";
export const navigation = [
  { href: "/", label: "我的学习概览", icon: LayoutDashboard },
  { href: "/today", label: "今日学习计划", icon: ListTodo },
  { href: "/writing", label: "AI 写作教师", icon: PenLine },
  { href: "/speaking", label: "AI 口语教师", icon: AudioLines },
  { href: "/reading", label: "AI 阅读教师", icon: BookOpen },
  { href: "/listening", label: "AI 听力教师", icon: Headphones },
  { href: "/data", label: "爱听写数据中心", icon: Database },
  { href: "/resources", label: "我的学习资源", icon: LibraryBig },
  { href: "/vocabulary", label: "场景词与改写", icon: Languages },
  { href: "/review", label: "错题与词汇复习", icon: NotebookPen },
  { href: "/calendar", label: "70天学习路径", icon: CalendarDays },
  { href: "/report", label: "每周学习报告", icon: ChartNoAxesCombined },
];
export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { state, ready, running, pause, storageError } = useStudy();
  const tasks = Object.values(state.days).flat();
  const active = tasks.find((t) => t.id === running);
  const current = navigation.find((n) => n.href === pathname);
  if (pathname === "/login") return <>{children}</>;
  return (
    <div className="app-shell">
      <aside className={`sidebar ${open ? "mobile-open" : ""}`}>
        <Link href="/" className="brand" onClick={() => setOpen(false)}>
          <span className="brand-icon">
            <BookOpen size={22} />
          </span>
          <span>
            IELTS<span className="brand-light"> Study OS</span>
            <small>学会英语，也学会学习</small>
          </span>
        </Link>
        <button
          className="mobile-close icon-button"
          onClick={() => setOpen(false)}
          aria-label="关闭导航"
        >
          <X />
        </button>
        <div className="workspace-switch">
          <span className="avatar small">我</span>
          <div>
            <strong>我的备考空间</strong>
            <small>Academic · 目标 {state.profile.target.toFixed(1)}</small>
          </div>
          <ChevronRight size={15} />
        </div>
        <div className="nav-label">学习工作台</div>
        <nav>
          {navigation.map((n, i) => (
            <div key={n.href}>
              {i === 2 && <div className="nav-label">我的 AI 私人教师</div>}
              {i === 6 && <div className="nav-label">记录与成长</div>}
              <Link
                className={`nav-item ${pathname === n.href ? "active" : ""}`}
                href={n.href}
                onClick={() => setOpen(false)}
              >
                <n.icon size={18} />
                <span>{n.label}</span>
                {n.href === "/today" && <span className="nav-count">5</span>}
              </Link>
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="small-motto">
            <Sprout size={22} />
            <strong>每一个小进步，都算数。</strong>
            <p>不急着变得完美，先把今天的一步走好。</p>
            <Link href="/calendar">
              看看我的成长路径 <ArrowUpRight size={14} />
            </Link>
          </div>
          <Link
            href="/settings"
            className={`nav-item ${pathname === "/settings" ? "active" : ""}`}
          >
            <Settings2 size={18} />
            设置与数据管理
          </Link>
          <div className="profile-row">
            <span className="avatar">我</span>
            <div>
              <strong>{state.profile.name}</strong>
              <small>专注自己的节奏</small>
            </div>
            <span className="online-dot" />
          </div>
        </div>
      </aside>
      {open && <div className="nav-backdrop" onClick={() => setOpen(false)} />}
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button menu-toggle"
              onClick={() => setOpen(true)}
              aria-label="打开导航"
            >
              <PanelLeftClose size={20} />
            </button>
            <span>我的空间</span>
            <ChevronRight size={13} />
            <strong>{current?.label || "设置与数据管理"}</strong>
          </div>
          <div className="row top-actions">
            <span className="top-date">
              {localDate().replaceAll("-", ".")} ·{" "}
              {new Intl.DateTimeFormat("zh-CN", {
                weekday: "long",
                timeZone: "Asia/Shanghai",
              }).format(new Date())}
            </span>
            <Badge tone="gray">本地优先 · {ready ? "已载入" : "载入中"}</Badge>
            <Link
              href="/review"
              className="icon-button notification"
              aria-label="查看到期复习"
            >
              <Bell size={19} />
              {state.errors.some((e) => e.nextReview <= localDate()) && <i />}
            </Link>
            <Link href="/settings" className="avatar small" aria-label="设置">
              我
            </Link>
          </div>
        </header>
        <main>
          {storageError && (
            <div className="error-banner" role="alert">
              {storageError}
            </div>
          )}
          {ready ? (
            children
          ) : (
            <div className="loading">正在打开你的学习空间…</div>
          )}
        </main>
        <footer>
          IELTS Study OS <span>认真学习的每一天，都在靠近。</span>
          <Link href="/settings">隐私与数据</Link>
        </footer>
      </div>
      {active && (
        <div className="floating-timer">
          <span className="pulse" />
          <div>
            <strong>{active.title}</strong>
            <small>切到后台会自动暂停 · 净学习时间</small>
          </div>
          <b>{clock(active.seconds)}</b>
          <button className="icon-button" aria-label="暂停计时" onClick={pause}>
            <Pause size={19} />
          </button>
        </div>
      )}
    </div>
  );
}
