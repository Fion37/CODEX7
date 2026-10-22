import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
async function open(page: Page, path = "/") {
  await page.goto(path);
  await expect(page.getByText("正在打开你的学习空间…")).toHaveCount(0);
}
test("首页与10个页面均可打开，没有客户端异常", async ({ page }) => {
  const failures: string[] = [];
  page.on("pageerror", (error) => failures.push(error.message));
  for (const path of [
    "/",
    "/today",
    "/writing",
    "/speaking",
    "/reading",
    "/listening",
    "/resources",
    "/vocabulary",
    "/data",
    "/review",
    "/calendar",
    "/report",
    "/settings",
  ]) {
    await open(page, path);
    await expect(page.locator("h1")).toBeVisible();
  }
  expect(failures).toEqual([]);
});
test("首页桌面与手机布局不横向溢出", async ({ page }) => {
  for (const viewport of [
    { width: 1440, height: 1100 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await open(page);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/dashboard-${viewport.width}.png`,
      fullPage: true,
    });
  }
  await page.getByRole("button", { name: "打开导航" }).click();
  await expect(page.getByRole("link", { name: "AI 写作教师" })).toBeVisible();
});
test("真实计时、暂停、任务拆分、刷新保存与续学", async ({ page }) => {
  await open(page, "/today");
  await page.getByRole("button", { name: "进入学习" }).first().click();
  await page.getByRole("button", { name: "开始专注", exact: true }).click();
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const s = JSON.parse(localStorage.getItem("ielts-study-os-v1")!);
        return Object.values(s.days)
          .flat()
          .reduce((a: number, t: any) => a + t.seconds, 0);
      }),
    )
    .toBeGreaterThanOrEqual(2);
  await page.getByRole("button", { name: "暂停", exact: true }).click();
  await page.getByRole("button", { name: "太难了，拆小一点" }).click();
  await expect(page.getByRole("dialog").getByRole("checkbox")).toHaveCount(3);
  await page.getByRole("dialog").getByRole("checkbox").first().check();
  await page.reload();
  await page.getByRole("button", { name: "进入学习" }).first().click();
  await expect(
    page.getByRole("dialog").getByRole("checkbox").first(),
  ).toBeChecked();
  await page.getByRole("button", { name: "明天继续" }).click();
  await expect(page.getByText("明天继续", { exact: true })).toBeVisible();
});
test("写作：初稿、离线反馈、修改、独立重写与历史永久保留", async ({ page }) => {
  await open(page, "/writing");
  await page
    .getByLabel("我的初稿")
    .fill("I am agree that learning English is useful.");
  await page.reload();
  await expect(page.getByLabel("我的初稿")).toHaveValue(
    "I am agree that learning English is useful.",
  );
  await page.getByRole("button", { name: "请教师帮我看看" }).click();
  await expect(
    page.getByText("agree 本身是动词：把 I am agree 改成 I agree。"),
  ).toBeVisible();
  await page
    .getByLabel("我的修改稿")
    .fill("I agree that learning English is useful.");
  await page
    .getByLabel("不看示范，我能再写一次")
    .fill("I study English every day because I want to travel.");
  await page
    .getByRole("checkbox", { name: "这次没有复制范例，也没有让AI代写" })
    .check();
  await page.getByRole("button", { name: "检查这次独立表达" }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("ielts-study-os-v1")!).writing[0]
            ?.rewriteFeedback?.meetsCriteria,
      ),
    )
    .toBe(true);
  await page.reload();
  await page.getByRole("button", { name: /Level 1 ·/ }).click();
  await expect(page.getByLabel("我的修改稿")).toHaveValue(
    "I agree that learning English is useful.",
  );
});
test("阅读错误后解释、降低难度、迁移检测，保留首次答案", async ({ page }) => {
  await open(page, "/reading");
  await page.getByRole("button", { name: "FALSE", exact: true }).click();
  await page.getByLabel("原文证据与判断理由").fill("I think free means paid.");
  await page.getByRole("button", { name: "提交并看讲解" }).click();
  await expect(page.getByText("我们来找卡住的地方")).toBeVisible();
  await expect(
    page.getByText(/do not need to pay 与 free of charge/),
  ).toBeVisible();
  await page.getByRole("button", { name: "降低难度，再看一句" }).click();
  await expect(page.locator(".reading-passage")).toHaveText(
    "Students can use the room free of charge.",
  );
  await page.getByRole("button", { name: "TRUE", exact: true }).click();
  await page
    .getByLabel("原文证据与判断理由")
    .fill("free of charge means no payment.");
  await page.getByRole("button", { name: "提交并看讲解" }).click();
  await page.getByRole("button", { name: "换一道题复测" }).click();
  await expect(
    page.getByText(
      "Local residents must pay to attend the language workshops.",
    ),
  ).toBeVisible();
  const records = await page.evaluate(
    () => JSON.parse(localStorage.getItem("ielts-study-os-v1")!).drills,
  );
  expect(records[0].correct).toBe(false);
  expect(records[1].firstAttempt).toBe(false);
});
test("听力播放真实音频，记录首次答案与复听条件", async ({ page }) => {
  await open(page, "/listening");
  await page.getByRole("button", { name: "词汇与辨音微练习" }).click();
  await page.getByRole("button", { name: "首次播放", exact: true }).click();
  await expect(page.getByText("已播放 1 次")).toBeVisible();
  await page.getByLabel("听力答案").fill("9:30");
  await page.getByRole("button", { name: "保存本次答案并看讲解" }).click();
  await expect(page.getByText("捕捉到了关键信息")).toBeVisible();
  await page.getByRole("button", { name: "原句再试" }).click();
  await page.getByRole("button", { name: /再听一次|重新播放/ }).click();
  await expect(page.getByText("已播放 2 次")).toBeVisible();
  await page.getByLabel("听力答案").fill("nine thirty");
  await page.getByRole("button", { name: "保存本次答案并看讲解" }).click();
  const rows = await page.evaluate(
    () => JSON.parse(localStorage.getItem("ielts-study-os-v1")!).drills,
  );
  expect(rows.map((r: any) => r.plays)).toEqual([1, 2]);
  expect(rows[0].firstAttempt).toBe(true);
  expect(rows[1].firstAttempt).toBe(false);
});
test("CSV两次练习独立导入，未经核对不保存，禁止错误范围", async ({ page }) => {
  await open(page, "/data");
  await page.locator('input[type=file][accept=".csv,.xlsx"]').setInputFiles({
    name: "practice.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      "date,subject,book,test,part,repeated,timed,correct,total,duration\n2026-10-22,reading,11,3,Passage 1,false,false,4,13,35\n2026-10-23,reading,11,3,Passage 1,true,false,8,13,30",
    ),
  });
  await expect(
    page.getByRole("button", { name: "确认保存 2 条记录" }),
  ).toBeDisabled();
  await page.getByRole("checkbox", { name: /我已核对全部/ }).check();
  await page.getByRole("button", { name: "确认保存 2 条记录" }).click();
  await expect(page.locator("tbody tr")).toHaveCount(2);
  const rows = await page.evaluate(
    () => JSON.parse(localStorage.getItem("ielts-study-os-v1")!).practices,
  );
  expect(rows.map((r: any) => r.correct)).toEqual([4, 8]);
  await page.getByRole("button", { name: /手动记录练习/ }).click();
  await page.getByLabel("正确题数", { exact: true }).fill("14");
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "正确题数不能超过总题数",
  );
});
test("错题主动回想、答案对照、到期复练调度", async ({ page }) => {
  await open(page, "/review");
  await page.getByRole("button", { name: "记录错题 / 词汇" }).click();
  await page
    .getByLabel("题目 / 单词 / 我的原句")
    .fill("people is or people are?");
  await page
    .getByLabel("正确理解与例子")
    .fill("People are interested in languages.");
  await page.getByRole("button", { name: "保存并安排复习" }).click();
  await page.getByRole("button", { name: "先回想，再对照" }).click();
  await expect(
    page.getByRole("button", { name: "对照答案与错因" }),
  ).toBeDisabled();
  await page.getByLabel("我的回想 / 新例句").fill("People are kind.");
  await page.getByRole("button", { name: "对照答案与错因" }).click();
  await page.getByRole("button", { name: "这次能独立完成" }).click();
  await expect(
    page.getByRole("button", { name: "到期复习 (0)" }),
  ).toBeVisible();
});
test("录音可保存播放，转写文本反馈不会伪装发音评分", async ({ page }) => {
  await open(page, "/speaking");
  await page.getByRole("button", { name: "开始录音", exact: true }).click();
  await expect(page.getByText("正在听你说…")).toBeVisible();
  await page.waitForTimeout(1200);
  await page.getByRole("button", { name: "停止录音", exact: true }).click();
  await expect(page.locator("audio")).toBeVisible();
  await page
    .getByLabel("我的回答 / 确认转写")
    .fill("I enjoy English because I can meet new people.");
  await page.getByRole("button", { name: "分析这次表达" }).click();
  await expect(
    page.getByText(
      "反馈基于你确认的转写文本，不是声学发音评分。回答较短时不会据此给出低分预测。",
    ),
  ).toBeVisible();
  const record = await page.evaluate(
    () => JSON.parse(localStorage.getItem("ielts-study-os-v1")!).speaking[0],
  );
  expect(record.audioKey).toBeTruthy();
  await page.reload();
  await expect(page.locator(".speaking-history audio")).toBeVisible();
});
test("完整数据备份包含草稿，删除需明确确认", async ({ page }) => {
  await open(page, "/writing");
  await page.getByLabel("我的初稿").fill("My saved draft.");
  await open(page, "/settings");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出完整备份（JSON）" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("ielts-study-os-backup.json");
  await page.getByRole("button", { name: "管理删除" }).click();
  await expect(
    page.getByRole("button", { name: "确认删除本机数据" }),
  ).toBeDisabled();
  await page.getByLabel("输入“删除”以继续").fill("删除");
  await page.getByRole("button", { name: "确认删除本机数据" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await open(page, "/writing");
  await expect(page.getByLabel("我的初稿")).toHaveValue("");
});
test("Excel真实文件读取，核对后写入练习档案", async ({ page }) => {
  await open(page, "/data");
  await page
    .locator('input[type=file][accept=".csv,.xlsx"]')
    .setInputFiles("tests/fixtures/practice.xlsx");
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByLabel("正确题数", { exact: true })).toHaveValue("7");
  await expect(page.getByLabel("作答条件")).toHaveValue("timed");
  await page.getByRole("checkbox", { name: /我已核对全部/ }).check();
  await page.getByRole("button", { name: "确认保存 1 条记录" }).click();
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await expect(page.locator("tbody")).toContainText("Excel");
});
test("OCR在浏览器内识别图片且必须人工确认", async ({ page }) => {
  await open(page, "/data");
  const data = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1100;
    canvas.height = 320;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, 1100, 320);
    ctx.fillStyle = "black";
    ctx.font = "48px Arial";
    ctx.fillText("Cambridge IELTS 11 Test 3", 40, 90);
    ctx.fillText("Reading Passage 1", 40, 175);
    ctx.fillText("Correct: 4 / 13", 40, 260);
    return canvas.toDataURL("image/png").split(",")[1];
  });
  await page
    .locator('input[type=file][accept="image/png,image/jpeg,image/webp"]')
    .setInputFiles({
      name: "record.png",
      mimeType: "image/png",
      buffer: Buffer.from(data, "base64"),
    });
  await expect(page.getByRole("dialog")).toBeVisible({ timeout: 45000 });
  await expect(
    page.getByRole("button", { name: "确认保存 1 条记录" }),
  ).toBeDisabled();
  await expect(page.getByLabel("正确题数", { exact: true })).toHaveValue("4");
  await expect(page.getByLabel("总题数", { exact: true })).toHaveValue("13");
  await page.getByRole("checkbox", { name: /我已核对全部/ }).check();
  await page.getByRole("button", { name: "确认保存 1 条记录" }).click();
  await expect(page.locator("tbody")).toContainText("截图OCR");
});
test("限时阅读可启动、暂停并保存真实计时条件", async ({ page }) => {
  await open(page, "/reading");
  await page.getByRole("button", { name: "限时练习", exact: true }).click();
  await page.getByLabel("阅读目标分钟").fill("3");
  await page.getByRole("button", { name: "开始限时", exact: true }).click();
  await expect(page.getByText("02:59", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "暂停", exact: true }).click();
  await page.getByRole("button", { name: "TRUE", exact: true }).click();
  await page
    .getByLabel("原文证据与判断理由")
    .fill("The room is free of charge.");
  await page.getByRole("button", { name: "提交并看讲解" }).click();
  const record = await page.evaluate(
    () => JSON.parse(localStorage.getItem("ielts-study-os-v1")!).drills[0],
  );
  expect(record.timed).toBe(true);
  expect(record.seconds).toBeGreaterThan(0);
});
test("备份可恢复文本与录音附件，不依赖原来IndexedDB记录", async ({ page }) => {
  await open(page, "/speaking");
  await page.getByRole("button", { name: "开始录音", exact: true }).click();
  await expect(page.getByText("正在听你说…")).toBeVisible();
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: "停止录音", exact: true }).click();
  await expect(page.locator("audio")).toBeVisible();
  await page
    .getByLabel("我的回答 / 确认转写")
    .fill("I enjoy learning English.");
  await page.getByRole("button", { name: "分析这次表达" }).click();
  await expect(page.locator(".speaking-history audio")).toBeVisible();
  await open(page, "/settings");
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出完整备份（JSON）" }).click();
  const file = await event;
  const buffer = await readFile((await file.path())!);
  const backup = JSON.parse(buffer.toString());
  expect(backup.state.speaking).toHaveLength(1);
  expect(Object.keys(backup.assets)).toHaveLength(1);
  await page.getByRole("button", { name: "管理删除" }).click();
  await page.getByLabel("输入“删除”以继续").fill("删除");
  await page.getByRole("button", { name: "确认删除本机数据" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .locator('input[type=file][accept=".json,application/json"]')
    .setInputFiles({
      name: "backup.json",
      mimeType: "application/json",
      buffer,
    });
  await expect(
    page.getByText("已恢复备份。云端尚未改变；如要同步请先核对云端版本。"),
  ).toBeVisible();
  await open(page, "/speaking");
  await expect(page.locator(".speaking-history audio")).toBeVisible();
  await expect(page.locator(".speaking-history")).toContainText(
    "I enjoy learning English.",
  );
});
test("其他标签页写入时暂停旧计时，不互相覆盖", async ({ page, context }) => {
  await open(page, "/today");
  await page.getByRole("button", { name: "进入学习" }).first().click();
  await page.getByRole("button", { name: "开始专注", exact: true }).click();
  const other = await context.newPage();
  await open(other, "/writing");
  await other.getByLabel("我的初稿").fill("I learn English on another tab.");
  await expect(
    page.getByText(
      "另一个标签页更新了记录，已同步本页并暂停计时。请在一个标签页内专注学习。",
    ),
  ).toBeVisible();
  await expect(page.locator(".floating-timer")).toHaveCount(0);
  await other.close();
  await page.getByRole("button", { name: "关闭", exact: true }).click();
  await open(page, "/writing");
  await expect(page.getByLabel("我的初稿")).toHaveValue(
    "I learn English on another tab.",
  );
});
