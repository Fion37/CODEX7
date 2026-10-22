import {
  localDate,
  uid,
  errorCategories,
  type PracticeRecord,
  type ErrorCategory,
} from "./model";
function value(row: Record<string, unknown>, ...names: string[]) {
  for (const name of names) {
    const key = Object.keys(row).find(
      (k) => k.trim().toLowerCase() === name.toLowerCase(),
    );
    if (key !== undefined && row[key] !== "" && row[key] != null)
      return row[key];
  }
  return undefined;
}
function flag(input: unknown) {
  if (typeof input === "boolean") return input;
  const text = String(input ?? "")
    .toLowerCase()
    .trim();
  return ["true", "1", "yes", "是", "重复", "限时", "重复练习"].includes(text);
}
export function blankPractice(): PracticeRecord {
  return {
    id: uid(),
    date: localDate(),
    subject: "reading",
    book: "",
    test: "",
    part: "",
    repeated: false,
    timed: false,
    correct: 0,
    total: 13,
    duration: 0,
    replays: 0,
    errors: [],
    source: "manual",
    confidence: "self-reported",
    notes: "",
  };
}
export function parseImportRow(
  row: Record<string, unknown>,
  source: "csv" | "excel",
): PracticeRecord {
  const date = value(row, "date", "日期", "练习日期");
  const subject = String(value(row, "subject", "科目") ?? "").toLowerCase();
  if (!["reading", "listening", "阅读", "听力"].includes(subject))
    throw new Error(
      "每行需要提供 subject（reading/listening）或科目（阅读/听力）。",
    );
  const correct = value(row, "correct", "正确题数");
  const total = value(row, "total", "总题数");
  if (correct === undefined || total === undefined)
    throw new Error(
      "每行必须包含 correct/total（正确题数/总题数），不能从雅思分数反推。",
    );
  const errors = String(value(row, "errors", "错题类型") ?? "")
    .split(/[|,，、]/)
    .map((s) => s.trim())
    .filter((s): s is ErrorCategory =>
      errorCategories.includes(s as ErrorCategory),
    );
  return {
    ...blankPractice(),
    date:
      date instanceof Date
        ? date.toISOString().slice(0, 10)
        : date
          ? String(date).trim()
          : localDate(),
    subject:
      subject === "听力" || subject === "listening" ? "listening" : "reading",
    book: String(value(row, "book", "册数", "剑桥雅思册数") ?? ""),
    test: String(value(row, "test", "test编号") ?? ""),
    part: String(value(row, "part", "passage", "passage或part编号") ?? ""),
    correct: Number(correct),
    total: Number(total),
    duration: Number(value(row, "duration", "耗时", "练习耗时") ?? 0),
    replays: Number(value(row, "replays", "播放次数") ?? 0),
    timed: flag(value(row, "timed", "是否限时")),
    repeated: flag(value(row, "repeated", "是否重复", "首次/重复练习")),
    errors,
    notes: String(value(row, "notes", "备注") ?? ""),
    source,
  };
}
export function parseOcr(text: string): PracticeRecord {
  const fraction = text.match(/\b(\d{1,2})\s*\/\s*(\d{1,2})\b/);
  const book = text.match(/(?:Cambridge|IELTS)\s*(\d{1,2})/i);
  const test = text.match(/Test\s*(\d+)/i);
  const part = text.match(/(Passage|Part|Section)\s*(\d+)/i);
  return {
    ...blankPractice(),
    source: "ocr",
    subject: /listening/i.test(text) ? "listening" : "reading",
    book: book?.[1] || "",
    test: test?.[1] || "",
    part: part ? `${part[1]} ${part[2]}` : "",
    correct: fraction ? Number(fraction[1]) : 0,
    total: fraction ? Number(fraction[2]) : 13,
    notes: `OCR待核对；未识别字段使用默认值。原文：\n${text.slice(0, 6000)}`,
  };
}
