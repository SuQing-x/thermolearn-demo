<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppShell from '../../components/AppShell.vue'
import Icon from '../../components/Icon.vue'
import SimulationWorkbench from '../../components/SimulationWorkbench.vue'
import { getSimulationModel, simulationModels } from '../../simulations/registry'

const selectedId = ref(simulationModels[0]?.id ?? '')
const selected = computed(() => getSimulationModel(selectedId.value))

onLoad((options) => {
  const modelId = options?.model
  if (modelId && simulationModels.some((model) => model.id === modelId)) {
    selectedId.value = modelId
  }
})
</script>

<template>
  <AppShell active="simulation" title="仿真实验">
    <div class="page-heading">
      <div>
        <h1>让热力学过程，可以被看见</h1>
        <p>调节参数，观察 p–V 曲线、状态点与过程量的实时变化。</p>
      </div>
      <span class="tag"><Icon name="flask" :size="13" />{{ simulationModels.length }} 个演示模型</span>
    </div>

    <div class="model-switcher" role="tablist" aria-label="选择仿真模型">
      <button
        v-for="model in simulationModels"
        :key="model.id"
        class="model-chip"
        :class="{ active: model.id === selectedId }"
        role="tab"
        :aria-selected="model.id === selectedId"
        @click="selectedId = model.id"
      >
        <span class="model-chip-icon"><Icon name="flask" :size="17" /></span>
        <span class="model-chip-text">
          <strong>{{ model.shortName || model.name }}</strong>
          <small>{{ model.name }}</small>
        </span>
      </button>
    </div>

    <SimulationWorkbench :key="selected.id" :model="selected" />
  </AppShell>
</template>

<style scoped>
.model-switcher{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:20px}
.model-chip{display:flex;align-items:center;gap:11px;width:100%;text-align:left;background:#fff;border:1px solid var(--border);border-radius:9px;padding:13px 15px;transition:border-color .2s,background .2s,transform .2s}
.model-chip:hover{border-color:#bfd6c3;transform:translateY(-1px)}
.model-chip.active{border-color:#9dc4ad;background:#edf6ec}
.model-chip-icon{display:grid;place-items:center;width:34px;height:34px;border-radius:8px;background:#eff5ee;color:#78a18a;flex-shrink:0}
.model-chip.active .model-chip-icon{background:#dcecdf;color:#3d7a5a}
.model-chip-text{display:flex;flex-direction:column;gap:3px;min-width:0}
.model-chip-text strong{font-size:12px;font-weight:600;color:#3d5748}
.model-chip-text small{font-size:9px;color:#9aa79c;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
@media(max-width:980px){.model-switcher{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:600px){.model-switcher{gap:8px;margin-bottom:16px}.model-chip{padding:11px}.model-chip-text small{display:none}}
</style>
