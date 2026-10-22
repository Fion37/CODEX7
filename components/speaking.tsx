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
  const lesson = speakingLessons[level - 1];
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
    };
  }, []);
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
        r.lang = "en-US";
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
  const demo = () => {
    if (!window.speechSynthesis) {
      setNotice("当前浏览器不支持朗读，请阅读示范。");
      return;
    }
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(lesson.model);
    utterance.lang = "en-GB";
    utterance.rate = 0.85;
    speechSynthesis.speak(utterance);
  };
  const submit = async () => {
    if (!transcript.trim() || busy) return;
    setBusy(true);
    const result = await getFeedback(
      transcript,
      "speaking",
      level,
      lesson.question,
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
          feedback: result.feedback,
        },
      ],
    }));
    setSelected(id);
    setNotice(result.notice);
    setBusy(false);
  };
  return (
    <>
      <PageTitle
        eyebrow="AI SPEAKING COACH"
        title="从说出一句，到表达自己。"
        description="不用说得很长。每次只改最重要的1–3个问题，再录一次听听变化。"
        action={
          <Badge>
            Level {level} · {lesson.name}
          </Badge>
        }
      />
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
                disabled={busy}
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
