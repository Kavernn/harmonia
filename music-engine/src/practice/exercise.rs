#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ExerciseCategory {
    GuideTones,
    TargetNotes,
    ModalColor,
    PhraseAnswer,
    PositionWork,
    ScaleWorkout,
}

impl ExerciseCategory {
    pub fn label(self) -> &'static str {
        match self {
            ExerciseCategory::GuideTones => "Guide Tones",
            ExerciseCategory::TargetNotes => "Target Notes",
            ExerciseCategory::ModalColor => "Modal Color",
            ExerciseCategory::PhraseAnswer => "Phrase Answer",
            ExerciseCategory::PositionWork => "Position Work",
            ExerciseCategory::ScaleWorkout => "Scale Workout",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ExerciseGoal {
    HitChordTonesOnStrongBeats,
    ResolveColorTones,
    StayInsidePosition,
    FollowPhraseGuide,
    BuildSpeedPicking,
}

impl ExerciseGoal {
    pub fn label(self) -> &'static str {
        match self {
            ExerciseGoal::HitChordTonesOnStrongBeats => "Hit chord tones on strong beats",
            ExerciseGoal::ResolveColorTones => "Resolve color tones",
            ExerciseGoal::StayInsidePosition => "Stay inside the position",
            ExerciseGoal::FollowPhraseGuide => "Follow the phrase guide",
            ExerciseGoal::BuildSpeedPicking => "Build speed picking",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TargetStrategy {
    StrongBeatChordTones,
    ModalCharacteristicFirst,
    ResolveOnNextBeat,
    FollowPhraseGuide,
    ScaleRun,
    ChordToneRun,
}

impl TargetStrategy {
    pub fn label(self) -> &'static str {
        match self {
            TargetStrategy::StrongBeatChordTones => "Strong beat chord tones",
            TargetStrategy::ModalCharacteristicFirst => "Modal characteristic first",
            TargetStrategy::ResolveOnNextBeat => "Resolve on next beat",
            TargetStrategy::FollowPhraseGuide => "Follow phrase guide",
            TargetStrategy::ScaleRun => "Scale run",
            TargetStrategy::ChordToneRun => "Chord tone run",
        }
    }
}

#[derive(Debug, Clone)]
pub struct PracticeExercise {
    pub id: &'static str,
    pub name: &'static str,
    pub description: &'static str,
    pub category: ExerciseCategory,
    pub goal: ExerciseGoal,
    pub target_strategy: TargetStrategy,
    pub default_progression_steps: Vec<String>,
    pub default_window_size: u8,
}

pub fn practice_library() -> Vec<PracticeExercise> {
    vec![
        PracticeExercise {
            id: "guide-tones-strong-beats",
            name: "Guide tones on strong beats",
            description: "Lock the solo to the current chord by hearing R, 3 and 5 on the strong pulses.",
            category: ExerciseCategory::GuideTones,
            goal: ExerciseGoal::HitChordTonesOnStrongBeats,
            target_strategy: TargetStrategy::StrongBeatChordTones,
            default_progression_steps: vec![
                "ii".to_string(),
                "V".to_string(),
                "I".to_string(),
                "I".to_string(),
            ],
            default_window_size: 5,
        },
        PracticeExercise {
            id: "modal-color-resolve",
            name: "Modal color then release",
            description: "Make the characteristic tone speak, then settle it on the modal release tone.",
            category: ExerciseCategory::ModalColor,
            goal: ExerciseGoal::ResolveColorTones,
            target_strategy: TargetStrategy::ModalCharacteristicFirst,
            default_progression_steps: vec![
                "i".to_string(),
                "IV".to_string(),
                "i".to_string(),
                "IV".to_string(),
            ],
            default_window_size: 5,
        },
        PracticeExercise {
            id: "target-note-resolution",
            name: "Target note resolution",
            description: "Aim at the color tone first, then land the line cleanly on the next release note.",
            category: ExerciseCategory::TargetNotes,
            goal: ExerciseGoal::ResolveColorTones,
            target_strategy: TargetStrategy::ResolveOnNextBeat,
            default_progression_steps: vec![
                "V".to_string(),
                "I".to_string(),
                "V".to_string(),
                "I".to_string(),
            ],
            default_window_size: 5,
        },
        PracticeExercise {
            id: "one-position-anchors",
            name: "One-position anchors",
            description: "Stay inside one box and keep returning to the nearest chord anchors.",
            category: ExerciseCategory::PositionWork,
            goal: ExerciseGoal::StayInsidePosition,
            target_strategy: TargetStrategy::StrongBeatChordTones,
            default_progression_steps: vec![
                "I".to_string(),
                "IV".to_string(),
                "V".to_string(),
                "I".to_string(),
            ],
            default_window_size: 5,
        },
        PracticeExercise {
            id: "phrase-answer",
            name: "Phrase answer",
            description: "Hear a simple start, passing tone and answer target inside the same position.",
            category: ExerciseCategory::PhraseAnswer,
            goal: ExerciseGoal::FollowPhraseGuide,
            target_strategy: TargetStrategy::FollowPhraseGuide,
            default_progression_steps: vec![
                "ii".to_string(),
                "V".to_string(),
                "I".to_string(),
                "vi".to_string(),
            ],
            default_window_size: 5,
        },
        PracticeExercise {
            id: "scale-speed-picking",
            name: "Scale speed picking",
            description: "Run the scale with steady alternate picking inside one box.",
            category: ExerciseCategory::ScaleWorkout,
            goal: ExerciseGoal::BuildSpeedPicking,
            target_strategy: TargetStrategy::ScaleRun,
            default_progression_steps: vec![
                "I".to_string(),
                "I".to_string(),
                "I".to_string(),
                "I".to_string(),
            ],
            default_window_size: 4,
        },
        PracticeExercise {
            id: "alternate-picking-foundation",
            name: "Alternate picking foundation",
            description: "Strict down-up motion with even timing on every note.",
            category: ExerciseCategory::ScaleWorkout,
            goal: ExerciseGoal::BuildSpeedPicking,
            target_strategy: TargetStrategy::ScaleRun,
            default_progression_steps: vec![
                "I".to_string(),
                "I".to_string(),
                "I".to_string(),
                "I".to_string(),
            ],
            default_window_size: 4,
        },
        PracticeExercise {
            id: "economy-picking-flow",
            name: "Economy picking flow",
            description: "Keep pick direction through string changes for smooth speed bursts.",
            category: ExerciseCategory::ScaleWorkout,
            goal: ExerciseGoal::BuildSpeedPicking,
            target_strategy: TargetStrategy::ScaleRun,
            default_progression_steps: vec![
                "I".to_string(),
                "I".to_string(),
                "I".to_string(),
                "I".to_string(),
            ],
            default_window_size: 4,
        },
        PracticeExercise {
            id: "sweep-picking-arpeggios",
            name: "Sweep picking arpeggios",
            description: "Glide through chord tones with one continuous pick motion.",
            category: ExerciseCategory::ScaleWorkout,
            goal: ExerciseGoal::BuildSpeedPicking,
            target_strategy: TargetStrategy::ChordToneRun,
            default_progression_steps: vec![
                "I".to_string(),
                "I".to_string(),
                "I".to_string(),
                "I".to_string(),
            ],
            default_window_size: 5,
        },
    ]
}

pub fn find_practice_exercise(id: &str) -> Option<PracticeExercise> {
    practice_library()
        .into_iter()
        .find(|exercise| exercise.id == id)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashSet;

    #[test]
    fn practice_library_is_not_empty() {
        assert!(!practice_library().is_empty());
    }

    #[test]
    fn practice_library_ids_are_unique() {
        let ids: Vec<_> = practice_library()
            .into_iter()
            .map(|exercise| exercise.id)
            .collect();
        let unique: HashSet<_> = ids.iter().copied().collect();
        assert_eq!(ids.len(), unique.len());
    }
}
