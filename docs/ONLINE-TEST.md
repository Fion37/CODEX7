# 浏览器在线测试

此方式不需要本机安装Node.js，也不需要Vercel或Supabase账号。它会在你自己的GitHub Codespaces里运行一份基础测试版，不是已经部署的长期公网网站。

打开：

https://github.com/codespaces/new?repo=1429534346&ref=codex%2Fielts-study-os-v1

1. 用拥有仓库权限的GitHub账号登录。
2. 点击 **Create codespace**；已有这个分支的环境时可点击 **Resume codespace**。
3. 首次创建时等待依赖安装，网站随后自动启动，通常会自动打开浏览器标签页。实际时间取决于GitHub环境和网络。
4. 没有自动打开时，在编辑器下方打开 **Ports / 端口**，找到 **3000**，点击浏览器/地球图标。
5. 确认端口可见性为 **Private**，这是GitHub的默认设置。不要切换成Public或组织共享；Private端口仅本人可访问。

## 先测试一条学习流程

首页 → 今日学习计划 → 写作任务 → 进入学习 → 开始专注。

然后打开写作教师，输入 `I am agree that learning English is useful.`，提交后查看离线规则讲解，修改，再独立重写。

还可以测试录音、原创听力音频、阅读小题、截图OCR、CSV/XLSX导入，以及完整备份导出恢复。真实AI和云同步没有配置时不会伪装成已连接；基础测试不需要密钥。

新版增加“我的学习资源”“场景词与改写”、Part 1–4听力专项和按Part区分的口语训练，操作见 [个人资料使用说明](PERSONAL-RESOURCES.md)。如果恢复的是旧Codespace，先在设置导出学习备份，再在终端执行`git pull --ff-only`、`bash .devcontainer/setup.sh`，停止旧开发服务后重新执行`node .devcontainer/start.mjs`；也可使用Codespaces的Rebuild Container重新应用安装步骤。更新只提供新的功能，未自动导入用户电脑中的原始文件。

## 隐私、费用和停止

- 这个测试环境由GitHub的Private端口认证保护。应用使用开发模式，不重复要求Supabase登录。此启动脚本只用于本机/Codespaces测试，正式公网部署仍使用网站所有者登录限制。
- 网站地址在Codespace创建后由GitHub实际分配，无法提前提供一个已经运行的地址。不要把创建入口当作已经运行的网站。
- 学习记录存储在当前浏览器的这个网站地址下，恢复或重建环境可能改变地址。测试后请在设置中导出备份。
- Codespaces使用你账号的计算和存储额度。先查看GitHub显示的额度与计费提示，不保证永久免费；不测试时到 https://github.com/codespaces 停止Codespace，需要释放存储时备份后再删除。
- 如果组织策略、地区或个人额度不允许创建，页面会给出提示；这需要账号侧处理，不能通过编造另一个网址解决。

## 启动问题

如果没有自动启动，在终端输入 `node .devcontainer/start.mjs`。脚本会复用已就绪的同一应用，不会终止别的服务。

日志位于 `/tmp/ielts-study-os-dev.log`。Codespaces初次配置失败时先查看创建日志；不要把端口改为公开来解决安装失败。
