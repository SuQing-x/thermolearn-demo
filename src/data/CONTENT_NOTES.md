# 演示课程内容说明

- 章节编号与标题见仓库根目录 `docs/COURSE_OUTLINE.md`，包含第 0–12 章；原始 Word 不随公开仓库分发。
- 32 个知识节点是根据大纲选出的中期演示内容，不代表用户已提供原始 32 点清单，也不代表课程全部知识点。
- 16 道单选题、3 组每组 4 页的文字课件均为本项目自编演示内容；视频是本项目自制可视化教学短片，不冒充正式网课。
- 节点 ID 是知识关联的稳定主键；题目、视频和课件通过 nodeIds 关联，可一对多关联。
- 节点及课件公式采用 KaTeX 可渲染的 LaTeX 字符串，适用条件写入 formulaNote；题干与解析使用可读 Unicode。
- Q、W 的正负号以题目约定为准。闭口系统题采用吸热为正、对外做功为正。制冷和循环热源的热量大小使用正值。

## 公式核对来源

以下是核对物理事实与基础公式的来源。题干、中文说明及课件内容由本项目自行组织，不转载来源中的题目或图片。

1. [NASA Glenn：First Law of Thermodynamics](https://www.grc.nasa.gov/www/BGH/thermo1.html) — ΔU = Q − W，以及吸热与对外做功的正号约定。
2. [NASA Glenn：Equation of State](https://www.grc.nasa.gov/www/k-12/airplane/eqstat.html) — 理想气体状态方程。
3. [NASA Glenn：Carnot Cycle](https://www.grc.nasa.gov/WWW/K-12/airplane/carnot.html) — 卡诺循环的四个过程与循环能量平衡。
4. [OpenStax：The Carnot Cycle](https://openstax.org/books/university-physics-volume-2/pages/4-5-the-carnot-cycle) — 卡诺热效率与逆卡诺制冷系数。
5. [OpenStax：Refrigerators and Heat Pumps](https://openstax.org/books/university-physics-volume-2/pages/4-3-refrigerators-and-heat-pumps) — 制冷系数、供热系数与能量平衡。

## 内容边界

自制示例资源链路的重点为第一定律、理想气体定温过程、卡诺循环。新增课程 PDF 与网课关联见下节；正式教学使用前仍应由课程教师结合指定教材复核与补齐。

## 接入的课程资源（2026-10-13）

- 用户提供的课程 PDF 共 13 份，按原标题对应第 0–12 章；原 PDF 内容未修改，作者及教学内容待人工核对。
- B 站《工程热力学（西安交通大学）》公开目录含 71 个分集；已按标题与课程大纲核对接入 71 个，P63、P64 已由用户确认归入第 11 章制冷循环，保留原分集标题。来源与逐集关联见根目录 `docs/RESOURCE_MAPPING.md`，实际视频播放与教学内容未逐集验证。
- 现有 6 个自制演示资源保留，合计 90 个资源。没有足够标题依据的网课只关联章节，不关联具体知识点。
- PDF 与网课打开不自动完成；学习进度由用户完成标记推算，不代表掌握程度。后端、账号同步及 AI 答疑仍未实现。
