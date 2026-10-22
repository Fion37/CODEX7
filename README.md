# IELTS Study OS — 我的AI雅思学习教练

一个可以立即开始造句、录音、精读、听辨、计时和复练的中文个人雅思学习网站。默认是诚实的本地教学模式，不需要付费AI或云端账号即可使用。

## 运行

需要 Node.js 22.12+（当前验证环境 Node 24）。在仓库根目录：

```bash
npm ci
npm run prepare:ocr
npm run dev
```

生产运行：`npm run build` 后 `npm run start`，生产环境默认启用仅所有者可访问的私人模式；必须先按下方配置登录。仅在本机验证时，可显式设置 `APP_PRIVATE_MODE=false`。`prepare:ocr` 将 npm 安装的 OCR worker、WASM 与英文识别数据复制到本站 `public/ocr`，识别时不访问外部CDN。重新安装或部署前要再次运行。听力原创合成 MP3 已提交，无需语音API。

## 部署为只允许本人访问的网站

完整步骤见 [docs/PRIVATE-DEPLOYMENT.md](docs/PRIVATE-DEPLOYMENT.md)。仓库已包含 Vercel 构建配置，不需要购买域名。生产环境默认私人模式：未配置登录服务时返回503，未登录时转到登录页，已登录但不是指定且已验证邮箱的所有者时拒绝访问。不会依靠“网址难猜”来保护网站。

部署需在服务商安全环境设置中提供 `APP_PRIVATE_MODE=true`、`APP_OWNER_EMAIL`、`NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`。所有者邮箱仅在服务端使用，不展示给访客。登录页不开放注册。其他账号即使在Supabase中存在，也不能通过网站访问检查。静态脚本和本站原创练习音频不包含私人学习数据。

## 第一版可用流程

1. 首页或“今日学习”打开任务，查看材料、示范和小步骤，开始专注计时；切到后台自动暂停。可以拆小任务或保留到明天，不计算失败。
2. 写作默认 Level 1：学习主谓宾 → 自己造句 → 反馈 → 修改 → 独立重写。初稿、反馈、修订、草稿均持久保存。离线规则只检查有限的常见形式，不能替代完整教师评估。
3. 口语：真实录音 → 回放 → 确认转写 → 最多三个重点反馈 → 跟读/重录。浏览器自动识别为可选项，可能使用浏览器厂商的在线服务。录音需 HTTPS 或受信任的本机来源，并允许麦克风；不支持时可文字练习。
4. 阅读：原创判断题、句子主干、证据解释、降阶与不同材料迁移题。听力：本站原创合成音频，保存每次播放次数和首次答案。当前不是完整考试题库。
5. 数据中心：上传截图、CSV/XLSX或手动录入，核对后才保存。OCR偏向英文数字，中文条件需手动补全。首次/重复、限时/不限时分开，后一次不覆盖前一次。
6. 错题先主动回想再查看答案，按1/3/7/14天间隔复练。日历展示真实记录；周报从真实时长、输出和错因生成。
7. 设置中导出/恢复完整JSON（包含本机可用录音和截图），或删除学习数据。共享设备使用完请备份并清空；本地数据未加密，浏览器清理会删除它。

## 可选：真实AI

复制 `.env.example` 为 `.env.local`，仅在服务器配置：

```
AI_API_KEY=你的密钥
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4.1-mini
```

服务端使用 OpenAI-compatible Chat Completions + JSON object 格式，连接超时/格式错误会降级为有明确标签的离线规则教学。界面不会冒充已调用AI。模型只收到当前题目、等级和提交的回答，不会收到全部档案。

生产环境在线AI需要同时配置 Supabase 登录；未经认证不会调用收费API。开发模式可单机验证AI适配器。内置每用户30次/15分钟的单进程限流；多实例公共部署应在网关额外设置共享限流与预算。AI密钥禁止使用 `NEXT_PUBLIC_` 前缀或提交Git。

## 可选：登录和云同步

1. 创建自己的 Supabase 项目，开启 Email/Password 登录，根据需求配置邮件验证和发件服务。
2. 在 SQL Editor 执行 [supabase/schema.sql](supabase/schema.sql) 一次。它创建 RLS 保护的 `learning_states`、带版本校验的写入RPC，以及 `study-private` 私有附件桶与按用户隔离策略。不要把 bucket 改成公开。
3. 在 `.env.local` 配置 `NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`。这两个是公开客户端配置，绝不能使用 service-role key。修改后重启；部署构建时也需要这两个值。
4. 设置中注册/登录，主动选择“上传本机数据”或“恢复云端记录”。首次登录不会自动把共享设备上别人的数据上传。写入使用预期版本检查，遇到其他设备更新时阻止覆盖；先备份本机，再恢复云端核对。当前不支持自动合并。
5. 退出功能会明确确认后清除本机记录。删除可选择仅本机或同时云端；学习数据删除不删除登录账户。如需销户，由项目管理员通过 Supabase Auth 管理。

未配置的外部服务不影响本地学习。真实Supabase、邮件投递、第三方AI和物理麦克风需在配置后分别验收，不能由本机模拟测试证明其已可用。未实现第三方未授权抓取、官方分数预测或专业发音评分。

## 数据导入

CSV UTF-8 或 XLSX 第一行为字段名，支持英文和常见中文表头。必须提供 `subject,correct,total`。推荐：

```csv
date,subject,book,test,part,repeated,timed,correct,total,duration,replays,notes
2026-10-22,reading,11,3,Passage 1,false,false,4,13,35,0,第一次不限时
2026-10-23,reading,11,3,Passage 1,true,false,8,13,30,0,复习后再次练习
```

耗时单位为分钟，`replays` 为作答前播放次数。没有限时条件的记录按不限时处理。导入上限500行/10MB。截图仅接受PNG/JPEG/WebP，10MB以内，均需人工核对。不会从平台显示的band反推正确题数。

## 验证

```bash
npm run typecheck
npm test
npm run build
npm run test:e2e
```

浏览器测试使用系统 Chromium（默认 `/usr/bin/chromium`，可用 `CHROMIUM_PATH` 指定）。没有系统浏览器时可安装 Playwright Chromium 后调整路径。测试启动生产服务器，包括任务计时与保存、写作闭环、判断题迁移、真实音频播放、CSV确认、录音模拟设备、数据导出删除和移动布局。模拟设备只验证录制流程，不证明真实麦克风或外部语音识别可用。

## 产品与范围

完整架构、阶段验收、数据边界：[docs/PRODUCT.md](docs/PRODUCT.md)。考试计划从2026-10-22至2026-12-31，相差70天；训练第70天为12月30日。日期使用亚洲/上海时区，可以在设置修改。

未改动原仓库的 `feihe-final.pptx`。代码分支与实际公网部署是两件事；只有部署完成、真实身份验证与访问拒绝检查通过后，才能称私人网址可用。
