<script setup lang="ts">
import { computed } from 'vue'

interface ListNode {
  id: string
  title: string
  chapterId: string
  core?: boolean
}

interface ListChapter {
  id: string
  color: string
}

const props = withDefaults(defineProps<{
  nodes: ListNode[]
  chapters: ListChapter[]
  selectedId?: string
  completedIds?: string[]
  relatedIds?: Set<string>
  emptyText?: string
}>(), {
  selectedId: '',
  completedIds: () => [],
  relatedIds: () => new Set(),
  emptyText: '当前没有匹配的知识点。',
})

const emit = defineEmits<{ select: [id: string] }>()

const chapterById = computed(() => new Map(props.chapters.map((chapter) => [chapter.id, chapter])))
const completed = computed(() => new Set(props.completedIds))

function getColor(node: ListNode): string {
  return chapterById.value.get(node.chapterId)?.color ?? '#168b84'
}
</script>

<template>
  <details class="accessible-list">
    <summary>以列表浏览知识点 <span>{{ nodes.length }}</span><svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m4 6 4 4 4-4" /></svg></summary>
    <div class="node-list" role="group" aria-label="可选择的知识点">
      <button
        v-for="node in nodes"
        :key="node.id"
        type="button"
        :class="{ active: selectedId === node.id, related: relatedIds.has(node.id) }"
        :aria-pressed="selectedId === node.id"
        @click="emit('select', node.id)"
      >
        <i :style="{ backgroundColor: getColor(node) }"></i>{{ node.title }}
        <span v-if="completed.has(node.id)" class="node-completed">已学</span>
        <span v-else-if="node.core" class="node-core">核心</span>
      </button>
      <p v-if="!nodes.length">{{ emptyText }}</p>
    </div>
  </details>
</template>

<style scoped>
.accessible-list { border-top: 1px solid #edf1ee; }
.accessible-list summary { display: flex; align-items: center; gap: 7px; padding: 10px 20px; color: #8c9c93; font-size: 10px; cursor: pointer; list-style: none; }
.accessible-list summary::-webkit-details-marker { display: none; }
.accessible-list summary > span { padding: 1px 5px; border-radius: 4px; background: #f1f5f1; color: #7b9186; font-size: 9px; }
.accessible-list summary > svg { margin-left: auto; width: 13px; height: 13px; stroke: currentColor; stroke-width: 1.2; }
.accessible-list[open] summary > svg { transform: rotate(180deg); }
.node-list { display: flex; flex-wrap: wrap; gap: 7px; padding: 3px 18px 16px; }
.node-list button { display: inline-flex; align-items: center; gap: 6px; padding: 7px 9px; font: inherit; font-size: 11px; color: #62796e; border: 1px solid #e1eae3; border-radius: 7px; background: #fff; cursor: pointer; }
.node-list button:hover, .node-list button.active { color: #116d5b; border-color: #abd0bf; background: #eff8f2; }
.node-list button.related:not(.active) { border-color: #cfe3d8; background: #f7fbf7; }
.node-list button i { width: 5px; height: 5px; border-radius: 50%; }
.node-core, .node-completed { font-size: 9px; color: #7f9c8b; }
.node-completed { color: #188367; }
.node-list p { font-size: 12px; color: #8b9c93; }
.accessible-list summary:focus-visible, .node-list button:focus-visible { outline: 3px solid #acd8ca; outline-offset: 3px; }
</style>
