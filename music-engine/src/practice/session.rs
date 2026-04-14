use crate::core::notes::PitchClass;
use crate::harmony::scale::named_scale;

use super::exercise::{
    find_practice_exercise, ExerciseCategory, ExerciseGoal, PracticeExercise, TargetStrategy,
};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum InputMode {
    Microphone,
    Midi,
}

impl InputMode {
    pub fn label(self) -> &'static str {
        match self {
            InputMode::Microphone => "Microphone",
            InputMode::Midi => "MIDI",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PracticeNoteValue {
    Whole,
    Half,
    Quarter,
    Eighth,
    Sixteenth,
}

impl PracticeNoteValue {
    pub fn label(self) -> &'static str {
        match self {
            PracticeNoteValue::Whole => "whole",
            PracticeNoteValue::Half => "half",
            PracticeNoteValue::Quarter => "quarter",
            PracticeNoteValue::Eighth => "eighth",
            PracticeNoteValue::Sixteenth => "sixteenth",
        }
    }

    pub fn pulses(self) -> u8 {
        match self {
            PracticeNoteValue::Whole => 16,
            PracticeNoteValue::Half => 8,
            PracticeNoteValue::Quarter => 4,
            PracticeNoteValue::Eighth => 2,
            PracticeNoteValue::Sixteenth => 1,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ScaleRunDirection {
    Ascending,
    Descending,
    UpDown,
}

impl ScaleRunDirection {
    pub fn label(self) -> &'static str {
        match self {
            ScaleRunDirection::Ascending => "ascending",
            ScaleRunDirection::Descending => "descending",
            ScaleRunDirection::UpDown => "up_down",
        }
    }
}

#[derive(Debug, Clone)]
pub struct PracticePlan {
    pub exercise: PracticeExercise,
    pub harmony_root: PitchClass,
    pub harmony_scale_name: String,
    pub solo_scale_root: PitchClass,
    pub solo_scale_name: String,
    pub progression_steps: Vec<String>,
    pub step_durations: Vec<PracticeNoteValue>,
    pub tempo_unit: PracticeNoteValue,
    pub tuning_notes: Vec<u8>,
    pub start_bpm: u16,
    pub target_bpm: u16,
    pub bpm_step: u16,
    pub reps_per_level: u8,
    pub count_in_bars: u8,
    pub input_mode: InputMode,
    pub position_start: Option<u8>,
    pub window_size: u8,
    pub scale_run_direction: ScaleRunDirection,
    pub scale_run_notes_per_string: u8,
}

impl PracticePlan {
    pub fn category(&self) -> ExerciseCategory {
        self.exercise.category
    }

    pub fn goal(&self) -> ExerciseGoal {
        self.exercise.goal
    }

    pub fn target_strategy(&self) -> TargetStrategy {
        self.exercise.target_strategy
    }
}

fn normalized_progression_steps(exercise: &PracticeExercise, steps: &[String]) -> Vec<String> {
    if steps.is_empty() {
        exercise.default_progression_steps.clone()
    } else {
        steps.to_vec()
    }
}

fn normalized_step_durations(
    progression_steps: &[String],
    step_durations: &[PracticeNoteValue],
) -> Vec<PracticeNoteValue> {
    progression_steps
        .iter()
        .enumerate()
        .map(|(index, _)| step_durations.get(index).copied().unwrap_or(PracticeNoteValue::Quarter))
        .collect()
}

pub struct PracticePlanArgs<'a> {
    pub exercise_id: &'a str,
    pub harmony_root: PitchClass,
    pub harmony_scale_name: &'a str,
    pub solo_scale_root: PitchClass,
    pub solo_scale_name: &'a str,
    pub progression_steps: &'a [String],
    pub step_durations: &'a [PracticeNoteValue],
    pub tempo_unit: PracticeNoteValue,
    pub tuning_notes: &'a [u8],
    pub start_bpm: u16,
    pub target_bpm: u16,
    pub bpm_step: u16,
    pub reps_per_level: u8,
    pub count_in_bars: u8,
    pub input_mode: InputMode,
    pub position_start: Option<u8>,
    pub window_size: Option<u8>,
    pub scale_run_direction: ScaleRunDirection,
    pub scale_run_notes_per_string: u8,
}

pub fn build_practice_plan(args: PracticePlanArgs<'_>) -> Result<PracticePlan, String> {
    let exercise = find_practice_exercise(args.exercise_id)
        .ok_or_else(|| format!("Unknown practice exercise: {}", args.exercise_id))?;

    named_scale(args.harmony_root, args.harmony_scale_name)
        .ok_or_else(|| format!("Unknown harmony scale: {}", args.harmony_scale_name))?;
    named_scale(args.solo_scale_root, args.solo_scale_name)
        .ok_or_else(|| format!("Unknown solo scale: {}", args.solo_scale_name))?;

    let progression_steps = normalized_progression_steps(&exercise, args.progression_steps);
    let step_durations = normalized_step_durations(&progression_steps, args.step_durations);
    let window_size = args.window_size.unwrap_or(exercise.default_window_size).clamp(4, 12);

    if progression_steps.is_empty() {
        return Err("Practice plan requires at least one progression step".to_string());
    }
    if args.tuning_notes.len() < 6 {
        return Err("Practice plan requires at least 6 tuning notes".to_string());
    }

    Ok(PracticePlan {
        exercise,
        harmony_root: args.harmony_root,
        harmony_scale_name: args.harmony_scale_name.to_string(),
        solo_scale_root: args.solo_scale_root,
        solo_scale_name: args.solo_scale_name.to_string(),
        progression_steps,
        step_durations,
        tempo_unit: args.tempo_unit,
        tuning_notes: args.tuning_notes.to_vec(),
        start_bpm: args.start_bpm.clamp(40, 220),
        target_bpm: args.target_bpm.clamp(40, 260),
        bpm_step: args.bpm_step.clamp(1, 20),
        reps_per_level: args.reps_per_level.clamp(1, 16),
        count_in_bars: args.count_in_bars.clamp(0, 8),
        input_mode: args.input_mode,
        position_start: args.position_start,
        window_size,
        scale_run_direction: args.scale_run_direction,
        scale_run_notes_per_string: args.scale_run_notes_per_string.clamp(2, 4),
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::notes::PitchClass;

    #[test]
    fn build_practice_plan_uses_exercise_defaults_when_progression_is_empty() {
        let plan = build_practice_plan(PracticePlanArgs {
            exercise_id: "guide-tones-strong-beats",
            harmony_root: PitchClass::new(0),
            harmony_scale_name: "Ionian",
            solo_scale_root: PitchClass::new(0),
            solo_scale_name: "Ionian",
            progression_steps: &[],
            step_durations: &[],
            tempo_unit: PracticeNoteValue::Quarter,
            tuning_notes: &[4, 9, 2, 7, 11, 4],
            start_bpm: 80,
            target_bpm: 110,
            bpm_step: 5,
            reps_per_level: 2,
            count_in_bars: 1,
            input_mode: InputMode::Midi,
            position_start: None,
            window_size: None,
            scale_run_direction: ScaleRunDirection::Ascending,
            scale_run_notes_per_string: 3,
        })
        .expect("practice plan should build");

        assert_eq!(plan.progression_steps, vec!["ii", "V", "I", "I"]);
        assert_eq!(plan.step_durations.len(), 4);
        assert!(plan
            .step_durations
            .iter()
            .all(|duration| *duration == PracticeNoteValue::Quarter));
    }
}
