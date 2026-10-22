<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as echarts from 'echarts'
import type { ECharts, EChartsOption, GraphSeriesOption, TreeSeriesOption } from 'echarts'
import KnowledgeNodeList from './KnowledgeNodeList.vue'
import { buildChapterGroups, buildPrerequisiteLayout } from '../utils/knowledgeLayout'
import type { Chapter, KnowledgeNode, Relation } from '../data/course'

type ViewMode = 'chapter' | 'prerequisite'

interface TreeDatum {
  id: string
  name: string
  title?: string
  chapterId?: string
  order?: number
  isRoot?: boolean
  isChapter?: boolean
  collapsed?: boolean
  symbol?: string
  symbolSize?: number | number[]
  itemStyle?: Record<string, unknown>
  label?: Record<string, unknown>
  children?: TreeDatum[]
}

interface GraphDatum {
  id: string
  name: string
  x: number
  y: number
  category: number
  value: number
  symbol: string
  symbolSize: number
  itemStyle: Record<string, unknown>
  label: Record<string, unknown>
  emphasis?: Record<string, unknown>
}

const props = withDefaults(defineProps<{
  nodes: KnowledgeNode[]
  relations: Relation[]
  chapters: Chapter[]
  learningPath: string[]
  mode: ViewMode
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
const expandedChapter = ref('')
const showSecondary = ref(true)
let chartInstance: ECharts | undefined
let resizeObserver: ResizeObserver | undefined
let resizeFrame = 0
let destroyed = false
const seriesId = 'knowledge-learning'

const chapterById = computed(() => new Map(props.chapters.map((chapter) => [chapter.id, chapter])))
const nodeById = computed(() => new Map(props.nodes.map((node) => [node.id, node])))
const completed = computed(() => new Set(props.completedIds))
const query = computed(() => props.search.trim().toLocaleLowerCase())
const pathOrder = computed(() => new Map(props.learningPath.map((id, index) => [id, index])))
const chapterGroups = computed(() => buildChapterGroups(props.nodes, props.chapters, props.learningPath))
const prerequisiteLayout = computed(() => buildPrerequisiteLayout(props.nodes, props.relations, props.learningPath))
const primaryRelations = computed(() => props.relations.filter((relation) => relation.type === '前置'))
const secondaryRelations = computed(() => props.relations.filter((relation) => relation.type !== '前置'))

const visibleNodes = computed(() => {
  if (props.mode === 'chapter') {
    return props.nodes.filter((node) => !props.chapterFilter || node.chapterId === props.chapterFilter)
  }
  if (!props.chapterFilter) return props.nodes
  const primaryIds = new Set(
    props.nodes.filter((node) => node.chapterId === props.chapterFilter).map((node) => node.id),
  )
  const ids = new Set(primaryIds)
  for (const relation of primaryRelations.value) {
    if (primaryIds.has(relation.source)) ids.add(relation.target)
    if (primaryIds.has(relation.target)) ids.add(relation.source)
  }
  return props.nodes.filter((node) => ids.has(node.id))
})
const visibleIds = computed(() => new Set(visibleNodes.value.map((node) => node.id)))
const visiblePrimaryRelations = computed(() => primaryRelations.value.filter((relation) =>
  visibleIds.value.has(relation.source) && visibleIds.value.has(relation.target),
))
const visibleSecondaryRelations = computed(() => secondaryRelations.value.filter((relation) =>
  visibleIds.value.has(relation.source) && visibleIds.value.has(relation.target),
))
const visibleChapters = computed(() => props.chapters.filter((chapter) =>
  visibleNodes.value.some((node) => node.chapterId === chapter.id),
))
const matches = computed(() => visibleNodes.value.filter((node) =>
  query.value && node.title.toLocaleLowerCase().includes(query.value),
))
const matchingIds = computed(() => new Set(matches.value.map((node) => node.id)))
const noMatches = computed(() => Boolean(query.value) && matches.value.length === 0)
const searchFocusIds = computed(() => {
  const ids = new Set(matchingIds.value)
  if (!query.value) return ids
  for (const relation of visiblePrimaryRelations.value) {
    if (matchingIds.value.has(relation.source)) ids.add(relation.target)
    if (matchingIds.value.has(relation.target)) ids.add(relation.source)
  }
  return ids
})
const selectedNeighbours = computed(() => {
  const ids = new Set<string>(props.selectedId ? [props.selectedId] : [])
  for (const relation of props.relations) {
    if (relation.source === props.selectedId) ids.add(relation.target)
    if (relation.target === props.selectedId) ids.add(relation.source)
  }
  return ids
})
const accessibleNodes = computed(() => {
  const base = query.value ? matches.value : visibleNodes.value
  if (props.mode === 'prerequisite') {
    const order = new Map(prerequisiteLayout.value.orderedIds.map((id, index) => [id, index]))
    return [...base].sort((a, b) => (order.get(a.id) ?? 999) - (order.get(b.id) ?? 999))
  }
  return [...base].sort((a, b) => (pathOrder.value.get(a.id) ?? 999) - (pathOrder.value.get(b.id) ?? 999))
})
const countText = computed(() => {
  if (props.mode === 'chapter') return `${visibleChapters.value.length} 章`
  if (showSecondary.value) {
    return `${visiblePrimaryRelations.value.length + visibleSecondaryRelations.value.length} 条关联`
  }
  return `${visiblePrimaryRelations.value.length} 条前置`
})
const viewSummary = computed(() => {
  if (props.mode === 'chapter') {
    return `章节学习路径，按 ch0 到 ch12 顺序展示 ${visibleNodes.value.length} 个知识点，当前展开 ${chapterById.value.get(expandedChapter.value)?.title ?? '未展开章节'}。可使用下方知识点列表选择节点。`
  }
  const selected = nodeById.value.get(props.selectedId)
  return `先修顺序，展示 ${visibleNodes.value.length} 个知识点、${visiblePrimaryRelations.value.length} 条前置关系和 ${visibleSecondaryRelations.value.length} 条应用/包含关系；层级参考全部关联，共 ${prerequisiteLayout.value.maxLevel + 1} 层、${prerequisiteLayout.value.roots.length} 个起点。${selected ? `当前选中：${selected.title}。` : ''}可使用下方知识点列表选择节点。`
})

function wrapTitle(title: string) {
  return title.length > 9 ? `${title.slice(0, 9)}\n${title.slice(9)}` : title
}

function isNarrow() {
  return typeof window !== 'undefined' && window.innerWidth <= 700
}

function adjustExpandedChapter() {
  if (props.mode !== 'chapter') return
  if (props.chapterFilter) { expandedChapter.value = props.chapterFilter; return }
  if (query.value && matches.value.length) { expandedChapter.value = matches.value[0]?.chapterId ?? ''; return }
  const selected = nodeById.value.get(props.selectedId)
  if (selected) { expandedChapter.value = selected.chapterId; return }
  if (!props.chapters.some((chapter) => chapter.id === expandedChapter.value)) {
    expandedChapter.value = props.chapters[0]?.id ?? ''
  }
}

function createChapterOption(): EChartsOption {
  const narrow = isNarrow()
  const selectedChapter = expandedChapter.value
  const groups = chapterGroups.value.filter((group) => !props.chapterFilter || group.chapter.id === props.chapterFilter)
  const root: TreeDatum = {
    id: '__root__',
    name: '工程热力学',
    isRoot: true,
    symbol: 'roundRect',
    symbolSize: narrow ? [78, 28] : [116, 34],
    itemStyle: { color: '#174b40', borderColor: '#6fa68e', borderWidth: 1 },
    label: { position: 'inside', color: '#f3faf5', fontSize: narrow ? 10 : 12, fontWeight: 600 },
    children: groups.map((group) => ({
      id: `__chapter_${group.chapter.id}`,
      name: `${group.chapter.number} ${group.chapter.shortTitle || group.chapter.title}`,
      isChapter: true,
      chapterId: group.chapter.id,
      symbol: 'roundRect',
      symbolSize: narrow ? [90, 23] : [126, 28],
      itemStyle: { color: '#f2f7f2', borderColor: group.chapter.color, borderWidth: 1.5 },
      label: { position: 'inside', color: '#3f6252', fontSize: narrow ? 8.5 : 10.5, fontWeight: 600 },
      collapsed: group.chapter.id !== selectedChapter,
      children: group.nodes.map((node, index) => {
        const selected = node.id === props.selectedId
        const match = matchingIds.value.has(node.id)
        const dimmed = Boolean(query.value) && !match
        const color = chapterById.value.get(node.chapterId)?.color ?? '#168b84'
        return {
          id: node.id,
          name: `${index + 1}. ${node.title}`,
          title: node.title,
          order: index + 1,
          chapterId: node.chapterId,
          symbolSize: selected ? 16 : 10,
          itemStyle: {
            color,
            opacity: dimmed ? 0.28 : 1,
            borderColor: selected ? '#0b6f64' : completed.value.has(node.id) ? '#0b6f64' : '#ffffff',
            borderWidth: selected ? 4 : completed.value.has(node.id) ? 3 : 1.5,
            shadowColor: selected ? 'rgba(24,125,119,.2)' : 'transparent',
            shadowBlur: selected ? 12 : 0,
          },
          label: {
            show: true,
            position: narrow ? 'bottom' : 'right',
            distance: narrow ? 4 : 8,
            align: narrow ? 'center' : 'left',
            color: match ? '#075e59' : dimmed ? '#a0aab0' : '#3c535b',
            fontSize: narrow ? 9 : 10.5,
            fontWeight: selected || match ? 600 : 400,
            lineHeight: narrow ? 12 : 15,
            width: narrow ? 92 : 150,
            overflow: 'break',
            backgroundColor: match ? 'rgba(241,251,248,.95)' : 'rgba(255,255,255,.72)',
            borderRadius: 4,
            padding: [2, 4],
          },
        }
      }),
    })),
  }

  return {
    animation: false,
    backgroundColor: 'transparent',
    aria: { enabled: true, decal: { show: false }, label: { description: viewSummary.value } },
    tooltip: {
      trigger: 'item',
      confine: true,
      backgroundColor: '#fff',
      borderColor: '#dfebe7',
      padding: [10, 13],
      textStyle: { color: '#294841', fontSize: 12, lineHeight: 22 },
      formatter: (params: unknown) => {
        const item = params as { data?: TreeDatum }
        const data = item.data
        if (!data) return ''
        if (data.isRoot) return '工程热力学\n全部章节的学习入口'
        if (data.isChapter) return `${data.name}\n点击展开或收起本章知识点`
        const node = data.id ? nodeById.value.get(data.id) : undefined
        if (!node) return data.title ?? data.name
        const chapter = chapterById.value.get(node.chapterId)
        return `${node.title}\n${chapter?.title ?? ''} · 章内第 ${data.order ?? ''} 个\n${completed.value.has(node.id) ? '✓ 已完成学习' : '点击查看资源与练习'}`
      },
    },
    series: [{
      id: seriesId,
      type: 'tree',
      data: [root] as unknown as TreeSeriesOption['data'],
      top: narrow ? 20 : 26,
      bottom: narrow ? 20 : 26,
      left: narrow ? 8 : 34,
      right: narrow ? 24 : 255,
      orient: 'LR',
      symbol: 'circle',
      edgeShape: 'polyline',
      edgeForkPosition: '50%',
      initialTreeDepth: 2,
      expandAndCollapse: false,
      roam: true,
      scaleLimit: { min: 0.6, max: 2.2 },
      nodeScaleRatio: 0.3,
      lineStyle: { color: '#cbdcd3', width: 1.3, curveness: 0 },
      labelLayout: { hideOverlap: false },
      emphasis: { focus: 'descendant', itemStyle: { borderColor: '#b6e6db', borderWidth: 4 } },
      blur: { itemStyle: { opacity: 0.3 }, lineStyle: { opacity: 0.16 } },
    } as TreeSeriesOption],
  }
}

function createPrerequisiteOption(): EChartsOption {
  const narrow = isNarrow()
  const layout = prerequisiteLayout.value
  const data: GraphDatum[] = visibleNodes.value.map((node) => {
    const selected = node.id === props.selectedId
    const match = matchingIds.value.has(node.id)
    const focus = searchFocusIds.value.has(node.id)
    const inChapter = !props.chapterFilter || node.chapterId === props.chapterFilter
    const dimmed = (Boolean(query.value) && !focus) || (Boolean(props.chapterFilter) && !inChapter)
    const color = chapterById.value.get(node.chapterId)?.color ?? '#168b84'
    const position = layout.positions.get(node.id) ?? [0, 0]
    const isolated = layout.isolated.has(node.id)
    return {
      id: node.id,
      name: node.title,
      x: position[0],
      y: position[1],
      category: Math.max(0, props.chapters.findIndex((chapter) => chapter.id === node.chapterId)),
      value: layout.levels.get(node.id) ?? 0,
      symbol: isolated ? 'diamond' : 'circle',
      symbolSize: selected ? 27 : node.core ? 20 : 14,
      itemStyle: {
        color,
        opacity: dimmed ? 0.24 : selected || match ? 1 : 0.94,
        borderColor: selected ? '#b6e6db' : completed.value.has(node.id) ? '#0b6f64' : '#ffffff',
        borderWidth: selected ? 5 : completed.value.has(node.id) ? 2.5 : 1.5,
        shadowColor: selected ? 'rgba(24,125,119,.2)' : 'transparent',
        shadowBlur: selected ? 14 : 0,
      },
      label: {
        show: true,
        position: 'bottom',
        distance: 7,
        color: match ? '#075e59' : dimmed ? '#a0aab0' : '#3c535b',
        fontSize: narrow ? 8.5 : 9,
        fontWeight: selected || match || node.core ? 600 : 400,
        lineHeight: narrow ? 12 : 13,
        width: narrow ? 62 : 78,
        overflow: 'break',
        backgroundColor: selected || match ? 'rgba(241,251,248,.94)' : 'rgba(255,255,255,.72)',
        borderRadius: 4,
        padding: [2, 3],
      },
      emphasis: {
        itemStyle: { borderColor: '#bddfd7', borderWidth: 5 },
        label: { color: '#075e59', fontWeight: 600 },
      },
    }
  })

  const links: NonNullable<GraphSeriesOption['links']> = [
    ...visiblePrimaryRelations.value.map((relation) => {
      const connected = relation.source === props.selectedId || relation.target === props.selectedId
      const searchConnected = matchingIds.value.has(relation.source) || matchingIds.value.has(relation.target)
      return {
        source: relation.source,
        target: relation.target,
        name: '前置',
        lineStyle: {
          color: connected ? '#68b8ac' : '#a9c3bb',
          width: connected ? 2 : 1.2,
          opacity: query.value && !searchConnected ? 0.14 : connected ? 0.95 : 0.58,
          curveness: 0.04,
        },
        emphasis: { lineStyle: { width: 2.6, opacity: 1, color: '#198b7d' } },
      }
    }),
    ...(showSecondary.value ? visibleSecondaryRelations.value.map((relation) => ({
      source: relation.source,
      target: relation.target,
      name: relation.type,
      lineStyle: { color: '#b9cdc7', width: 1, opacity: 0.26, curveness: 0.1, type: 'dashed' as const },
      label: { show: false },
    })) : []),
  ]

  return {
    animation: false,
    backgroundColor: 'transparent',
    aria: { enabled: true, decal: { show: false }, label: { description: viewSummary.value } },
    tooltip: {
      trigger: 'item',
      confine: true,
      backgroundColor: '#fff',
      borderColor: '#dfebe7',
      padding: [10, 13],
      textStyle: { color: '#294841', fontSize: 12, lineHeight: 22 },
      formatter: (params: unknown) => {
        const item = params as { dataType?: string; data?: { id?: string; source?: string; target?: string; name?: string } }
        if (item.dataType === 'edge') {
          const source = nodeById.value.get(String(item.data?.source))?.title ?? ''
          const target = nodeById.value.get(String(item.data?.target))?.title ?? ''
          const secondary = item.data?.name !== '前置'
          return `${source} → ${target}\n${item.data?.name ?? '关联'}${secondary ? '（应用/包含关系）' : ''}`
        }
        const node = nodeById.value.get(String(item.data?.id))
        if (!node) return ''
        const level = prerequisiteLayout.value.levels.get(node.id) ?? 0
        const isolated = prerequisiteLayout.value.isolated.has(node.id)
        return `${node.title}\n${chapterById.value.get(node.chapterId)?.title ?? ''} · 第 ${level} 层${isolated ? ' · 无前置应用点' : ''}\n${completed.value.has(node.id) ? '✓ 已完成学习' : '点击查看资源与练习'}`
      },
    },
    series: [{
      id: seriesId,
      type: 'graph',
      layout: 'none',
      roam: true,
      draggable: false,
      left: 70,
      right: 70,
      top: 62,
      bottom: 54,
      nodeScaleRatio: 0.35,
      scaleLimit: { min: 0.55, max: 2.4 },
      edgeSymbol: ['none', 'arrow'],
      edgeSymbolSize: 5,
      categories: props.chapters.map((chapter) => ({ name: chapter.shortTitle ?? chapter.title })),
      data,
      links,
      emphasis: { focus: 'adjacency', scale: 1.12 },
      blur: { itemStyle: { opacity: 0.28 }, lineStyle: { opacity: 0.12 } },
      labelLayout: { hideOverlap: true },
      cursor: 'pointer',
    } as GraphSeriesOption],
  }
}

function createOption(): EChartsOption {
  return props.mode === 'chapter' ? createChapterOption() : createPrerequisiteOption()
}

function syncZoom() {
  const series = chartInstance?.getOption().series as Array<{ zoom?: number }> | undefined
  const value = series?.[0]?.zoom
  if (typeof value === 'number') zoomPercent.value = Math.round(value * 100)
}

function render(reset = false) {
  if (!chartInstance || destroyed) return
  // tree 在部分 ECharts 版本中更新数据后会残留已收起节点的边，先清空画布再重建。
  chartInstance.clear()
  chartInstance.setOption(createOption(), true)
  if (reset) zoomPercent.value = 100
  if (props.mode === 'chapter' && isNarrow() && expandedChapter.value) {
    // 窄屏展开章节后略缩小，避免根节点和右侧标签被裁切。
    chartInstance.dispatchAction({
      type: 'treeRoam',
      seriesId,
      zoom: 0.78,
      originX: chartInstance.getWidth() / 2,
      originY: chartInstance.getHeight() / 2,
    })
    zoomPercent.value = 78
  } else {
    syncZoom()
  }
}

function changeZoom(factor: number) {
  if (!chartInstance) return
  const action = props.mode === 'chapter' ? 'treeRoam' : 'graphRoam'
  chartInstance.dispatchAction({
    type: action,
    seriesId,
    zoom: factor,
    originX: chartInstance.getWidth() / 2,
    originY: chartInstance.getHeight() / 2,
  })
  const series = chartInstance.getOption().series as Array<{ zoom?: number }> | undefined
  const value = series?.[0]?.zoom
  if (typeof value === 'number') zoomPercent.value = Math.round(value * 100)
  else zoomPercent.value = Math.min(240, Math.max(60, Math.round(zoomPercent.value * factor)))
}

function visibleCenter(): [number, number] {
  const layout = prerequisiteLayout.value
  const points = visibleNodes.value.map((node) => layout.positions.get(node.id) ?? [0, 0] as [number, number])
  if (!points.length) return [0, 0]
  const xs = points.map((point) => point[0])
  const ys = points.map((point) => point[1])
  return [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2]
}

function resetView() {
  if (!chartInstance) return
  if (props.mode === 'chapter') {
    render(true)
  } else {
    chartInstance.setOption({ series: [{ id: seriesId, center: visibleCenter(), zoom: 1 }] })
    syncZoom()
  }
}

function focusNode(id: string) {
  if (!chartInstance || props.mode !== 'prerequisite') return
  const position = prerequisiteLayout.value.positions.get(id)
  if (position) chartInstance.setOption({ series: [{ id: seriesId, center: position }] })
}

function chooseNode(id: string) {
  emit('select', id)
  if (props.mode === 'chapter') {
    const node = nodeById.value.get(id)
    if (node) expandedChapter.value = node.chapterId
    render()
  } else {
    focusNode(id)
  }
}

function handleChartClick(params: unknown) {
  const item = params as { data?: TreeDatum }
  const data = item.data
  if (!data?.id) return
  if (data.id === '__root__') return
  if (data.id.startsWith('__chapter_')) {
    const chapterId = data.chapterId ?? data.id.slice('__chapter_'.length)
    expandedChapter.value = expandedChapter.value === chapterId ? '' : chapterId
    render()
    return
  }
  chooseNode(data.id)
}

function handleKeys(event: KeyboardEvent) {
  if (event.key === '+' || event.key === '=') { event.preventDefault(); changeZoom(1.2) }
  else if (event.key === '-') { event.preventDefault(); changeZoom(1 / 1.2) }
  else if (event.key === '0') { event.preventDefault(); resetView() }
}

function toggleSecondary() {
  showSecondary.value = !showSecondary.value
  render()
  if (props.mode === 'prerequisite') focusNode(props.selectedId)
}

watch(() => [props.selectedId, props.chapterFilter, props.search], () => {
  adjustExpandedChapter()
  render()
})

watch(() => [props.nodes, props.relations, props.chapters, props.completedIds, props.learningPath], () => {
  render()
}, { deep: true })

watch(() => props.mode, () => {
  adjustExpandedChapter()
  render()
})

onMounted(() => {
  if (!chartElement.value) return
  expandedChapter.value = props.chapterFilter
    || (query.value ? matches.value[0]?.chapterId : '')
    || ''
  chartInstance = echarts.init(chartElement.value, undefined, { renderer: 'canvas' })
  chartInstance.on('click', handleChartClick)
  chartInstance.on('graphroam', syncZoom)
  chartInstance.on('treeroam', syncZoom)
  render()
  resizeObserver = new ResizeObserver(() => {
    cancelAnimationFrame(resizeFrame)
    resizeFrame = requestAnimationFrame(() => chartInstance?.resize())
  })
  resizeObserver.observe(chartElement.value)
})

onBeforeUnmount(() => {
  destroyed = true
  cancelAnimationFrame(resizeFrame)
  resizeObserver?.disconnect()
  chartInstance?.dispose()
  chartInstance = undefined
})
</script>

<template>
  <section class="knowledge-map" :aria-label="mode === 'chapter' ? '章节学习路径' : '先修顺序'">
    <div class="map-stage" :class="{ 'is-prerequisite': mode === 'prerequisite' }" @keydown="handleKeys">
      <div class="map-topline">
        <span class="map-live"><span aria-hidden="true"></span>{{ mode === 'chapter' ? '章节学习路径' : '先修顺序' }}</span>
        <span class="map-count">{{ visibleNodes.length }} 个知识点 <span>·</span> {{ countText }}</span>
      </div>
      <div ref="chartElement" class="graph-canvas" role="img" :aria-label="viewSummary"></div>

      <div v-if="noMatches || !visibleNodes.length" class="map-empty" role="status">
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4.5 4.5M8 10.5h5" /></svg>
        <strong>{{ noMatches ? '没有找到相关知识点' : '当前章节暂无知识点' }}</strong>
        <p>{{ noMatches ? '试试更短的关键词，或切换到全部章节。' : '请选择其他章节，继续探索课程知识。' }}</p>
      </div>

      <div v-if="query && matches.length" class="search-results" role="status">
        <span>找到 {{ matches.length }} 个知识点</span>
        <button v-for="node in matches.slice(0, 3)" :key="node.id" type="button" @click="chooseNode(node.id)">{{ node.title }}</button>
      </div>

      <div class="map-help"><svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M10 3v14M3 10h14M7.5 5.5 10 3l2.5 2.5M7.5 14.5 10 17l2.5-2.5M5.5 7.5 3 10l2.5 2.5M14.5 7.5 17 10l-2.5 2.5" /></svg><span>拖动探索 · 滚轮缩放 · 点击知识点</span></div>
      <div class="map-controls" role="group" aria-label="图谱视图控制">
        <span class="zoom-value" aria-live="polite">{{ zoomPercent }}%</span>
        <button type="button" aria-label="放大图谱" title="放大（+）" :disabled="zoomPercent >= 240" @click="changeZoom(1.2)"><svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M10 4v12M4 10h12" /></svg></button>
        <button type="button" aria-label="缩小图谱" title="缩小（-）" :disabled="zoomPercent <= 60" @click="changeZoom(1 / 1.2)"><svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M4 10h12" /></svg></button>
        <span class="control-divider"></span>
        <button type="button" aria-label="复位图谱视图" title="复位视图（0）" @click="resetView"><svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M7 3H3v4M13 3h4v4M17 13v4h-4M7 17H3v-4" /><circle cx="10" cy="10" r="3" /></svg></button>
      </div>
    </div>

    <div class="map-footer">
      <div class="chapter-legend" aria-label="章节图例">
        <span v-for="chapter in visibleChapters" :key="chapter.id"><i :style="{ backgroundColor: chapter.color }"></i>{{ chapter.shortTitle || chapter.title }}</span>
      </div>
      <div class="status-legend">
        <span><i class="core-symbol"></i>核心知识点</span>
        <span><i class="completed-symbol"></i>已学习</span>
        <template v-if="mode === 'prerequisite'">
          <span><i class="isolated-symbol"></i>无前置应用点</span>
          <button type="button" class="secondary-toggle" :aria-pressed="showSecondary" @click="toggleSecondary">{{ showSecondary ? '隐藏应用/包含' : '显示应用/包含' }}</button>
        </template>
      </div>
    </div>

    <div v-if="mode === 'prerequisite'" class="view-help">
      <span><i class="prereq-line"></i>实线箭头为前置依赖；虚线为应用/包含。</span>
      <span>{{ prerequisiteLayout.roots.length }} 个起点 · 上 → 下为学习层级（参考全部关联）</span>
    </div>
    <div v-else class="view-help">
      <span>点击章节展开/收起；序号表示章内建议学习顺序。</span>
    </div>

    <KnowledgeNodeList
      :nodes="accessibleNodes"
      :chapters="chapters"
      :selected-id="selectedId"
      :completed-ids="completedIds"
      :related-ids="selectedNeighbours"
      :empty-text="noMatches ? '没有找到相关知识点。' : '当前章节暂无知识点。'"
      @select="chooseNode"
    />
  </section>
</template>

<style scoped>
.knowledge-map { overflow: hidden; background: #fff; border: 1px solid #e4ebe8; border-radius: 16px; color: #304b46; }
.map-stage { position: relative; height: clamp(460px, 55vw, 570px); min-width: 0; background-color: #fdfefd; background-image: radial-gradient(#dbe5e0 .8px, transparent .8px); background-size: 20px 20px; }
.map-stage.is-prerequisite { height: clamp(680px, 68vw, 760px); }
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
.isolated-symbol { display: inline-block; width: 8px; height: 8px; border: 1.5px solid #7f9c8b; border-radius: 1px; transform: rotate(45deg); }
.prereq-line { display: inline-block; width: 16px; border-top: 2px solid #68b8ac; }
.secondary-toggle { font: inherit; font-size: 10px; color: #4f8063; border: 1px solid #d8e7dc; border-radius: 5px; background: #f6faf6; padding: 5px 8px; cursor: pointer; }
.secondary-toggle:hover { background: #edf5ed; }
.view-help { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px; padding: 0 20px 14px; border-top: 1px solid #f0f4f0; color: #8d9f95; font-size: 10px; line-height: 1.7; }
.view-help span { display: inline-flex; align-items: center; gap: 6px; }
.knowledge-map button:focus-visible { outline: 3px solid #acd8ca; outline-offset: 3px; }
@media (max-width: 700px) {
  .map-stage { height: 470px; }
  .map-stage.is-prerequisite { height: 620px; }
  .map-topline { top: 17px; left: 16px; right: 16px; gap: 8px; }
  .map-count { font-size: 9px; }
  .map-live { font-size: 10px; }
  .map-help { left: 14px; bottom: 20px; font-size: 9px; }
  .map-help span { max-width: 105px; line-height: 1.6; }
  .map-help svg { display: none; }
  .map-controls { right: 12px; bottom: 14px; }
  .map-footer { padding: 14px 16px; }
  .chapter-legend { gap: 9px; }
  .view-help { padding: 0 16px 12px; }
}
</style>
