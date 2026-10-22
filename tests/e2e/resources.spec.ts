import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
async function open(page: Page, path: string) {
  await page.goto(path);
  await expect(page.getByText("正在打开你的学习空间…")).toHaveCount(0);
}
async function state(page: Page) {
  return page.evaluate(() =>
    JSON.parse(localStorage.getItem("ielts-study-os-v1")!),
  );
}
test("场景词有真实可播放示范，独立听写与提示练习分别记录", async ({ page }) => {
  const curriculum = JSON.parse(
    await readFile("data/personal-curriculum.json", "utf8"),
  );
  const item = curriculum.items.find(
    (v: any) => v.kind === "word" && v.status === "checked",
  );
  await open(page, `/vocabulary?item=${item.id}`);
  await page.getByRole("button", { name: "播放词语 / 改写" }).click();
  await expect(page.getByText("已播放1次")).toBeVisible();
  await page.getByLabel("词汇练习答案").fill(item.term);
  await page.getByRole("button", { name: "保存这次练习" }).click();
  expect((await state(page)).vocabularyAttempts[0]).toMatchObject({
    itemId: item.id,
    correct: true,
    plays: 1,
    revealed: false,
  });
});
test("PDF和DOCX在本机提取，确认后保存、去重、备份及恢复", async ({ page }) => {
  await open(page, "/resources");
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles([
      "tests/fixtures/personal-resource.pdf",
      "tests/fixtures/personal-resource.docx",
    ]);
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.locator("pre")).toContainText("Water is included");
  await expect(
    dialog.getByRole("button", { name: "确认保存资源" }),
  ).toBeDisabled();
  expect((await state(page)).resources).toHaveLength(0);
  await dialog.getByLabel("正在核对的文件").selectOption("1");
  await expect(dialog.locator("pre")).toContainText("deposit is five hundred");
  await dialog.getByRole("checkbox").check();
  await dialog.getByRole("button", { name: "确认保存资源" }).click();
  await expect(dialog).toHaveCount(0);
  await page.reload();
  await expect(page.getByText("我的私人文件 · 2")).toBeVisible();
  expect((await state(page)).resources.map((r: any) => r.kind)).toEqual([
    "pdf",
    "document",
  ]);
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles("tests/fixtures/personal-resource.pdf");
  await expect(page.getByText(/已存在相同文件/)).toBeVisible();
  expect((await state(page)).resources).toHaveLength(2);
  await open(page, "/settings");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出完整备份" }).click();
  const download = await downloadPromise;
  const backup = JSON.parse(await readFile((await download.path())!, "utf8"));
  expect(Object.values(backup.assets).map((a: any) => a.type)).toContain(
    "application/pdf",
  );
  expect(Object.values(backup.assets)).toHaveLength(4);
  page.once("dialog", (d) => d.accept());
  await page.locator("input[type=file]").setInputFiles({
    name: "backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(backup)),
  });
  await expect(page.getByText(/已恢复备份/)).toBeVisible();
  expect((await state(page)).resources).toHaveLength(2);
});
test("词汇提示练习保留答案与复听记录，重载后不丢失", async ({ page }) => {
  await open(page, "/vocabulary");
  await page.getByRole("button", { name: "需要示范，先降低难度" }).click();
  await page.getByLabel("词汇练习答案").fill("wrong spelling");
  await page.getByRole("button", { name: "保存这次练习" }).click();
  await expect(
    page.getByText("本次看过示范，保留为有支架练习，不标为独立掌握。"),
  ).toBeVisible();
  const first = (await state(page)).vocabularyAttempts[0];
  expect(first).toMatchObject({
    answer: "wrong spelling",
    revealed: true,
    correct: false,
  });
  await page.reload();
  expect((await state(page)).vocabularyAttempts).toHaveLength(1);
  await page.getByLabel("搜索词汇").fill("rarely");
  await expect(page.locator("tbody tr")).toHaveCount(0);
  await page.getByLabel("词汇核对状态").selectOption("review");
  await expect(
    page.getByRole("button", { name: "核对条目" }).first(),
  ).toBeVisible();
});
test("雅思听力按题反馈，中途提交不冒充完整单次考试，重复另存", async ({
  page,
}) => {
  await open(page, "/listening");
  await page.getByRole("button", { name: "单次播放检测", exact: true }).click();
  await page.getByRole("button", { name: "开始播放题目音频" }).click();
  await expect(page.getByText("已播放1次")).toBeVisible();
  await page.getByLabel("第1题答案").fill("650");
  await page.getByLabel("第2题答案").fill("electricity");
  await page.getByLabel("第3题答案").fill("500");
  await page.getByLabel("第4题答案").fill("Monday");
  await page.getByLabel("第5题答案").fill("dishwasher");
  await page.getByRole("button", { name: /提交整组/ }).click();
  let sessions = (await state(page)).listeningSessions;
  expect(sessions).toHaveLength(1);
  expect(sessions[0]).toMatchObject({
    mode: "once",
    firstAttempt: true,
    paused: true,
    plays: 1,
  });
  expect(sessions[0].results.filter((r: any) => r.correct)).toHaveLength(4);
  await page
    .getByRole("button", { name: "请教师分步解释这道题" })
    .nth(1)
    .click();
  await expect(page.getByText(/先定位，再核对改写/)).toBeVisible();
  await page.getByRole("button", { name: "再次练习并保留首次记录" }).click();
  await page.getByRole("button", { name: "开始播放题目音频" }).click();
  await page.getByLabel("第1题答案").fill("650");
  await page.getByRole("button", { name: /提交整组/ }).click();
  sessions = (await state(page)).listeningSessions;
  expect(sessions.map((s: any) => s.firstAttempt)).toEqual([true, false]);
  await page.getByLabel("听力题组").selectOption("ielts-centre");
  await expect(page.getByRole("img", { name: /地图/ })).toBeVisible();
});
test("口语Part 2提示卡、准备倒计时和题目草稿保持一致", async ({ page }) => {
  await open(page, "/speaking");
  await page.getByLabel("雅思口语部分").selectOption("2");
  await expect(
    page.getByText("Describe a useful skill you would like to learn."),
  ).toBeVisible();
  await expect(
    page.getByText("what the skill is", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("口语训练方式").selectOption("exam");
  await expect(page.getByRole("button", { name: "开始录音" })).toBeDisabled();
  await page.clock.install();
  await page.getByRole("button", { name: "开始1分钟准备" }).click();
  await page.clock.fastForward(61000);
  await expect(page.getByRole("button", { name: "开始录音" })).toBeEnabled();
  await page
    .getByLabel("Part 2关键词笔记")
    .fill("English; daily practice; travel");
  await page.reload();
  await expect(page.getByLabel("Part 2关键词笔记")).toHaveValue(
    "English; daily practice; travel",
  );
});
test("资源与听力词汇页面在手机上不横向溢出", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of ["/resources", "/vocabulary", "/listening", "/speaking"]) {
    await open(page, path);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/${path.slice(1)}-mobile.png`,
      fullPage: true,
    });
  }
});
