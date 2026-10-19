<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppShell from '../../components/AppShell.vue'
import Icon from '../../components/Icon.vue'
import SimulationWorkbench from '../../components/SimulationWorkbench.vue'
import { getSimulationModel } from '../../simulations/registry'
import { navigate } from '../../store'

const modelId = ref('')
const model = computed(() => getSimulationModel(modelId.value))

onLoad((options) => {
  modelId.value = options?.model || ''
})
</script>

<template>
  <AppShell active="simulation" title="仿真实验">
    <button class="back-link" @click="navigate('simulation')">
      <Icon name="arrow" :size="15" />返回实验列表
    </button>

    <div class="page-heading">
      <div>
        <span class="eyebrow">{{ model.category || 'SIMULATION' }}</span>
        <h1>{{ model.name }}</h1>
        <p>调节参数，观察过程曲线、状态点与关键指标的变化。</p>
      </div>
      <span class="tag"><Icon :name="model.icon || 'flask'" :size="13" />{{ model.shortName || '仿真模型' }}</span>
    </div>

    <SimulationWorkbench :model="model" />
  </AppShell>
</template>

<style scoped>
.back-link{display:inline-flex;align-items:center;gap:6px;font-size:11px;color:#6e8a76;margin-bottom:16px}
.back-link:hover{color:#347f52}
.back-link svg{transform:rotate(180deg)}
</style>
