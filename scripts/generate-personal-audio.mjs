// Optional maintainer command; ffmpeg with flite is needed only to regenerate.
// All clips are synthetic, using common terms or our original exercises.
import {
  readFile,
  mkdir,
  mkdtemp,
  writeFile,
  rm,
  access,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import ts from "typescript";
async function moduleFrom(path) {
  const raw = await readFile(path, "utf8");
  const js = ts.transpileModule(raw, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  return import(
    "data:text/javascript;base64," + Buffer.from(js).toString("base64")
  );
}
const { listeningSets } = await moduleFrom("lib/listening-exams.ts");
const { speakingTopics, speakingModel } = await moduleFrom(
  "lib/speaking-topics.ts",
);
const data = JSON.parse(
  await readFile("data/personal-curriculum.json", "utf8"),
);
const work = await mkdtemp(join(tmpdir(), "ielts-voice-"));
function run(args) {
  return new Promise((resolve, reject) => {
    const p = spawn("ffmpeg", [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      ...args,
    ]);
    let message = "";
    p.stderr.on("data", (b) => (message += b));
    p.on("error", reject);
    p.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(message)),
    );
  });
}
let generated = 0;
async function clip(target, turns) {
  try {
    await access(target);
    return;
  } catch {}
  const id = generated++;
  const dir = join(work, String(id));
  await mkdir(dir);
  const segments = [];
  for (let n = 0; n < turns.length; n++) {
    const t = turns[n];
    const textPath = join(dir, `${n}.txt`),
      wav = join(dir, `${n}.wav`);
    await writeFile(textPath, t.text);
    await run([
      "-f",
      "lavfi",
      "-i",
      `flite=textfile=${textPath}:voice=${t.voice || "slt"}`,
      "-ar",
      "22050",
      "-ac",
      "1",
      wav,
    ]);
    segments.push(`file '${wav}'`);
  }
  const list = join(dir, "list.txt");
  await writeFile(list, segments.join("\n"));
  await run([
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    list,
    "-codec:a",
    "libmp3lame",
    "-b:a",
    "64k",
    target,
  ]);
}
try {
  for (const path of ["vocabulary", "speaking", "ielts"])
    await mkdir(`public/audio/${path}`, { recursive: true });
  for (const item of data.items.filter((v) => v.status === "checked"))
    await clip(`public/audio/vocabulary/${item.id}.mp3`, [
      {
        text:
          item.kind === "paraphrase"
            ? item.alternative?.split(";")[0] || item.term
            : item.term,
      },
    ]);
  for (const topic of speakingTopics) {
    for (const part of ["1", "2", "3"]) {
      const questions =
        part === "1"
          ? topic.part1
          : part === "2"
            ? [topic.cue + " You should say: " + topic.bullets.join("; ")]
            : topic.part3;
      for (let index = 0; index < questions.length; index++) {
        await clip(`public/audio/speaking/${topic.id}-${part}-${index}.mp3`, [
          { text: questions[index], voice: "awb" },
        ]);
        for (const [variant, level] of [
          ["basic", 1],
          ["extended", 3],
        ])
          await clip(
            `public/audio/speaking/${topic.id}-${part}-${index}-model-${variant}.mp3`,
            [{ text: speakingModel(topic.id, part, index, level) }],
          );
      }
    }
  }
  for (const set of listeningSets) {
    const turns = set.transcript.split("\n").map((line) => {
      const m = line.match(/^(Agent|Student|Maya|Tutor|Leo):\s*(.*)$/);
      return {
        text: m ? m[2] : line,
        voice: m && ["Agent", "Tutor", "Leo"].includes(m[1]) ? "awb" : "slt",
      };
    });
    await clip(`public/audio/ielts/${set.id}.mp3`, turns);
  }
  process.stdout.write(`Generated ${generated} synthetic learning clips.\n`);
} finally {
  await rm(work, { recursive: true, force: true });
}
