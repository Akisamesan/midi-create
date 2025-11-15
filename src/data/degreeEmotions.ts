export type MovementKey =
  | 'step_up'
  | 'skip_up'
  | 'leap_up'
  | 'same'
  | 'step_down'
  | 'skip_down'
  | 'leap_down'

export type DegreeKey = 'Ⅰ' | 'Ⅱ' | 'Ⅲ' | 'Ⅳ' | 'Ⅴ' | 'Ⅵ' | 'Ⅶ'

export interface MovementTabConfig {
  key: MovementKey
  label: string
  description: string
  color: string
}

export const MOVEMENT_TABS: MovementTabConfig[] = [
  { key: 'step_up', label: '↑ステップ', description: '順次上行', color: '#3b82f6' },
  { key: 'skip_up', label: '↑スキップ', description: '3度上行', color: '#22c55e' },
  { key: 'leap_up', label: '↑跳躍', description: '4度以上上行', color: '#a855f7' },
  { key: 'same', label: '→同音', description: '保続', color: '#9ca3af' },
  { key: 'step_down', label: '↓ステップ', description: '順次下行', color: '#fb923c' },
  { key: 'skip_down', label: '↓スキップ', description: '3度下行', color: '#ef4444' },
  { key: 'leap_down', label: '↓跳躍', description: '4度以上下行', color: '#ec4899' },
]

export const DEGREE_LIST: DegreeKey[] = ['Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ', 'Ⅴ', 'Ⅵ', 'Ⅶ']

export const DEGREE_TO_INDEX: Record<DegreeKey, number> = DEGREE_LIST.reduce(
  (acc, degree, index) => {
    acc[degree] = index
    return acc
  },
  {} as Record<DegreeKey, number>,
)

export const MOVEMENT_META_MAP: Record<MovementKey, MovementTabConfig> =
  MOVEMENT_TABS.reduce(
    (acc, tab) => {
      acc[tab.key] = tab
      return acc
    },
    {} as Record<MovementKey, MovementTabConfig>,
  )

export const DEGREE_EMOTIONS: Record<DegreeKey, Record<MovementKey, string>> = {
  'Ⅰ': {
    step_up: '推進',
    skip_up: '強い進行',
    leap_up: 'ドラマチック',
    same: '安定',
    step_down: '終止',
    skip_down: '中継',
    leap_down: '深い終止',
  },
  'Ⅱ': {
    step_up: '導入',
    skip_up: '中継',
    leap_up: '跳躍的導入',
    same: '持続',
    step_down: '弱まり',
    skip_down: '下降転換',
    leap_down: '解決',
  },
  'Ⅲ': {
    step_up: '淡い光',
    skip_up: '共鳴',
    leap_up: '鮮烈な呼吸',
    same: '静止',
    step_down: '委ねる',
    skip_down: '情緒の翳り',
    leap_down: '憧れの反転',
  },
  'Ⅳ': {
    step_up: '広がり',
    skip_up: '慈しみ',
    leap_up: '祝祭感',
    same: '堅さ',
    step_down: '帰着',
    skip_down: '陰影',
    leap_down: '決断',
  },
  'Ⅴ': {
    step_up: '跳ね上がり',
    skip_up: '旗印',
    leap_up: '昂揚',
    same: '緊張維持',
    step_down: '力強さ',
    skip_down: '背中押し',
    leap_down: '圧倒的収束',
  },
  'Ⅵ': {
    step_up: '甘い進行',
    skip_up: '柔らかな高揚',
    leap_up: '救済の跳躍',
    same: '揺らぎ',
    step_down: '静かな余韻',
    skip_down: '憂い',
    leap_down: '沈み込む',
  },
  'Ⅶ': {
    step_up: '導音の緊張',
    skip_up: '追い風',
    leap_up: '天上の閃き',
    same: '漂い',
    step_down: 'かすかな解放',
    skip_down: '急転',
    leap_down: '奈落の飛翔',
  },
}
