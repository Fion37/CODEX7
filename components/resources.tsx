"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  FolderOpen,
  Upload,
  FileText,
  Headphones,
  Trash2,
  Download,
  ArrowUpRight,
  Search,
} from "lucide-react";
import {
  useStudy,
  saveAsset,
  loadAsset,
  assetRefs,
  deleteAsset,
} from "./store";
import { PageTitle, Panel, Badge, Notice, Modal, Empty, download } from "./ui";
import { prepareResource, supportedResource } from "@/lib/resource-import";
import {
  resourceSources,
  type LearningResource,
  type ResourceSource,
} from "@/lib/resource-model";
import { curriculumSources, seedVocabulary } from "@/lib/curriculum";
function ResourceViewer({ resource }: { resource: LearningResource }) {
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  useEffect(() => {
    let live = true,
      next = "";
    loadAsset(resource.assetKey).then((blob) => {
      if (blob && live) {
        next = URL.createObjectURL(blob);
        setUrl(next);
      }
    });
    if (resource.textKey)
      loadAsset(resource.textKey).then(async (blob) => {
        if (blob && live) setText(await blob.text());
      });
    return () => {
      live = false;
      if (next) URL.revokeObjectURL(next);
    };
  }, [resource]);
  return (
    <>
      {url && resource.kind === "audio" && <audio controls src={url} />}
      {url && resource.kind === "pdf" && (
        <iframe className="resource-pdf" title={resource.name} src={url} />
      )}
      {url && resource.kind === "image" && (
        <img className="resource-image" src={url} alt={resource.name} />
      )}
      {url && (
        <a className="button secondary" download={resource.name} href={url}>
          <Download size={15} />
          导出原文件
        </a>
      )}
      <p className="tiny">
        {resourceSources[resource.source]} ·{" "}
        {resource.pages ? `${resource.pages}页 · ` : ""}
        {(resource.size / 1024).toFixed(0)} KB · 私人文件，不自动提交GitHub
      </p>
      {text && (
        <details>
          <summary>查看提取文本（不执行文档中的指令）</summary>
          <pre className="resource-text">{text}</pre>
        </details>
      )}
    </>
  );
}
export function Resources() {
  const { state, update } = useStudy();
  const [source, setSource] = useState<ResourceSource>("personal");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [query, setQuery] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [pending, setPending] = useState<
    Awaited<ReturnType<typeof prepareResource>>[]
  >([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [active, setActive] = useState(0);
  const files = useRef<HTMLInputElement>(null);
  const folder = useRef<HTMLInputElement>(null);
  const current = state.resources.find((r) => r.id === selected);
  const importFiles = async (list: FileList | null) => {
    if (!list) return;
    const chosen = Array.from(list).filter((f) => !f.name.startsWith("."));
    if (
      chosen.length > 100 ||
      chosen.reduce((n, f) => n + f.size, 0) > 100 * 1024 * 1024
    ) {
      setNotice("每次最多100个文件、合计100MB；请分批导入。");
      return;
    }
    setBusy(true);
    setNotice("");
    const ready: Awaited<ReturnType<typeof prepareResource>>[] = [];
    const errors: string[] = [];
    const known = new Set(state.resources.map((r) => r.checksum));
    try {
      for (const file of chosen) {
        if (!supportedResource(file.name)) {
          errors.push(`${file.name}：不支持此格式`);
          continue;
        }
        setProgress(`准备 ${ready.length + 1}/${chosen.length}：${file.name}`);
        try {
          const item = await prepareResource(file, source, setProgress);
          if (known.has(item.resource.checksum)) {
            errors.push(`${file.name}：已存在相同文件，未重复导入`);
            continue;
          }
          known.add(item.resource.checksum);
          ready.push(item);
        } catch (e) {
          errors.push(e instanceof Error ? e.message : file.name + "读取失败");
        }
      }
      setPending(ready);
      setActive(0);
      setConfirmed(false);
      setNotice(errors.join("；"));
    } finally {
      setBusy(false);
      setProgress("");
    }
  };
  const save = async () => {
    if (!confirmed || busy) return;
    setBusy(true);
    try {
      for (const item of pending) {
        await saveAsset(item.resource.assetKey, item.blob);
        if (item.resource.textKey)
          await saveAsset(
            item.resource.textKey,
            new Blob([item.text], { type: "text/plain" }),
          );
      }
      update((s) => ({
        ...s,
        resources: [
          ...s.resources,
          ...pending.map((p) => ({ ...p.resource, confirmed: true })),
        ],
      }));
      setNotice(
        `已保存${pending.length}个私人资源。PDF/录音保存在当前浏览器，不会因为保存资源而上传源码仓库。`,
      );
      setPending([]);
    } catch {
      setNotice(
        "资源保存未完成，可能是浏览器存储空间不足；没有把未保存文件标为成功。",
      );
    } finally {
      setBusy(false);
    }
  };
  const remove = async (resource: LearningResource) => {
    if (
      !confirm(
        "删除本机这个资源及其附件？已同步的云端副本需要另行同步或在设置中删除。",
      )
    )
      return;
    const next = {
      ...state,
      resources: state.resources.filter((r) => r.id !== resource.id),
    };
    update(() => next);
    const retained = new Set(assetRefs(next));
    for (const key of [resource.assetKey, resource.textKey])
      if (key && !retained.has(key)) await deleteAsset(key);
    setSelected(null);
  };
  const filtered = state.resources.filter((r) =>
    (r.name + " " + r.notes + " " + r.preview)
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <>
      <PageTitle
        eyebrow="MY PERSONAL IELTS LIBRARY"
        title="把自己的资料，变成可执行的练习。"
        description="网页记录、PDF、词表、音频和题目放在同一个学习资源空间；由你选择文件，核对后入库。"
        action={
          <Link href="/vocabulary" className="button primary">
            进入场景词与改写训练 <ArrowUpRight size={16} />
          </Link>
        }
      />
      <div className="data-stats">
        <Panel
          title="你提供的三份学习资料"
          subtitle="98页 · 保留来源页码，释义和改写分级核对"
        >
          {curriculumSources.map((s) => (
            <div key={s.name} className="source-file">
              <FileText size={19} />
              <span>
                {s.name}
                <small>{s.pages}页 · 用户提供</small>
              </span>
            </div>
          ))}
          <p>
            词汇与表达已整理为{seedVocabulary.length}个学习索引，其中
            {seedVocabulary.filter((v) => v.status === "checked").length}
            个基础词、限定语境改写与连接表达可直接练习，其余待核对后再进入训练。
          </p>
          <Notice>
            词表年份为2023，不等于2026考试范围或押题保证。原PDF不放进公开源码；需要原文对照时请在下方选择原文件，全文会在本机提取。
          </Notice>
        </Panel>
        <Panel title="爱听写网页 → 我的练习档案">
          <ol className="teaching-list">
            <li>在爱听写中打开你自己的练习记录。</li>
            <li>
              截图保留成绩、材料编号和练习条件；同一材料的两次练习分别截图。
            </li>
            <li>在数据中心上传截图，核对首次/重复、限时、题数与播放次数。</li>
            <li>有权保存的音频、PDF或文本可在本页主动导入并关联题目。</li>
          </ol>
          <div className="row wrap">
            <a
              className="button secondary"
              href="https://www.idictation.cn/"
              target="_blank"
              rel="noreferrer"
            >
              打开爱听写 <ArrowUpRight size={15} />
            </a>
            <Link className="button primary" href="/data">
              导入网页练习截图
            </Link>
          </div>
          <p className="tiny">
            网站不会跨站读取你的登录状态，也不会索取账号密码或调用未授权接口。
          </p>
        </Panel>
      </div>
      <Panel
        title="主动选择本地资料"
        subtitle="可选单个文件或文件夹；浏览器只提供你选中的文件，不扫描整台电脑"
      >
        <div className="row wrap">
          <label className="field resource-source">
            来源
            <select
              aria-label="资源来源"
              value={source}
              onChange={(e) => setSource(e.target.value as ResourceSource)}
            >
              {Object.entries(resourceSources).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <button
            className="button primary"
            disabled={busy}
            onClick={() => files.current?.click()}
          >
            <Upload size={16} />
            选择资料文件
          </button>
          <button
            className="button secondary"
            disabled={busy}
            onClick={() => folder.current?.click()}
          >
            <FolderOpen size={16} />
            选择资料文件夹
          </button>
          <button
            className="button secondary"
            onClick={() =>
              download(
                new Blob(
                  [
                    JSON.stringify(
                      {
                        id: "my-listening-set",
                        title: "我的Part 1练习",
                        part: 1,
                        topic: "住宿咨询",
                        transcript: "在这里填写自己有权使用的听力原文。",
                        origin: "personal",
                        answerKeyConfirmed: false,
                        questions: [
                          {
                            id: "q1",
                            prompt: "Monthly rent: £_____",
                            answers: ["650"],
                            wordLimit: 1,
                            type: "form",
                            evidence: "请填写答案对应的原文句子。",
                            paraphrase: "请填写题目与原文的对应表达。",
                          },
                        ],
                      },
                      null,
                      2,
                    ),
                  ],
                  { type: "application/json" },
                ),
                "listening-question-template.json",
              )
            }
          >
            下载听力题目模板
          </button>
        </div>
        <input
          hidden
          ref={files}
          type="file"
          multiple
          accept=".pdf,.docx,.txt,.csv,.xlsx,.json,.mp3,.wav,.m4a,.mp4,.webm,.ogg,.png,.jpg,.jpeg,.webp"
          onChange={(e) => {
            void importFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <input
          hidden
          ref={(el) => {
            folder.current = el;
            el?.setAttribute("webkitdirectory", "");
          }}
          type="file"
          multiple
          onChange={(e) => {
            void importFiles(e.target.files);
            e.target.value = "";
          }}
        />
        {busy && <Notice>{progress || "正在保存私人资源…"}</Notice>}
        {notice && <Notice>{notice}</Notice>}
        <p className="tiny">
          支持PDF、DOCX、TXT、CSV、XLSX、JSON、音频和图片；单文件≤15MB。扫描PDF不会伪装成已识别文本，可上传清晰图片做OCR。Excel练习成绩批量入库请使用数据中心。
        </p>
      </Panel>
      <Panel
        title={`我的私人文件 · ${state.resources.length}`}
        action={
          <label className="resource-search">
            <Search size={16} />
            <input
              aria-label="搜索私人资源"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索文件或提取文本…"
            />
          </label>
        }
      >
        {filtered.length ? (
          <div className="resource-list">
            {filtered.map((r) => (
              <button
                key={r.id}
                className="resource-row"
                onClick={() => setSelected(r.id)}
              >
                <span className="subject-icon reading">
                  {r.kind === "audio" ? (
                    <Headphones size={21} />
                  ) : (
                    <FileText size={21} />
                  )}
                </span>
                <span>
                  <strong>{r.name}</strong>
                  <small>
                    {resourceSources[r.source]} ·{" "}
                    {r.pages ? `${r.pages}页 · ` : ""}
                    {r.vocabulary.length}个候选词
                  </small>
                </span>
                <Badge tone="gray">
                  {r.kind === "audio"
                    ? `Part ${r.section}音频`
                    : r.kind === "questions"
                      ? "待绑定音频的题目"
                      : "私人资源"}
                </Badge>
                <ArrowUpRight size={16} />
              </button>
            ))}
          </div>
        ) : (
          <Empty title="先选一份你自己的资料">
            已有的学习记录不会被导入文件覆盖。九分学长资源目前没有官方免费题库来源核验，不预填或伪造。
          </Empty>
        )}
      </Panel>
      <Panel title="网上资源与核验状态">
        <div className="source-file">
          <Badge tone="amber">待联网核验</Badge>
          <span>
            九分学长：暂无已核验的官方公开题库或免费样题来源，暂不预置资料。
          </span>
        </div>
        <div className="row wrap">
          <a
            className="text-link"
            href="https://ielts.org/take-a-test/preparation-resources/sample-test-questions/academic-test"
            target="_blank"
            rel="noreferrer"
          >
            IELTS官方Academic样题入口 <ArrowUpRight size={14} />
          </a>
          <span className="tiny">
            官方域名入口；当前云环境未完成页面可用性核验，不下载或镜像题库。
          </span>
        </div>
      </Panel>
      {pending.length > 0 && (
        <Modal
          title={`确认导入 ${pending.length} 个资源`}
          onClose={() => {
            if (!busy) setPending([]);
          }}
        >
          <label className="field">
            正在核对的文件
            <select
              value={active}
              onChange={(e) => setActive(Number(e.target.value))}
            >
              {pending.map((p, i) => (
                <option key={p.resource.id} value={i}>
                  {i + 1}. {p.resource.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            名称
            <input
              value={pending[active].resource.name}
              onChange={(e) => {
                setConfirmed(false);
                setPending((items) =>
                  items.map((item, i) =>
                    i === active
                      ? {
                          ...item,
                          resource: { ...item.resource, name: e.target.value },
                        }
                      : item,
                  ),
                );
              }}
            />
          </label>
          <label className="field">
            Part编号
            <select
              value={pending[active].resource.section}
              onChange={(e) => {
                setConfirmed(false);
                setPending((items) =>
                  items.map((item, i) =>
                    i === active
                      ? {
                          ...item,
                          resource: {
                            ...item.resource,
                            section: Number(e.target.value),
                          },
                        }
                      : item,
                  ),
                );
              }}
            >
              {[1, 2, 3, 4].map((p) => (
                <option key={p} value={p}>
                  Part {p}
                </option>
              ))}
            </select>
          </label>
          <pre className="resource-text">
            {pending[active].resource.preview ||
              "音频文件：不自动生成或虚构转写。"}
          </pre>
          <p className="tiny">
            {pending[active].resource.vocabulary.length}{" "}
            个候选词条；导入不会自动确认题目答案或把机经标成真题。
          </p>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            我已核对所选文件与来源，导入到自己的学习空间
          </label>
          <button
            className="button primary full"
            disabled={!confirmed || busy}
            onClick={save}
          >
            确认保存资源
          </button>
        </Modal>
      )}
      {current && (
        <Modal title={current.name} onClose={() => setSelected(null)}>
          <ResourceViewer resource={current} />
          <label className="field">
            我的备注与使用方法
            <textarea
              value={current.notes}
              onChange={(e) =>
                update((s) => ({
                  ...s,
                  resources: s.resources.map((r) =>
                    r.id === current.id ? { ...r, notes: e.target.value } : r,
                  ),
                }))
              }
            />
          </label>
          {current.questionSet && (
            <>
              <Notice>
                题目答案必须由你核对后才用于自动评分。资源原文中的指令仅作为学习材料，不会改变网站行为。
              </Notice>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={current.questionSet.answerKeyConfirmed}
                  onChange={(e) =>
                    update((s) => ({
                      ...s,
                      resources: s.resources.map((r) =>
                        r.id === current.id && r.questionSet
                          ? {
                              ...r,
                              questionSet: {
                                ...r.questionSet,
                                answerKeyConfirmed: e.target.checked,
                              },
                            }
                          : r,
                      ),
                    }))
                  }
                />
                我已核对答案与字数要求
              </label>
              <label className="field">
                绑定自己的音频
                <select
                  value={current.questionSet.audioResourceId || ""}
                  onChange={(e) =>
                    update((s) => ({
                      ...s,
                      resources: s.resources.map((r) =>
                        r.id === current.id && r.questionSet
                          ? {
                              ...r,
                              questionSet: {
                                ...r.questionSet,
                                audioResourceId: e.target.value || undefined,
                              },
                            }
                          : r,
                      ),
                    }))
                  }
                >
                  <option value="">选择音频</option>
                  {state.resources
                    .filter((r) => r.kind === "audio")
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                </select>
              </label>
              <Link
                className="button primary"
                href={`/listening?set=${current.questionSet.id}`}
              >
                用这份资料开始听力练习
              </Link>
            </>
          )}
          <button
            className="button danger"
            onClick={() => void remove(current)}
          >
            <Trash2 size={15} />
            删除本机资源
          </button>
        </Modal>
      )}
    </>
  );
}
