"use client";
import { useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronRight,
  PenLine,
  Sparkles,
  RotateCcw,
  BookmarkPlus,
  EyeOff,
} from "lucide-react";
import { useStudy } from "./store";
import { PageTitle, Panel, Badge, Notice, FeedbackCard, Empty } from "./ui";
import {
  dailyWritingLesson,
  localDate,
  uid,
  writingLessons,
  writingUpgrade,
  type WritingRecord,
} from "@/lib/model";
import { getFeedback } from "@/lib/coach";
export function Writing() {
  const { state, update } = useStudy();
  const level = state.levels.writing;
  const dailyLesson = dailyWritingLesson(
    level,
    localDate(),
    state.profile.startDate,
  );
  const lesson =
    state.drafts[`writing-${level}`] && state.drafts[`writing-prompt-${level}`]
      ? { ...dailyLesson, prompt: state.drafts[`writing-prompt-${level}`] }
      : dailyLesson;
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [hide, setHide] = useState(false);
  const record = state.writing.find((r) => r.id === selected);
  const draft = state.drafts[`writing-${level}`] || "";
  const words = draft.trim() ? draft.trim().split(/\s+/).length : 0;
  const change = (fn: (r: WritingRecord) => WritingRecord) =>
    update((s) => ({
      ...s,
      writing: s.writing.map((r) => (r.id === selected ? fn(r) : r)),
    }));
  const submit = async () => {
    if (!draft.trim() || busy) return;
    setBusy(true);
    setNotice("");
    const text = draft;
    const id = uid();
    const { feedback, notice } = await getFeedback(
      text,
      "writing",
      level,
      lesson.prompt,
    );
    update((s) => ({
      ...s,
      writing: [
        ...s.writing,
        {
          id,
          date: localDate(),
          level,
          prompt: lesson.prompt,
          original: text,
          revised: "",
          rewrite: "",
          independent: false,
          feedback,
        },
      ],
    }));
    setSelected(id);
    setNotice(notice);
    setBusy(false);
  };
  const rewrite = async () => {
    if (!record?.rewrite.trim() || busy) return;
    setBusy(true);
    const result = await getFeedback(
      record.rewrite,
      "writing",
      record.level,
      record.prompt,
    );
    change((r) => ({ ...r, rewriteFeedback: result.feedback }));
    setNotice(result.notice);
    setBusy(false);
  };
  return (
    <>
      <PageTitle
        eyebrow="AI WRITING COACH"
        title="先写好一句，再写好一篇。"
        description="不急着写250词。先把你的想法，变成清楚、完整的英文句子。"
        action={
          <Badge>
            当前 Level {level} · {lesson.name}
          </Badge>
        }
      />
      <div className="level-path">
        {writingLessons.map((l, i) => (
          <button
            key={l.name}
            className={`level-node ${level === i + 1 ? "active" : ""}`}
            onClick={() => {
              if (
                i + 1 > level &&
                !confirm(
                  "这是主动调整训练等级，并不代表已通过能力检测。确认要试一试这个等级吗？",
                )
              )
                return;
              update((s) => ({
                ...s,
                levels: { ...s.levels, writing: i + 1 },
              }));
              setSelected(null);
            }}
          >
            <span>{level > i + 1 ? <Check size={15} /> : i + 1}</span>
            <div>
              <small>LEVEL {i + 1}</small>
              <strong>{l.name}</strong>
            </div>
            {i < 4 && <ChevronRight size={14} />}
          </button>
        ))}
      </div>
      {notice && <Notice>{notice}</Notice>}
      {writingUpgrade(state) && level < 5 && (
        <Notice>
          你已经在至少两天完成三次独立重写形式检查。可以尝试下一级；离线检查仍需你核对语义和表达是否准确。
          <button
            className="text-link"
            onClick={() => {
              update((s) => ({
                ...s,
                levels: { ...s.levels, writing: Math.min(5, level + 1) },
              }));
              setSelected(null);
            }}
          >
            尝试下一级 →
          </button>
        </Notice>
      )}
      <div className="coach-layout">
        <div>
          <Panel
            title={`今天的小课 · ${lesson.name}`}
            subtitle="诊断 → 讲解 → 示范 → 分步练习"
          >
            <div className="teaching-goal">
              <PenLine size={20} />
              <div>
                <small>今天要学会</small>
                <h3>{lesson.prompt}</h3>
              </div>
            </div>
            <p>{lesson.concept}</p>
            <div className="example-steps">
              {lesson.steps.map((s, i) => (
                <div key={s}>
                  <span>{i + 1}</span>
                  <p>{s}</p>
                </div>
              ))}
            </div>
            <blockquote className="english-example">
              {lesson.example}
            </blockquote>
            <Notice>
              示范是用来理解结构的。请写自己的想法，系统不会默认替你代写整篇文章。
            </Notice>
          </Panel>
          {!record ? (
            <Panel
              title="现在，轮到你试一试"
              subtitle="先表达，再修改。草稿会自动保存在本机。"
            >
              <label className="field">
                我的初稿
                <textarea
                  className="writing-editor"
                  aria-label="我的初稿"
                  maxLength={15000}
                  value={draft}
                  onChange={(e) =>
                    update((s) => ({
                      ...s,
                      drafts: {
                        ...s.drafts,
                        [`writing-${level}`]: e.target.value,
                        [`writing-prompt-${level}`]: lesson.prompt,
                      },
                    }))
                  }
                  placeholder={
                    level === 1
                      ? "I study English because …"
                      : "Write your own ideas here…"
                  }
                />
              </label>
              <div className="row between">
                <span className="tiny">{words} 个词 · 不要求复杂表达</span>
                <button
                  className="button primary"
                  disabled={!draft.trim() || busy}
                  onClick={submit}
                >
                  <Sparkles size={16} />
                  {busy ? "正在分析…" : "请教师帮我看看"}
                </button>
              </div>
            </Panel>
          ) : (
            <>
              <Panel
                title="初稿与教师反馈"
                action={<Badge tone="gray">原稿永久保留</Badge>}
              >
                <p className="tiny">
                  Level {record.level} · {record.prompt}
                </p>
                <div className="saved-text">{record.original}</div>
                <FeedbackCard feedback={record.feedback} />
                <button
                  className="text-link"
                  onClick={() => {
                    update((s) => ({
                      ...s,
                      errors: [
                        ...s.errors,
                        {
                          id: uid(),
                          date: localDate(),
                          subject: "writing",
                          category: "语法",
                          question: record.original,
                          answer: record.feedback.example,
                          reason:
                            record.feedback.issues.join("；") ||
                            record.feedback.next,
                          nextReview: localDate(),
                          interval: 0,
                          reviews: [],
                        },
                      ],
                    }));
                    setNotice("已加入错题本，请补充自己的理解并用新例句复练。");
                  }}
                >
                  <BookmarkPlus size={15} />
                  把这次的重点加入错题本
                </button>
              </Panel>
              <Panel
                title="先修改，再独立重写"
                subtitle="修改稿可以参考反馈；独立重写时请遮住示范。"
              >
                <label className="field">
                  我的修改稿
                  <textarea
                    maxLength={15000}
                    value={record.revised}
                    onChange={(e) =>
                      change((r) => ({ ...r, revised: e.target.value }))
                    }
                    placeholder="根据反馈，只改最重要的1–3个问题。"
                  />
                </label>
                <div className="divider" />
                <button
                  className="button secondary"
                  onClick={() => setHide(!hide)}
                >
                  <EyeOff size={16} />
                  {hide ? "重新查看提示" : "进入独立重写（隐藏提示）"}
                </button>
                {hide && (
                  <div className="rewrite-focus">
                    这是自己的第二次表达。可以更简单，但请用自己的想法。
                  </div>
                )}
                <label className="field">
                  不看示范，我能再写一次
                  <textarea
                    maxLength={15000}
                    value={record.rewrite}
                    onChange={(e) =>
                      change((r) => ({
                        ...r,
                        rewrite: e.target.value,
                        rewriteFeedback: undefined,
                      }))
                    }
                    placeholder="Try again in your own words."
                  />
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={record.independent}
                    onChange={(e) =>
                      change((r) => ({ ...r, independent: e.target.checked }))
                    }
                  />
                  这次没有复制范例，也没有让AI代写
                </label>
                <button
                  className="button primary"
                  disabled={!record.rewrite.trim() || busy}
                  onClick={rewrite}
                >
                  <RotateCcw size={16} />
                  {busy ? "正在检查…" : "检查这次独立表达"}
                </button>
                {record.rewriteFeedback && (
                  <FeedbackCard feedback={record.rewriteFeedback} />
                )}
                <button
                  className="button secondary"
                  onClick={() => {
                    setSelected(null);
                    update((s) => ({
                      ...s,
                      drafts: {
                        ...s.drafts,
                        [`writing-${level}`]: "",
                        [`writing-prompt-${level}`]: "",
                      },
                    }));
                  }}
                >
                  开始新的小练习 <ArrowRight size={15} />
                </button>
              </Panel>
            </>
          )}
        </div>
        <div className={`coach-sidebar ${hide ? "hide-tips" : ""}`}>
          <Panel title="一步一步，把句子搭起来">
            <div className="sentence-block">
              <small>WHO · 谁</small>
              <strong>I</strong>
            </div>
            <div className="sentence-block">
              <small>DOES WHAT · 做什么</small>
              <strong>study English</strong>
            </div>
            <div className="sentence-block">
              <small>WHY · 为什么</small>
              <strong>because I want to travel.</strong>
            </div>
            <p className="tiny">
              基础句子也能表达有价值的想法。准确、清楚，比堆砌高级词更重要。
            </p>
          </Panel>
          <Panel title="我的写作足迹" subtitle="原稿、反馈与重写都在这里">
            {state.writing.length ? (
              <div className="history-list">
                {state.writing
                  .slice()
                  .reverse()
                  .map((r) => (
                    <button
                      key={r.id}
                      onClick={() => {
                        setSelected(r.id);
                        setHide(false);
                      }}
                    >
                      <span>
                        <strong>
                          Level {r.level} · {r.date}
                        </strong>
                        <small>{r.original.slice(0, 60)}</small>
                      </span>
                      <Badge
                        tone={
                          r.independent && r.rewriteFeedback ? "mint" : "gray"
                        }
                      >
                        {r.independent && r.rewriteFeedback
                          ? "已重写"
                          : "继续练习"}
                      </Badge>
                    </button>
                  ))}
              </div>
            ) : (
              <Empty title="从第一句开始">
                保存练习后，这里会留下你的进步。
              </Empty>
            )}
          </Panel>
          <Notice>
            不提供未经校准的雅思预测分数。升级依据独立输出与复练证据，用户可手动调整难度。
          </Notice>
        </div>
      </div>
      {hide && (
        <style>{`.example-steps,.english-example,.feedback,.saved-text{visibility:hidden}.hide-tips{visibility:hidden}`}</style>
      )}
    </>
  );
}
