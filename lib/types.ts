// 集計のスコープ（取り違え防止：共通モジュールは必ずこれを受ける）
export type Scope =
  | { kind: 'online' }                 // オンライン全体
  | { kind: 'real' }                   // リアル全体（全卓）
  | { kind: 'team'; teamId: string }   // 単一チーム
  | { kind: 'merged' };                // オンライン＋リアル統合

// 集計結果の共通スキーマ（OpenAI Structured Outputs で生成する型）
export interface AggregationResult {
  commonStumbles: { title: string; count: number; evidence: string[] }[];
  hacks: { title: string; evidence: string[] }[];
  currentTroubles: { title: string; count: number; evidence: string[] }[];
  trendSummary: string;
  wordCloud: { keyword: string; weight: number }[]; // weight 1..5
  interpretations: {
    spark: { read: string; evidence: string[] }[];
    minta: { read: string; evidence: string[] }[];
  };
}

export type RecordingStatus = 'recording' | 'transcribing' | 'aggregated' | 'failed';
