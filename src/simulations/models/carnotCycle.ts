import type {
  SimulationModel,
  SimulationParamValue,
  SimulationResult,
  SimulationSeries,
  SimulationState,
} from '../types'

const R = 8.314462618 // J/(mol·K)
const CHART_COLOR = '#0f8a5f'

function readNumber(values: Record<string, SimulationParamValue>, key: string, label: string): number {
  const value = Number(values[key])
  if (!Number.isFinite(value)) throw new Error(`${label}不是有效数值`)
  return value
}

function requirePositive(label: string, value: number): void {
  if (!(value > 0)) throw new Error(`${label}必须大于 0`)
}

function requireGamma(value: number): void {
  if (!Number.isFinite(value) || value <= 1) throw new Error('绝热指数 γ 必须大于 1')
}

function round(value: number, digits = 2): number {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function makeState(label: string, pressure: number, volume: number, temperature: number, entropy: number): SimulationState {
  return {
    label,
    values: [
      { label: 'p', value: round(pressure), unit: 'kPa' },
      { label: 'V', value: round(volume), unit: 'L' },
      { label: 'T', value: round(temperature), unit: 'K' },
      { label: 'S', value: round(entropy, 3), unit: 'J/K' },
    ],
  }
}

function computeCarnot(values: Record<string, SimulationParamValue>): SimulationResult {
  const n = readNumber(values, 'n', '物质的量 n')
  const v1 = readNumber(values, 'v1', '状态 1 体积 V₁')
  const th = readNumber(values, 'th', '高温热源温度 T_H')
  const tc = readNumber(values, 'tc', '低温热源温度 T_C')
  const ratio = readNumber(values, 'ratio', '定温膨胀比 V₂/V₁')
  const gamma = readNumber(values, 'gamma', '绝热指数 γ')

  requirePositive('物质的量 n', n)
  requirePositive('状态 1 体积 V₁', v1)
  requirePositive('高温热源温度 T_H', th)
  requirePositive('低温热源温度 T_C', tc)
  requirePositive('定温膨胀比 V₂/V₁', ratio)
  requireGamma(gamma)
  if (tc >= th) throw new Error('低温热源温度 T_C 必须低于高温热源温度 T_H')
  if (ratio <= 1) throw new Error('定温膨胀比 V₂/V₁ 必须大于 1')

  // 四个状态：1→2 定温膨胀，2→3 绝热膨胀，3→4 定温压缩，4→1 绝热压缩。
  const v2 = v1 * ratio
  const p1 = (n * R * th) / v1
  const p2 = (n * R * th) / v2
  const adiabaticRatio = Math.pow(th / tc, 1 / (gamma - 1))
  const v3 = v2 * adiabaticRatio
  const p3 = (n * R * tc) / v3
  const v4 = v1 * adiabaticRatio
  const p4 = (n * R * tc) / v4

  const qh = n * R * th * Math.log(ratio)
  const qc = n * R * tc * Math.log(ratio)
  const wnet = qh - qc
  const eta = 1 - tc / th
  const s2 = n * R * Math.log(ratio)
  const s1 = 0
  const s3 = s2
  const s4 = 0

  const pvPoints: Array<[number, number]> = []
  const samples = 36
  for (let index = 0; index <= samples; index++) {
    const volume = v1 + (v2 - v1) * (index / samples)
    pvPoints.push([round(volume, 4), round((n * R * th) / volume, 4)])
  }
  for (let index = 1; index <= samples; index++) {
    const volume = v2 + (v3 - v2) * (index / samples)
    pvPoints.push([round(volume, 4), round(p2 * Math.pow(v2 / volume, gamma), 4)])
  }
  for (let index = 1; index <= samples; index++) {
    const volume = v3 + (v4 - v3) * (index / samples)
    pvPoints.push([round(volume, 4), round((n * R * tc) / volume, 4)])
  }
  for (let index = 1; index <= samples; index++) {
    const volume = v4 + (v1 - v4) * (index / samples)
    pvPoints.push([round(volume, 4), round(p4 * Math.pow(v4 / volume, gamma), 4)])
  }

  const pvSeries: SimulationSeries = { name: '卡诺循环', points: pvPoints, color: CHART_COLOR }
  const tsSeries: SimulationSeries = {
    name: '卡诺循环',
    points: [
      [round(s1, 3), round(th, 3)],
      [round(s2, 3), round(th, 3)],
      [round(s3, 3), round(tc, 3)],
      [round(s4, 3), round(tc, 3)],
      [round(s1, 3), round(th, 3)],
    ],
    color: CHART_COLOR,
  }

  return {
    charts: [
      {
        id: 'pv',
        title: 'p–V 循环图',
        xLabel: 'V / L',
        yLabel: 'p / kPa',
        series: [pvSeries],
        markPoints: [
          { name: '状态 1', x: round(v1, 3), y: round(p1, 3) },
          { name: '状态 2', x: round(v2, 3), y: round(p2, 3) },
          { name: '状态 3', x: round(v3, 3), y: round(p3, 3) },
          { name: '状态 4', x: round(v4, 3), y: round(p4, 3) },
        ],
      },
      {
        id: 'ts',
        title: 'T–s 循环图',
        xLabel: 'S / (J/K)',
        yLabel: 'T / K',
        series: [tsSeries],
        markPoints: [
          { name: '状态 1', x: round(s1, 3), y: round(th, 3) },
          { name: '状态 2', x: round(s2, 3), y: round(th, 3) },
          { name: '状态 3', x: round(s3, 3), y: round(tc, 3) },
          { name: '状态 4', x: round(s4, 3), y: round(tc, 3) },
        ],
      },
    ],
    metrics: [
      { label: '卡诺效率 η', value: round(eta * 100, 2), unit: '%', precision: 2 },
      { label: '吸热量 Q_H', value: round(qh / 1000, 3), unit: 'kJ', precision: 3 },
      { label: '放热量 Q_C', value: round(qc / 1000, 3), unit: 'kJ', precision: 3 },
      { label: '净功 W_net', value: round(wnet / 1000, 3), unit: 'kJ', precision: 3 },
      { label: '高温热源 T_H', value: round(th, 0), unit: 'K', precision: 0 },
      { label: '低温热源 T_C', value: round(tc, 0), unit: 'K', precision: 0 },
    ],
    states: [
      makeState('状态 1', p1, v1, th, s1),
      makeState('状态 2', p2, v2, th, s2),
      makeState('状态 3', p3, v3, tc, s3),
      makeState('状态 4', p4, v4, tc, s4),
    ],
    notes: [
      '符号约定：ΔU = Q − W，W 为系统对外做功。',
      '卡诺循环由两个可逆定温过程和两个可逆绝热过程组成。',
      'Q_C 为向低温热源放出的热量，按正值展示；循环净功 W_net = Q_H − Q_C。',
      '工质按理想气体处理；效率上限 η = 1 − T_C/T_H 与工质性质无关。',
    ],
  }
}

export const carnotCycleModel: SimulationModel = {
  id: 'carnot-cycle',
  name: '卡诺循环',
  shortName: '卡诺循环',
  description: '在两个恒温热源之间运行的可逆循环，由定温膨胀、绝热膨胀、定温压缩和绝热压缩组成；用于观察效率上限与 p–V、T–s 图。',
  category: '经典循环',
  icon: 'target',
  accent: '#c6904f',
  formula: String.raw`\eta = 1-\frac{T_C}{T_H},\qquad W_{net}=Q_H-Q_C`,
  formulaNote: '适用于两个恒温热源之间的可逆卡诺循环；工质按理想气体处理。',
  chapterIds: ['ch5', 'ch9'],
  parameters: [
    { key: 'n', label: '物质的量 n', unit: 'mol', type: 'number', min: 0.1, max: 10, step: 0.1, default: 1 },
    { key: 'v1', label: '状态 1 体积 V₁', unit: 'L', type: 'number', min: 1, max: 100, step: 1, default: 20 },
    { key: 'th', label: '高温热源 T_H', unit: 'K', type: 'range', min: 400, max: 1200, step: 10, default: 600 },
    {
      key: 'tc',
      label: '低温热源 T_C',
      unit: 'K',
      type: 'range',
      min: 200,
      max: 500,
      step: 10,
      default: 300,
      help: '必须低于高温热源温度。',
    },
    { key: 'ratio', label: '定温膨胀比 V₂/V₁', type: 'range', min: 1.2, max: 4, step: 0.1, default: 2 },
    {
      key: 'gamma',
      label: '绝热指数 γ',
      type: 'range',
      min: 1.1,
      max: 1.67,
      step: 0.01,
      default: 1.4,
      help: '单原子气体约 1.67，双原子气体约 1.4。',
    },
  ],
  compute: computeCarnot,
}
