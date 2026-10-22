<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as echarts from 'echarts'
import type { ECharts, EChartsOption, GraphSeriesOption } from 'echarts'
import KnowledgeNodeList from './KnowledgeNodeList.vue'

interface KnowledgeNode {
  id: string
  title: string
  chapterId: string
  core?: boolean
  level?: number | string
  x?: number
  y?: number
}

interface KnowledgeRelation { source: string; target: string; type: string }
interface KnowledgeChapter { id: string; title: string; shortTitle?: string; color: string }

const props = withDefaults(defineProps<{
  nodes: KnowledgeNode[]
  relations: KnowledgeRelation[]
  chapters: KnowledgeChapter[]
  selectedId?: string
  completedIds?: string[]
  chapterFilter?: string
  search?: string
}>(), {
  selectedId: '',
  completedIds: () => [],
  chapterFilter: '',
  search: '',
})

const emit = defineEmits<{ select: [id: string] }>()
const chartElement = ref<HTMLDivElement | null>(null)
const zoomPercent = ref(100)
let chart: ECharts | undefined
let resizeObserver: ResizeObserver | undefined
let resizeFrame = 0
let destroyed = false
const seriesId = 'knowledge-network'
const chapterById = computed(() => new Map(props.chapters.map(chapter => [chapter.id, chapter])))
const nodeById = computed(() => new Map(props.nodes.map(node => [node.id, node])))
const completed = computed(() => new Set(props.completedIds))
const query = computed(() => props.search.trim().toLocaleLowerCase())

// All filtering operates on ids, so duplicate titles in different chapters remain distinct.
const primaryIds = computed(() => new Set(
  props.nodes.filter(node => !props.chapterFilter || node.chapterId === props.chapterFilter).map(node => node.id),
))
const visibleIds = computed(() => {
  const ids = new Set(primaryIds.value)
  if (props.chapterFilter) {
    for (const relation of props.relations) {
      if (primaryIds.value.has(relation.source)) ids.add(relation.target)
      if (primaryIds.value.has(relation.target)) ids.add(relation.source)
    }
  }
  return ids
})
const visibleNodes = computed(() => props.nodes.filter(node => visibleIds.value.has(node.id)))
const visibleRelations = computed(() => props.relations.filter(relation =>
  visibleIds.value.has(relation.source) && visibleIds.value.has(relation.target)
  && nodeById.value.has(relation.source) && nodeById.value.has(relation.target),
))
const matches = computed(() => visibleNodes.value.filter(node =>
  query.value && node.title.toLocaleLowerCase().includes(query.value),
))
const matchingIds = computed(() => new Set(matches.value.map(node => node.id)))
const noMatches = computed(() => Boolean(query.value) && matches.value.length === 0)
const selectedNeighbours = computed(() => {
  const ids = new Set<string>(props.selectedId ? [props.selectedId] : [])
  for (const relation of visibleRelations.value) {
    if (relation.source === props.selectedId) ids.add(relation.target)
    if (relation.target === props.selectedId) ids.add(relation.source)
  }
  return ids
})
const visibleChapters = computed(() => props.chapters.filter(chapter =>
  visibleNodes.value.some(node => node.chapterId === chapter.id),
))
const accessibleNodes = computed(() => query.value ? matches.value : visibleNodes.value)
const graphSummary = computed(() => {
  const selected = nodeById.value.get(props.selectedId)
  return `知识图谱，当前展示 ${visibleNodes.value.length} 个知识点、${visibleRelations.value.length} 条关联。${selected ? `当前选中：${selected.title}。` : ''}可使用下方知识点列表选择节点。`
})

function positionFor(node: KnowledgeNode): [number, number] {
  if (typeof node.x === 'number' && typeof node.y === 'number') return [node.x, node.y]
  const index = props.nodes.findIndex(item => item.id === node.id)
  const angle = index / Math.max(props.nodes.length, 1) * Math.PI * 2 - Math.PI / 2
  const radius = node.core ? 220 : 340
  return [500 + Math.cos(angle) * radius, 350 + Math.sin(angle) * radius]
}

function wrapTitle(title: string) {
  return title.length > 8 ? `${title.slice(0, 8)}\n${title.slice(8)}` : title
}

function getColor(node: KnowledgeNode) {
  return chapterById.value.get(node.chapterId)?.color ?? '#168b84'
}

function createOption(): EChartsOption {
  const data: NonNullable<GraphSeriesOption['data']> = visibleNodes.value.map(node => {
    const selected = node.id === props.selectedId
    const match = matchingIds.value.has(node.id)
    const neighbouringChapter = Boolean(props.chapterFilter) && !primaryIds.value.has(node.id)
    const dimmed = (Boolean(query.value) && !match) || neighbouringChapter
    const color = getColor(node)
    const [x, y] = positionFor(node)
    return {
      id: node.id,
      name: node.title,
      x,
      y,
      value: completed.value.has(node.id) ? '已学' : '待学习',
      symbolSize: selected ? 28 : node.core ? 23 : 15,
      category: props.chapters.findIndex(chapter => chapter.id === node.chapterId),
      itemStyle: {
        color: selected ? '#147d77' : color,
        opacity: selected || match ? 1 : dimmed ? 0.3 : 0.94,
        borderColor: selected ? '#b6e6db' : completed.value.has(node.id) ? '#0b6f64' : '#fff',
        borderWidth: selected ? 7 : completed.value.has(node.id) ? 3 : 2,
        shadowColor: selected ? 'rgba(24, 125, 119, 0.20)' : 'transparent',
        shadowBlur: selected ? 15 : 0,
      },
      label: {
        show: true,
        formatter: wrapTitle(node.title),
        position: 'bottom',
        distance: selected ? 12 : 8,
        color: selected ? '#075e59' : dimmed && !match ? '#a0aab0' : '#3c535b',
        fontFamily: 'Inter, "PingFang SC", "Microsoft YaHei", sans-serif',
        fontSize: selected || node.core ? 12 : 11,
        fontWeight: selected || match || node.core ? 600 : 400,
        lineHeight: 17,
        backgroundColor: selected || match ? 'rgba(241, 251, 248, .92)' : 'rgba(255,255,255,.80)',
        borderRadius: 4,
        padding: [2, 4],
      },
      emphasis: { itemStyle: { borderColor: '#bddfd7', borderWidth: 5 }, label: { color: '#075e59', fontWeight: 600 } },
    }
  })
  const links: NonNullable<GraphSeriesOption['links']> = visibleRelations.value.map(relation => {
    const connected = relation.source === props.selectedId || relation.target === props.selectedId
    const searchConnected = matchingIds.value.has(relation.source) || matchingIds.value.has(relation.target)
    return {
      source: relation.source,
      target: relation.target,
      name: relation.type,
      lineStyle: {
        color: connected ? '#68b8ac' : '#c7d9d6',
        width: connected ? 2 : 1,
        opacity: query.value && !searchConnected ? 0.2 : connected ? 0.95 : 0.62,
        curveness: 0.055,
        type: relation.type === '应用' || relation.type === 'application' ? 'dashed' : 'solid',
      },
      emphasis: { lineStyle: { width: 2.5, opacity: 1, color: '#198b7d' } },
      label: { show: false },
    }
  })
  return {
    animation: false,
    backgroundColor: 'transparent',
    aria: { enabled: true, decal: { show: false }, label: { description: graphSummary.value } },
    tooltip: {
      trigger: 'item',
      confine: true,
      renderMode: 'richText',
      backgroundColor: '#fff',
      borderColor: '#dfebe7',
      borderWidth: 1,
      padding: [10, 13],
      textStyle: { color: '#294841', fontSize: 12, lineHeight: 22 },
      formatter: (params: unknown) => {
        const item = params as { dataType?: string; data?: { id?: string; source?: string; target?: string; name?: string } }
        if (item.dataType === 'edge') {
          const source = nodeById.value.get(String(item.data?.source))?.title ?? ''
          const target = nodeById.value.get(String(item.data?.target))?.title ?? ''
          return `${source}\n${item.data?.name ?? '关联'} → ${target}`
        }
        const node = nodeById.value.get(String(item.data?.id))
        if (!node) return ''
        return `${node.title}\n${chapterById.value.get(node.chapterId)?.shortTitle ?? '工程热力学'}${node.core ? ' · 核心知识点' : ''}\n${completed.value.has(node.id) ? '✓ 已完成学习' : '点击查看资源与练习'}`
      },
    },
    series: [{
      id: seriesId,
      type: 'graph',
      layout: 'none',
      roam: true,
      draggable: false,
      left: 60,
      right: 60,
      top: 76,
      bottom: 88,
      nodeScaleRatio: 0.35,
      scaleLimit: { min: 0.6, max: 2.4 },
      edgeSymbol: ['none', 'none'],
      categories: props.chapters.map(chapter => ({ name: chapter.shortTitle ?? chapter.title })),
      data,
      links,
      emphasis: { focus: 'adjacency', scale: 1.13 },
      blur: { itemStyle: { opacity: 0.28 }, lineStyle: { opacity: 0.12 } },
      labelLayout: { hideOverlap: false },
      cursor: 'pointer',
    }],
  }
}

function syncZoom() {
  const current = chart?.getOption().series as Array<{ zoom?: number }> | undefined
  zoomPercent.value = Math.round((current?.[0]?.zoom ?? 1) * 100)
}

function render() {
  if (!chart || destroyed) return
  chart.setOption(createOption(), { replaceMerge: ['series'], lazyUpdate: false })
  syncZoom()
}

function changeZoom(factor: number) {
  if (!chart || !visibleNodes.value.length) return
  chart.dispatchAction({ type: 'graphRoam', seriesId, zoom: factor, originX: chart.getWidth() / 2, originY: chart.getHeight() / 2 })
  syncZoom()
}

function resetView() {
  if (!chart) return
  const positions = visibleNodes.value.map(positionFor)
  const xs = positions.map(position => position[0])
  const ys = positions.map(position => position[1])
  const center: [number, number] = positions.length
    ? [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2]
    : [0, 0]
  chart.setOption({ series: [{ id: seriesId, center, zoom: 1 }] })
  syncZoom()
}

function focusNode(id: string) {
  if (!chart) return
  const node = nodeById.value.get(id)
  if (!node) return
  chart.setOption({ series: [{ id: seriesId, center: positionFor(node) }] })
}

function chooseNode(id: string) {
  emit('select', id)
  focusNode(id)
}

function handleKeys(event: KeyboardEvent) {
  if (event.key === '+' || event.key === '=') { event.preventDefault(); changeZoom(1.2) }
  else if (event.key === '-') { event.preventDefault(); changeZoom(1 / 1.2) }
  else if (event.key === '0') { event.preventDefault(); resetView() }
}

watch(() => [props.nodes, props.relations, props.chapters, props.selectedId, props.completedIds], render, { deep: true })
watch(() => props.chapterFilter, async () => { await nextTick(); render(); resetView() })
watch(() => props.search, async () => {
  await nextTick()
  render()
  if (matches.value.length) focusNode(matches.value[0]!.id)
  else if (!query.value) resetView()
})

onMounted(() => {
  if (!chartElement.value) return
  chart = echarts.init(chartElement.value, undefined, { renderer: 'canvas' })
  chart.on('click', params => {
    if (params.dataType !== 'node') return
    const node = params.data as { id?: string }
    if (node.id) emit('select', node.id)
  })
  chart.on('graphroam', syncZoom)
  render()
  resizeObserver = new ResizeObserver(() => {
    cancelAnimationFrame(resizeFrame)
    resizeFrame = requestAnimationFrame(() => chart?.resize())
  })
  resizeObserver.observe(chartElement.value)
})

onBeforeUnmount(() => {
  destroyed = true
  cancelAnimationFrame(resizeFrame)
  resizeObserver?.disconnect()
  chart?.dispose()
  chart = undefined
})
</script>

<template>
  <section class="knowledge-map" aria-label="工程热力学知识图谱">
    <div class="map-stage" @keydown="handleKeys">
      <div class="map-topline">
        <span class="map-live"><span aria-hidden="true"></span>知识关联视图</span>
        <span class="map-count">{{ visibleNodes.length }} 个知识点 <span>·</span> {{ visibleRelations.length }} 条关联</span>
      </div>
      <div ref="chartElement" class="graph-canvas" role="img" :aria-label="graphSummary"></div>

      <div v-if="noMatches || !visibleNodes.length" class="map-empty" role="status">
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5M8 10.5h5"/></svg>
        <strong>{{ noMatches ? '没有找到相关知识点' : '当前章节暂无知识点' }}</strong>
        <p>{{ noMatches ? '试试更短的关键词，或切换到全部章节。' : '请选择其他章节，继续探索课程知识。' }}</p>
      </div>

      <div v-if="query && matches.length" class="search-results" role="status">
        <span>找到 {{ matches.length }} 个知识点</span>
        <button v-for="node in matches.slice(0, 3)" :key="node.id" type="button" @click="chooseNode(node.id)">{{ node.title }}</button>
      </div>

      <div class="map-help"><svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M10 3v14M3 10h14M7.5 5.5 10 3l2.5 2.5M7.5 14.5 10 17l2.5-2.5M5.5 7.5 3 10l2.5 2.5M14.5 7.5 17 10l-2.5 2.5"/></svg><span>拖动探索 · 滚轮缩放 · 点击知识点</span></div>
      <div class="map-controls" role="group" aria-label="图谱视图控制">
        <span class="zoom-value" aria-live="polite">{{ zoomPercent }}%</span>
        <button type="button" aria-label="放大图谱" title="放大（+）" :disabled="zoomPercent >= 240" @click="changeZoom(1.2)"><svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M10 4v12M4 10h12"/></svg></button>
        <button type="button" aria-label="缩小图谱" title="缩小（-）" :disabled="zoomPercent <= 60" @click="changeZoom(1 / 1.2)"><svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M4 10h12"/></svg></button>
        <span class="control-divider"></span>
        <button type="button" aria-label="复位图谱视图" title="复位视图（0）" @click="resetView"><svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M7 3H3v4M13 3h4v4M17 13v4h-4M7 17H3v-4"/><circle cx="10" cy="10" r="3"/></svg></button>
      </div>
    </div>

    <div class="map-footer">
      <div class="chapter-legend" aria-label="章节图例">
        <span v-for="chapter in visibleChapters" :key="chapter.id"><i :style="{ backgroundColor: chapter.color }"></i>{{ chapter.shortTitle || chapter.title }}</span>
      </div>
      <div class="status-legend"><span><i class="core-symbol"></i>核心知识点</span><span><i class="completed-symbol"></i>已学习</span></div>
    </div>

    <KnowledgeNodeList
      :nodes="accessibleNodes"
      :chapters="chapters"
      :selected-id="selectedId"
      :completed-ids="completedIds"
      :related-ids="selectedNeighbours"
      @select="chooseNode"
    />
  </section>
</template>

<style scoped>
.knowledge-map { overflow: hidden; background: #fff; border: 1px solid #e4ebe8; border-radius: 16px; color: #304b46; }
.map-stage { position: relative; height: clamp(460px, 55vw, 570px); min-width: 0; background-color: #fdfefd; background-image: radial-gradient(#dbe5e0 .8px, transparent .8px); background-size: 20px 20px; }
.graph-canvas { position: absolute; inset: 0; width: 100%; height: 100%; }
.map-topline { position: absolute; z-index: 2; top: 20px; left: 22px; right: 22px; display: flex; align-items: center; justify-content: space-between; gap: 16px; pointer-events: none; }
.map-live { display: inline-flex; align-items: center; gap: 7px; font-size: 11px; font-weight: 600; color: #668079; letter-spacing: .04em; }
.map-live > span { width: 6px; height: 6px; border-radius: 50%; background: #269c84; box-shadow: 0 0 0 4px #e6f4ed; }
.map-count { color: #8a9c96; font-size: 11px; }
.map-count > span { padding: 0 6px; color: #b9c6c0; }
.map-help { position: absolute; left: 20px; bottom: 20px; display: flex; gap: 7px; align-items: center; color: #8b9f98; pointer-events: none; font-size: 10px; }
.map-help svg { width: 15px; height: 15px; stroke: currentColor; stroke-width: 1.2; }
.map-controls { position: absolute; z-index: 3; right: 18px; bottom: 16px; display: flex; gap: 2px; align-items: center; padding: 4px 5px; border: 1px solid #e2e9e5; border-radius: 10px; background: rgba(255,255,255,.96); box-shadow: 0 3px 10px #23483b07; }
.map-controls button { display: grid; place-items: center; width: 30px; height: 30px; padding: 0; color: #637e72; background: transparent; border: 0; border-radius: 6px; cursor: pointer; }
.map-controls button:hover { color: #13786b; background: #eef7f3; }
.map-controls button:disabled { opacity: .35; cursor: default; }
.map-controls svg { width: 17px; height: 17px; stroke: currentColor; stroke-width: 1.5; stroke-linecap: round; stroke-linejoin: round; }
.zoom-value { min-width: 39px; text-align: center; font-size: 10px; color: #7c9188; font-variant-numeric: tabular-nums; }
.control-divider { width: 1px; height: 16px; margin: 0 2px; background: #e4ece6; }
.map-empty { position: absolute; z-index: 3; top: 50%; left: 50%; transform: translate(-50%, -50%); display: grid; justify-items: center; width: min(80%, 330px); box-sizing: border-box; padding: 26px 20px; background: rgba(255,255,255,.97); border: 1px solid #e4eee8; border-radius: 16px; box-shadow: 0 10px 40px #3557450c; text-align: center; }
.map-empty svg { width: 30px; height: 30px; margin-bottom: 14px; color: #93b8aa; stroke: currentColor; stroke-width: 1.5; stroke-linecap: round; }
.map-empty strong { font-size: 14px; color: #496459; }
.map-empty p { margin: 8px 0 0; font-size: 12px; line-height: 1.8; color: #83998d; }
.search-results { position: absolute; z-index: 2; top: 51px; left: 20px; display: flex; max-width: calc(100% - 40px); align-items: center; flex-wrap: wrap; gap: 6px; padding: 5px 7px; border-radius: 8px; background: #fffffff2; }
.search-results > span { font-size: 11px; color: #69867a; }
.search-results button { font: inherit; font-size: 11px; color: #167b69; background: #e8f5ef; border: 1px solid #d1e9de; border-radius: 5px; padding: 4px 7px; cursor: pointer; }
.map-footer { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 12px; padding: 16px 20px; border-top: 1px solid #eaf0ec; background: #fff; }
.chapter-legend, .status-legend { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; }
.chapter-legend > span, .status-legend > span { display: inline-flex; align-items: center; gap: 5px; white-space: nowrap; font-size: 10px; color: #7e9189; }
.chapter-legend i { width: 6px; height: 6px; border-radius: 50%; }
.status-legend { gap: 13px; }
.core-symbol { width: 9px; height: 9px; border-radius: 50%; background: #9ab6a8; }
.completed-symbol { width: 8px; height: 8px; border: 2px solid #387f68; border-radius: 50%; box-sizing: border-box; }
.knowledge-map button:focus-visible { outline: 3px solid #acd8ca; outline-offset: 3px; }
@media (max-width: 700px) {
  .map-stage { height: 470px; }
  .map-topline { top: 17px; left: 16px; right: 16px; gap: 8px; }
  .map-count { font-size: 9px; }
  .map-live { font-size: 10px; }
  .map-help { left: 14px; bottom: 20px; font-size: 9px; }
  .map-help span { max-width: 105px; line-height: 1.6; }
  .map-help svg { display: none; }
  .map-controls { right: 12px; bottom: 14px; }
  .map-footer { padding: 14px 16px; }
  .chapter-legend { gap: 9px; }
}
</style>
