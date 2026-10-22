# 离线教学演示媒体

三个视频由 `generate_media.py` 使用 Pillow 绘制科学示意图，再用 FFmpeg 编码。没有使用外部课程视频、音频或图像素材。视频无声，16 秒，1280×720，24 fps，H.264/yuv420p，MP4 faststart，可离线播放。

- `first-law.mp4`：闭口系统第一定律，Q 正值代表系统吸热，W 正值代表系统对外做功；忽略动能、势能变化。动画终态 Q = 100 kJ，W = 40 kJ，ΔU = 60 kJ。
- `isothermal.mp4`：固定物质的量、固定温度的理想气体准静态膨胀，pV = nRT = 300 kPa·m³，体积从 1 增至 3 m³，绝对压力从 300 降至 100 kPa。
- `carnot.mp4`：两恒温热源间的可逆热机，Tc 固定 300 K，Th 从 450 增至 900 K，卡诺效率从 33.3% 增至 66.7%；每循环吸热示例固定 100 kJ，输出功与放热满足能量守恒。

各视频对应一张 `*-cover.png` 封面。`validation.json` 记录编码元数据和完整解码验证结果。

生成需要 Python、Pillow、imageio-ffmpeg，以及 Windows 微软雅黑字体。可将 imageio-ffmpeg 安装到当前目录的 `vendor` 子目录，也可使用已有的 Python 环境。

```powershell
python -m pip install Pillow imageio-ffmpeg
python scripts/media/generate_media.py
```

本项目中的短片用于概念演示，不代表已接入完整课程或外部网课。

## 章节封面

`generate_covers.mjs` 生成 13 张章节封面 SVG（ch0–ch12），输出到 `src/static/media/covers/chXX-cover.svg`。封面使用深绿背景、章节色和抽象热力学线稿，不包含中文标题；章节标题与资源类型由 `ResourceCard.vue` 在页面上叠加，避免固定图片裁切导致文字丢失。PDF 与网课资源都按 `chapterId` 自动使用对应章节封面。

```powershell
node scripts/media/generate_covers.mjs
```

新增或替换封面时保持 `chXX-cover.svg` 命名；如需单独覆盖某个资源，可在 `src/data/course.ts` 的资源对象上添加可选 `cover` 字段，例如 `cover: '/static/media/covers/custom.svg'`。封面脚本只依赖 Node.js，不需要 Pillow 或 FFmpeg。
