<script setup lang="ts">
import { ref, nextTick, onMounted, onUnmounted } from 'vue'
import Icon from './Icon.vue'
import { navigate, feedback } from '../store'
defineProps<{ active: string; title: string }>()
const menuOpen = ref(false), helpOpen = ref(false), search = ref('')
const searchFocused = ref(false)
const navigation = [{ id: 'index', label: '学习首页', icon: 'home' }, { id: 'graph', label: '知识图谱', icon: 'graph' }, { id: 'resources', label: '视频与课件', icon: 'video' }, { id: 'practice', label: '习题练习', icon: 'edit' }, { id: 'profile', label: '个人中心', icon: 'user' }]
function doSearch() { if (search.value.trim()) navigate('graph', { q: search.value.trim() }) }
async function onKey(event: KeyboardEvent) { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); searchFocused.value = false; await nextTick(); searchFocused.value = true } if (event.key === 'Escape') { helpOpen.value = false; menuOpen.value = false } }
onMounted(() => window.addEventListener('keydown', onKey)); onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>
<template>
  <div class="app-shell">
    <div v-if="menuOpen" class="sidebar-backdrop" @click="menuOpen = false"></div>
    <aside class="sidebar" :class="{ 'is-open': menuOpen }">
      <button class="brand" @click="navigate('index')"><span class="brand-mark"><svg viewBox="0 0 40 40" fill="none"><path d="M10 8v24h24M12 26C16 12 23 11 31 9M13 29c4-7 12-9 19-10" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><circle cx="31" cy="9" r="3" fill="#e8c184" /></svg></span><span><strong>热知<span class="brand-dot">.</span></strong><small>THERMO LEARN</small></span></button>
      <div class="course-identity"><span class="tiny-label">我的课程</span><strong>工程热力学</strong><span>Engineering Thermodynamics</span></div>
      <div class="nav-caption">学习空间</div>
      <nav aria-label="主导航"><button v-for="item in navigation" :key="item.id" class="nav-item" :class="{ active: active === item.id }" :aria-current="active === item.id ? 'page' : undefined" @click="navigate(item.id)"><Icon :name="item.icon" :size="20" /><span>{{ item.label }}</span><span v-if="active === item.id" class="nav-active-dot"></span></button></nav>
      <div class="sidebar-bottom"><div class="explore-tip"><span class="tip-icon"><Icon name="bulb" /></span><strong>让知识，连接起来</strong><p>从一个问题出发，<br />看见热力学的完整图景。</p><button @click="navigate('graph')">开始探索 <Icon name="arrow" :size="16" /></button></div><button class="sidebar-help" @click="helpOpen = true"><Icon name="help" :size="17" /> 演示使用指南</button><div class="local-status"><i></i> 本地学习空间 <span>v1.0</span></div></div>
    </aside>
    <div class="main-shell">
      <header class="topbar"><div class="breadcrumb"><button class="icon-button mobile-menu" aria-label="打开导航" @click="menuOpen = true"><Icon name="menu" /></button><span>工程热力学</span><Icon name="chevron" :size="13" /><strong>{{ title }}</strong></div><div class="topbar-actions"><div class="global-search" role="search"><button class="search-submit" aria-label="提交知识点搜索" @click="doSearch"><Icon name="search" :size="17" /></button><input v-model="search" :focus="searchFocused" confirm-type="search" aria-label="搜索知识点" placeholder="搜索知识点、概念…" @confirm="doSearch" @blur="searchFocused = false" /><kbd>Ctrl K</kbd></div><span class="demo-tag">中期演示版</span><button class="avatar" aria-label="进入个人中心" @click="navigate('profile')">学</button></div></header>
      <main id="main-content" class="main-content"><slot /></main>
      <footer class="app-footer"><span>热知 · 连接知识，理解热力学</span><span>大学生创新创业训练计划 · 教学演示</span></footer>
    </div>
    <div v-if="feedback.visible" class="toast" role="status"><Icon name="check" :size="18" />{{ feedback.message }}</div>
    <div v-if="helpOpen" class="modal-backdrop" @click.self="helpOpen = false"><section class="modal guide-modal" role="dialog" aria-modal="true" aria-labelledby="guide-title"><button class="modal-close icon-button" aria-label="关闭指南" @click="helpOpen = false"><Icon name="close" /></button><span class="eyebrow">WELCOME TO THERMO LEARN</span><h2 id="guide-title">从知识，到理解</h2><p class="muted">用一条学习路径，体验平台的五个页面。</p><ol class="guide-steps"><li><b>01</b><div><strong>探索知识图谱</strong><p>选中「热力学第一定律」，查看概念与关联关系。</p></div></li><li><b>02</b><div><strong>观看视频、阅读课件</strong><p>打开自制演示素材，点击「标记已学」保存进度。</p></div></li><li><b>03</b><div><strong>练习与反馈</strong><p>提交答案查看解析，错题自动进入个人中心。</p></div></li><li><b>04</b><div><strong>回顾学习记录</strong><p>查看收藏、错题和学习足迹，继续下一次探索。</p></div></li></ol><div class="soft-note">当前使用演示精选知识点与自制素材。记录保存在此浏览器，可在个人中心导出或重置。</div><button class="button primary full-width" @click="helpOpen = false; navigate('graph', { node: 'first-law' })">开始探索 <Icon name="arrow" :size="18" /></button></section></div>
  </div>
</template>

<style scoped>
.search-submit{display:flex;align-items:center;justify-content:center;flex-shrink:0}
</style>
