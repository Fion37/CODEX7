"use client";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Clock3,
  Flag,
  Flame,
  PenLine,
  Headphones,
  BookOpen,
  AudioLines,
  NotebookPen,
  Sprout,
  Check,
  Circle,
  ChevronRight,
  CalendarDays,
  Sparkles,
  Target,
} from "lucide-react";
import { useStudy } from "./store";
import { Badge, Panel, Empty } from "./ui";
import {
  addDays,
  daysBetween,
  localDate,
  modes,
  phaseFor,
  phaseName,
  subjects,
  type Subject,
} from "@/lib/model";
export const subjectIcons = {
  writing: PenLine,
  listening: Headphones,
  reading: BookOpen,
  speaking: AudioLines,
  review: NotebookPen,
};
export function JourneyArt() {
  return (
    <div className="journey-art" aria-hidden="true">
      <div className="art-orbit orbit-one" />
      <div className="art-orbit orbit-two" />
      <span className="art-star star-one">✦</span>
      <span className="art-star star-two">✧</span>
      <div className="art-note">
        <span className="art-note-icon">
          <Check size={14} />
        </span>{" "}
        每天进步一点点
      </div>
      <div className="art-plant">
        <i />
        <i />
        <i />
        <span />
      </div>
      <div className="book-shadow" />
      <div className="art-book">
        <div className="book-left">
          <span />
          <span />
          <span />
          <span />
          <span />
          <i />
        </div>
        <div className="book-right">
          <b>
            YOUR NEXT
            <br />
            CHAPTER.
          </b>
          <span />
          <span />
          <span />
          <i>
            <Sprout size={26} />
          </i>
        </div>
      </div>
      <div className="art-pill">
        <span className="online-dot" /> A LITTLE, EVERY DAY.
      </div>
    </div>
  );
}
export function Dashboard() {
  const { state } = useStudy();
  const today = localDate();
  const tasks = state.days[today] || [];
  const seconds = tasks.reduce((a, t) => a + t.seconds, 0);
  const done = tasks.filter((t) => t.status === "done").length;
  const remaining = Math.max(0, daysBetween(today, state.profile.examDate));
  const day = daysBetween(state.profile.startDate, today) + 1;
  const next = tasks.find((t) => t.status !== "done");
  const week = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
  const counts = state.errors.reduce<Record<string, number>>(
    (a, e) => ({ ...a, [e.category]: (a[e.category] || 0) + 1 }),
    {},
  );
  const weakness = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  const dailyTotals = week.map(
    (d) => (state.days[d] || []).reduce((s, t) => s + t.seconds, 0) / 60,
  );
  const previousRecords =
    state.writing.filter((r) => r.date >= week[0]).length +
    state.speaking.filter((r) => r.date >= week[0]).length;
  return (
    <>
      <div className="dashboard-heading">
        <div>
          <div className="eyebrow">
            <span className="live-dot" /> YOUR PERSONAL LEARNING SPACE
          </div>
          <h1>
            今天，向目标再近一步<span className="mint-dot">。</span>
          </h1>
          <p>不需要一下子做到完美。我们从你现在能完成的一步开始。</p>
        </div>
        <Link href="/calendar" className="date-chip">
          <CalendarDays size={16} />
          {state.profile.examDate.replaceAll("-", ".")} 考试
          <ChevronRight size={14} />
        </Link>
      </div>
      <section className="hero">
        <div className="hero-content">
          <Badge>
            <span className="live-dot" /> {modes[state.profile.mode]}模式
          </Badge>
          <h2>
            你的 {state.profile.target.toFixed(1)} 之路，
            <br />
            从今天的一个小进步开始。
          </h2>
          <p>
            先学会造句，再写好段落；先说出一句，再表达想法。
            <br className="desktop" />
            你的 AI 教师，会陪你把每一步练扎实。
          </p>
          <div className="row">
            <Link href="/today" className="button dark">
              开始今天的学习 <ArrowRight size={17} />
            </Link>
            <Link className="text-link" href="/calendar">
              查看我的学习路径 <ArrowUpRight size={15} />
            </Link>
          </div>
          <div className="hero-foot">
            <span>
              <span className="online-dot" /> 按能力进阶
            </span>
            <span>小任务 · 完整教学闭环</span>
          </div>
        </div>
        <JourneyArt />
      </section>
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">
            距离考试
            <Flag size={17} />
          </div>
          <div className="stat-number">
            {remaining}
            <small>天</small>
            <span className="stat-tag">
              目标 {state.profile.target.toFixed(1)}
            </span>
          </div>
          <p>
            IELTS Academic ·{" "}
            {state.profile.examDate.slice(5).replace("-", "月")}日
          </p>
        </div>
        <div className="stat-card">
          <div className="stat-label">
            今日有效学习
            <Clock3 size={17} />
          </div>
          <div className="stat-number">
            {Math.floor(seconds / 60)}
            <small>/ 300 分钟</small>
          </div>
          <div className="progress-track">
            <i
              style={{ width: `${Math.min((seconds / 18000) * 100, 100)}%` }}
            />
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">
            今天的小目标
            <Target size={17} />
          </div>
          <div className="stat-number">
            {done}
            <small>/ {tasks.length} 项完成</small>
          </div>
          <p>
            {done === tasks.length && tasks.length
              ? "今天的努力已经留下痕迹。"
              : "每完成一小步，都值得认真记录。"}
          </p>
        </div>
        <div className="stat-card">
          <div className="stat-label">
            当前学习阶段
            <Sprout size={18} />
          </div>
          <div className="stage-number">
            {phaseName(phaseFor(Math.max(1, day)))}
          </div>
          <p>
            <span className="mini-dot" /> 写作 L{state.levels.writing} · 口语 L
            {state.levels.speaking} · 其余待诊断
          </p>
        </div>
      </div>
      <div className="dashboard-columns">
        <div className="dashboard-main">
          <Panel
            title="今天的学习，从这里开始"
            subtitle="300 分钟净学习 · 五个可以踏实完成的时段"
            action={
              <Link className="text-link" href="/today">
                完整计划 <ArrowRight size={15} />
              </Link>
            }
          >
            <div className="task-list">
              {tasks.map((t, i) => {
                const Icon = subjectIcons[t.subject];
                return (
                  <Link
                    href={`/today?task=${t.id}`}
                    className={`task-row ${t.status === "done" ? "completed" : ""}`}
                    key={t.id}
                  >
                    <span className={`subject-icon ${t.subject}`}>
                      <Icon size={21} />
                    </span>
                    <div className="task-row-text">
                      <div className="row">
                        <span className="task-subject">
                          {subjects[t.subject]}
                        </span>
                        {i === 0 && t.status !== "done" && (
                          <Badge tone="blue">建议先学</Badge>
                        )}
                        {t.status === "done" && <Badge>已完成</Badge>}
                      </div>
                      <h3>{t.title}</h3>
                      <p>{t.goal}</p>
                    </div>
                    <span className="task-time">
                      <Clock3 size={14} />
                      {t.minutes} 分钟
                    </span>
                    <span className={`task-action ${i === 0 ? "first" : ""}`}>
                      {t.status === "done" ? (
                        <Check size={17} />
                      ) : (
                        <ArrowUpRight size={17} />
                      )}
                    </span>
                  </Link>
                );
              })}
            </div>
            <div className="gentle-note">
              <Sprout size={16} />{" "}
              遇到困难时，可以把任务拆小。没做完的内容，明天接着学。
            </div>
          </Panel>
          <Panel
            title="这一周，让进步有迹可循"
            subtitle="只记录真实的学习，不和别人比较"
            action={
              <Link href="/report" className="text-link">
                学习周报 <ArrowUpRight size={14} />
              </Link>
            }
          >
            <div className="week-overview">
              <div>
                <small>近7天有效学习</small>
                <h3>
                  {Math.floor(dailyTotals.reduce((a, b) => a + b, 0))}
                  <span>分钟</span>
                </h3>
                <p>
                  {previousRecords
                    ? `留下了 ${previousRecords} 次写作与口语练习`
                    : "完成第一次练习后，这里会记录你的变化"}
                </p>
              </div>
              <div className="week-chart">
                {week.map((date, i) => (
                  <div className="week-bar" key={date}>
                    <span
                      style={{
                        height: `${Math.max(3, Math.min((dailyTotals[i] / 300) * 90, 90))}px`,
                      }}
                      title={`${date}：${Math.floor(dailyTotals[i])}分钟`}
                    />
                    <small>
                      {
                        ["日", "一", "二", "三", "四", "五", "六"][
                          new Date(date + "T12:00:00Z").getUTCDay()
                        ]
                      }
                    </small>
                    {date === today && <i />}
                  </div>
                ))}
              </div>
            </div>
          </Panel>
        </div>
        <div className="dashboard-side">
          <Panel className="coach-note">
            <div className="row">
              <span className="coach-avatar">
                <Sparkles size={20} />
              </span>
              <div>
                <h3>你的 AI 学习教练</h3>
                <small>先理解你，再安排学习</small>
              </div>
            </div>
            <h2>
              {weakness
                ? `我们先解决「${weakness[0]}」`
                : "现在最重要的，是把基础练稳。"}
            </h2>
            <p>
              {weakness
                ? `你的错题中出现了 ${weakness[1]} 次${weakness[0]}问题。先复练一个小题，找到卡住的原因。`
                : "你不需要今天就写一篇完整作文。先写出自己的句子，就是很好的开始。"}
            </p>
            <div className="next-step">
              <span>下一步建议</span>
              <strong>{next?.title || "回顾今天最有帮助的一个方法"}</strong>
              <Link href={weakness ? "/review" : "/writing"}>
                和教师一起练习 <ArrowRight size={15} />
              </Link>
            </div>
            <small className="honest-label">
              离线教学可用 · AI 接口按需配置
            </small>
          </Panel>
          <Panel title="我的能力起点" subtitle="学习掌握程度，不是雅思预测分">
            <div className="ability-list">
              {(
                ["writing", "speaking", "listening", "reading"] as Subject[]
              ).map((s) => (
                <div className="ability-row" key={s}>
                  <span>{subjects[s]}</span>
                  <span>
                    {s === "writing" || s === "speaking"
                      ? `Level ${state.levels[s]} · ${state.levels[s] < 3 ? "基础表达" : "独立输出"}`
                      : state.drills.some((r) => r.subject === s) ||
                          state.practices.some((r) => r.subject === s)
                        ? "已开始微诊断 · 继续收集证据"
                        : "等待首次诊断"}
                  </span>
                  <div className="ability-dots">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <i
                        key={n}
                        className={
                          (s === "writing" || s === "speaking") &&
                          n <= state.levels[s]
                            ? "filled"
                            : ""
                        }
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="divider" />
            <p className="tiny">
              历史不限时、重复练习的成绩会保留为学习证据，不能直接推算正式分数。
            </p>
            <Link href="/data" className="text-link">
              补充我的练习记录 <ArrowUpRight size={14} />
            </Link>
          </Panel>
        </div>
      </div>
      <div className="bottom-quote">
        <span>✦</span> 今天学会的一句话，就是明天表达自己的底气。
      </div>
    </>
  );
}
