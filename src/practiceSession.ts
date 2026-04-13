import type { PracticePlan, PracticeRepHistoryEntry, PracticeSessionSummary } from "./practice";

interface SummarizePracticeSessionArgs {
  plan: PracticePlan | null;
  repHistory: PracticeRepHistoryEntry[];
  startedAt: string | null;
  endedAt?: string;
  finalBpm: number;
}

export function summarizePracticeSession({
  plan,
  repHistory,
  startedAt,
  endedAt = new Date().toISOString(),
  finalBpm,
}: SummarizePracticeSessionArgs): PracticeSessionSummary | null {
  if (!plan || !startedAt || repHistory.length === 0) {
    return null;
  }

  const cleanRepCount = repHistory.filter((entry) => entry.score.clean_rep).length;
  const bestCleanBpm = repHistory.reduce<number | null>(
    (best, entry) => (entry.score.clean_rep ? Math.max(best ?? entry.bpm, entry.bpm) : best),
    null,
  );
  const totalScores = repHistory.map((entry) => entry.score.total_score);
  const averageTotalScore = Math.round(totalScores.reduce((sum, value) => sum + value, 0) / repHistory.length);
  const bestTotalScore = Math.max(...totalScores);

  return {
    id: `${endedAt}-${plan.exercise_id}`,
    exercise_id: plan.exercise_id,
    exercise_name: plan.exercise_name,
    started_at: startedAt,
    ended_at: endedAt,
    rep_count: repHistory.length,
    clean_rep_count: cleanRepCount,
    average_total_score: averageTotalScore,
    best_total_score: bestTotalScore,
    best_clean_bpm: bestCleanBpm,
    final_bpm: finalBpm,
    target_bpm: plan.target_bpm,
    reached_target_bpm: bestCleanBpm !== null && bestCleanBpm >= plan.target_bpm,
  };
}
