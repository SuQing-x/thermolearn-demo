<script setup lang="ts">
import { computed } from 'vue'
import katex from 'katex'
const props = defineProps<{ value?: string; note?: string }>()
const isLatex = computed(() => !!props.value?.includes('\\'))
const html = computed(() => isLatex.value ? katex.renderToString(props.value || '', { throwOnError: false, trust: false, displayMode: true }) : '')
</script>
<template><div v-if="value" class="formula-box"><div v-if="isLatex" v-html="html"></div><div v-else class="formula-text">{{ value }}</div><p v-if="note">{{ note }}</p></div></template>
