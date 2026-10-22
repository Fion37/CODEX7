"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Play,
  RotateCcw,
  ArrowRight,
  BookmarkPlus,
  FileAudio,
} from "lucide-react";
import { useStudy, loadAsset } from "./store";
import {
  PageTitle,
  Panel,
  Badge,
  Notice,
  Empty,
  clock,
  FeedbackCard,
} from "./ui";
import { getListeningFeedback } from "@/lib/coach";
import { feedbackSchema } from "@/lib/validation";
import { Listening as MicroListening } from "./drills";
import { listeningSets } from "@/lib/listening-exams";
import { gradeListening } from "@/lib/curriculum";
import type { LearningResource, ListeningSet } from "@/lib/resource-model";
import { localDate, uid } from "@/lib/model";
function RoomMap() {
  return (
    <svg
      className="listening-map"
      viewBox="0 0 400 210"
      role="img"
      aria-label="地图：北在上方，A左上、B右上、C左下、D右下，中间为Reception"
    >
      <rect
        x="5"
        y="5"
        width="390"
        height="200"
        rx="12"
        fill="#f6f9f1"
        stroke="#d5e2cc"
      />
      {[
        ["A", 40, 30],
        ["B", 250, 30],
        ["C", 40, 130],
        ["D", 250, 130],
      ].map(([label, x, y]) => (
        <g key={label}>
          <rect
            x={Number(x)}
            y={Number(y)}
            width="110"
            height="50"
            rx="6"
            fill="#e4efda"
          />
          <text
            x={Number(x) + 55}
            y={Number(y) + 31}
            textAnchor="middle"
            fill="#5d7a4b"
          >
            {label}
          </text>
        </g>
      ))}
      <text x="200" y="111" textAnchor="middle" fill="#718963" fontSize="13">
        Reception
      </text>
      <text x="200" y="30" textAnchor="middle" fill="#718963" fontSize="12">
        ↑ N
      </text>
    </svg>
  );
}
function draftOf(raw: string | undefined) {
  try {
    const data = JSON.parse(raw || "{}");
    return {
      answers:
        typeof data.answers === "object" && data.answers
          ? (data.answers as Record<string, string>)
          : {},
      plays: Number.isFinite(data.plays) ? Math.max(0, data.plays) : 0,
      paused: data.paused === true,
      seeked: data.seeked === true,
      transcriptViewed: data.transcriptViewed === true,
      sessionId: typeof data.sessionId === "string" ? data.sessionId : "",
      mode: data.mode === "once" ? ("once" as const) : ("learn" as const),
    };
  } catch {
    return {
      answers: {},
      plays: 0,
      paused: false,
      seeked: false,
      transcriptViewed: false,
      sessionId: "",
      mode: "learn" as const,
    };
  }
}
function ListeningExercise({ set }: { set: ListeningSet }) {
  const { state, update } = useStudy();
  const key = `listening-exam-${set.id}`;
  const draft = draftOf(state.drafts[key]);
  const mode = draft.mode;
  const setMode = (mode: "learn" | "once") => patch({ mode });
  const [notice, setNotice] = useState("");
  const [url, setUrl] = useState(set.audioPath || "");
  const [playing, setPlaying] = useState(false);
  const [feedback, setFeedback] = useState(false);
  const [busyQuestion, setBusyQuestion] = useState("");
  const started = useRef(Date.now());
  const audio = useRef<HTMLAudioElement | null>(null);
  const result = state.listeningSessions.find((s) => s.id === draft.sessionId);
  const stopping = useRef(false);
  const patch = (fields: Partial<ReturnType<typeof draftOf>>) =>
    update((s) => ({
      ...s,
      drafts: {
        ...s.drafts,
        [key]: JSON.stringify({ ...draftOf(s.drafts[key]), ...fields }),
      },
    }));
  useEffect(() => {
    let live = true,
      next = "";
    if (set.audioResourceId) {
      const resource = state.resources.find(
        (r) => r.id === set.audioResourceId,
      );
      if (resource)
        loadAsset(resource.assetKey).then((blob) => {
          if (blob && live) {
            next = URL.createObjectURL(blob);
            setUrl(next);
          }
        });
    }
    return () => {
      live = false;
      stopping.current = true;
      audio.current?.pause();
      if (next) URL.revokeObjectURL(next);
    };
  }, [set.audioResourceId]);
  useEffect(() => {
    if (draft.plays > 0 && !draft.sessionId) patch({ paused: true });
  }, []);
  const play = async () => {
    if (!url || !audio.current) return;
    if (mode === "once" && draft.plays > 0) {
      setNotice(
        "单次检测不重播。可提交当前答案，或重新开始并将这份材料标为重复练习。",
      );
      return;
    }
    try {
      stopping.current = false;
      await audio.current.play();
    } catch {
      setNotice("音频未能播放，请检查资源是否已导入或音量设置。");
    }
  };
  const submit = () => {
    if (draft.plays === 0 || !set.answerKeyConfirmed) return;
    const results = set.questions.map((q) => ({
      questionId: q.id,
      ...gradeListening(q, draft.answers[q.id] || ""),
    }));
    const id = uid();
    update((s) => ({
      ...s,
      listeningSessions: [
        ...s.listeningSessions,
        {
          id,
          date: localDate(),
          setId: set.id,
          title: set.title,
          mode,
          plays: draft.plays,
          paused: draft.paused || !audio.current?.ended,
          seeked: draft.seeked,
          transcriptViewed: draft.transcriptViewed,
          firstAttempt: !s.listeningSessions.some((a) => a.setId === set.id),
          answers: draft.answers,
          results,
          seconds: (Date.now() - started.current) / 1000,
        },
      ],
      drafts: {
        ...s.drafts,
        [key]: JSON.stringify({ ...draft, sessionId: id }),
      },
    }));
    stopping.current = true;
    audio.current?.pause();
    setPlaying(false);
  };
  const restart = () => {
    stopping.current = true;
    audio.current?.pause();
    if (audio.current) audio.current.currentTime = 0;
    update((s) => ({
      ...s,
      drafts: {
        ...s.drafts,
        [key]: JSON.stringify({
          answers: {},
          plays: 0,
          paused: false,
          seeked: false,
          transcriptViewed: false,
          sessionId: "",
          mode,
        }),
      },
    }));
    setNotice(
      "已开始新的尝试，之前的记录保留；已经接触过的材料不会再算首次新材料。",
    );
    started.current = Date.now();
  };
  const coachFor = (id: string) => {
    try {
      const raw = JSON.parse(
        state.drafts[`listening-coach-${result?.id}-${id}`] || "null",
      );
      const parsed = feedbackSchema.safeParse(raw);
      return parsed.success
        ? {
            ...parsed.data,
            source: raw.source === "ai" ? ("ai" as const) : ("local" as const),
          }
        : null;
    } catch {
      return null;
    }
  };
  const fresh =
    result &&
    result.firstAttempt &&
    result.mode === "once" &&
    result.plays === 1 &&
    !result.paused &&
    !result.seeked &&
    !result.transcriptViewed;
  return (
    <>
      <Panel
        title={set.title}
        subtitle={`${set.origin === "original" ? "本站原创专项" : "个人导入资料"} · ${set.questions.length}题 · ${set.topic}`}
        action={<Badge tone="blue">Part {set.part}</Badge>}
      >
        <div className="row wrap">
          <button
            className={`button ${mode === "learn" ? "primary" : "secondary"}`}
            disabled={draft.plays > 0}
            onClick={() => setMode("learn")}
          >
            精听教学 · 可回放
          </button>
          <button
            className={`button ${mode === "once" ? "primary" : "secondary"}`}
            disabled={draft.plays > 0}
            onClick={() => setMode("once")}
          >
            单次播放检测
          </button>
          <Badge tone="gray">已播放{draft.plays}次</Badge>
        </div>
        <Notice>
          {mode === "once"
            ? "先预读题目再播放一次。检测中不提供原文、暂停或拖动控件。刷新、中断或看过原文后，记录为有支架/中断练习。"
            : "先作答，再逐句回听与核对原文。记下听辨、拼写、定位、改写或干扰项问题。"}
        </Notice>
        <audio
          ref={audio}
          src={url || undefined}
          controls={mode === "learn"}
          onPlay={() => {
            setPlaying(true);
            patch({ plays: draft.plays + 1 });
          }}
          onEnded={() => setPlaying(false)}
          onPause={() => {
            setPlaying(false);
            if (
              !stopping.current &&
              audio.current &&
              !audio.current.ended &&
              audio.current.currentTime > 0
            )
              patch({ paused: true });
          }}
          onSeeking={() => {
            if ((audio.current?.currentTime || 0) > 0) patch({ seeked: true });
          }}
          onError={() =>
            setNotice("音频资源加载失败，不能把此练习视为有效听力检测。")
          }
        />
        <div className="row wrap">
          <button
            className="button dark"
            disabled={
              !url || Boolean(result) || (mode === "once" && draft.plays > 0)
            }
            onClick={play}
          >
            <Play size={16} />
            {playing
              ? "音频播放中"
              : draft.plays
                ? "再次播放"
                : "开始播放题目音频"}
          </button>
          <button
            className="button secondary"
            disabled={mode === "once" && !result}
            onClick={() => {
              setFeedback(!feedback);
              if (!result) patch({ transcriptViewed: true });
            }}
          >
            查看听力原文
          </button>
        </div>
        {feedback && <pre className="resource-text">{set.transcript}</pre>}
        {!url && (
          <Notice>
            尚未绑定本机音频，请到资源中心为这份题目选择音频文件。
          </Notice>
        )}
        {!set.answerKeyConfirmed && (
          <Notice>
            这份题目的答案尚未由你核对，暂不自动评分。请到资源中心确认答案键与字数要求。
          </Notice>
        )}
        {set.questions.some((q) => q.type === "map") && <RoomMap />}
        <div className="listening-questions">
          {set.questions.map((q, i) => (
            <article key={q.id}>
              <div className="row between">
                <h3>
                  {i + 1}. {q.prompt}
                </h3>
                <Badge tone="gray">
                  {q.type === "multiple-choice" ||
                  q.type === "matching" ||
                  q.type === "map"
                    ? "选择字母"
                    : `最多${q.wordLimit}词 / 数字`}
                </Badge>
              </div>
              {q.choices ? (
                <select
                  aria-label={`第${i + 1}题答案`}
                  disabled={Boolean(result)}
                  value={
                    typeof draft.answers[q.id] === "string"
                      ? draft.answers[q.id]
                      : ""
                  }
                  onChange={(e) =>
                    patch({
                      answers: { ...draft.answers, [q.id]: e.target.value },
                    })
                  }
                >
                  <option value="">选择答案</option>
                  {q.choices.map((c) => (
                    <option key={c} value={c[0]}>
                      {c}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  aria-label={`第${i + 1}题答案`}
                  maxLength={300}
                  disabled={Boolean(result)}
                  value={
                    typeof draft.answers[q.id] === "string"
                      ? draft.answers[q.id]
                      : ""
                  }
                  onChange={(e) =>
                    patch({
                      answers: { ...draft.answers, [q.id]: e.target.value },
                    })
                  }
                />
              )}
              {result && (
                <div
                  className={`answer-feedback ${result.results.find((r) => r.questionId === q.id)?.correct ? "right" : "wrong"}`}
                >
                  <strong>
                    {result.results.find((r) => r.questionId === q.id)?.correct
                      ? "本题正确"
                      : "一起找出原因"}{" "}
                    · {q.answers[0]}
                  </strong>
                  <p>
                    {result.results.find((r) => r.questionId === q.id)?.reason}
                  </p>
                  <blockquote>{q.evidence}</blockquote>
                  <p>{q.paraphrase}</p>
                  <button
                    className="button secondary"
                    disabled={Boolean(busyQuestion)}
                    onClick={async () => {
                      setBusyQuestion(q.id);
                      const reply = await getListeningFeedback(
                        set.part,
                        q,
                        draft.answers[q.id] || "",
                      );
                      update((s) => ({
                        ...s,
                        drafts: {
                          ...s.drafts,
                          [`listening-coach-${result.id}-${q.id}`]:
                            JSON.stringify(reply.feedback),
                        },
                      }));
                      setNotice(reply.notice);
                      setBusyQuestion("");
                    }}
                  >
                    {busyQuestion === q.id
                      ? "正在分析…"
                      : "请教师分步解释这道题"}
                  </button>
                  {coachFor(q.id) && (
                    <FeedbackCard feedback={coachFor(q.id)!} />
                  )}
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
                            subject: "listening",
                            category: q.type === "map" ? "定位" : "同义替换",
                            question: q.prompt,
                            answer: q.answers.join(" / "),
                            reason: q.paraphrase + " 定位句：" + q.evidence,
                            interval: 0,
                            nextReview: localDate(),
                            reviews: [],
                          },
                        ],
                      }));
                      setNotice(
                        "已保存这个考点。下次请用不同语境复练，而非只记住原题答案。",
                      );
                    }}
                  >
                    <BookmarkPlus size={14} />
                    保存这个考点
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
        {!result ? (
          <button
            className="button primary"
            disabled={draft.plays === 0 || !set.answerKeyConfirmed}
            onClick={submit}
          >
            提交整组并看定位与改写讲解 <ArrowRight size={16} />
          </button>
        ) : (
          <div>
            <Notice>
              本次{result.results.filter((r) => r.correct).length}/
              {result.results.length}。
              {fresh
                ? "符合本站首次单次播放条件，仍只是原创专项，不换算雅思分数。"
                : "归入学习/重复/中断表现，不作为首次限时考试成绩。"}
              每次作答均独立保留。
            </Notice>
            <button className="button secondary" onClick={restart}>
              <RotateCcw size={16} />
              再次练习并保留首次记录
            </button>
          </div>
        )}
        {notice && <Notice>{notice}</Notice>}
      </Panel>
      <Panel title="从这套题迁移到你的资料">
        <p>
          先练对应场景词，再听自己的真题音频；只有你有权使用且主动导入的材料才会进入个人资源库。
        </p>
        <div className="row wrap">
          <Link className="button secondary" href="/vocabulary">
            复练场景词与改写
          </Link>
          <Link className="button secondary" href="/resources">
            绑定自己的音频与题目
          </Link>
        </div>
      </Panel>
    </>
  );
}
function PersonalAudio({ resource }: { resource: LearningResource }) {
  const { state, update } = useStudy();
  const [url, setUrl] = useState("");
  const plays = Math.max(
    0,
    Number(state.drafts[`audio-plays-${resource.id}`]) || 0,
  );
  const countPlay = () =>
    update((s) => ({
      ...s,
      drafts: {
        ...s.drafts,
        [`audio-plays-${resource.id}`]: String(
          (Number(s.drafts[`audio-plays-${resource.id}`]) || 0) + 1,
        ),
      },
    }));
  const [loop, setLoop] = useState(false);
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(10);
  const [first, setFirst] = useState("");
  const [final, setFinal] = useState("");
  const [text, setText] = useState("");
  const [notice, setNotice] = useState("");
  const audio = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    let live = true,
      url = "";
    loadAsset(resource.assetKey).then((blob) => {
      if (blob && live) {
        url = URL.createObjectURL(blob);
        setUrl(url);
      }
    });
    return () => {
      live = false;
      audio.current?.pause();
      if (url) URL.revokeObjectURL(url);
    };
  }, [resource.assetKey]);
  return (
    <Panel
      title={resource.name}
      subtitle="真实课程音频优先；AB逐句精听与首次答案分别记录"
    >
      <audio
        ref={audio}
        controls
        src={url}
        onPlay={countPlay}
        onTimeUpdate={() => {
          if (
            loop &&
            audio.current &&
            audio.current.currentTime >= end &&
            end > start
          ) {
            audio.current.currentTime = start;
            countPlay();
          }
        }}
      />
      <div className="resource-filters">
        <label className="field">
          A起点（秒）
          <input
            type="number"
            min="0"
            value={start}
            onChange={(e) => setStart(Math.max(0, Number(e.target.value)))}
          />
        </label>
        <label className="field">
          B终点（秒）
          <input
            type="number"
            min="0"
            value={end}
            onChange={(e) => setEnd(Math.max(0, Number(e.target.value)))}
          />
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={loop}
            disabled={end <= start}
            onChange={(e) => setLoop(e.target.checked)}
          />
          AB循环精听
        </label>
        <Badge tone="gray">播放/循环{plays}次</Badge>
      </div>
      <label className="field">
        首次听到的答案
        <textarea
          value={state.drafts[`first-${resource.id}`] || first}
          onChange={(e) => {
            setFirst(e.target.value);
            update((s) => ({
              ...s,
              drafts: { ...s.drafts, [`first-${resource.id}`]: e.target.value },
            }));
          }}
        />
      </label>
      <label className="field">
        复听后的修正与错因
        <textarea
          value={state.drafts[`final-${resource.id}`] || final}
          onChange={(e) => {
            setFinal(e.target.value);
            update((s) => ({
              ...s,
              drafts: { ...s.drafts, [`final-${resource.id}`]: e.target.value },
            }));
          }}
        />
      </label>
      <label className="field">
        对照自己的原文
        <select
          onChange={async (e) => {
            const r = state.resources.find((r) => r.id === e.target.value);
            const blob = r?.textKey ? await loadAsset(r.textKey) : null;
            setText(blob ? await blob.text() : "");
          }}
          defaultValue=""
        >
          <option value="">选择已导入的文本 / PDF</option>
          {state.resources
            .filter((r) => r.textKey)
            .map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
        </select>
      </label>
      {text && <pre className="resource-text">{text}</pre>}
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
                category: "听辨",
                question: `${resource.name} ${start}–${end}秒：我的首次答案`,
                answer:
                  state.drafts[`final-${resource.id}`] ||
                  final ||
                  "请结合原文补充正确理解。",
                reason:
                  "首次：" +
                  (state.drafts[`first-${resource.id}`] || first) +
                  `；本次播放/循环${plays}次。`,
                interval: 0,
                nextReview: localDate(),
                reviews: [],
              },
            ],
          }));
          setNotice(
            "首次答案与复听修正已保存到错题本。只有确认题目答案后，才记录正确题数。",
          );
        }}
      >
        保存这一句的听辨复盘
      </button>
      {notice && <Notice>{notice}</Notice>}
      <Link className="text-link" href="/data">
        另行记录已核对的正确题数与练习条件 →
      </Link>
    </Panel>
  );
}
export function ListeningCoach() {
  const { state } = useStudy();
  const [tab, setTab] = useState("exam");
  const [selected, setSelected] = useState(listeningSets[0].id);
  const [audioId, setAudioId] = useState("");
  const sets = [
    ...listeningSets,
    ...state.resources.flatMap((r) => (r.questionSet ? [r.questionSet] : [])),
  ];
  const current = sets.find((s) => s.id === selected) || sets[0];
  const personal = state.resources.filter((r) => r.kind === "audio");
  const audio = personal.find((r) => r.id === audioId) || personal[0];
  useEffect(() => {
    const q = new URLSearchParams(location.search).get("set");
    if (q) setSelected(q);
  }, []);
  return (
    <>
      <PageTitle
        eyebrow="IELTS LISTENING · YOUR MATERIALS"
        title="从场景词，到真正听懂题目。"
        description="预读、一次作答、定位原文、识别改写、分析干扰，再用新材料验证。"
      />
      <div className="tab-bar">
        <button
          className={tab === "exam" ? "active" : ""}
          onClick={() => setTab("exam")}
        >
          雅思题型训练
        </button>
        <button
          className={tab === "personal" ? "active" : ""}
          onClick={() => setTab("personal")}
        >
          我的真实音频
        </button>
        <button
          className={tab === "micro" ? "active" : ""}
          onClick={() => setTab("micro")}
        >
          词汇与辨音微练习
        </button>
      </div>
      {tab === "micro" ? (
        <MicroListening />
      ) : tab === "personal" ? (
        <>
          {personal.length ? (
            <>
              <label className="field">
                选择自己的音频
                <select
                  aria-label="个人听力音频"
                  value={audio?.id || ""}
                  onChange={(e) => setAudioId(e.target.value)}
                >
                  {personal.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </label>
              {audio && <PersonalAudio key={audio.id} resource={audio} />}
            </>
          ) : (
            <Panel>
              <Empty title="先导入一份自己的音频">
                在资源中心主动选择你有权使用的文件。爱听写网页成绩请通过截图导入，不会自动下载其付费音频。
              </Empty>
              <Link className="button primary" href="/resources">
                <FileAudio size={16} />
                选择本地音频
              </Link>
            </Panel>
          )}
        </>
      ) : (
        <>
          <Notice>
            正式听力共4个Part、40题，通常只播放一次；机考与纸笔的检查/誊写安排不同。本页内置的是原创合成音频专项题，不冒充历年真题或完整模考。你自己的原声资料可优先导入使用。
          </Notice>
          <label className="field">
            题目与场景
            <select
              aria-label="听力题组"
              value={current.id}
              onChange={(e) => setSelected(e.target.value)}
            >
              {sets.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          </label>
          <ListeningExercise key={current.id} set={current} />
        </>
      )}
    </>
  );
}
