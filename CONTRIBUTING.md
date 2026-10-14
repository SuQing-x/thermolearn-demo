# 团队协作指南

## 安装和启动

安装 Node.js（含 npm）与 Git，将本仓库克隆到本机，在仓库根目录执行：

```powershell
npm.cmd ci
npm.cmd run dev
```

浏览器访问 http://127.0.0.1:5173。演示期间保持服务窗口开启，结束按 Ctrl+C。macOS/Linux 将 `npm.cmd` 替换为 `npm`。依赖锁定文件应保留，无需自行升级依赖。

## 一次修改的协作流程

1. 开始前阅读 README.md 与 AGENTS.md，确认修改范围。
2. 同步主分支并新建自己的功能分支：

```powershell
git switch main
git pull --ff-only
git switch -c codex/your-change
```

3. 小范围修改后运行相关检查；提交前查看 `git status` 与 `git diff`，确认不包含私密资料。
4. 明确添加本次文件后提交，并推送功能分支：

```powershell
git add src/data/course.ts
git commit -m "说明本次修改的目的"
git push -u origin codex/your-change
```

上面的文件名和分支名是示例，替换为实际内容。然后在 GitHub 创建 Pull Request，由另一位队友审阅后合并。仓库公开允许别人查看和克隆；需要直接推送功能分支的队友仍需仓库管理员添加为协作者，没有写权限可使用 Fork 和 Pull Request。

## 提交前检查

```powershell
node scripts/check-content.mjs
npm.cmd run typecheck
npm.cmd run build
```

内容、媒体或 PDF 变化需运行内容检查；TypeScript/Vue 变化需类型检查；页面结构、构建配置变化需构建。文档改完重读。UI 改动说明实际检查的浏览器尺寸，未实际运行时明确说明。

## 内容与资源

课程运行数据只改 `src/data/course.ts`，不要随意更改已有 ID；题目答案下标从 0 开始。网课变更同时维护目录快照和关联清单。本地媒体保持 `/static/media/` 访问方式，PDF 保持 `/static/courseware/`。

不要提交 node_modules、dist、账号凭证、密钥、原始申报 Word 或个人学习记录。新增教学资料需要确认来源与公开权限，不为第三方资料擅自附加开源许可。后端、AI 等规划功能必须标明尚未实现。
