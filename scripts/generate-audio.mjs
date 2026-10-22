// Optional maintenance tool. The generated MP3 files are committed;
// regular installations do not need ffmpeg or a voice service.
import { readFile, mkdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
const lines = JSON.parse(
  await readFile(
    new URL("../data/listening-audio.json", import.meta.url),
    "utf8",
  ),
);
const output = new URL("../public/audio/", import.meta.url);
await mkdir(output, { recursive: true });
for (const [id, text] of Object.entries(lines)) {
  const result = spawnSync(
    "ffmpeg",
    [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-f",
      "lavfi",
      "-i",
      `flite=text='${text}':voice=slt`,
      "-ar",
      "22050",
      "-ac",
      "1",
      "-b:a",
      "64k",
      new URL(id + ".mp3", output).pathname,
    ],
    { stdio: "inherit" },
  );
  if (result.status !== 0) throw new Error(`Audio generation failed: ${id}`);
}
console.log(
  `Generated ${Object.keys(lines).length} original synthetic audio clips.`,
);
