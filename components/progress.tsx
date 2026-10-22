"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarDays, Flag, Sprout, Download } from "lucide-react";
import { useStudy } from "./store";
import { PageTitle, Panel, Badge, Notice, DownloadButton, Empty } from "./ui";
import {
  addDays,
  daysBetween,
  localDate,
  phaseFor,
  phaseName,
  recommendMode,
  modes,
  practiceStats,
  subjects,
} from "@/lib/model";
export function Calendar() {
  const { state } = useStudy();
  const [selected, setSelected] = useState(localDate());
  const count = Math.max(
    1,
    Math.min(365, daysBetween(state.profile.startDate, state.profile.examDate)),
  );
  const dates = Array.from({ length: count }, (_, i) =>
    addDays(state.profile.startDate, i),
  );
  const tasks = state.days[selected] || [];
  const day = daysBetween(state.profile.startDate, selected) + 1;
  const phase = phaseFor(day);
  const recommended = recommendMode(state);
  return (
    <>
      <PageTitle
        eyebrow="YOUR ADAPTIVE LEARNING JOURNEY"
        title="70天，走自己的进步路径。"
        description="日期提醒我们方向，能力决定下一步。没有达到基础门槛时，先练稳，再提速。"
      />
      <Notice>
        规划起点 {state.profile.startDate}，考试日 {state.profile.examDate}
        ，相隔 {count} 天。考试前一天是最后一个训练日；阶段不是自动升级。
      </Notice>
      <div className="phase-grid">
        {[1, 2, 3, 4].map((p, i) => (
          <Panel
            key={p}
            className={`phase-card ${phase === p ? "current" : ""}`}
          >
            <span className="eyebrow">PHASE 0{p}</span>
            <h3>{phaseName(p)}</h3>
            <small>
              {["第1–14天", "第15–35天", "第36–55天", "第56天至考前"][i]}
            </small>
            <p>
              {
                [
                  "诊断、造句、短答、逐句精听与错因记录。",
                  "独立段落、连续回答、定位和首次听取能力。",
                  "有选择地引入时间压力；先保证独立完成。",
                  "准备充分后模考，复盘弱点，稳定考前节奏。",
                ][i]
              }
            </p>
          </Panel>
        ))}
      </div>
      <div className="coach-layout">
        <Panel
          title="每天的一小步"
          subtitle="点击日期查看记录 · 深色表示有实际学习"
        >
          <div className="calendar-legend">
            <span>
              <i className="calendar-swatch" />
              待开始
            </span>
            <span>
              <i className="calendar-swatch started" />
              有学习
            </span>
            <span>
              <i className="calendar-swatch completed" />
              当日任务完成
            </span>
          </div>
          <div className="calendar-grid">
            {dates.map((date, i) => {
              const rows = state.days[date] || [];
              const done =
                rows.length > 0 && rows.every((t) => t.status === "done");
              const active = rows.some(
                (t) => t.seconds > 0 || t.completedSteps.length > 0,
              );
              return (
                <button
                  key={date}
                  title={`${date} · 第${i + 1}天`}
                  className={`calendar-day ${done ? "completed" : active ? "started" : ""} ${date === localDate() ? "today" : ""} ${selected === date ? "selected" : ""}`}
                  onClick={() => setSelected(date)}
                >
                  <small>{date.slice(5).replace("-", "/")}</small>
                  <strong>{i + 1}</strong>
                  {date === localDate() && <span>今天</span>}
                </button>
              );
            })}
          </div>
          <div className="exam-marker">
            <Flag size={19} />
            <strong>{state.profile.examDate} · IELTS Academic</strong>
            <span>目标 {state.profile.target.toFixed(1)}</span>
          </div>
        </Panel>
        <div>
          <Panel
            title={`${selected} · 第${day}天`}
            action={<Badge tone="blue">阶段 {phase}</Badge>}
          >
            {tasks.length ? (
              <div className="day-records">
                {tasks.map((t) => (
                  <div key={t.id}>
                    <strong>{subjects[t.subject]}</strong>
                    <span>{Math.floor(t.seconds / 60)}分钟</span>
                    <Badge tone={t.status === "done" ? "mint" : "gray"}>
                      {t.status === "done"
                        ? "完成"
                        : t.status === "carry"
                          ? "续学"
                          : "进行中"}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <Empty
                title={
                  selected > localDate() ? "给未来留一点空间" : "这一天没有记录"
                }
              >
                未来任务会根据最近表现生成，不会强迫补齐空白日期。
              </Empty>
            )}
            <Link href="/today" className="button secondary full">
              回到今天的学习 <ArrowRight size={16} />
            </Link>
          </Panel>
          <Panel title="进阶前，先看能力">
            <p>
              当前建议：<strong>{modes[recommended]}模式</strong>
            </p>
            <p className="tiny">
              写作或口语尚未达到独立段落/连续回答时，优先基础。具备独立输出后，再根据首次限时练习证据引入模考。
            </p>
            {phase >= 3 && recommended === "foundation" && (
              <Notice>
                日程已进入后期，但基础输出证据仍不足。7.0目标存在风险；建议继续补基础，并用真实诊断重新评估训练强度与目标。
              </Notice>
            )}
            <Link href="/settings" className="text-link">
              查看 / 调整学习模式 →
            </Link>
          </Panel>
        </div>
      </div>
    </>
  );
}
export function Report() {
  const { state } = useStudy();
  const [end, setEnd] = useState(localDate());
  const begin = addDays(end, -6);
  const tasks = Object.entries(state.days)
    .filter(([day]) => day >= begin && day <= end)
    .flatMap(([, t]) => t);
  const writing = state.writing.filter((r) => r.date >= begin && r.date <= end);
  const speaking = state.speaking.filter(
    (r) => r.date >= begin && r.date <= end,
  );
  const practices = state.practices.filter(
    (r) => r.date >= begin && r.date <= end,
  );
  const errors = state.errors.filter((r) => r.date >= begin && r.date <= end);
  const vocabulary = state.vocabularyAttempts.filter(
    (r) => r.date >= begin && r.date <= end,
  );
  const listeningSessions = state.listeningSessions.filter(
    (r) => r.date >= begin && r.date <= end,
  );
  const minutes = Math.floor(tasks.reduce((s, t) => s + t.seconds, 0) / 60);
  const hasData =
    writing.length +
      speaking.length +
      practices.length +
      errors.length +
      vocabulary.length +
      listeningSessions.length +
      minutes >
    0;
  const causes = errors.reduce<Record<string, number>>(
    (a, e) => ({ ...a, [e.category]: (a[e.category] || 0) + 1 }),
    {},
  );
  for (const r of practices)
    for (const e of r.errors) causes[e] = (causes[e] || 0) + 1;
  const top = Object.entries(causes).sort((a, b) => b[1] - a[1]);
  const report = {
    range: { begin, end },
    effectiveMinutes: minutes,
    completedTasks: tasks.filter((t) => t.status === "done").length,
    writingSubmissions: writing.length,
    independentRewrites: writing.filter(
      (r) => r.independent && r.rewriteFeedback,
    ).length,
    speakingSubmissions: speaking.length,
    practiceRecords: practices.length,
    vocabularyAttempts: vocabulary.length,
    vocabularyWithoutHints: vocabulary.filter(
      (v) => v.correct && !v.revealed && v.plays === 1 && v.mode !== "usage",
    ).length,
    listeningStudyAttempts: listeningSessions.length,
    listeningUninterruptedFirstAttempts: listeningSessions.filter(
      (s) =>
        s.firstAttempt &&
        s.mode === "once" &&
        s.plays === 1 &&
        !s.paused &&
        !s.seeked &&
        !s.transcriptViewed,
    ).length,
    errorCategories: causes,
    recommendedMode: modes[recommendMode(state)],
    reading: practiceStats(practices, "reading"),
    listening: practiceStats(practices, "listening"),
  };
  return (
    <>
      <PageTitle
        eyebrow="WEEKLY REFLECTION"
        title="看清这一周，学好下一周。"
        description="把真实练习变成下一步建议。数据不足时，我们承认还不知道。"
        action={
          <input
            aria-label="周报截止日期"
            type="date"
            value={end}
            max={localDate()}
            onChange={(e) => {
              if (e.target.value) setEnd(e.target.value);
            }}
          />
        }
      />
      <div className="row between report-period">
        <Badge tone="gray">
          {begin} — {end}
        </Badge>
        <DownloadButton data={report} filename={`ielts-report-${end}.json`}>
          <Download size={15} />
          导出周报
        </DownloadButton>
      </div>
      {!hasData ? (
        <Panel>
          <Empty title="第一份报告，从真实练习开始">
            完成一项写作、口语或导入练习后，这里会显示你的学习证据，不预填虚假进步。
          </Empty>
          <Link className="button primary" href="/today">
            开始今天的学习 <ArrowRight size={16} />
          </Link>
        </Panel>
      ) : (
        <>
          <div className="stat-grid">
            <Panel>
              <small>有效学习</small>
              <div className="stat-number">
                {minutes}
                <small>分钟</small>
              </div>
            </Panel>
            <Panel>
              <small>写作 / 独立重写</small>
              <div className="stat-number">
                {writing.length}
                <small>/ {report.independentRewrites} 次</small>
              </div>
            </Panel>
            <Panel>
              <small>口语练习</small>
              <div className="stat-number">
                {speaking.length}
                <small>次</small>
              </div>
            </Panel>
            <Panel>
              <small>练习数据</small>
              <div className="stat-number">
                {practices.length}
                <small>条</small>
              </div>
            </Panel>
          </div>
          <div className="two-columns">
            <Panel title="这周真实发生了什么">
              <p>
                完成了 {report.completedTasks} 项学习任务，留下 {writing.length}{" "}
                次写作和 {speaking.length} 次口语练习。
              </p>
              {writing.length > 0 && (
                <p>
                  其中 {report.independentRewrites}{" "}
                  次有独立重写记录。优先比较同一等级的原稿与重写，不能用练习次数代替掌握程度。
                </p>
              )}
              {(vocabulary.length > 0 || listeningSessions.length > 0) && (
                <p>
                  场景词与改写共尝试{vocabulary.length}次，其中
                  {report.vocabularyWithoutHints}
                  次在一次播放、未看提示的条件下答对；听力专项
                  {listeningSessions.length}次，其中
                  {report.listeningUninterruptedFirstAttempts}
                  次符合首次不中断单播条件。这些是专项练习证据，不能换算正式雅思分数。
                </p>
              )}
              {(["reading", "listening"] as const).map((s) => (
                <div className="separate-stat" key={s}>
                  <span>{subjects[s]}首次限时练习</span>
                  <strong>
                    {report[s].fresh === null
                      ? "证据不足"
                      : `${report[s].fresh}%`}
                  </strong>
                </div>
              ))}
              <Notice>
                本周报告由可解释的规则汇总，不声称AI已经阅读所有材料。没有足够的首次限时样本，无法可靠预测考试分数。
              </Notice>
            </Panel>
            <Panel title="下周最值得解决的问题">
              {top.length ? (
                top.map(([cause, count]) => (
                  <div className="error-cause" key={cause}>
                    <strong>{cause}</strong>
                    <div className="progress-track">
                      <i style={{ width: `${(count / top[0][1]) * 100}%` }} />
                    </div>
                    <span>{count}次</span>
                  </div>
                ))
              ) : (
                <p>
                  还没有足够的错误归因。下一次练习后，记录自己为什么做错，比只记正确答案更有帮助。
                </p>
              )}
              <div className="next-step">
                <span>下一步建议</span>
                <strong>
                  {top.length
                    ? `每天拿出15分钟，主动复练一个「${top[0][0]}」问题`
                    : "先完成一次基础诊断，并记录最重要的一个困难"}
                </strong>
                <p>
                  建议保持{modes[recommendMode(state)]}
                  模式；用新材料验证是否能够迁移。
                </p>
              </div>
              <Link href="/review" className="button secondary">
                去复练 <ArrowRight size={15} />
              </Link>
            </Panel>
          </div>
        </>
      )}
    </>
  );
}
