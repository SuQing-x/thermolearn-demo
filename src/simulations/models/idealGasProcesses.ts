import type {
  SimulationModel,
  SimulationParameter,
  SimulationParamValue,
  SimulationResult,
  SimulationSeries,
  SimulationState,
} from '../types'

const R = 8.314462618 // J/(mol·K)
const CHART_COLOR = '#0f8a5f'

const BASE_NOTES = [
  '符号约定：ΔU = Q − W，W 为系统对外做功。',
  '理想气体状态方程 pV = nRT，R = 8.314 J/(mol·K)；p 为绝对压力。',
]

type ProcessKind = 'isothermal' | 'isobaric' | 'isochoric' | 'adiabatic'

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

function sample(start: number, end: number, count: number, fn: (x: number) => number): Array<[number, number]> {
  if (Math.abs(end - start) < 1e-9) {
    return [[round(start, 4), round(fn(start), 4)], [round(end, 4), round(fn(end), 4)]]
  }
  const points: Array<[number, number]> = []
  for (let index = 0; index < count; index++) {
    const x = start + (end - start) * (index / (count - 1))
    points.push([round(x, 4), round(fn(x), 4)])
  }
  return points
}

function makeState(label: string, pressure: number, volume: number, temperature: number): SimulationState {
  return {
    label,
    values: [
      { label: 'p', value: round(pressure), unit: 'kPa' },
      { label: 'V', value: round(volume), unit: 'L' },
      { label: 'T', value: round(temperature), unit: 'K' },
    ],
  }
}

interface ResultInput {
  seriesName: string
  p1: number
  v1: number
  t1: number
  p2: number
  v2: number
  t2: number
  w: number
  q: number
  deltaU: number
  deltaS: number
  points: Array<[number, number]>
  notes: string[]
}

function buildResult(input: ResultInput): SimulationResult {
  const series: SimulationSeries = {
    name: input.seriesName,
    points: input.points,
    color: CHART_COLOR,
  }

  return {
    charts: [{
      id: 'pv',
      title: 'p–V 过程曲线',
      xLabel: 'V / L',
      yLabel: 'p / kPa',
      series: [series],
      markPoints: [
        { name: '状态 1', x: round(input.v1, 3), y: round(input.p1, 3) },
        { name: '状态 2', x: round(input.v2, 3), y: round(input.p2, 3) },
      ],
    }],
    metrics: [
      { label: '终态压力 p₂', value: round(input.p2), unit: 'kPa', precision: 2 },
      { label: '终态温度 T₂', value: round(input.t2), unit: 'K', precision: 2 },
      { label: '做功 W', value: round(input.w / 1000, 3), unit: 'kJ', precision: 3 },
      { label: '热量 Q', value: round(input.q / 1000, 3), unit: 'kJ', precision: 3 },
      { label: '内能变化 ΔU', value: round(input.deltaU / 1000, 3), unit: 'kJ', precision: 3 },
      { label: '熵变 ΔS', value: round(input.deltaS, 3), unit: 'J/K', precision: 3 },
    ],
    states: [
      makeState('状态 1', input.p1, input.v1, input.t1),
      makeState('状态 2', input.p2, input.v2, input.t2),
    ],
    notes: input.notes,
  }
}

function commonParameters(): SimulationParameter[] {
  return [
    { key: 'n', label: '物质的量 n', unit: 'mol', type: 'number', min: 0.1, max: 10, step: 0.1, default: 1 },
    { key: 'p1', label: '初始压力 p₁', unit: 'kPa', type: 'number', min: 10, max: 1000, step: 10, default: 100 },
    { key: 'v1', label: '初始体积 V₁', unit: 'L', type: 'number', min: 1, max: 100, step: 1, default: 24.94 },
  ]
}

function volumeParameter(defaultValue = 49.88): SimulationParameter {
  return {
    key: 'v2',
    label: '最终体积 V₂',
    unit: 'L',
    type: 'range',
    min: 1,
    max: 200,
    step: 0.5,
    default: defaultValue,
    help: '大于 V₁ 为膨胀，小于 V₁ 为压缩。',
  }
}

function temperatureParameter(): SimulationParameter {
  return {
    key: 't2',
    label: '最终温度 T₂',
    unit: 'K',
    type: 'range',
    min: 100,
    max: 1200,
    step: 5,
    default: 600,
  }
}

function gammaParameter(): SimulationParameter {
  return {
    key: 'gamma',
    label: '绝热指数 γ',
    type: 'range',
    min: 1.1,
    max: 1.67,
    step: 0.01,
    default: 1.4,
    help: '单原子气体约 1.67，双原子气体约 1.4。',
  }
}

function computeIsothermal(values: Record<string, SimulationParamValue>): SimulationResult {
  const n = readNumber(values, 'n', '物质的量 n')
  const p1 = readNumber(values, 'p1', '初始压力 p₁')
  const v1 = readNumber(values, 'v1', '初始体积 V₁')
  const v2 = readNumber(values, 'v2', '最终体积 V₂')
  requirePositive('物质的量 n', n)
  requirePositive('初始压力 p₁', p1)
  requirePositive('初始体积 V₁', v1)
  requirePositive('最终体积 V₂', v2)

  const t1 = (p1 * v1) / (n * R)
  const t2 = t1
  const p2 = (p1 * v1) / v2
  const w = n * R * t1 * Math.log(v2 / v1)
  const q = w
  const deltaU = 0
  const deltaS = n * R * Math.log(v2 / v1)
  const points = sample(v1, v2, 80, (volume) => (n * R * t1) / volume)

  return buildResult({
    seriesName: '定温过程',
    p1, v1, t1, p2, v2, t2,
    w, q, deltaU, deltaS,
    points,
    notes: [...BASE_NOTES, '定温过程 ΔU = 0，Q = W。'],
  })
}

function computeIsobaric(values: Record<string, SimulationParamValue>): SimulationResult {
  const n = readNumber(values, 'n', '物质的量 n')
  const p1 = readNumber(values, 'p1', '初始压力 p₁')
  const v1 = readNumber(values, 'v1', '初始体积 V₁')
  const v2 = readNumber(values, 'v2', '最终体积 V₂')
  const gamma = readNumber(values, 'gamma', '绝热指数 γ')
  requirePositive('物质的量 n', n)
  requirePositive('初始压力 p₁', p1)
  requirePositive('初始体积 V₁', v1)
  requirePositive('最终体积 V₂', v2)
  requireGamma(gamma)

  const t1 = (p1 * v1) / (n * R)
  const t2 = (p1 * v2) / (n * R)
  const p2 = p1
  const cv = R / (gamma - 1)
  const cp = (gamma * R) / (gamma - 1)
  const w = p1 * (v2 - v1)
  const deltaU = n * cv * (t2 - t1)
  const q = deltaU + w
  const deltaS = n * cp * Math.log(t2 / t1)
  const points = sample(v1, v2, 80, () => p1)

  return buildResult({
    seriesName: '定压过程',
    p1, v1, t1, p2, v2, t2,
    w, q, deltaU, deltaS,
    points,
    notes: [...BASE_NOTES, '定压过程 Q = nCpΔT，Cp = γR/(γ−1)。'],
  })
}

function computeIsochoric(values: Record<string, SimulationParamValue>): SimulationResult {
  const n = readNumber(values, 'n', '物质的量 n')
  const p1 = readNumber(values, 'p1', '初始压力 p₁')
  const v1 = readNumber(values, 'v1', '初始体积 V₁')
  const t2 = readNumber(values, 't2', '最终温度 T₂')
  const gamma = readNumber(values, 'gamma', '绝热指数 γ')
  requirePositive('物质的量 n', n)
  requirePositive('初始压力 p₁', p1)
  requirePositive('初始体积 V₁', v1)
  requirePositive('最终温度 T₂', t2)
  requireGamma(gamma)

  const t1 = (p1 * v1) / (n * R)
  const p2 = (n * R * t2) / v1
  const v2 = v1
  const cv = R / (gamma - 1)
  const w = 0
  const deltaU = n * cv * (t2 - t1)
  const q = deltaU
  const deltaS = n * cv * Math.log(t2 / t1)
  const points: Array<[number, number]> = [
    [round(v1, 4), round(p1, 4)],
    [round(v2, 4), round(p2, 4)],
  ]

  return buildResult({
    seriesName: '定容过程',
    p1, v1, t1, p2, v2, t2,
    w, q, deltaU, deltaS,
    points,
    notes: [...BASE_NOTES, '定容过程 W = 0，Q = ΔU。'],
  })
}

function computeAdiabatic(values: Record<string, SimulationParamValue>): SimulationResult {
  const n = readNumber(values, 'n', '物质的量 n')
  const p1 = readNumber(values, 'p1', '初始压力 p₁')
  const v1 = readNumber(values, 'v1', '初始体积 V₁')
  const v2 = readNumber(values, 'v2', '最终体积 V₂')
  const gamma = readNumber(values, 'gamma', '绝热指数 γ')
  requirePositive('物质的量 n', n)
  requirePositive('初始压力 p₁', p1)
  requirePositive('初始体积 V₁', v1)
  requirePositive('最终体积 V₂', v2)
  requireGamma(gamma)

  const t1 = (p1 * v1) / (n * R)
  const p2 = p1 * Math.pow(v1 / v2, gamma)
  const t2 = (p2 * v2) / (n * R)
  const w = (p1 * v1 - p2 * v2) / (gamma - 1)
  const q = 0
  const deltaU = -w
  const deltaS = 0
  const points = sample(v1, v2, 80, (volume) => p1 * Math.pow(v1 / volume, gamma))

  return buildResult({
    seriesName: '绝热过程',
    p1, v1, t1, p2, v2, t2,
    w, q, deltaU, deltaS,
    points,
    notes: [...BASE_NOTES, '按可逆绝热过程计算，Q = 0，ΔS = 0。'],
  })
}

const PROCESS_META: Record<ProcessKind, {
  id: string
  name: string
  shortName: string
  description: string
  formula: string
  formulaNote: string
  parameters: SimulationParameter[]
  compute: (values: Record<string, SimulationParamValue>) => SimulationResult
}> = {
  isothermal: {
    id: 'ideal-gas-isothermal',
    name: '理想气体定温过程',
    shortName: '定温',
    description: '温度保持不变，压力与体积成反比。适用于理想气体的可逆定温过程。',
    formula: String.raw`p_1V_1=p_2V_2,\quad W=nRT\ln\frac{V_2}{V_1}`,
    formulaNote: '适用条件：理想气体、可逆定温过程；T 为热力学温度。',
    parameters: [...commonParameters(), volumeParameter()],
    compute: computeIsothermal,
  },
  isobaric: {
    id: 'ideal-gas-isobaric',
    name: '理想气体定压过程',
    shortName: '定压',
    description: '压力保持不变，体积与温度成正比。适用于理想气体的可逆定压过程。',
    formula: String.raw`\frac{V_1}{T_1}=\frac{V_2}{T_2},\quad W=p(V_2-V_1)`,
    formulaNote: '适用条件：理想气体、可逆定压过程；C_p = γR/(γ−1)。',
    parameters: [...commonParameters(), volumeParameter(), gammaParameter()],
    compute: computeIsobaric,
  },
  isochoric: {
    id: 'ideal-gas-isochoric',
    name: '理想气体定容过程',
    shortName: '定容',
    description: '体积保持不变，压力与温度成正比；过程不做体积功。',
    formula: String.raw`\frac{p_1}{T_1}=\frac{p_2}{T_2},\quad W=0`,
    formulaNote: '适用条件：理想气体、可逆定容过程；C_v = R/(γ−1)。',
    parameters: [...commonParameters(), temperatureParameter(), gammaParameter()],
    compute: computeIsochoric,
  },
  adiabatic: {
    id: 'ideal-gas-adiabatic',
    name: '理想气体绝热过程',
    shortName: '绝热',
    description: '过程不与环境交换热量，满足 pV^γ = 常数。适用于可逆绝热过程。',
    formula: String.raw`p_1V_1^\gamma=p_2V_2^\gamma,\quad Q=0`,
    formulaNote: '适用条件：理想气体、可逆绝热过程；γ 为绝热指数。',
    parameters: [...commonParameters(), volumeParameter(), gammaParameter()],
    compute: computeAdiabatic,
  },
}

export const idealGasProcessModels: SimulationModel[] = (
  Object.keys(PROCESS_META) as ProcessKind[]
).map((kind) => {
  const meta = PROCESS_META[kind]
  return {
    id: meta.id,
    name: meta.name,
    shortName: meta.shortName,
    description: meta.description,
    formula: meta.formula,
    formulaNote: meta.formulaNote,
    chapterIds: ['ch4'],
    parameters: meta.parameters,
    compute: meta.compute,
  }
})
