"use client";
import { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  Check,
  Volume2,
  RotateCcw,
  ArrowRight,
  BookmarkPlus,
} from "lucide-react";
import { useStudy } from "./store";
import { PageTitle, Panel, Badge, Notice, clock } from "./ui";
import { localDate, uid, type ErrorCategory } from "@/lib/model";
import { readingItems, listeningItems, normalizeAnswer } from "@/lib/materials";
export function Reading() {
  const { state, update } = useStudy();
  const [index, setIndex] = useState(0);
  const [transfer, setTransfer] = useState(false);
  const [answer, setAnswer] = useState("");
  const [evidence, setEvidence] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [simple, setSimple] = useState(false);
  const [mode, setMode] = useState("精读教学");
  const [notice, setNotice] = useState("");
  const start = useRef(Date.now());
  const item = readingItems[index];
  const content = transfer ? item.transfer : item;
  const correct = answer === content.answer;
  const [budget, setBudget] = useState(5);
  const [elapsed, setElapsed] = useState(0);
  const [timing, setTiming] = useState(false);
  const tickAt = useRef(0);
  useEffect(() => {
    if (!timing) return;
    tickAt.current = Date.now();
    const id = setInterval(() => {
      const seconds = (Date.now() - tickAt.current) / 1000;
      tickAt.current = Date.now();
      setElapsed((n) => {
        const next = n + seconds;
        if (next >= budget * 60) {
          setTiming(false);
          setNotice(
            "本次小练习的时间到了。请提交当前答案，或切回精读模式继续理解；不会判定学习失败。",
          );
        }
        return next;
      });
    }, 500);
    const hidden = () => {
      if (document.hidden) setTiming(false);
    };
    document.addEventListener("visibilitychange", hidden);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", hidden);
    };
  }, [timing, budget]);
  const questionId = item.id + (transfer ? "-transfer" : "");
  const submit = () => {
    if (!answer || !evidence.trim() || (mode === "限时练习" && elapsed === 0))
      return;
    const first = !state.drills.some(
      (d) => d.questionId === questionId && d.subject === "reading",
    );
    update((s) => ({
      ...s,
      drills: [
        ...s.drills,
        {
          id: uid(),
          date: localDate(),
          subject: "reading",
          questionId,
          answer,
          correct,
          plays: 0,
          firstAttempt: first,
          seconds:
            mode === "限时练习"
              ? elapsed
              : Math.max(0, (Date.now() - start.current) / 1000),
          timed: mode === "限时练习",
        },
      ],
    }));
    setTiming(false);
    setSubmitted(true);
  };
  const reset = () => {
    setAnswer("");
    setEvidence("");
    setSubmitted(false);
    setSimple(false);
    setTiming(false);
    setElapsed(0);
    setNotice("");
    start.current = Date.now();
  };
  const addError = () => {
    update((s) => ({
      ...s,
      errors: [
        ...s.errors,
        {
          id: uid(),
          date: localDate(),
          subject: "reading",
          category: item.skill.includes("同义") ? "同义替换" : "定位",
          question: content.question,
          answer: `${content.answer}。${content.explanation}`,
          reason: evidence || "请补充自己的错误原因",
          interval: 0,
          nextReview: localDate(),
          reviews: [],
        },
      ],
    }));
    setNotice("已保存到错题本，原题与自己的解释都已保留。");
  };
  return (
    <>
      <PageTitle
        eyebrow="AI READING COACH"
        title="先读懂，再读快。"
        description="先找证据、拆句子，再做一道不同的题确认自己真的理解了。"
      />
      <div className="tab-bar">
        {["精读教学", "题型专项", "限时练习"].map((m) => (
          <button
            key={m}
            className={mode === m ? "active" : ""}
            onClick={() => {
              setMode(m);
              reset();
            }}
          >
            {m}
          </button>
        ))}
      </div>
      <Notice>
        {mode === "限时练习"
          ? "当前是原创微型限时练习，会记录实际耗时；不是完整雅思阅读模考，不换算分数。可以自行设定目标，不强制20分钟做一篇。"
          : "初期可以多花时间理解少量题目。本站练习均为原创，不是剑桥真题。"}
      </Notice>
      <div className="coach-layout">
        <div>
          <Panel
            title={transfer ? "换一篇短文，检验迁移" : item.title}
            action={
              <Badge tone="blue">{transfer ? "独立复测" : item.skill}</Badge>
            }
          >
            <>
              {mode === "限时练习" && (
                <div className="timer-box">
                  <label className="row">
                    目标{" "}
                    <input
                      aria-label="阅读目标分钟"
                      type="number"
                      min="1"
                      max="60"
                      value={budget}
                      style={{ width: 65 }}
                      disabled={timing || elapsed > 0}
                      onChange={(e) =>
                        setBudget(
                          Math.max(
                            1,
                            Math.min(60, Number(e.target.value) || 1),
                          ),
                        )
                      }
                    />{" "}
                    分钟
                  </label>
                  <strong className="mono">
                    {clock(Math.max(0, Math.ceil(budget * 60 - elapsed)))}
                  </strong>
                  <button
                    className="button secondary"
                    disabled={submitted || elapsed >= budget * 60}
                    onClick={() => setTiming(!timing)}
                  >
                    {timing ? "暂停" : "开始限时"}
                  </button>
                </div>
              )}
            </>
            <div className="reading-passage">
              {simple && !transfer ? item.sentence : content.passage}
            </div>
            {submitted && !transfer && (
              <div className="sentence-analysis">
                <small>句子主干</small>
                <p>{item.structure}</p>
              </div>
            )}
            <div className="lesson-block">
              <span className="eyebrow">TRUE / FALSE / NOT GIVEN</span>
              <h3>{content.question}</h3>
              <div className="answer-options">
                {["TRUE", "FALSE", "NOT GIVEN"].map((a) => (
                  <button
                    key={a}
                    disabled={submitted}
                    className={answer === a ? "selected" : ""}
                    onClick={() => setAnswer(a)}
                  >
                    {a}
                  </button>
                ))}
              </div>
              <label className="field">
                你的原文证据与判断理由
                <textarea
                  aria-label="原文证据与判断理由"
                  value={evidence}
                  disabled={submitted}
                  onChange={(e) => setEvidence(e.target.value)}
                  placeholder="哪个词或哪句话支持你的判断？如果没有提及，也请说明。"
                />
              </label>
              {!submitted ? (
                <button
                  className="button primary"
                  disabled={
                    !answer ||
                    !evidence.trim() ||
                    (mode === "限时练习" && elapsed === 0)
                  }
                  onClick={submit}
                >
                  提交并看讲解 <ArrowRight size={15} />
                </button>
              ) : (
                <div
                  className={`answer-feedback ${correct ? "right" : "wrong"}`}
                >
                  <Badge tone={correct ? "mint" : "amber"}>
                    {correct ? "这次判断正确" : "我们来找卡住的地方"}
                  </Badge>
                  <h3>答案：{content.answer}</h3>
                  <p>{content.explanation}</p>
                  <p className="tiny">你的依据：{evidence}</p>
                  <div className="row wrap">
                    <button className="button secondary" onClick={addError}>
                      <BookmarkPlus size={15} />
                      保存重点
                    </button>
                    {!correct && (
                      <button
                        className="button secondary"
                        onClick={() => {
                          reset();
                          setSimple(true);
                        }}
                      >
                        降低难度，再看一句
                      </button>
                    )}
                    <button
                      className="button primary"
                      onClick={() => {
                        if (!transfer) setTransfer(true);
                        else {
                          setIndex((index + 1) % readingItems.length);
                          setTransfer(false);
                        }
                        reset();
                      }}
                    >
                      {transfer ? "下一个能力点" : "换一道题复测"}{" "}
                      <ArrowRight size={15} />
                    </button>
                  </div>
                </div>
              )}
            </div>
            {notice && <Notice>{notice}</Notice>}
          </Panel>
        </div>
        <div>
          <Panel title="判断题的三个问题">
            <ol className="teaching-list">
              <li>
                <strong>TRUE：原文支持吗？</strong>
                <p>允许词汇不同，但含义必须一致。</p>
              </li>
              <li>
                <strong>FALSE：原文明确矛盾吗？</strong>
                <p>先确认比较的是同一个对象和条件。</p>
              </li>
              <li>
                <strong>NOT GIVEN：信息够吗？</strong>
                <p>不靠常识补全原文没说的内容。</p>
              </li>
            </ol>
          </Panel>
          <Panel title="选择一个能力点">
            <div className="choice-list">
              {readingItems.map((r, i) => (
                <button
                  key={r.id}
                  className={i === index ? "active" : ""}
                  onClick={() => {
                    setIndex(i);
                    setTransfer(false);
                    reset();
                  }}
                >
                  <BookOpen size={17} />
                  {r.skill}
                </button>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}
export function Listening() {
  const { state, update } = useStudy();
  const [index, setIndex] = useState(0);
  const [transfer, setTransfer] = useState(false);
  const [answer, setAnswer] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [notice, setNotice] = useState("");
  const [category, setCategory] = useState<ErrorCategory>("听辨");
  const [speaking, setSpeaking] = useState(false);
  const start = useRef(Date.now());
  const item = listeningItems[index];
  const content = transfer ? item.transfer : item;
  const questionId = item.id + (transfer ? "-transfer" : "");
  const plays = Number(state.drafts[`plays-${questionId}`] || 0);
  const correct = content.answers.includes(normalizeAnswer(answer));
  const audio = useRef<HTMLAudioElement | null>(null);
  useEffect(
    () => () => {
      audio.current?.pause();
    },
    [],
  );
  const play = async () => {
    audio.current?.pause();
    const clip = new Audio(`/audio/${questionId}.mp3`);
    audio.current = clip;
    clip.onended = () => setSpeaking(false);
    clip.onerror = () => {
      setSpeaking(false);
      setNotice("音频未能加载，请检查本站音频资源或网络；未成功播放不会计数。");
    };
    try {
      await clip.play();
      setSpeaking(true);
      update((s) => ({
        ...s,
        drafts: {
          ...s.drafts,
          [`plays-${questionId}`]: String(
            Number(s.drafts[`plays-${questionId}`] || 0) + 1,
          ),
        },
      }));
    } catch {
      setSpeaking(false);
      setNotice("浏览器阻止播放或音频资源不可用，请再次点击播放。");
    }
  };
  const submit = () => {
    if (!answer.trim() || plays < 1) return;
    update((s) => ({
      ...s,
      drills: [
        ...s.drills,
        {
          id: uid(),
          date: localDate(),
          subject: "listening",
          questionId,
          answer,
          correct,
          plays,
          firstAttempt: !s.drills.some(
            (d) => d.questionId === questionId && d.subject === "listening",
          ),
          seconds: (Date.now() - start.current) / 1000,
        },
      ],
    }));
    setSubmitted(true);
  };
  const next = () => {
    audio.current?.pause();
    setSpeaking(false);
    if (!transfer) setTransfer(true);
    else {
      setIndex((index + 1) % listeningItems.length);
      setTransfer(false);
    }
    setSubmitted(false);
    setAnswer("");
    setNotice("");
    start.current = Date.now();
  };
  const first = state.drills.filter(
    (d) => d.subject === "listening" && d.firstAttempt && d.plays === 1,
  );
  const repeated = state.drills.filter(
    (d) => d.subject === "listening" && d.plays > 1,
  );
  return (
    <>
      <PageTitle
        eyebrow="AI LISTENING COACH"
        title="把声音，听成意义。"
        description="先听一次作答，再回听找原因。每一次播放和每一个答案，都分别记录。"
      />
      <Notice>
        本站提供原创合成语音微练习，帮助辨音和定位；不是正式考试音频。你在爱听写的练习可单独导入，二者不会混算分数。
      </Notice>
      <div className="coach-layout">
        <div>
          <Panel
            title={transfer ? "换句复测 · 同一能力，不同内容" : item.part}
            action={<Badge tone="blue">已播放 {plays} 次</Badge>}
          >
            <div className="audio-lesson">
              <span className="sound-bars">
                {[
                  16, 28, 42, 26, 52, 36, 22, 44, 30, 18, 38, 52, 26, 40, 20,
                ].map((h, i) => (
                  <i
                    key={i}
                    style={{ height: h }}
                    className={speaking ? "playing" : ""}
                  />
                ))}
              </span>
              <button className="button dark" onClick={play}>
                <Volume2 size={18} />
                {speaking ? "重新播放" : plays ? "再听一次" : "首次播放"}
              </button>
              <small>
                {plays > 1
                  ? "再次播放后作答会标记为复听练习"
                  : "建议先听完一次，再提交最初的答案"}
              </small>
            </div>
            <h3>{content.question}</h3>
            <label className="field">
              我听到的答案
              <input
                value={answer}
                aria-label="听力答案"
                maxLength={200}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Write what you heard…"
                disabled={submitted}
              />
            </label>
            {!submitted ? (
              <button
                className="button primary"
                disabled={!answer.trim() || plays === 0}
                onClick={submit}
              >
                保存本次答案并看讲解 <ArrowRight size={15} />
              </button>
            ) : (
              <div className={`answer-feedback ${correct ? "right" : "wrong"}`}>
                <Badge tone={correct ? "mint" : "amber"}>
                  {correct ? "捕捉到了关键信息" : "把困难缩小到一个声音或词组"}
                </Badge>
                <h3>参考答案：{content.answers[0]}</h3>
                <blockquote>{content.audio}</blockquote>
                <p>{item.explanation}</p>
                <p className="tiny">
                  本次作答前共播放 {plays} 次；重复练习不会覆盖首次作答。
                </p>
                <div className="row wrap">
                  <select
                    aria-label="听力错因"
                    value={category}
                    onChange={(e) =>
                      setCategory(e.target.value as ErrorCategory)
                    }
                  >
                    {["听辨", "拼写", "定位", "同义替换", "时间管理"].map(
                      (c) => (
                        <option key={c}>{c}</option>
                      ),
                    )}
                  </select>
                  <button
                    className="button secondary"
                    onClick={() => {
                      update((s) => ({
                        ...s,
                        errors: [
                          ...s.errors,
                          {
                            id: uid(),
                            date: localDate(),
                            subject: "listening",
                            category,
                            question: content.question,
                            answer: content.audio,
                            reason: `我的答案：${answer}；播放${plays}次。请复习时补充具体原因。`,
                            interval: 0,
                            nextReview: localDate(),
                            reviews: [],
                          },
                        ],
                      }));
                      setNotice("错因已记录。复练时先回想，再用新的短句检查。");
                    }}
                  >
                    <BookmarkPlus size={15} />
                    记录错因
                  </button>
                  <button
                    className="button secondary"
                    onClick={() => {
                      setSubmitted(false);
                      setAnswer("");
                    }}
                  >
                    原句再试
                  </button>
                  <button className="button primary" onClick={next}>
                    换句复测 <ArrowRight size={15} />
                  </button>
                </div>
              </div>
            )}
            {notice && <Notice>{notice}</Notice>}
          </Panel>
        </div>
        <div>
          <Panel title="分清两种练习表现">
            <div className="separate-stat">
              <span>首次 · 单次播放作答</span>
              <strong>
                {first.length
                  ? `${first.filter((r) => r.correct).length} / ${first.length}`
                  : "待诊断"}
              </strong>
            </div>
            <div className="separate-stat">
              <span>反复播放后的作答</span>
              <strong>
                {repeated.length
                  ? `${repeated.filter((r) => r.correct).length} / ${repeated.length}`
                  : "暂无记录"}
              </strong>
            </div>
            <p className="tiny">
              这里是本站小练习答对次数；不提供雅思分数换算。
            </p>
          </Panel>
          <Panel title="专项能力点">
            <div className="choice-list">
              {listeningItems.map((r, i) => (
                <button
                  key={r.id}
                  className={i === index ? "active" : ""}
                  onClick={() => {
                    audio.current?.pause();
                    setIndex(i);
                    setTransfer(false);
                    setSubmitted(false);
                    setAnswer("");
                    setSpeaking(false);
                    start.current = Date.now();
                  }}
                >
                  {r.part}
                </button>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}
