"use client";
import { useState } from "react";
import { Plus, Eye, Check, RotateCcw, Trash2 } from "lucide-react";
import { useStudy } from "./store";
import { PageTitle, Panel, Modal, Notice, Badge, Empty } from "./ui";
import {
  addDays,
  localDate,
  uid,
  subjects,
  errorCategories,
  type ErrorCategory,
  type Subject,
} from "@/lib/model";
export function Review() {
  const { state, update } = useStudy();
  const [adding, setAdding] = useState(false);
  const [filter, setFilter] = useState("due");
  const [selected, setSelected] = useState<string | null>(null);
  const [response, setResponse] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [subject, setSubject] = useState<Subject>("writing");
  const [category, setCategory] = useState<ErrorCategory>("语法");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [reason, setReason] = useState("");
  const list = state.errors.filter(
    (e) => filter === "all" || e.nextReview <= localDate(),
  );
  const current = state.errors.find((e) => e.id === selected);
  const save = () => {
    if (!question.trim() || !answer.trim()) return;
    update((s) => ({
      ...s,
      errors: [
        ...s.errors,
        {
          id: uid(),
          date: localDate(),
          subject,
          category,
          question,
          answer,
          reason,
          nextReview: localDate(),
          interval: 0,
          reviews: [],
        },
      ],
    }));
    setAdding(false);
    setQuestion("");
    setAnswer("");
    setReason("");
  };
  const review = (remembered: boolean) => {
    update((s) => ({
      ...s,
      errors: s.errors.map((e) => {
        if (e.id !== selected) return e;
        const interval = remembered
          ? e.interval === 0
            ? 1
            : e.interval === 1
              ? 3
              : e.interval === 3
                ? 7
                : 14
          : 1;
        return {
          ...e,
          interval,
          nextReview: addDays(localDate(), interval),
          reviews: [...e.reviews, { date: localDate(), response, remembered }],
        };
      }),
    }));
    setSelected(null);
    setResponse("");
    setRevealed(false);
  };
  return (
    <>
      <PageTitle
        eyebrow="RECALL · REFLECT · REPEAT"
        title="把错因，变成下次的线索。"
        description="先尝试回想，再看答案。没有掌握的内容，我们缩短间隔再练一次。"
        action={
          <button className="button primary" onClick={() => setAdding(true)}>
            <Plus size={17} />
            记录错题 / 词汇
          </button>
        }
      />
      <div className="tab-bar">
        <button
          className={filter === "due" ? "active" : ""}
          onClick={() => setFilter("due")}
        >
          到期复习 (
          {state.errors.filter((e) => e.nextReview <= localDate()).length})
        </button>
        <button
          className={filter === "all" ? "active" : ""}
          onClick={() => setFilter("all")}
        >
          全部条目 ({state.errors.length})
        </button>
      </div>
      <Notice>
        词汇也可以作为“表达 /
        拼写”条目保存。每次先用它造一个不同的句子，避免只是记住原题答案。
      </Notice>
      {list.length ? (
        <div className="review-grid">
          {list.map((e) => (
            <Panel key={e.id}>
              <div className="row between">
                <Badge tone="blue">
                  {subjects[e.subject]} · {e.category}
                </Badge>
                <button
                  className="icon-button"
                  aria-label="删除错题"
                  onClick={() => {
                    if (confirm("确认删除这个条目及其复习记录？"))
                      update((s) => ({
                        ...s,
                        errors: s.errors.filter((r) => r.id !== e.id),
                      }));
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <h3>{e.question}</h3>
              <p className="tiny">
                {e.date} 记录 · 已复练 {e.reviews.length} 次 · {e.nextReview}{" "}
                复习
              </p>
              <button
                className="button secondary"
                onClick={() => {
                  setSelected(e.id);
                  setRevealed(false);
                  setResponse("");
                }}
              >
                先回想，再对照 <RotateCcw size={15} />
              </button>
            </Panel>
          ))}
        </div>
      ) : (
        <Panel>
          <Empty
            title={filter === "due" ? "目前没有到期复习" : "还没有记录错题"}
          >
            在教师反馈中保存重点，或手动记录一个经常困扰你的单词和句子。
          </Empty>
        </Panel>
      )}
      {adding && (
        <Modal title="记录一个值得再练的点" onClose={() => setAdding(false)}>
          <div className="form-grid">
            <label className="field">
              科目
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value as Subject)}
              >
                {Object.entries(subjects).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              错误类型
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ErrorCategory)}
              >
                {errorCategories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="field">
            题目 / 单词 / 我的原句
            <textarea
              value={question}
              maxLength={10000}
              onChange={(e) => setQuestion(e.target.value)}
            />
          </label>
          <label className="field">
            正确理解与例子
            <textarea
              value={answer}
              maxLength={10000}
              onChange={(e) => setAnswer(e.target.value)}
            />
          </label>
          <label className="field">
            我为什么出错
            <textarea
              value={reason}
              maxLength={10000}
              onChange={(e) => setReason(e.target.value)}
              placeholder="是听不出来、没定位到，还是句子结构不清楚？"
            />
          </label>
          <button
            className="button primary"
            disabled={!question.trim() || !answer.trim()}
            onClick={save}
          >
            保存并安排复习
          </button>
        </Modal>
      )}
      {current && (
        <Modal title="先回想，再看答案" onClose={() => setSelected(null)}>
          <Badge tone="blue">{current.category}</Badge>
          <h2>{current.question}</h2>
          <label className="field">
            我的回想 / 新例句
            <textarea
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              placeholder="先试着回答或写一个不同的例句，再查看提示。"
            />
          </label>
          {!revealed ? (
            <button
              className="button secondary"
              disabled={!response.trim()}
              onClick={() => setRevealed(true)}
            >
              <Eye size={16} />
              对照答案与错因
            </button>
          ) : (
            <>
              <blockquote>{current.answer}</blockquote>
              <p>{current.reason}</p>
              <Notice>
                请诚实判断是否能独立完成。点击“还不稳”会在明天继续安排，系统不会判定学习失败。
              </Notice>
              <div className="row wrap">
                <button
                  className="button secondary"
                  onClick={() => review(false)}
                >
                  <RotateCcw size={16} />
                  还不稳，明天再练
                </button>
                <button className="button primary" onClick={() => review(true)}>
                  <Check size={16} />
                  这次能独立完成
                </button>
              </div>
            </>
          )}
        </Modal>
      )}
    </>
  );
}
