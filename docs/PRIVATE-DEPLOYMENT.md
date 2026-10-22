# 私人网站部署

当前尚没有可交付的公网应用地址。云环境内部路径不能作为下载附件或外网网址。本文件准备部署步骤，不表示已完成部署。

## 所需账号

1. 在 `https://vercel.com/signup` 用自己的GitHub账号注册Vercel。账号创建和授权由本人完成；不在聊天中发送密码、验证码、令牌或登录Cookie。
2. 创建自己的Supabase项目，用于真正的所有者登录和可选云端学习档案。只拥有网址不授予网站访问权限。

## 先建立所有者身份

- 在Supabase的Authentication用户管理中创建自己的邮箱账号，并完成邮箱验证；账号邮箱必须与后续的 `APP_OWNER_EMAIL` 一致。
- 设置自己的登录密码，不向助手或Git仓库提供密码。可以关闭Supabase的公开注册；应用登录页本身不提供注册入口。
- 在SQL Editor执行仓库的 `supabase/schema.sql` 一次，准备私有学习状态与附件存储。不要关闭RLS或把附件桶设为公开。

## 在Vercel导入

- 导入 `Fion37/CODEX7` 中包含本应用源码的分支；确认所选分支有 `package.json`、`app/` 和 `vercel.json`，而不是只有PPT的旧版本。
- Framework选择Next.js，根目录为仓库根目录。`vercel.json` 已配置 `npm ci` 和 `npm run prepare:ocr && npm run build`，确保OCR资源也被部署。
- 在Vercel的安全环境设置中添加：

| 名称                            | 内容                                         |
| ------------------------------- | -------------------------------------------- |
| `APP_PRIVATE_MODE`              | `true`，部署环境不要改为false                |
| `APP_OWNER_EMAIL`               | 自己已验证的登录邮箱                         |
| `NEXT_PUBLIC_SUPABASE_URL`      | 自己的Supabase项目URL                        |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 项目客户端匿名密钥，不能使用service-role key |

- 需要真实AI时，另行添加服务器专用 `AI_API_KEY`、`AI_BASE_URL`、`AI_MODEL`。AI不是开启私人网站的必要条件。
- 为Preview和Production都配置访问设置，再开始部署；改动客户端公开配置后需要重新构建。

## 交付网址前必须验证

1. 已完成的部署拥有服务商实际返回的HTTPS网址。不要预先猜测或编造域名。
2. 未登录访问首页、教师页和设置页时，只能进入登录页。
3. 未登录调用API返回401；其他已验证邮箱的账号调用API返回403，无法浏览学习页面。
4. 自己的已验证邮箱能够登录，完成造句并在刷新后恢复。
5. 同一网址用无痕窗口访问时，仍然要求登录。
6. 所有者页面响应含private/no-store，学习录音/截图桶为私有；导出和删除正常。
7. 身份服务故障或配置缺失时，网站保持关闭，不自动开放访问。

本地已验证34项单元/API/访问控制测试与生产构建；这些不能替代部署后真实账号、邮件和访问权限验证。现阶段不提供“已经只有本人可访问”的公网保证。
