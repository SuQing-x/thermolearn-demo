<script setup lang="ts">
withDefaults(defineProps<{ name: string; size?: number }>(), { size: 20 })
const paths: Record<string, string> = {
  home: 'm3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z',
  graph: 'M7 7 17 6M6 8l4 9m8-9-6 10M3 6a3 3 0 1 0 6 0 3 3 0 0 0-6 0m12-1a3 3 0 1 0 6 0 3 3 0 0 0-6 0M8 19a3 3 0 1 0 6 0 3 3 0 0 0-6 0',
  video: 'M3 5h14v14H3z m14 5 5-3v10l-5-3M8 9l5 3-5 3z',
  edit: 'M13 4H5a2 2 0 0 0-2 2v14h14v-8m-9 3 2-5L19 1l4 4-9 9-6 1Z',
  user: 'M8 6a4 4 0 1 0 8 0 4 4 0 0 0-8 0M4 22v-3a8 8 0 0 1 16 0v3',
  search: 'M3 10a7 7 0 1 0 14 0 7 7 0 0 0-14 0m12 5 6 6',
  arrow: 'M4 12h16m-6-6 6 6-6 6',
  chevron: 'm9 5 7 7-7 7',
  book: 'M12 5C8 2 4 3 2 4v16c4-2 7-1 10 1 3-2 6-3 10-1V4c-4-2-7-1-10 1Zm0 0v16',
  clock: 'M2 12a10 10 0 1 0 20 0 10 10 0 0 0-20 0m10-6v6l4 2',
  play: 'm9 5 11 7-11 7Z',
  bookmark: 'M6 3h12v19l-6-4-6 4Z',
  check: 'm5 12 4 4L20 5',
  close: 'm6 6 12 12M6 18 18 6',
  layers: 'm12 3 10 6-10 6L2 9Zm-10 11 10 6 10-6M2 18l10 6 10-6',
  spark: 'm12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3Zm7 0 1 2 2 1-2 1-1 2-1-2-2-1 2-1Z',
  target: 'M2 12a10 10 0 1 0 20 0 10 10 0 0 0-20 0m5 0a5 5 0 1 0 10 0 5 5 0 0 0-10 0m4 0a1 1 0 1 0 2 0 1 1 0 0 0-2 0',
  help: 'M2 12a10 10 0 1 0 20 0 10 10 0 0 0-20 0m7-4a3 3 0 0 1 6 0c0 2-3 2-3 5m0 4v.1',
  download: 'M12 3v12m-5-5 5 5 5-5M3 17v4h18v-4',
  chart: 'M3 3v18h19M7 16l4-5 4 2 6-8',
  menu: 'M3 6h18M3 12h18M3 18h18',
  file: 'M5 2h9l5 5v15H5Zm9 0v6h5M8 12h8M8 16h6',
  reset: 'M3 10a9 9 0 1 1 2 9M3 3v7h7',
  bulb: 'M8 17c0-3-4-4-4-9a8 8 0 1 1 16 0c0 5-4 6-4 9ZM8 20h8m-6 3h4',
  flask: 'M9 2h6M10 2v7L3 20v2h18v-2L14 9V2M7 15h10',
  link: 'm10 13 4-4M8 15l-2 2a4 4 0 0 1-6-6l5-5a4 4 0 0 1 6 0m2 3 2-2a4 4 0 0 1 6 6l-5 5a4 4 0 0 1-6 0',
}
</script>
<template><svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path :d="paths[name] || paths.book" /></svg></template>
