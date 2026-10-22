<script setup lang="ts">
import { computed } from 'vue'
import type { Resource } from '../data/course'
import { chapters, resourceTypeHint, resourceTypeIcon, resourceTypeLabel } from '../data/course'
import { progress, openResource, toggleBookmark } from '../store'
import Icon from './Icon.vue'
import ThermoArt from './ThermoArt.vue'

const props = defineProps<{ resource: Resource }>()
const chapter = computed(() => chapters.find((item) => item.id === props.resource.chapterId))
const chapterCover = computed(() => {
  if (props.resource.type !== 'pdf' && props.resource.type !== 'external') return ''
  return props.resource.cover || `/static/media/covers/${props.resource.chapterId}-cover.svg`
})
const coverStyle = computed(() => chapterCover.value ? { backgroundImage: `url("${chapterCover.value}")` } : undefined)
</script>
<template><article class="resource-card"><button class="resource-cover" :class="[resource.theme, { 'slide-cover': resource.type === 'slides' }]" :aria-label="'打开' + resource.title" @click="openResource(resource.id)"><div v-if="resource.type === 'pdf' || resource.type === 'external'" class="course-cover" :class="{ 'has-cover': chapterCover }" :style="coverStyle"><template v-if="chapterCover"><span class="course-cover-kicker">CHAPTER {{ chapter?.number }}</span><strong>{{ chapter?.title }}</strong></template><template v-else><Icon :name="resourceTypeIcon[resource.type]" :size="48" /><strong>{{ resource.type === 'pdf' ? '课程 PDF' : '工程热力学网课' }}</strong><span>{{ chapter?.title }}</span></template></div><ThermoArt v-else :theme="resource.theme" /><span class="cover-type"><Icon :name="resourceTypeIcon[resource.type]" :size="13" />{{ resourceTypeLabel[resource.type] }}</span><span v-if="resource.type === 'video'" class="cover-play"><Icon name="play" :size="20" /></span><span v-if="resource.type === 'external'" class="cover-external">网课</span><span class="cover-duration">{{ resource.duration }}</span><span v-if="progress.completed.includes(resource.id)" class="cover-complete"><Icon name="check" :size="13" />已学</span></button><div class="resource-card-body"><div class="resource-card-label">{{ chapter?.shortTitle }}</div><button class="resource-title" @click="openResource(resource.id)">{{ resource.title }}</button><p>{{ resource.description }}</p><p v-if="resource.type === 'external'" class="resource-source"><span v-if="resource.course">课程：{{ resource.course }}</span><span v-if="resource.source || resource.author">{{ resource.source || '来源平台待补充' }}<template v-if="resource.author"> · {{ resource.author }}</template></span></p><div class="resource-card-footer"><span><Icon :name="resourceTypeIcon[resource.type]" :size="14" />{{ resourceTypeHint[resource.type] }}<i></i>{{ resource.type === 'external' ? '外部资源' : resource.type === 'pdf' ? '课程课件' : '自制示例' }}</span><button class="icon-button" :class="{ bookmarked: progress.bookmarks.includes(resource.id) }" :aria-label="progress.bookmarks.includes(resource.id) ? '取消收藏' : '收藏资源'" :aria-pressed="progress.bookmarks.includes(resource.id)" @click="toggleBookmark(resource.id)"><Icon name="bookmark" :size="17" /></button></div></div></article></template>

<style scoped>
.course-cover{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;width:100%;height:100%;min-width:0;padding:20px;color:#426e5d;background:#edf3e9}.course-cover strong{font-size:16px}.course-cover span{font-size:11px;line-height:1.5;text-align:center}.course-cover svg{width:36px;height:36px}
.course-cover.has-cover{position:relative;align-items:flex-start;justify-content:flex-end;gap:4px;padding:16px 18px 22px;color:#f2f8f0;background-color:#173f35;background-position:center;background-repeat:no-repeat;background-size:cover}
.course-cover.has-cover::before{content:'';position:absolute;inset:0;background:linear-gradient(180deg,#0b211b00 0%,#0b211b40 48%,#0b211be6 100%)}
.course-cover.has-cover>*{position:relative;z-index:1}
.course-cover.has-cover strong{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;max-width:82%;font-size:15px;line-height:1.45;text-align:left;text-shadow:0 1px 12px #081a1580}
.course-cover-kicker{font-size:9px;line-height:1.5;letter-spacing:1.2px;color:#d8e7d9;opacity:.85;text-align:left}
</style>
