import type {
  LearningResource,
  ResourceKind,
  ResourceSource,
} from "./resource-model";
import { uid } from "./model";
import { extractVocabularyCandidates } from "./curriculum";
import { listeningSetSchema } from "./resource-validation";
const extensions: Record<string, { kind: ResourceKind; mime: string }> = {
  pdf: { kind: "pdf", mime: "application/pdf" },
  docx: {
    kind: "document",
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  },
  txt: { kind: "text", mime: "text/plain" },
  csv: { kind: "text", mime: "text/csv" },
  xlsx: {
    kind: "document",
    mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  },
  json: { kind: "questions", mime: "application/json" },
  mp3: { kind: "audio", mime: "audio/mpeg" },
  m4a: { kind: "audio", mime: "audio/mp4" },
  mp4: { kind: "audio", mime: "audio/mp4" },
  wav: { kind: "audio", mime: "audio/wav" },
  ogg: { kind: "audio", mime: "audio/ogg" },
  webm: { kind: "audio", mime: "audio/webm" },
  png: { kind: "image", mime: "image/png" },
  jpg: { kind: "image", mime: "image/jpeg" },
  jpeg: { kind: "image", mime: "image/jpeg" },
  webp: { kind: "image", mime: "image/webp" },
};
export function supportedResource(name: string) {
  return extensions[name.split(".").at(-1)?.toLowerCase() || ""];
}
export async function prepareResource(
  file: File,
  source: ResourceSource,
  progress: (message: string) => void,
) {
  const info = supportedResource(file.name);
  if (!info)
    throw new Error(
      `${file.name}：暂不支持这个格式，请使用PDF、DOCX、文本、XLSX、JSON、图片或音频。`,
    );
  if (file.size > 15 * 1024 * 1024)
    throw new Error(`${file.name}超过15MB，请分割后导入。`);
  const bytes = await file.arrayBuffer();
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  const checksum = Array.from(new Uint8Array(hash), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
  const id = uid();
  let text = "";
  let pages: { page: number; text: string }[] = [];
  let questionSet: LearningResource["questionSet"];
  if (info.kind === "pdf") {
    progress(`正在读取 ${file.name} 的PDF文本…`);
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    pdfjs.GlobalWorkerOptions.workerSrc = "/pdf/pdf.worker.min.mjs";
    const task = pdfjs.getDocument({
      data: new Uint8Array(bytes),
      useSystemFonts: true,
    });
    const doc = await task.promise;
    try {
      if (doc.numPages > 200) throw new Error("PDF超过200页，请拆分后导入。");
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const content = await page.getTextContent();
        const line = content.items
          .map((item) =>
            "str" in item
              ? item.str + ("hasEOL" in item && item.hasEOL ? "\n" : " ")
              : "",
          )
          .join("");
        pages.push({ page: i, text: line });
        if (pages.reduce((n, p) => n + p.text.length, 0) > 800000)
          throw new Error("提取文本过长，请拆分文件。");
      }
    } finally {
      await task.destroy();
    }
    text = pages.some((p) => p.text.trim())
      ? pages.map((p) => `[第${p.page}页]\n${p.text}`).join("\n")
      : "";
  } else if (file.name.toLowerCase().endsWith(".docx")) {
    const { unzipSync, strFromU8 } = await import("fflate");
    const entries = unzipSync(new Uint8Array(bytes), {
      filter: (entry) =>
        entry.name === "word/document.xml" &&
        entry.originalSize <= 4 * 1024 * 1024,
    });
    const documentXml = entries["word/document.xml"];
    if (!documentXml) throw new Error("DOCX正文缺失或超过4MB，请拆分文件。");
    const document = new DOMParser().parseFromString(
      strFromU8(documentXml),
      "application/xml",
    );
    if (document.getElementsByTagName("parsererror").length)
      throw new Error("DOCX正文XML无效。");
    const paragraphs = Array.from(document.getElementsByTagName("*")).filter(
      (node) => node.localName === "p",
    );
    text = paragraphs
      .map((paragraph) =>
        Array.from(paragraph.getElementsByTagName("*"))
          .map((node) =>
            node.localName === "t"
              ? node.textContent
              : node.localName === "tab"
                ? "\t"
                : node.localName === "br"
                  ? "\n"
                  : "",
          )
          .join(""),
      )
      .join("\n");
    pages = [{ page: 1, text }];
  } else if (file.name.toLowerCase().endsWith(".xlsx")) {
    const { default: read } = await import("read-excel-file");
    const rows = await read(file);
    text = rows
      .map((row) => row.map((cell) => String(cell ?? "")).join("\t"))
      .join("\n");
    pages = [{ page: 1, text }];
  } else if (info.kind === "text") {
    text = new TextDecoder().decode(bytes);
    pages = [{ page: 1, text }];
  } else if (info.kind === "questions") {
    const raw = JSON.parse(new TextDecoder().decode(bytes));
    const parsed = listeningSetSchema.safeParse({
      ...raw,
      id: `personal-${id}`,
      origin: "personal",
      audioPath: undefined,
      answerKeyConfirmed: false,
    });
    if (!parsed.success)
      throw new Error("题目JSON不符合模板：" + parsed.error.issues[0]?.message);
    questionSet = parsed.data;
    delete questionSet.audioResourceId;
    text = questionSet.transcript;
  } else if (info.kind === "image") {
    progress(`正在本机OCR识别 ${file.name}…`);
    const { createWorker } = await import("tesseract.js");
    const worker = await createWorker("eng", 1, {
      workerPath: "/ocr/worker.min.js",
      corePath: "/ocr/core",
      langPath: "/ocr",
      workerBlobURL: false,
    });
    try {
      text = (await worker.recognize(file)).data.text;
      pages = [{ page: 1, text }];
    } finally {
      await worker.terminate();
    }
  }
  if (text.length > 800000) throw new Error("文本超过80万字符，请拆分。");
  const resource: LearningResource = {
    id,
    name: file.name,
    source,
    kind: info.kind,
    assetKey: uid(),
    ...(text ? { textKey: uid() } : {}),
    checksum,
    mime: info.mime,
    size: file.size,
    addedAt: new Date().toISOString(),
    ...(info.kind === "pdf" ? { pages: pages.length } : {}),
    preview: text.slice(0, 1600),
    notes:
      info.kind === "pdf" && !text.trim()
        ? "未提取到文字：可能是扫描PDF，请先做OCR或补充文本。"
        : "",
    section: questionSet?.part || 1,
    confirmed: false,
    questionSet,
    vocabulary: extractVocabularyCandidates(pages, file.name, `resource-${id}`),
  };
  return { resource, blob: new Blob([bytes], { type: info.mime }), text };
}
