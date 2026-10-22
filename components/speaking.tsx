"use client";
import { useEffect, useRef, useState } from "react";
import {
  Mic,
  Square,
  Volume2,
  RotateCcw,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { useStudy, saveAsset, loadAsset } from "./store";
import {
  PageTitle,
  Panel,
  Badge,
  Notice,
  FeedbackCard,
  Empty,
  clock,
} from "./ui";
import { localDate, uid, type SpeakingRecord } from "@/lib/model";
import { getFeedback } from "@/lib/coach";
import {
  speakingTopics,
  speakingModel,
  speakingCriteria,
  speakingFeedbackContext,
} from "@/lib/speaking-topics";
import type { SpeakingContext } from "@/lib/resource-model";
import Link from "next/link";
const speakingLessons = [
  {
    name: "单词与基础句型",
    question: "Do you enjoy learning English?",
    model: "I enjoy learning English because I can meet new people.",
    help: "先说 I enjoy English. 再加一个自己的原因。",
  },
  {
    name: "简单问题回答",
    question: "What do you usually do in the morning?",
    model: "I usually study in the morning. I feel more focused at that time.",
    help: "先回答做什么，再说为什么。两句清楚的话就很好。",
  },
  {
    name: "3–5句回答",
    question: "Tell me about a place where you like to study.",
    model:
      "I like studying in the library. It is quiet. I can focus on my work there.",
    help: "按地点、特点、原因、一个例子组织3–5句话。",
  },
  {
    name: "Part 1 / Part 2",
    question:
      "Describe a useful skill you learned. Say what it was, how you learned it and why it was useful.",
    model:
      "I would like to talk about cooking. I started with simple dishes and practised at weekends.",
    help: "先用一分钟写关键词，再逐渐扩展连续表达。",
  },
  {
    name: "完整模拟准备",
    question:
      "How might technology change the way people learn skills in the future?",
    model:
      "Technology may make learning more flexible. For example, learners can practise with immediate feedback.",
    help: "先给观点，再解释原因和例子。完整口试应包含各部分，当前为原创单题练习。",
  },
];
function SavedAudio({ record }: { record: SpeakingRecord }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    let active = true;
    let next = "";
    if (record.audioKey)
      loadAsset(record.audioKey).then((blob) => {
        if (blob && active) {
          next = URL.createObjectURL(blob);
          setUrl(next);
        }
      });
    return () => {
      active = false;
      if (next) URL.revokeObjectURL(next);
    };
  }, [record.audioKey]);
  return url ? (
    <audio controls src={url} preload="metadata" />
  ) : (
    <span className="tiny">
      {record.audioKey
        ? "录音尚未在此设备下载，可在设置恢复云端记录"
        : "本次使用文字回答"}
    </span>
  );
}
export function Speaking() {
  const { state, update } = useStudy();
  const level = state.levels.speaking;
  const [topicId, setTopicId] = useState(
    state.drafts["speaking-topic"] || "study",
  );
  const [part, setPart] = useState<SpeakingContext["part"]>(
    ["1", "2", "3"].includes(state.drafts["speaking-part"])
      ? (state.drafts["speaking-part"] as SpeakingContext["part"])
      : "1",
  );
  const [mode, setMode] = useState<SpeakingContext["mode"]>("guided");
  const [questionIndex, setQuestionIndex] = useState(
    Number(state.drafts["speaking-question-index"]) || 0,
  );
  const [preparing, setPreparing] = useState(false);
  const [prepRemaining, setPrepRemaining] = useState(60);
  const [prepared, setPrepared] = useState(false);
  const prepDeadline = useRef(0);
  const topic =
    speakingTopics.find((t) => t.id === topicId) || speakingTopics[0];
  const questions =
    part === "1" ? topic.part1 : part === "3" ? topic.part3 : [topic.cue];
  const lesson = {
    ...speakingLessons[level - 1],
    question: questions[questionIndex % questions.length],
    model: speakingModel(topic.id, part, questionIndex, level),
    help: speakingCriteria[part],
  };
  const transcript = state.drafts["speaking"] || "";
  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState(
    Number(state.drafts["speaking-duration"] || 0),
  );
  const [url, setUrl] = useState("");
  const [audioKey, setAudioKey] = useState<string | undefined>(
    state.drafts["speaking-audio"],
  );
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [recognition, setRecognition] = useState(false);
  const [selected, setSelected] = useState<string>();
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const speech = useRef<SpeechRecognitionLike | null>(null);
  const startAt = useRef(0);
  const active = useRef(true);
  const urlRef = useRef("");
  const promptAudio = useRef<HTMLAudioElement | null>(null);
  const record = state.speaking.find((r) => r.id === selected);
  const setTranscript = (text: string) =>
    update((s) => ({ ...s, drafts: { ...s.drafts, speaking: text } }));
  useEffect(() => {
    const key = state.drafts["speaking-audio"];
    if (!key || urlRef.current) return;
    let mounted = true;
    loadAsset(key).then((blob) => {
      if (blob && mounted) {
        urlRef.current = URL.createObjectURL(blob);
        setUrl(urlRef.current);
      }
    });
    return () => {
      mounted = false;
    };
  }, [state.drafts]);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      recorder.current?.state === "recording" && recorder.current.stop();
      stream.current?.getTracks().forEach((t) => t.stop());
      speech.current?.abort();
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      window.speechSynthesis?.cancel();
      promptAudio.current?.pause();
    };
  }, []);
  useEffect(() => {
    if (!preparing) return;
    prepDeadline.current = Date.now() + prepRemaining * 1000;
    const id = setInterval(() => {
      const left = Math.max(
        0,
        Math.ceil((prepDeadline.current - Date.now()) / 1000),
      );
      setPrepRemaining(left);
      if (!left) {
        setPreparing(false);
        setPrepared(true);
        setNotice(
          "1分钟准备结束。点击录音开始回答，最长2分钟；这是分部计时练习，不是官方整场评分。",
        );
      }
    }, 250);
    return () => clearInterval(id);
  }, [preparing]);
  useEffect(() => {
    if (!recording) return;
    const id = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startAt.current) / 1000);
      setDuration(elapsed);
      if (elapsed >= 120) recorder.current?.stop();
    }, 200);
    return () => clearInterval(id);
  }, [recording]);
  const begin = async () => {
    if (mode === "exam" && part === "2" && !prepared) {
      setNotice("Part 2计时练习先完成1分钟准备。");
      return;
    }
    promptAudio.current?.pause();
    window.speechSynthesis?.cancel();
    setNotice("");
    setAudioKey(undefined);
    try {
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
        setNotice(
          "此浏览器不支持网页录音，请使用HTTPS或本机浏览器；仍可输入回答练习。",
        );
        return;
      }
      stream.current = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      chunks.current = [];
      const rec = new MediaRecorder(stream.current);
      recorder.current = rec;
      rec.ondataavailable = (e) => {
        if (e.data.size) chunks.current.push(e.data);
      };
      rec.onstop = async () => {
        stream.current?.getTracks().forEach((t) => t.stop());
        speech.current?.stop();
        const blob = new Blob(chunks.current, { type: rec.mimeType });
        const key = uid();
        try {
          await saveAsset(key, blob);
          update((s) => ({
            ...s,
            drafts: {
              ...s.drafts,
              "speaking-audio": key,
              "speaking-duration": String(
                Math.floor((Date.now() - startAt.current) / 1000),
              ),
            },
          }));
          if (active.current) {
            if (urlRef.current) URL.revokeObjectURL(urlRef.current);
            urlRef.current = URL.createObjectURL(blob);
            setUrl(urlRef.current);
            setAudioKey(key);
            setRecording(false);
          }
        } catch {
          if (active.current) {
            setNotice(
              "录音保存失败，可能是存储空间不足；请保留转写并导出已有数据。",
            );
            setRecording(false);
          }
        }
      };
      rec.start(500);
      startAt.current = Date.now();
      setDuration(0);
      setRecording(true);
      if (recognition) {
        const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!Ctor) {
          setNotice(
            "当前浏览器不支持语音识别；录音正常进行，请回放后手动确认转写。",
          );
          return;
        }
        const r = new Ctor();
        speech.current = r;
        r.lang = "en-GB";
        r.continuous = true;
        r.interimResults = false;
        let text = "";
        r.onresult = (e) => {
          for (let i = e.resultIndex; i < e.results.length; i++)
            if (e.results[i].isFinal) text += e.results[i][0].transcript + " ";
          setTranscript(text.trim());
        };
        r.onerror = (e) =>
          setNotice(
            `自动转写不可用（${e.error}），录音继续保存。请回放并手动输入。`,
          );
        try {
          r.start();
        } catch {
          setNotice("转写未启动，录音仍在进行。");
        }
      }
    } catch {
      setNotice(
        "没有获得麦克风权限或设备不可用。请检查浏览器权限；你也可以先输入一句回答。",
      );
    }
  };
  const demo = async () => {
    promptAudio.current?.pause();
    window.speechSynthesis?.cancel();
    const voice = window.speechSynthesis
      ?.getVoices()
      .find((v) => v.lang.toLowerCase() === "en-gb");
    if (!voice) {
      const audio = new Audio(
        `/audio/speaking/${topic.id}-${part}-${questionIndex % questions.length}-model-${level <= 2 ? "basic" : "extended"}.mp3`,
      );
      promptAudio.current = audio;
      try {
        await audio.play();
        setNotice(
          "正在播放本站合成的起步示范。用自己的经历改写，不背整篇答案。",
        );
      } catch {
        setNotice("示范音频暂不可用，可以先阅读示范句再录自己的回答。");
      }
      return;
    }
    const utterance = new SpeechSynthesisUtterance(lesson.model);
    utterance.lang = "en-GB";
    utterance.voice = voice;
    utterance.rate = mode === "exam" ? 1 : 0.9;
    speechSynthesis.speak(utterance);
  };
  const submit = async () => {
    if (!transcript.trim() || busy) return;
    setBusy(true);
    const examContext: SpeakingContext = {
      part,
      topic: topic.title,
      mode,
      criterion: speakingCriteria[part],
      ...(duration ? { duration } : {}),
    };
    const result = await getFeedback(
      transcript,
      "speaking",
      level,
      lesson.question,
      examContext,
    );
    const id = uid();
    update((s) => ({
      ...s,
      speaking: [
        ...s.speaking,
        {
          id,
          date: localDate(),
          level,
          prompt: lesson.question,
          transcript,
          duration,
          audioKey,
          feedback: speakingFeedbackContext(
            result.feedback,
            examContext,
            transcript,
          ),
          examContext,
        },
      ],
    }));
    setSelected(id);
    setNotice(result.notice);
    setBusy(false);
  };
  const changeQuestion = (
    nextTopic: string,
    nextPart: SpeakingContext["part"],
    nextIndex: number,
  ) => {
    if (recording || busy) return;
    if (
      (transcript.trim() || audioKey) &&
      !selected &&
      !confirm(
        "当前回答尚未提交。切换题目会清空当前草稿；已保存历史不受影响。继续吗？",
      )
    )
      return;
    setTopicId(nextTopic);
    setPart(nextPart);
    setQuestionIndex(nextIndex);
    setSelected(undefined);
    setPreparing(false);
    setPrepared(false);
    setPrepRemaining(60);
    setDuration(0);
    setAudioKey(undefined);
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = "";
    setUrl("");
    promptAudio.current?.pause();
    window.speechSynthesis?.cancel();
    update((s) => ({
      ...s,
      drafts: {
        ...s.drafts,
        speaking: "",
        "speaking-audio": "",
        "speaking-duration": "0",
        "speaking-topic": nextTopic,
        "speaking-part": nextPart,
        "speaking-question-index": String(nextIndex),
      },
    }));
  };
  const hearQuestion = async () => {
    promptAudio.current?.pause();
    window.speechSynthesis?.cancel();
    const voice = window.speechSynthesis
      ?.getVoices()
      .find((v) => v.lang.toLowerCase() === "en-gb");
    if (voice) {
      const u = new SpeechSynthesisUtterance(lesson.question);
      u.voice = voice;
      u.rate = mode === "exam" ? 1 : 0.9;
      speechSynthesis.speak(u);
    } else {
      const audio = new Audio(
        `/audio/speaking/${topic.id}-${part}-${questionIndex % questions.length}.mp3`,
      );
      promptAudio.current = audio;
      try {
        await audio.play();
      } catch {
        setNotice(
          "题目音频暂不可用，请阅读当前问题；没有把未播放的音频视为已听。",
        );
      }
    }
  };
  return (
    <>
      <PageTitle
        eyebrow="AI SPEAKING COACH"
        title="从说出一句，到表达自己。"
        description="按雅思Part 1、提示卡Part 2和讨论Part 3练表达。当前基础较弱时，先回答一句，再逐步扩展。"
        action={
          <Badge>
            Level {level} · {lesson.name}
          </Badge>
        }
      />
      <div className="resource-filters">
        <label className="field">
          雅思话题
          <select
            aria-label="雅思口语话题"
            value={topic.id}
            disabled={recording || busy}
            onChange={(e) => changeQuestion(e.target.value, part, 0)}
          >
            {speakingTopics.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          考试部分
          <select
            aria-label="雅思口语部分"
            value={part}
            disabled={recording || busy}
            onChange={(e) =>
              changeQuestion(
                topic.id,
                e.target.value as SpeakingContext["part"],
                0,
              )
            }
          >
            <option value="1">Part 1 · 熟悉话题</option>
            <option value="2">Part 2 · 提示卡长答</option>
            <option value="3">Part 3 · 抽象讨论</option>
          </select>
        </label>
        <label className="field">
          训练方式
          <select
            aria-label="口语训练方式"
            value={mode}
            disabled={recording || busy || preparing}
            onChange={(e) => {
              setMode(e.target.value as SpeakingContext["mode"]);
              setPrepared(false);
              setPrepRemaining(60);
            }}
          >
            <option value="guided">分步教学 · 可跟读与重练</option>
            <option value="exam">分部计时 · 逐步接近考试</option>
          </select>
        </label>
      </div>
      <Notice>
        正式口试约11–14分钟，Part 1与Part 3各约4–5分钟，Part
        2有1分钟准备和1–2分钟回答。本页是原创题目的分部训练；基础阶段不强制完整模考。
        {mode === "exam" && level < 3
          ? "你当前仍在基础表达阶段，可以随时切回分步教学。"
          : ""}
      </Notice>
      <div className="coach-layout">
        <div>
          <Panel
            title="今天，聊一个熟悉的话题"
            action={
              <select
                aria-label="口语训练等级"
                value={level}
                disabled={recording}
                onChange={(e) => {
                  update((s) => ({
                    ...s,
                    levels: { ...s.levels, speaking: Number(e.target.value) },
                  }));
                  setSelected(undefined);
                }}
              >
                {speakingLessons.map((l, i) => (
                  <option key={l.name} value={i + 1}>
                    Level {i + 1} · {l.name}
                  </option>
                ))}
              </select>
            }
          >
            <div className="speaking-question">
              <span>YOUR QUESTION</span>
              <h2>{lesson.question}</h2>
              <p>{lesson.help}</p>
              {part === "2" && (
                <ul className="cue-card">
                  {topic.bullets.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              )}
              <div className="row wrap">
                <button
                  className="button secondary"
                  disabled={recording}
                  onClick={hearQuestion}
                >
                  <Volume2 size={16} />
                  听考官式提问
                </button>
                <button
                  className="text-link"
                  disabled={recording || busy || preparing}
                  onClick={() =>
                    part === "2"
                      ? changeQuestion(
                          speakingTopics[
                            (speakingTopics.indexOf(topic) + 1) %
                              speakingTopics.length
                          ].id,
                          part,
                          0,
                        )
                      : changeQuestion(topic.id, part, questionIndex + 1)
                  }
                >
                  {part === "2" ? "换一张提示卡 →" : "换一道同话题问题 →"}
                </button>
              </div>
              {part === "2" && (
                <div className="timer-box">
                  <strong>准备时间 {clock(prepRemaining)}</strong>
                  <button
                    className="button secondary"
                    disabled={recording || preparing || prepared}
                    onClick={() => {
                      setPrepRemaining(60);
                      setPreparing(true);
                    }}
                  >
                    开始1分钟准备
                  </button>
                  <label className="field">
                    关键词笔记
                    <textarea
                      aria-label="Part 2关键词笔记"
                      value={state.drafts[`cue-notes-${topic.id}`] || ""}
                      onChange={(e) =>
                        update((s) => ({
                          ...s,
                          drafts: {
                            ...s.drafts,
                            [`cue-notes-${topic.id}`]: e.target.value,
                          },
                        }))
                      }
                    />
                  </label>
                </div>
              )}
            </div>
            <div
              className={`recording-area ${recording ? "is-recording" : ""}`}
            >
              <button
                className="record-button"
                aria-label={recording ? "停止录音" : "开始录音"}
                onClick={() =>
                  recording
                    ? recorder.current?.state === "recording" &&
                      recorder.current.stop()
                    : begin()
                }
                disabled={
                  busy ||
                  preparing ||
                  (mode === "exam" && part === "2" && !prepared)
                }
              >
                {recording ? <Square size={27} /> : <Mic size={30} />}
              </button>
              <h3>{recording ? "正在听你说…" : "准备好了，就说一句。"}</h3>
              <span className="mono">{clock(duration)} / 02:00</span>
              <p>短回答也有价值 · 最长录制2分钟</p>
            </div>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={recognition}
                disabled={recording}
                onChange={(e) => setRecognition(e.target.checked)}
              />
              启用浏览器语音识别（可选）
            </label>
            <p className="tiny">
              <ShieldCheck size={14} className="inline-icon" />
              自动转写可能由浏览器厂商在线处理音频；默认关闭。不支持时可手动输入，录音保存在本机。
            </p>
            {url && <audio controls src={url} />}
            <label className="field">
              我的回答 / 确认转写
              <textarea
                maxLength={15000}
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="先录音，再核对转写；也可以直接写下你说出的句子。"
              />
            </label>
            <div className="row wrap">
              <button
                className="button primary"
                onClick={submit}
                disabled={!transcript.trim() || busy || recording}
              >
                <Sparkles size={16} />
                {busy ? "正在分析…" : "分析这次表达"}
              </button>
              <button
                className="button secondary"
                disabled={recording}
                onClick={() => {
                  setSelected(undefined);
                  update((s) => ({
                    ...s,
                    drafts: {
                      ...s.drafts,
                      speaking: "",
                      "speaking-audio": "",
                      "speaking-duration": "0",
                    },
                  }));
                  if (urlRef.current) URL.revokeObjectURL(urlRef.current);
                  urlRef.current = "";
                  setUrl("");
                  setDuration(0);
                  setAudioKey(undefined);
                  setNotice(
                    "可以针对同一个问题重新录制。前一次已提交的练习会保留在历史中。",
                  );
                }}
              >
                <RotateCcw size={16} />
                重新练一次
              </button>
            </div>
            {notice && <Notice>{notice}</Notice>}
          </Panel>
          {record && (
            <Panel title="这次的反馈">
              <FeedbackCard feedback={record.feedback} />
              <Notice>
                反馈基于你确认的转写文本，不是声学发音评分。回答较短时不会据此给出低分预测。
              </Notice>
            </Panel>
          )}
        </div>
        <div>
          <Panel title="听示范，学会表达">
            <Badge tone="blue">示范，不是标准答案</Badge>
            <blockquote className="english-example">{lesson.model}</blockquote>
            <button className="button secondary" onClick={demo}>
              <Volume2 size={16} />
              慢速听一遍
            </button>
            <ol className="teaching-list">
              <li>听一遍，注意主语和动词。</li>
              <li>跟读一次，再换成自己的原因。</li>
              <li>不看示范，重新录制。</li>
            </ol>
            <Notice>
              短口语优先用because、but、also、for
              example自然展开；不强迫套用moreover等写作连接词。
            </Notice>
            <Link className="text-link" href="/vocabulary">
              练习你资料中的连接表达 →
            </Link>
          </Panel>
          <Panel
            title="前后对比 · 我的录音"
            subtitle="每次提交分别保存，不覆盖前一次"
          >
            {state.speaking.length ? (
              <div className="speaking-history">
                {state.speaking
                  .slice()
                  .reverse()
                  .map((r) => (
                    <article key={r.id}>
                      <div className="row between">
                        <strong>
                          {r.date} · L{r.level}
                          {r.examContext &&
                            ` · Part ${r.examContext.part} · ${r.examContext.topic}`}
                        </strong>
                        <button
                          className="text-link"
                          onClick={() => setSelected(r.id)}
                        >
                          看反馈
                        </button>
                      </div>
                      <p>{r.transcript}</p>
                      <SavedAudio record={r} />
                    </article>
                  ))}
              </div>
            ) : (
              <Empty title="先留下自己的声音">
                从一句完整回答开始，慢慢听见变化。
              </Empty>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
