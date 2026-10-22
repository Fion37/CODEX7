"use client";
import { useRef, useState } from "react";
import {
  Upload,
  ImagePlus,
  FileSpreadsheet,
  Plus,
  Download,
  Trash2,
  Check,
  ArrowUpRight,
  Database,
} from "lucide-react";
import Papa from "papaparse";
import { useStudy, saveAsset } from "./store";
import { PageTitle, Panel, Badge, Notice, Modal, Empty, download } from "./ui";
import {
  practiceStats,
  subjects,
  errorCategories,
  uid,
  type PracticeRecord,
  type ErrorCategory,
} from "@/lib/model";
import { blankPractice, parseImportRow, parseOcr } from "@/lib/imports";
import { practiceSchema } from "@/lib/validation";
function PracticeForm({
  record,
  onChange,
}: {
  record: PracticeRecord;
  onChange: (r: PracticeRecord) => void;
}) {
  const field = (key: keyof PracticeRecord, value: unknown) =>
    onChange({ ...record, [key]: value });
  return (
    <>
      <div className="form-grid">
        <label className="field">
          练习日期
          <input
            type="date"
            value={record.date}
            onChange={(e) => field("date", e.target.value)}
          />
        </label>
        <label className="field">
          科目
          <select
            value={record.subject}
            onChange={(e) => field("subject", e.target.value)}
          >
            <option value="reading">阅读</option>
            <option value="listening">听力</option>
          </select>
        </label>
        <label className="field">
          剑桥雅思册数 / 材料
          <input
            value={record.book}
            placeholder="例如 Cambridge 11"
            onChange={(e) => field("book", e.target.value)}
          />
        </label>
        <label className="field">
          Test编号
          <input
            value={record.test}
            placeholder="3"
            onChange={(e) => field("test", e.target.value)}
          />
        </label>
        <label className="field">
          Passage / Part
          <input
            value={record.part}
            placeholder="Passage 1"
            onChange={(e) => field("part", e.target.value)}
          />
        </label>
        <label className="field">
          练习耗时（分钟）
          <input
            type="number"
            min="0"
            max="1440"
            step="0.1"
            value={record.duration}
            onChange={(e) => field("duration", Number(e.target.value))}
          />
        </label>
        <label className="field">
          正确题数
          <input
            type="number"
            min="0"
            max={record.total}
            value={record.correct}
            onChange={(e) => field("correct", Number(e.target.value))}
          />
        </label>
        <label className="field">
          总题数
          <input
            type="number"
            min="1"
            max="200"
            value={record.total}
            onChange={(e) => field("total", Number(e.target.value))}
          />
        </label>
        <label className="field">
          作答条件
          <select
            value={record.timed ? "timed" : "untimed"}
            onChange={(e) => field("timed", e.target.value === "timed")}
          >
            <option value="untimed">不限时 / 不确定</option>
            <option value="timed">严格限时</option>
          </select>
        </label>
        <label className="field">
          首次还是重复
          <select
            value={record.repeated ? "repeated" : "first"}
            onChange={(e) => field("repeated", e.target.value === "repeated")}
          >
            <option value="first">首次练习</option>
            <option value="repeated">重复练习</option>
          </select>
        </label>
        {record.subject === "listening" && (
          <label className="field">
            作答前播放次数
            <input
              type="number"
              min="0"
              value={record.replays}
              onChange={(e) => field("replays", Number(e.target.value))}
            />
          </label>
        )}
      </div>
      <label className="field">
        主要错因
        <div className="chip-options">
          {errorCategories.map((c) => (
            <button
              key={c}
              type="button"
              className={record.errors.includes(c) ? "selected" : ""}
              onClick={() =>
                field(
                  "errors",
                  record.errors.includes(c)
                    ? record.errors.filter((x) => x !== c)
                    : [...record.errors, c],
                )
              }
            >
              {c}
            </button>
          ))}
        </div>
      </label>
      <label className="field">
        备注 / 证据来源
        <textarea
          value={record.notes}
          maxLength={10000}
          onChange={(e) => field("notes", e.target.value)}
          placeholder="是否看过答案？时间如何记录？哪里仍不确定？"
        />
      </label>
    </>
  );
}
export function DataCenter() {
  const { state, update } = useStudy();
  const [pending, setPending] = useState<PracticeRecord[]>([]);
  const [active, setActive] = useState(0);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [progress, setProgress] = useState("");
  const [raw, setRaw] = useState("");
  const [filter, setFilter] = useState("all");
  const [image, setImage] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);
  const show = (records: PracticeRecord[]) => {
    setPending(records);
    setActive(0);
    setConfirmed(false);
  };
  const file = async (f: File) => {
    setNotice("");
    if (f.size > 10 * 1024 * 1024) {
      setNotice("文件超过10MB，请拆分后导入。");
      return;
    }
    setBusy(true);
    try {
      let rows: Record<string, unknown>[];
      const excel = /\.xlsx$/i.test(f.name);
      if (excel) {
        const { default: readXlsxFile } = await import("read-excel-file");
        const data = await readXlsxFile(f);
        const headers = data[0]?.map(String) || [];
        rows = data
          .slice(1)
          .filter((row) => row.some((cell) => cell !== null))
          .map((row) =>
            Object.fromEntries(headers.map((key, i) => [key, row[i]])),
          );
      } else if (/\.csv$/i.test(f.name)) {
        const result = Papa.parse<Record<string, unknown>>(await f.text(), {
          header: true,
          skipEmptyLines: "greedy",
          transformHeader: (h) => h.trim().replace(/^\uFEFF/, ""),
        });
        if (result.errors.length)
          throw new Error(`CSV格式错误：${result.errors[0].message}`);
        rows = result.data;
      } else
        throw new Error(
          "请使用 UTF-8 CSV 或 .xlsx 文件。旧版 .xls 请先另存为 .xlsx。",
        );
      if (!rows.length || rows.length > 500)
        throw new Error("每次导入1–500条记录。");
      const records = rows.map((row) =>
        parseImportRow(row, excel ? "excel" : "csv"),
      );
      setImage(null);
      setRaw("");
      show(records);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "文件解析失败，请检查模板。");
    } finally {
      setBusy(false);
    }
  };
  const ocr = async (f: File) => {
    if (
      !["image/png", "image/jpeg", "image/webp"].includes(f.type) ||
      f.size > 10 * 1024 * 1024
    ) {
      setNotice("请使用10MB以内的 PNG/JPEG/WebP 图片。");
      return;
    }
    setBusy(true);
    setNotice("");
    setProgress("正在加载本地OCR引擎…");
    let worker:
      | Awaited<ReturnType<(typeof import("tesseract.js"))["createWorker"]>>
      | undefined;
    try {
      const { createWorker } = await import("tesseract.js");
      worker = await createWorker("eng", 1, {
        workerPath: "/ocr/worker.min.js",
        corePath: "/ocr/core",
        langPath: "/ocr",
        workerBlobURL: false,
        logger: (m) => {
          if (m.status === "recognizing text")
            setProgress(`识别中 ${Math.round(m.progress * 100)}%`);
        },
      });
      const result = await worker.recognize(f);
      setRaw(result.data.text);
      setImage(f);
      show([parseOcr(result.data.text)]);
    } catch {
      setNotice(
        "OCR未完成，请确认已运行 npm run prepare:ocr。仍可使用手动记录；中文标签需要人工核对。",
      );
    } finally {
      await worker?.terminate();
      setBusy(false);
      setProgress("");
    }
  };
  const invalid = pending
    .map((r, i) => ({ result: practiceSchema.safeParse(r), i }))
    .filter((x) => !x.result.success);
  const save = async () => {
    if (!confirmed || invalid.length || saving) return;
    setSaving(true);
    try {
      let key: string | undefined;
      if (image) {
        key = uid();
        await saveAsset(key, image);
      }
      const records = pending.map((r) => ({
        ...r,
        confidence: "confirmed" as const,
        ...(key ? { attachmentKey: key } : {}),
      }));
      update((s) => ({ ...s, practices: [...s.practices, ...records] }));
      setPending([]);
      setImage(null);
      setNotice(
        `已保存 ${records.length} 条独立练习记录。历史记录没有被覆盖。`,
      );
    } catch {
      setNotice("保存附件失败，请检查本机存储空间。记录尚未导入，可重试。");
    } finally {
      setSaving(false);
    }
  };
  const exportCsv = () =>
    download(
      new Blob(
        [
          "\uFEFF" +
            Papa.unparse(
              state.practices.map((r) => ({
                ...r,
                errors: r.errors.join("|"),
              })),
            ),
        ],
        { type: "text/csv;charset=utf-8" },
      ),
      "ielts-practices.csv",
    );
  const records = state.practices
    .filter((r) => filter === "all" || r.subject === filter)
    .slice()
    .reverse();
  return (
    <>
      <PageTitle
        eyebrow="LEARNING DATA, WITH CONTEXT"
        title="每一次练习，都有自己的背景。"
        description="首次与重复、限时与不限时分别记录。学习的提高是真实的，但不直接等于正式考试分数。"
        action={
          <a
            href="https://www.idictation.cn/"
            target="_blank"
            rel="noreferrer"
            className="button secondary"
          >
            打开爱听写 <ArrowUpRight size={16} />
          </a>
        }
      />
      <div className="import-grid">
        <button
          className="import-card"
          disabled={busy}
          onClick={() => imageRef.current?.click()}
        >
          <span className="subject-icon writing">
            <ImagePlus size={24} />
          </span>
          <strong>上传练习截图</strong>
          <p>本机OCR识别 → 人工确认 → 保存</p>
          <span className="text-link">
            选择截图 <Plus size={15} />
          </span>
        </button>
        <button
          className="import-card"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
        >
          <span className="subject-icon reading">
            <FileSpreadsheet size={24} />
          </span>
          <strong>导入 CSV / Excel</strong>
          <p>批量导入，逐条核对数据与条件</p>
          <span className="text-link">
            选择文件 <Plus size={15} />
          </span>
        </button>
        <button
          className="import-card"
          disabled={busy}
          onClick={() => {
            setImage(null);
            setRaw("");
            show([blankPractice()]);
          }}
        >
          <span className="subject-icon speaking">
            <Plus size={24} />
          </span>
          <strong>手动记录练习</strong>
          <p>补充练习背景，保留每次尝试</p>
          <span className="text-link">
            新增记录 <Plus size={15} />
          </span>
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        hidden
        accept=".csv,.xlsx"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void file(f);
          e.target.value = "";
        }}
      />
      <input
        ref={imageRef}
        type="file"
        hidden
        accept="image/png,image/jpeg,image/webp"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void ocr(f);
          e.target.value = "";
        }}
      />
      {busy && <Notice>{progress || "正在读取文件…"}</Notice>}
      {notice && <Notice>{notice}</Notice>}
      <div className="data-stats">
        {(["reading", "listening"] as const).map((subject) => {
          const stats = practiceStats(state.practices, subject);
          return (
            <Panel
              key={subject}
              title={`${subjects[subject]} · 分开看，才有意义`}
            >
              <div className="split-stats">
                <div>
                  <small>首次 + 严格限时</small>
                  <strong>
                    {stats.fresh === null ? "—" : `${stats.fresh}%`}
                  </strong>
                  <span>{stats.freshCount} 条记录 · 考试表现证据</span>
                </div>
                <div>
                  <small>重复 / 不限时</small>
                  <strong>
                    {stats.learning === null ? "—" : `${stats.learning}%`}
                  </strong>
                  <span>{stats.learningCount} 条记录 · 学习掌握证据</span>
                </div>
              </div>
              <p className="tiny">
                按正确题数 / 总题数加权；不换算雅思成绩。
                {subject === "listening"
                  ? "多次播放的记录即使标记限时，也应按学习表现解读。"
                  : ""}
              </p>
            </Panel>
          );
        })}
      </div>
      <Panel
        title="练习档案"
        subtitle="每次练习都是独立记录，同一篇文章的第二次成绩不会覆盖第一次"
        action={
          <div className="row">
            <button
              className="text-link"
              onClick={() =>
                download(
                  new Blob(
                    [
                      "\uFEFF" +
                        Papa.unparse([
                          {
                            date: "2026-10-22",
                            subject: "reading",
                            book: "11",
                            test: "3",
                            part: "Passage 1",
                            repeated: false,
                            timed: false,
                            correct: 4,
                            total: 13,
                            duration: 35,
                            replays: 0,
                            notes: "模板示例，请替换为真实记录",
                          },
                        ]),
                    ],
                    { type: "text/csv;charset=utf-8" },
                  ),
                  "import-template.csv",
                )
              }
            >
              下载模板
            </button>
            <button
              className="button secondary"
              disabled={!state.practices.length}
              onClick={exportCsv}
            >
              <Download size={15} />
              导出CSV
            </button>
          </div>
        }
      >
        <div className="tab-bar compact">
          {[
            ["all", "全部"],
            ["reading", "阅读"],
            ["listening", "听力"],
          ].map(([key, label]) => (
            <button
              className={filter === key ? "active" : ""}
              key={key}
              onClick={() => setFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>
        {records.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>日期 / 材料</th>
                  <th>成绩</th>
                  <th>条件</th>
                  <th>耗时</th>
                  <th>来源 / 可信度</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <strong>
                        {r.book || "未命名材料"} · {r.test} · {r.part}
                      </strong>
                      <small>
                        {r.date} · {subjects[r.subject]}
                      </small>
                    </td>
                    <td>
                      <strong>
                        {r.correct} / {r.total}
                      </strong>
                      <small>
                        {Math.round((r.correct / r.total) * 100)}% 正确率
                      </small>
                    </td>
                    <td>
                      <Badge tone={r.repeated ? "amber" : "blue"}>
                        {r.repeated ? "重复" : "首次"}
                      </Badge>{" "}
                      <Badge tone="gray">
                        {r.timed ? "严格限时" : "不限时"}
                      </Badge>
                      {r.subject === "listening" && (
                        <small>播放 {r.replays || "未记录"} 次</small>
                      )}
                    </td>
                    <td>{r.duration} 分钟</td>
                    <td>
                      <span>
                        {
                          {
                            manual: "手动",
                            csv: "CSV",
                            excel: "Excel",
                            ocr: "截图OCR",
                            coach: "本站练习",
                          }[r.source]
                        }
                      </span>
                      <small>
                        {r.confidence === "confirmed"
                          ? "用户已核对"
                          : "用户自报"}
                      </small>
                    </td>
                    <td>
                      <button
                        className="icon-button"
                        aria-label="删除练习记录"
                        onClick={() => {
                          if (
                            confirm(
                              "确认删除这一次练习记录？其他练习不会受影响。",
                            )
                          )
                            update((s) => ({
                              ...s,
                              practices: s.practices.filter(
                                (p) => p.id !== r.id,
                              ),
                            }));
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="先补充一条真实的练习">
            例如你做过的 C11 Test 3 Passage 1，可以把第一次与第二次分别录入。
          </Empty>
        )}
      </Panel>
      <Notice>
        目前不自动同步第三方平台。OCR仅在你的浏览器处理，英文数字识别后必须人工核对；正式授权与官方接口可用后再接入自动同步。
      </Notice>
      {pending.length > 0 && (
        <Modal
          title={`核对后再保存 · ${pending.length}条记录`}
          onClose={() => {
            if (!saving) setPending([]);
          }}
        >
          <Notice>
            默认日期为今天，未提供的限时条件按不限时处理。请逐条确认，尤其是首次/重复、正确题数和时间。OCR可能识别错误，中文标签不自动判定。
          </Notice>
          {raw && (
            <details>
              <summary>查看OCR原始文本</summary>
              <pre className="ocr-text">{raw}</pre>
            </details>
          )}
          {pending.length > 1 && (
            <label className="field">
              选择要核对的记录
              <select
                value={active}
                onChange={(e) => setActive(Number(e.target.value))}
              >
                {pending.map((r, i) => (
                  <option key={r.id} value={i}>
                    {i + 1}. {r.book} {r.part} · {r.correct}/{r.total}
                  </option>
                ))}
              </select>
            </label>
          )}
          <PracticeForm
            record={pending[active]}
            onChange={(r) => {
              setPending((rows) =>
                rows.map((row, i) => (i === active ? r : row)),
              );
              setConfirmed(false);
            }}
          />
          {invalid.length > 0 && (
            <div role="alert" className="error-banner">
              {invalid
                .map(
                  (x) =>
                    `第${x.i + 1}条：${x.result.success ? "" : x.result.error.issues.map((i) => i.message).join("；")}`,
                )
                .join("\n")}
            </div>
          )}
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            我已核对全部 {pending.length} 条记录的成绩、练习条件与来源
          </label>
          <button
            className="button primary full"
            disabled={!confirmed || invalid.length > 0 || saving}
            onClick={save}
          >
            <Check size={16} />
            {saving ? "正在保存…" : `确认保存 ${pending.length} 条记录`}
          </button>
        </Modal>
      )}
    </>
  );
}
