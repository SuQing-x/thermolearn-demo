<script setup lang="ts">
import AppShell from '../../components/AppShell.vue'
import Icon from '../../components/Icon.vue'
import SimulationCard from '../../components/SimulationCard.vue'
import { simulationModels } from '../../simulations/registry'

function openModel(id: string): void {
  uni.reLaunch({ url: `/pages/simulation/detail?model=${encodeURIComponent(id)}` })
}
</script>

<template>
  <AppShell active="simulation" title="仿真实验">
    <div class="page-heading">
      <div>
        <h1>选择一个实验，开始探索</h1>
        <p>每个模块对应一个热力学实验或基础过程，进入后调节参数、观察过程与结果。</p>
      </div>
      <span class="tag"><Icon name="flask" :size="13" />{{ simulationModels.length }} 个实验模块</span>
    </div>

    <div class="experiment-grid">
      <SimulationCard
        v-for="model in simulationModels"
        :key="model.id"
        :model="model"
        @open="openModel"
      />

      <div class="more-card" aria-label="更多实验正在接入">
        <span class="more-icon"><Icon name="spark" :size="22" /></span>
        <strong>更多实验，持续接入</strong>
        <p>组员按统一契约新增模型后，会自动出现在这里，并生成对应的独立详情页。</p>
        <span class="more-note">SIMULATION MODULES</span>
      </div>
    </div>

    <div class="soft-note simulation-note">
      <Icon name="bulb" :size="15" />
      <p>新增模型只需实现 <code>SimulationModel</code> 并在注册表登记，实验卡片与详情页会自动生成。接入说明见 <code>docs/SIMULATION_MODEL_GUIDE.md</code>。</p>
    </div>
  </AppShell>
</template>

<style scoped>
.experiment-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;align-items:stretch}
.more-card{display:flex;flex-direction:column;align-items:flex-start;gap:9px;border:1px dashed #cfdcd2;border-radius:12px;padding:18px;background:#fbfcfb;color:#8b9a8e}
.more-icon{display:grid;place-items:center;width:38px;height:38px;border-radius:10px;background:#eef4ee;color:#78a18a}
.more-card strong{font-size:15px;color:#5d7164;font-weight:600}
.more-card p{font-size:11px;line-height:1.8;color:#93a096;margin:0}
.more-note{margin-top:auto;padding-top:12px;font-size:9px;letter-spacing:1.5px;color:#a9b4a8}
.simulation-note{display:flex;gap:9px;align-items:flex-start;margin-top:18px;font-size:10px;line-height:1.8;color:#8b9a8e}
.simulation-note svg{margin-top:2px;flex-shrink:0}
.simulation-note code{font-size:9px;background:#edf4ed;padding:2px 4px;border-radius:3px;color:#5e7f65}
@media(max-width:1200px){.experiment-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:600px){.experiment-grid{grid-template-columns:1fr}}
</style>
