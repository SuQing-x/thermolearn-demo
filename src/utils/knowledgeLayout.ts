import type { Chapter, KnowledgeNode, Relation } from '../data/course'

export interface ChapterGroup {
  chapter: Chapter
  nodes: KnowledgeNode[]
}

export interface PrerequisiteLayout {
  levels: Map<string, number>
  levelGroups: string[][]
  components: string[][]
  isolated: Set<string>
  roots: string[]
  positions: Map<string, [number, number]>
  maxLevel: number
  hasCycle: boolean
  orderedIds: string[]
}

const HORIZONTAL_GAP = 112
const COMPONENT_GAP = 52
const VERTICAL_GAP = 128

function orderMap(nodes: KnowledgeNode[], learningPath: string[]) {
  const index = new Map(nodes.map((node, position) => [node.id, 1000 + position]))
  learningPath.forEach((id, position) => index.set(id, position))
  return index
}

function compareIds(a: string, b: string, order: Map<string, number>, componentIndex?: Map<string, number>) {
  if (componentIndex) {
    const componentA = componentIndex.get(a) ?? Number.MAX_SAFE_INTEGER
    const componentB = componentIndex.get(b) ?? Number.MAX_SAFE_INTEGER
    if (componentA !== componentB) return componentA - componentB
  }
  return (order.get(a) ?? Number.MAX_SAFE_INTEGER) - (order.get(b) ?? Number.MAX_SAFE_INTEGER)
}

function sortIds(ids: string[], order: Map<string, number>, componentIndex?: Map<string, number>) {
  return [...ids].sort((a, b) => compareIds(a, b, order, componentIndex))
}

/** 按章节顺序和章内学习顺序分组；节点顺序来自 learningPath。 */
export function buildChapterGroups(
  nodes: KnowledgeNode[],
  chapters: Chapter[],
  learningPath: string[],
): ChapterGroup[] {
  const order = orderMap(nodes, learningPath)
  return chapters.map((chapter) => ({
    chapter,
    nodes: nodes
      .filter((node) => node.chapterId === chapter.id)
      .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0)),
  }))
}

/**
 * 用全部关联计算学习层级和固定坐标：前置/应用/包含都会影响布局，
 * 但只有「前置」边被标记为先修依赖。无前置边的应用节点会单独标记。
 */
export function buildPrerequisiteLayout(
  nodes: KnowledgeNode[],
  relations: Relation[],
  learningPath: string[],
): PrerequisiteLayout {
  const order = orderMap(nodes, learningPath)
  const nodeIds = new Set(nodes.map((node) => node.id))
  const layoutRelations = relations.filter((relation) =>
    nodeIds.has(relation.source) && nodeIds.has(relation.target),
  )
  const primary = relations.filter((relation) =>
    relation.type === '前置' && nodeIds.has(relation.source) && nodeIds.has(relation.target),
  )

  const parents = new Map<string, string[]>(nodes.map((node) => [node.id, []]))
  const children = new Map<string, string[]>(nodes.map((node) => [node.id, []]))
  const undirected = new Map<string, Set<string>>(nodes.map((node) => [node.id, new Set<string>()]))
  const indegree = new Map<string, number>(nodes.map((node) => [node.id, 0]))

  for (const relation of layoutRelations) {
    parents.get(relation.target)?.push(relation.source)
    children.get(relation.source)?.push(relation.target)
    undirected.get(relation.source)?.add(relation.target)
    undirected.get(relation.target)?.add(relation.source)
    indegree.set(relation.target, (indegree.get(relation.target) ?? 0) + 1)
  }

  // 只有完全没有「前置」边的应用节点才标记为“无前置应用点”。
  const primaryDegree = new Map<string, number>(nodes.map((node) => [node.id, 0]))
  for (const relation of primary) {
    primaryDegree.set(relation.source, (primaryDegree.get(relation.source) ?? 0) + 1)
    primaryDegree.set(relation.target, (primaryDegree.get(relation.target) ?? 0) + 1)
  }

  const levels = new Map<string, number>(nodes.map((node) => [node.id, 0]))
  const queue = sortIds(
    nodes.filter((node) => indegree.get(node.id) === 0).map((node) => node.id),
    order,
  )
  const processed: string[] = []
  while (queue.length) {
    const id = queue.shift() as string
    processed.push(id)
    for (const child of children.get(id) ?? []) {
      levels.set(child, Math.max(levels.get(child) ?? 0, (levels.get(id) ?? 0) + 1))
      const next = (indegree.get(child) ?? 0) - 1
      indegree.set(child, next)
      if (next === 0) queue.push(child)
    }
  }

  const hasCycle = processed.length !== nodes.length
  if (hasCycle) {
    // 数据异常时保持页面可用；正式数据由 check-content.mjs 拦截环。
    for (const node of nodes) {
      if (!processed.includes(node.id)) levels.set(node.id, 0)
    }
  }

  // 弱连通分量：用无向前置边做 BFS，保留多个独立分支。
  const componentIds: string[][] = []
  const seen = new Set<string>()
  for (const node of [...nodes].sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))) {
    if (seen.has(node.id)) continue
    const component: string[] = []
    const stack = [node.id]
    seen.add(node.id)
    while (stack.length) {
      const id = stack.pop() as string
      component.push(id)
      for (const neighbour of undirected.get(id) ?? []) {
        if (!seen.has(neighbour)) {
          seen.add(neighbour)
          stack.push(neighbour)
        }
      }
    }
    componentIds.push(sortIds(component, order))
  }
  componentIds.sort((a, b) => (order.get(a[0] ?? '') ?? 0) - (order.get(b[0] ?? '') ?? 0))

  const componentIndex = new Map<string, number>()
  componentIds.forEach((component, index) => {
    for (const id of component) componentIndex.set(id, index)
  })

  const maxLevel = Math.max(0, ...nodes.map((node) => levels.get(node.id) ?? 0))
  const levelGroups: string[][] = Array.from({ length: maxLevel + 1 }, () => [])
  for (const node of nodes) {
    levelGroups[levels.get(node.id) ?? 0]?.push(node.id)
  }
  for (const group of levelGroups) {
    group.sort((a, b) => compareIds(a, b, order, componentIndex))
  }

  // 固定坐标：先按“分量 → 学习顺序”初始化，再按父节点重心排序，减少交叉。
  const positions = new Map<string, [number, number]>()
  const MAX_PER_ROW = 6
  const ROW_GAP = VERTICAL_GAP * 0.46
  function assignLevel(group: string[], level: number) {
    for (let startIndex = 0; startIndex < group.length; startIndex += MAX_PER_ROW) {
      const row = group.slice(startIndex, startIndex + MAX_PER_ROW)
      const offsets: number[] = []
      let total = 0
      row.forEach((id, index) => {
        if (index > 0) {
          const previous = row[index - 1] as string
          total += componentIndex.get(previous) === componentIndex.get(id) ? HORIZONTAL_GAP : HORIZONTAL_GAP + COMPONENT_GAP
        }
        offsets.push(total)
      })
      const start = -total / 2
      const rowIndex = Math.floor(startIndex / MAX_PER_ROW)
      const y = level * VERTICAL_GAP + rowIndex * ROW_GAP
      row.forEach((id, index) => {
        positions.set(id, [start + (offsets[index] ?? 0), y])
      })
    }
  }

  assignLevel(levelGroups[0] ?? [], 0)
  for (let level = 1; level <= maxLevel; level++) {
    const group = levelGroups[level] ?? []
    const scored = group.map((id) => {
      const parentXs = (parents.get(id) ?? [])
        .map((parent) => positions.get(parent)?.[0])
        .filter((value): value is number => typeof value === 'number')
      return {
        id,
        x: parentXs.length ? parentXs.reduce((sum, value) => sum + value, 0) / parentXs.length : 0,
      }
    })
    scored.sort((a, b) => a.x - b.x || compareIds(a.id, b.id, order, componentIndex))
    levelGroups[level] = scored.map((item) => item.id)
    assignLevel(levelGroups[level] ?? [], level)
  }

  const isolated = new Set(
    nodes
      .filter((node) => (primaryDegree.get(node.id) ?? 0) === 0)
      .map((node) => node.id),
  )
  const roots = sortIds(
    nodes.filter((node) => (parents.get(node.id)?.length ?? 0) === 0).map((node) => node.id),
    order,
  )

  return {
    levels,
    levelGroups,
    components: componentIds,
    isolated,
    roots,
    positions,
    maxLevel,
    hasCycle,
    orderedIds: levelGroups.flat(),
  }
}
