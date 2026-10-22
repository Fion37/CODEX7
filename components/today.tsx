"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Play,
  Pause,
  Check,
  ArrowRight,
  Scissors,
  CornerDownRight,
  Clock3,
} from "lucide-react";
import { useStudy } from "./store";
import { Panel, PageTitle, Badge, Modal, Notice, clock } from "./ui";
import {
  generateTasks,
  localDate,
  simplifyTask,
  subjects,
  type Task,
} from "@/lib/model";
import { subjectIcons } from "./dashboard";
export function Today() {
  const { state, update, running, start, pause } = useStudy();
  const [date, setDate] = useState(localDate());
  const [selected, setSelected] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const tasks = state.days[date] || [];
  const task = tasks.find((t) => t.id === selected);
  const editable = date === localDate();
  useEffect(() => {
    const query = new URLSearchParams(window.location.search).get("task");
    if (query) setSelected(query);
  }, []);
  const change = (fn: (t: Task) => Task) =>
    update((s) => ({
      ...s,
      days: {
        ...s.days,
        [date]: s.days[date].map((t) => (t.id === selected ? fn(t) : t)),
      },
    }));
  return (
    <>
      <PageTitle
        eyebrow="TODAY’S LEARNING"
        title="把今天，学扎实。"
        description="讲解、练习、反馈、再试一次。300分钟，是留给真正学习的时间。"
        action={
          <input
            aria-label="学习日期"
            type="date"
            value={date}
            max={localDate()}
            onChange={(e) => {
              setDate(e.target.value);
              setSelected(null);
            }}
          />
        }
      />
      <div className="learning-summary">
        <span>
          <Clock3 size={19} />
          今日计划{" "}
          <strong>{tasks.reduce((s, t) => s + t.minutes, 0)} 分钟</strong>
        </span>
        <span>
          已学习{" "}
          <strong>
            {Math.floor(tasks.reduce((s, t) => s + t.seconds, 0) / 60)} 分钟
          </strong>
        </span>
        <span>
          已完成{" "}
          <strong>
            {tasks.filter((t) => t.status === "done").length} / {tasks.length}
          </strong>
        </span>
      </div>
      <Notice>
        计时只计算当前页面可见时的学习时间，切到后台会自动暂停。完成标准看掌握情况，不用为了打卡空等计时器。每25–30分钟建议休息，休息不计入300分钟。
      </Notice>
      {notice && <Notice>{notice}</Notice>}
      <div className="today-grid">
        {tasks.map((t) => {
          const Icon = subjectIcons[t.subject];
          return (
            <Panel
              key={t.id}
              className={`today-card ${t.status === "done" ? "is-done" : ""}`}
            >
              <div className="row between">
                <span className={`subject-icon ${t.subject}`}>
                  <Icon size={22} />
                </span>
                <Badge
                  tone={
                    t.status === "done"
                      ? "mint"
                      : t.status === "carry"
                        ? "amber"
                        : "gray"
                  }
                >
                  {t.status === "done"
                    ? "已完成"
                    : t.status === "carry"
                      ? "明天继续"
                      : `${t.minutes}分钟 · ${subjects[t.subject]}`}
                </Badge>
              </div>
              <h2>{t.title}</h2>
              <p>{t.goal}</p>
              <div className="mini-steps">
                {t.steps.slice(0, 3).map((s, i) => (
                  <div key={s}>
                    <span
                      className={t.completedSteps.includes(i) ? "checked" : ""}
                    >
                      {t.completedSteps.includes(i) ? (
                        <Check size={12} />
                      ) : (
                        i + 1
                      )}
                    </span>
                    {s}
                  </div>
                ))}
                {t.steps.length > 3 && (
                  <small>还有 {t.steps.length - 3} 个小步骤</small>
                )}
              </div>
              <div className="row between">
                <span className="muted mono">
                  {clock(t.seconds)} <small>已专注</small>
                </span>
                <button
                  className="button secondary"
                  onClick={() => setSelected(t.id)}
                >
                  {t.status === "done" ? "回顾练习" : "进入学习"}{" "}
                  <ArrowRight size={15} />
                </button>
              </div>
            </Panel>
          );
        })}
      </div>
      {!tasks.length && (
        <Panel>
          <h2>这一天还没有学习记录</h2>
          <p>没有记录不代表失败。回到今天，从一个小任务开始。</p>
        </Panel>
      )}
      {editable && (
        <div className="row wrap plan-adjust">
          <button
            className="button secondary"
            onClick={() => {
              update((s) => {
                const fresh = generateTasks(s, date);
                return {
                  ...s,
                  days: {
                    ...s.days,
                    [date]: fresh.map((t) => {
                      const old = s.days[date]?.find((o) => o.id === t.id);
                      return old ? { ...old, minutes: t.minutes } : t;
                    }),
                  },
                };
              });
              setNotice(
                "已根据当前证据重新分配时长；已有进度、任务内容和反馈全部保留。",
              );
            }}
          >
            根据最近表现调整时长
          </button>
          <span className="tiny">证据不足时，保持前两周的基础分配。</span>
        </div>
      )}
      {task && (
        <Modal
          title={`${subjects[task.subject]} · ${task.minutes}分钟学习时段`}
          onClose={() => setSelected(null)}
        >
          <div className="lesson-intro">
            <h2>{task.title}</h2>
            <p>{task.goal}</p>
            <Badge tone="gray">{task.material}</Badge>
          </div>
          {task.reflection && <Notice>{task.reflection}</Notice>}
          <div className="lesson-block">
            <h3>01 理解与示范</h3>
            <p>{task.instruction}</p>
            <blockquote>{task.example}</blockquote>
            <h3>02 自己试一试</h3>
            <p>{task.exercise}</p>
          </div>
          <div className="checklist">
            {task.steps.map((step, i) => (
              <label key={i}>
                <input
                  type="checkbox"
                  disabled={!editable}
                  checked={task.completedSteps.includes(i)}
                  onChange={(e) =>
                    change((t) => ({
                      ...t,
                      completedSteps: e.target.checked
                        ? [...t.completedSteps, i]
                        : t.completedSteps.filter((n) => n !== i),
                    }))
                  }
                />
                <span>{step}</span>
                {task.stepMinutes?.[i] !== undefined && (
                  <small style={{ marginLeft: "auto" }}>
                    {task.stepMinutes[i]} 分钟
                  </small>
                )}
              </label>
            ))}
          </div>
          <Link
            className="button primary full"
            href={task.subject === "review" ? "/review" : `/${task.subject}`}
          >
            打开{subjects[task.subject]}教师与练习 <ArrowRight size={16} />
          </Link>
          <div className="lesson-block">
            <h3>03 完成标准与下一步</h3>
            <p>{task.criterion}</p>
            <p className="muted">{task.next}</p>
          </div>
          <label className="field">
            反馈与复盘
            <textarea
              value={task.reflection}
              disabled={!editable}
              placeholder="哪一步卡住了？下一次先改什么？"
              onChange={(e) =>
                change((t) => ({ ...t, reflection: e.target.value }))
              }
            />
          </label>
          <div className="timer-box">
            <span className="mono">{clock(task.seconds)}</span>
            <button
              className="button dark"
              disabled={!editable || task.status === "done"}
              onClick={() => (running === task.id ? pause() : start(task.id))}
            >
              {running === task.id ? <Pause size={17} /> : <Play size={17} />}{" "}
              {running === task.id ? "暂停" : "开始专注"}
            </button>
          </div>
          {editable && (
            <div className="row wrap">
              <button
                className="button secondary"
                onClick={() => change(simplifyTask)}
              >
                <Scissors size={16} />
                太难了，拆小一点
              </button>
              <button
                className="button secondary"
                onClick={() => {
                  if (running === task.id) pause();
                  change((t) => ({ ...t, status: "carry" }));
                  setSelected(null);
                  setNotice(
                    "已保留全部进度；下一天会提供续学提示，不需要补双倍任务。",
                  );
                }}
              >
                <CornerDownRight size={16} />
                明天继续
              </button>
              <button
                className="button primary"
                disabled={task.completedSteps.length !== task.steps.length}
                onClick={() => {
                  if (running === task.id) pause();
                  change((t) => ({ ...t, status: "done" }));
                  setSelected(null);
                }}
              >
                <Check size={16} />
                完成学习
              </button>
            </div>
          )}
        </Modal>
      )}
    </>
  );
}
