"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Volume2,
  ArrowRight,
  Eye,
  Check,
  Search,
  BookmarkPlus,
} from "lucide-react";
import { useStudy } from "./store";
import { PageTitle, Panel, Badge, Notice, Modal, Empty } from "./ui";
import {
  allVocabulary,
  dueVocabulary,
  normalizeListeningAnswer,
} from "@/lib/curriculum";
import { addDays, localDate, uid } from "@/lib/model";
import type { VocabularyItem } from "@/lib/resource-model";
export function Vocabulary() {
  const { state, update } = useStudy();
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("all");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("checked");
  const [limit, setLimit] = useState(60);
  const [chosen, setChosen] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [plays, setPlays] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [notice, setNotice] = useState("");
  const [checking, setChecking] = useState<VocabularyItem | null>(null);
  const [meaning, setMeaning] = useState("");
  const [audioSource, setAudioSource] = useState("");
  const audio = useRef<HTMLAudioElement | null>(null);
  const items = allVocabulary(state);
  const due = dueVocabulary(state, localDate());
  const current =
    items.find((v) => v.id === chosen && v.status === "checked") ||
    due[0]?.item;
  const practiceMode =
    current?.kind === "connector"
      ? "usage"
      : current?.kind === "paraphrase"
        ? "paraphrase"
        : "dictation";
  const filtered = items.filter(
    (v) =>
      (kind === "all" || v.kind === kind) &&
      (category === "all" || v.category === category) &&
      (status === "all" || v.status === status) &&
      (v.term + " " + v.meaning + " " + (v.alternative || ""))
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  useEffect(() => {
    const item = new URLSearchParams(location.search).get("item");
    if (item) setChosen(item);
    return () => {
      audio.current?.pause();
      window.speechSynthesis?.cancel();
    };
  }, []);
  const begin = (id: string) => {
    audio.current?.pause();
    window.speechSynthesis?.cancel();
    setChosen(id);
    setAnswer("");
    setPlays(0);
    setRevealed(false);
    setSubmitted(false);
    setNotice("");
    setAudioSource("");
  };
  const play = async () => {
    if (!current) return;
    const text =
      current.kind === "paraphrase"
        ? current.alternative?.split(";")[0] || current.term
        : current.term;
    audio.current?.pause();
    window.speechSynthesis?.cancel();
    const voice = window.speechSynthesis
      ?.getVoices()
      .find((v) => v.lang.toLowerCase() === "en-gb");
    if (voice) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.voice = voice;
      utterance.lang = "en-GB";
      utterance.rate = 0.9;
      utterance.onstart = () => {
        setPlays((n) => n + 1);
        setAudioSource("系统英式英语语音（合成）");
      };
      utterance.onerror = () =>
        setNotice("系统语音播放失败，请使用示范阅读，不把它记作听写掌握。");
      speechSynthesis.speak(utterance);
      return;
    }
    if (current.status === "checked" && /^([vpc])-[\w-]+$/.test(current.id)) {
      const clip = new Audio(`/audio/vocabulary/${current.id}.mp3`);
      audio.current = clip;
      try {
        await clip.play();
        setPlays((n) => n + 1);
        setAudioSource("本站合成词汇音频；不是正式考试录音");
        return;
      } catch {
        setNotice("本词尚无预制音频，使用当前浏览器英语语音或先看示范。");
      }
    }
    if (window.speechSynthesis) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-GB";
      utterance.rate = 0.9;
      utterance.onstart = () => {
        setPlays((n) => n + 1);
        setAudioSource("浏览器系统合成语音");
      };
      speechSynthesis.speak(utterance);
    } else
      setNotice("此浏览器没有可用语音。先查看示范并练习，不作为独立听写成绩。");
  };
  const correct = current
    ? practiceMode === "usage"
      ? answer.trim().toLowerCase().includes(current.term.toLowerCase()) &&
        answer.trim().split(/\s+/).length >= 5
      : normalizeListeningAnswer(answer) ===
        normalizeListeningAnswer(current.term)
    : false;
  const save = () => {
    if (
      !current ||
      !answer.trim() ||
      (practiceMode !== "usage" && plays < 1 && !revealed)
    )
      return;
    setChosen(current.id);
    const last = state.vocabularyAttempts
      .filter((a) => a.itemId === current.id)
      .at(-1);
    const interval =
      correct && !revealed ? (last?.correct && !last.revealed ? 7 : 3) : 1;
    update((s) => ({
      ...s,
      vocabularyAttempts: [
        ...s.vocabularyAttempts,
        {
          id: uid(),
          date: localDate(),
          itemId: current.id,
          answer,
          correct,
          mode: practiceMode,
          plays,
          revealed,
          nextReview: addDays(localDate(), interval),
        },
      ],
    }));
    setSubmitted(true);
  };
  const addError = () => {
    if (!current) return;
    update((s) => ({
      ...s,
      errors: [
        ...s.errors,
        {
          id: uid(),
          date: localDate(),
          subject: current.kind === "connector" ? "speaking" : "listening",
          category:
            current.kind === "paraphrase"
              ? "同义替换"
              : current.kind === "connector"
                ? "表达"
                : "拼写",
          question: `${current.meaning}：请在新语境中回想并使用。`,
          answer: `${current.term}${current.alternative ? " ↔ " + current.alternative : ""}`,
          reason: current.note,
          nextReview: localDate(),
          interval: 0,
          reviews: [],
        },
      ],
    }));
    setNotice("已加入错题本，之后用新句子检验迁移。");
  };
  return (
    <>
      <PageTitle
        eyebrow="HEAR · SPELL · REPHRASE · USE"
        title="认识、听出、写对，再放进语境。"
        description="基于你提供的场景词、改写与连接表达。先练核对过的基础条目，不机械背诵等号。"
        action={
          <Link href="/resources" className="button secondary">
            管理我的资料
          </Link>
        }
      />
      <div className="learning-summary">
        <span>
          资料索引 <strong>{items.length}</strong>
        </span>
        <span>
          可直接训练{" "}
          <strong>{items.filter((v) => v.status === "checked").length}</strong>
        </span>
        <span>
          到期与新词 <strong>{due.length}</strong>
        </span>
        <span>
          真实尝试 <strong>{state.vocabularyAttempts.length}</strong>
        </span>
      </div>
      {current ? (
        <Panel
          title={
            practiceMode === "usage"
              ? "把连接表达用在自己的回答里"
              : practiceMode === "paraphrase"
                ? "听到改写，定位原表达"
                : "今天先练一个场景词"
          }
          action={<Badge tone="blue">{current.category}</Badge>}
        >
          <div className="vocab-practice">
            <div>
              <span className="eyebrow">
                {practiceMode === "usage" ? "SPEAK NATURALLY" : "LISTEN FIRST"}
              </span>
              <h2>{current.meaning}</h2>
              <p>
                {practiceMode === "usage"
                  ? `用 ${current.term} 写一个至少5词的自然回答。`
                  : "先听一次，再尝试写出对应的英文。首次和复听都会留下记录。"}
              </p>
              <div className="row wrap">
                <button className="button dark" onClick={play}>
                  <Volume2 size={16} />
                  播放词语 / 改写
                </button>
                <button
                  className="button secondary"
                  onClick={() => setRevealed(true)}
                >
                  <Eye size={16} />
                  需要示范，先降低难度
                </button>
                <Badge tone="gray">已播放{plays}次</Badge>
              </div>
              {audioSource && <p className="tiny">{audioSource}</p>}
              {(revealed || submitted || practiceMode === "usage") && (
                <blockquote>
                  <strong>{current.term}</strong>
                  {current.alternative && <p>{current.alternative}</p>}
                  <p>{current.note}</p>
                  {current.example && <p>{current.example}</p>}
                </blockquote>
              )}
            </div>
            <div>
              <label className="field">
                我的词汇练习答案
                <textarea
                  aria-label="词汇练习答案"
                  value={answer}
                  disabled={submitted}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder={
                    practiceMode === "usage"
                      ? "Write one sentence about yourself…"
                      : "Write what you hear…"
                  }
                />
              </label>
              <button
                className="button primary"
                disabled={
                  submitted ||
                  !answer.trim() ||
                  (practiceMode !== "usage" && plays === 0 && !revealed)
                }
                onClick={save}
              >
                保存这次练习
              </button>
              {submitted && (
                <div
                  className={`answer-feedback ${correct ? "right" : "wrong"}`}
                >
                  <Badge tone={correct ? "mint" : "amber"}>
                    {practiceMode === "usage"
                      ? "已记录表达尝试"
                      : correct
                        ? "拼写 / 对应表达正确"
                        : "回到声音、词形和语境再练一次"}
                  </Badge>
                  <p>
                    {practiceMode === "usage"
                      ? "规则仅检查是否使用目标表达，不代表句意和语法完全正确。可带到口语教师继续练。"
                      : correct
                        ? "接下来在不同句子里确认能否听出，不把熟悉单个单词当成正式考试能力。"
                        : `参考：${current.term}。${current.note}`}
                  </p>
                  <p className="tiny">
                    {revealed
                      ? "本次看过示范，保留为有支架练习，不标为独立掌握。"
                      : "本次未打开示范。"}
                    复习已安排。
                  </p>
                  <div className="row wrap">
                    <button className="button secondary" onClick={addError}>
                      <BookmarkPlus size={15} />
                      加入复练
                    </button>
                    <button
                      className="button primary"
                      onClick={() =>
                        begin(
                          due.find(({ item }) => item.id !== current.id)?.item
                            .id || current.id,
                        )
                      }
                    >
                      下一个词 <ArrowRight size={15} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          <p className="tiny">
            出处：{current.source} · 第{current.page}页。
            {current.status === "review" ? "当前条目仍待核对。" : ""}
          </p>
          {notice && <Notice>{notice}</Notice>}
        </Panel>
      ) : (
        <Empty title="本轮到期词已完成">
          可以去听力题型训练，或检查新的资料候选。
        </Empty>
      )}
      <Panel
        title="场景词、语境改写与连接表达"
        subtitle="默认只显示核对过的条目；待核对内容不自动进入每日训练"
      >
        <div className="resource-filters">
          <label className="resource-search">
            <Search size={16} />
            <input
              aria-label="搜索词汇"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setLimit(60);
              }}
              placeholder="英文、中文、改写…"
            />
          </label>
          <select
            aria-label="词汇类型"
            value={kind}
            onChange={(e) => {
              setKind(e.target.value);
              setLimit(60);
            }}
          >
            <option value="all">全部类型</option>
            <option value="word">场景词</option>
            <option value="paraphrase">语境改写</option>
            <option value="connector">连接与基础表达</option>
          </select>
          <select
            aria-label="词汇场景"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setLimit(60);
            }}
          >
            <option value="all">全部场景</option>
            {[...new Set(items.map((v) => v.category))].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <select
            aria-label="词汇核对状态"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setLimit(60);
            }}
          >
            <option value="checked">已核对</option>
            <option value="review">待核对</option>
            <option value="all">全部索引</option>
          </select>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>英文与表达</th>
                <th>含义 / 语境</th>
                <th>出处</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, limit).map((v) => (
                <tr key={v.id}>
                  <td>
                    <strong>{v.term}</strong>
                    {v.alternative && <small>{v.alternative}</small>}
                  </td>
                  <td>
                    <span>{v.meaning}</span>
                    <small>{v.note}</small>
                  </td>
                  <td>
                    <Badge tone={v.status === "checked" ? "mint" : "amber"}>
                      {v.status === "checked" ? "已核对" : "待核对"}
                    </Badge>
                    <small>
                      {v.source} · {v.page}页
                    </small>
                  </td>
                  <td>
                    {v.status === "checked" ? (
                      <button
                        className="text-link"
                        onClick={() => {
                          begin(v.id);
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                      >
                        练这个
                      </button>
                    ) : (
                      <button
                        className="text-link"
                        onClick={() => {
                          setChecking(v);
                          setMeaning(v.meaning);
                        }}
                      >
                        核对条目
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="tiny">
          显示{Math.min(limit, filtered.length)} / {filtered.length}
          个索引。检索与收藏不等于已掌握。
        </p>
        {filtered.length > limit && (
          <button
            className="button secondary"
            onClick={() => setLimit(limit + 60)}
          >
            再显示60条
          </button>
        )}
      </Panel>
      {checking && (
        <Modal title="核对后再加入训练" onClose={() => setChecking(null)}>
          <h2>{checking.term}</h2>
          {checking.alternative && (
            <blockquote>{checking.alternative}</blockquote>
          )}
          <Notice>
            {checking.note}{" "}
            请结合原文或词典核对，不要仅因为词表用等号连接就认定完全等义。
          </Notice>
          <label className="field">
            我核对后的释义
            <input
              value={meaning}
              maxLength={500}
              onChange={(e) => setMeaning(e.target.value)}
            />
          </label>
          <button
            className="button primary"
            disabled={!meaning.trim()}
            onClick={() => {
              update((s) => ({
                ...s,
                vocabularyOverrides: {
                  ...s.vocabularyOverrides,
                  [checking.id]: { status: "checked", meaning },
                },
              }));
              setChecking(null);
            }}
          >
            <Check size={16} />
            已核对，加入个人训练
          </button>
        </Modal>
      )}
    </>
  );
}
