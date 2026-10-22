/**
 * 生成 13 张章节封面（SVG）。
 * 运行：node scripts/media/generate_covers.mjs
 *
 * 封面只包含抽象热力学线稿与章节号，不烘焙中文标题；
 * 标题、类型等文字由 ResourceCard 在页面上叠加，保证清晰且可响应式裁切。
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = resolve(HERE, '../../src/static/media/covers')

const MUTED = '#b8d0c1'
const INK = '#e7f1e4'

function axes(x, y, width, height) {
  return `<path d="M${x} ${y}V${y - height}M${x} ${y}H${x + width}" stroke="${MUTED}" stroke-opacity=".55"/>`
}

const CHAPTERS = [
  {
    id: 'ch0', number: '00', title: '绪论', color: '#7d91ac',
    motif: (c) => `
      <circle cx="880" cy="240" r="95" stroke="${c}" stroke-width="3"/>
      <path d="M880 115v-55" stroke="${c}" marker-end="url(#arrow)"/>
      <path d="M880 365v55" stroke="${c}" marker-end="url(#arrow)"/>
      <path d="M755 240h-55" stroke="${c}" marker-end="url(#arrow)"/>
      <path d="M1005 240h55" stroke="${c}" marker-end="url(#arrow)"/>
      <path d="M700 355h390" stroke="${MUTED}" stroke-opacity=".45" stroke-dasharray="6 8"/>
      <path d="M800 355v-55h45v55m25 0v-80h55v80m25 0v-40h40v40" stroke="${MUTED}"/>
      <path d="M680 300c50-70 100-90 160-70" stroke="${MUTED}" stroke-dasharray="8 9"/>`,
  },
  {
    id: 'ch1', number: '01', title: '基本概念及定义', color: '#5987c5',
    motif: (c) => `
      <rect x="720" y="150" width="280" height="220" rx="8" stroke="${c}" stroke-width="3"/>
      <path d="M720 225h280" stroke="${MUTED}" stroke-opacity=".7"/>
      <path d="M860 225v-85" stroke="${c}" stroke-width="6"/>
      <path d="M815 140h90" stroke="${c}" stroke-width="7"/>
      <path d="M675 115v300M1045 115v300" stroke="${MUTED}" stroke-opacity=".4" stroke-dasharray="8 10"/>
      <path d="M700 305h35m240 0h35" stroke="${c}" marker-end="url(#arrow)"/>
      <circle cx="860" cy="225" r="5" fill="${c}" stroke="none"/>`,
  },
  {
    id: 'ch2', number: '02', title: '热力学第一定律', color: '#317cff',
    motif: (c) => `
      <circle cx="880" cy="245" r="115" stroke="${c}" stroke-width="3"/>
      <path d="M710 245h-75" stroke="${c}" marker-end="url(#arrow)"/>
      <path d="M1050 245h75" stroke="${c}" marker-end="url(#arrow)"/>
      <path d="M805 160l-35-45m185 260l35 45" stroke="${MUTED}"/>
      <path d="M775 310c40 55 130 70 210 20" stroke="${MUTED}" stroke-dasharray="7 8"/>
      <circle cx="880" cy="245" r="9" fill="${c}" stroke="none"/>
      <path d="M840 200c30-25 70-25 100 0" stroke="${MUTED}"/>`,
  },
  {
    id: 'ch3', number: '03', title: '气体和蒸汽的性质', color: '#35a7bd',
    motif: (c) => `
      ${axes(680, 405, 380, 275)}
      <path d="M735 355c45-100 105-190 190-240" stroke="${c}" stroke-width="3"/>
      <path d="M720 300c30-40 70-40 100 0s70 40 100 0 70-40 100 0" stroke="${MUTED}" stroke-dasharray="7 8"/>
      <circle cx="805" cy="210" r="17" stroke="${MUTED}"/>
      <circle cx="860" cy="165" r="11" stroke="${MUTED}"/>
      <circle cx="930" cy="135" r="22" stroke="${MUTED}"/>
      <path d="M960 315c20-30 50-30 70 0s50 30 70 0" stroke="${c}"/>`,
  },
  {
    id: 'ch4', number: '04', title: '气体和蒸汽的基本热力过程', color: '#20a896',
    motif: (c) => `
      ${axes(680, 405, 380, 275)}
      <path d="M720 260h300" stroke="${MUTED}" stroke-dasharray="8 8"/>
      <path d="M820 395V150" stroke="${MUTED}" stroke-dasharray="8 8"/>
      <path d="M730 175c110 25 210 90 290 210" stroke="${c}" stroke-width="4"/>
      <path d="M720 145c75 80 150 170 215 255" stroke="${c}" stroke-dasharray="10 8"/>
      <path d="M700 405h340" stroke="${MUTED}" stroke-opacity=".4"/>`,
  },
  {
    id: 'ch5', number: '05', title: '热力学第二定律', color: '#8a67d7',
    motif: (c) => `
      ${axes(680, 405, 380, 275)}
      <rect x="760" y="185" width="230" height="155" fill="none" stroke="${c}" stroke-width="3"/>
      <path d="M760 185h230" stroke="${c}" marker-end="url(#arrow)"/>
      <path d="M990 340V185" stroke="${c}" marker-end="url(#arrow)"/>
      <path d="M990 340H760" stroke="${c}" marker-end="url(#arrow)"/>
      <path d="M760 185v155" stroke="${c}" marker-end="url(#arrow)"/>
      <circle cx="790" cy="210" r="4" fill="${c}" stroke="none"/>
      <circle cx="950" cy="210" r="4" fill="${c}" stroke="none"/>
      <path d="M780 300c40-50 110-60 160-20" stroke="${MUTED}" stroke-dasharray="7 8"/>`,
  },
  {
    id: 'ch6', number: '06', title: '实际气体的性质及热力学一般关系式', color: '#a478ba',
    motif: (c) => `
      ${axes(680, 405, 380, 275)}
      <path d="M720 195c70 0 100 165 180 165s95-120 165-165" stroke="${c}" stroke-width="3"/>
      <path d="M720 245c65 0 95 125 170 125s90-90 160-125" stroke="${MUTED}" stroke-dasharray="8 8"/>
      <circle cx="765" cy="320" r="14" stroke="${MUTED}"/>
      <circle cx="815" cy="285" r="8" stroke="${MUTED}"/>
      <circle cx="985" cy="220" r="18" stroke="${MUTED}"/>
      <path d="M740 350c20-20 45-20 65 0" stroke="${c}"/>`,
  },
  {
    id: 'ch7', number: '07', title: '气体与蒸汽的流动', color: '#4b98ae',
    motif: (c) => `
      <path d="M690 145c95 0 115 95 165 95s70-95 165-95" stroke="${c}" stroke-width="3"/>
      <path d="M690 355c95 0 115-95 165-95s70 95 165 95" stroke="${c}" stroke-width="3"/>
      <path d="M700 250h370" stroke="${MUTED}" marker-end="url(#arrow)"/>
      <path d="M740 215h290M740 285h290" stroke="${MUTED}" stroke-dasharray="6 8" stroke-opacity=".5"/>
      <path d="M790 190c40 20 40 40 0 60m210-60c-40 20-40 40 0 60" stroke="${MUTED}"/>`,
  },
  {
    id: 'ch8', number: '08', title: '压气机的热力过程', color: '#b58b58',
    motif: (c) => `
      <rect x="720" y="190" width="250" height="170" rx="7" stroke="${c}" stroke-width="3"/>
      <path d="M845 190v-80" stroke="${c}" stroke-width="6"/>
      <path d="M800 110h90" stroke="${c}" stroke-width="7"/>
      <path d="M760 190v-50M930 190v-50" stroke="${MUTED}"/>
      <circle cx="845" cy="290" r="44" stroke="${MUTED}"/>
      <path d="M845 255v70m-25-35h50" stroke="${MUTED}"/>
      <path d="M700 230h-35m35 90h-35" stroke="${c}" marker-end="url(#arrow)"/>
      <path d="M975 220c30 0 30 110 0 110" stroke="${MUTED}" stroke-dasharray="7 8"/>`,
  },
  {
    id: 'ch9', number: '09', title: '气体动力循环', color: '#dc9261',
    motif: (c) => `
      <circle cx="880" cy="250" r="110" stroke="${c}" stroke-width="3" stroke-dasharray="10 8"/>
      <circle cx="880" cy="250" r="14" fill="${c}" stroke="none"/>
      <path d="M880 140v55M880 360v-55M770 250h55M990 250h-55" stroke="${MUTED}"/>
      <path d="M880 140l-22-32m22 32l22-32M880 360l-22 32m22-32l22 32M770 250l-32-22m32 22l-32 22M990 250l32-22m-32 22l32 22" stroke="${MUTED}"/>
      <path d="M815 185c40-20 90-20 130 0" stroke="${c}"/>`,
  },
  {
    id: 'ch10', number: '10', title: '蒸汽动力装置', color: '#cf778b',
    motif: (c) => `
      <circle cx="945" cy="235" r="82" stroke="${c}" stroke-width="3"/>
      <path d="M945 153v164M863 235h164M887 177l116 116M1003 177L887 293" stroke="${MUTED}"/>
      <path d="M700 335h150v65H700z" stroke="${MUTED}"/>
      <path d="M720 250h95" stroke="${c}" marker-end="url(#arrow)"/>
      <path d="M1027 250h40c20 0 20 85 0 85h-40" stroke="${MUTED}" stroke-dasharray="7 8"/>
      <path d="M760 190c25-35 55-35 80 0" stroke="${c}"/>`,
  },
  {
    id: 'ch11', number: '11', title: '制冷循环', color: '#478bc8',
    motif: (c) => `
      <rect x="720" y="175" width="280" height="195" rx="14" stroke="${c}" stroke-width="3"/>
      <path d="M760 175v195M960 175v195" stroke="${MUTED}" stroke-dasharray="8 8"/>
      <path d="M790 235h130" stroke="${MUTED}" marker-end="url(#arrow)"/>
      <path d="M820 305c30-40 80-40 110 0" stroke="${c}"/>
      <circle cx="880" cy="265" r="42" stroke="${MUTED}"/>
      <path d="M700 260h-35m35 85h-35" stroke="${c}" marker-end="url(#arrow)"/>
      <path d="M1030 235h35m-35 85h35" stroke="${c}" marker-end="url(#arrow)"/>`,
  },
  {
    id: 'ch12', number: '12', title: '理想气体混合物及湿空气', color: '#71a283',
    motif: (c) => `
      ${axes(680, 405, 380, 275)}
      <path d="M730 215c0-50 40-90 90-90 20-45 75-65 115-35 15-35 65-50 100-20 55-10 90 25 90 60 35 0 60 30 60 60 0 45-35 75-80 75H780c-35 0-50-20-50-50z" stroke="${MUTED}" stroke-width="3"/>
      <path d="M810 300v35m45-35v50m45-50v30m45-30v45" stroke="${c}" stroke-dasharray="6 8"/>
      <path d="M720 360c80-30 150-70 220-110" stroke="${c}"/>`,
  },
]

function coverSvg(chapter) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 520" width="1200" height="520" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${chapter.title}章节封面">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#173f35"/>
      <stop offset="1" stop-color="#0b211b"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="${chapter.color}" stop-opacity=".32"/>
      <stop offset="1" stop-color="${chapter.color}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#081a15" stop-opacity="0"/>
      <stop offset="1" stop-color="#081a15" stop-opacity=".9"/>
    </linearGradient>
    <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
      <path d="M48 0H0V48" fill="none" stroke="#ffffff" stroke-opacity=".05"/>
    </pattern>
    <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0L10 5L0 10Z" fill="${chapter.color}"/>
    </marker>
  </defs>
  <rect width="1200" height="520" fill="url(#bg)"/>
  <rect width="1200" height="520" fill="url(#grid)"/>
  <circle cx="900" cy="235" r="340" fill="url(#glow)"/>
  <text x="1140" y="470" text-anchor="end" font-family="Georgia, 'Times New Roman', serif" font-size="330" font-weight="700" fill="#ffffff" fill-opacity=".055" letter-spacing="-12">${chapter.number}</text>
  <g fill="none" stroke="${INK}" stroke-opacity=".78" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${chapter.motif(chapter.color)}</g>
  <rect x="0" y="300" width="1200" height="220" fill="url(#fade)"/>
  <rect x="0" y="0" width="8" height="520" fill="${chapter.color}"/>
</svg>`
}

mkdirSync(OUT_DIR, { recursive: true })
for (const chapter of CHAPTERS) {
  writeFileSync(resolve(OUT_DIR, `${chapter.id}-cover.svg`), coverSvg(chapter), 'utf8')
}
console.log(`已生成 ${CHAPTERS.length} 张章节封面：${OUT_DIR}`)
