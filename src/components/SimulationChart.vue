<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as echarts from 'echarts'
import type { ECharts, EChartsOption } from 'echarts'
import type { SimulationChart } from '../simulations/types'

const props = withDefaults(defineProps<{ chart: SimulationChart; height?: number }>(), {
  height: 360,
})

const chartElement = ref<HTMLDivElement | null>(null)
let chartInstance: ECharts | undefined
let resizeObserver: ResizeObserver | undefined

const reducedMotion = typeof window !== 'undefined'
  && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

function buildOption(): EChartsOption {
  return {
    animation: !reducedMotion,
    grid: { left: 34, right: 26, top: 36, bottom: 34, containLabel: true },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' },
      backgroundColor: '#ffffff',
      borderColor: '#e5ebe8',
      textStyle: { color: '#263d36', fontSize: 11 },
    },
    xAxis: {
      type: 'value',
      name: props.chart.xLabel,
      nameLocation: 'middle',
      nameGap: 28,
      nameTextStyle: { color: '#87938f', fontSize: 11 },
      axisLine: { lineStyle: { color: '#dce4de' } },
      axisTick: { show: false },
      axisLabel: { color: '#87938f', fontSize: 10 },
      splitLine: { lineStyle: { color: '#edf1ed' } },
    },
    yAxis: {
      type: 'value',
      name: props.chart.yLabel,
      nameLocation: 'middle',
      nameGap: 34,
      nameTextStyle: { color: '#87938f', fontSize: 11 },
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#87938f', fontSize: 10 },
      splitLine: { lineStyle: { color: '#edf1ed' } },
    },
    series: props.chart.series.map((series, index) => ({
      type: 'line' as const,
      name: series.name,
      data: series.points,
      showSymbol: false,
      smooth: false,
      lineStyle: { width: 2, color: series.color || '#0f8a5f' },
      itemStyle: { color: series.color || '#0f8a5f' },
      emphasis: { focus: 'series' as const },
      markPoint: index === 0 && props.chart.markPoints?.length
        ? {
            symbol: 'circle',
            symbolSize: 9,
            itemStyle: { color: '#a36b2c', borderColor: '#ffffff', borderWidth: 2 },
            label: { show: true, position: 'top', formatter: '{b}', color: '#52695d', fontSize: 10 },
            data: props.chart.markPoints.map((point) => ({ name: point.name, coord: [point.x, point.y] })),
          }
        : undefined,
    })),
  }
}

function render(): void {
  chartInstance?.setOption(buildOption(), true)
}

onMounted(() => {
  if (!chartElement.value) return
  chartInstance = echarts.init(chartElement.value)
  render()
  resizeObserver = new ResizeObserver(() => chartInstance?.resize())
  resizeObserver.observe(chartElement.value)
})

watch(() => props.chart, render, { deep: true })

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  chartInstance?.dispose()
  chartInstance = undefined
})
</script>

<template>
  <div
    ref="chartElement"
    class="simulation-chart"
    :style="{ height: height + 'px' }"
    role="img"
    :aria-label="chart.title"
  ></div>
</template>

<style scoped>
.simulation-chart {
  width: 100%;
  min-height: 240px;
}
</style>
