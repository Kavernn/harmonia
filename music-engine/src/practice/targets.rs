use crate::core::notes::PitchClass;
use crate::harmony::scale::named_scale;
use crate::progression::builder::build_progression_from_steps;
use crate::progression::solo::{contextual_modal_guidance, solo_notes_for_chord};

use super::exercise::TargetStrategy;
use super::session::{PracticePlan, ScaleRunDirection};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PracticeTargetRole {
    StrongBeat,
    ModalColor,
    Resolution,
    Passing,
    PhraseStart,
    PhraseAnswer,
    ScaleNote,
    ArpeggioNote,
}

impl PracticeTargetRole {
    pub fn label(self) -> &'static str {
        match self {
            PracticeTargetRole::StrongBeat => "strong_beat",
            PracticeTargetRole::ModalColor => "modal_color",
            PracticeTargetRole::Resolution => "resolution",
            PracticeTargetRole::Passing => "passing",
            PracticeTargetRole::PhraseStart => "phrase_start",
            PracticeTargetRole::PhraseAnswer => "phrase_answer",
            PracticeTargetRole::ScaleNote => "scale_note",
            PracticeTargetRole::ArpeggioNote => "arpeggio_note",
        }
    }
}

#[derive(Debug, Clone)]
pub struct PracticeTarget {
    pub step_index: usize,
    pub step_name: String,
    pub chord_name: String,
    pub pulse_index: u8,
    pub pulse_total: u8,
    pub role: PracticeTargetRole,
    pub weight: u8,
    pub pitch_classes: Vec<PitchClass>,
    pub description: String,
}

fn note_names(notes: &[PitchClass]) -> String {
    notes
        .iter()
        .map(|note| note.name().to_string())
        .collect::<Vec<_>>()
        .join(", ")
}

fn target(
    step_index: usize,
    step_name: &str,
    chord_name: &str,
    pulse_index: u8,
    pulse_total: u8,
    role: PracticeTargetRole,
    weight: u8,
    pitch_classes: Vec<PitchClass>,
    description: String,
) -> PracticeTarget {
    PracticeTarget {
        step_index,
        step_name: step_name.to_string(),
        chord_name: chord_name.to_string(),
        pulse_index,
        pulse_total,
        role,
        weight,
        pitch_classes,
        description,
    }
}

fn resolution_pulse(pulse_total: u8, preferred: u8) -> Option<u8> {
    if pulse_total <= 1 {
        return None;
    }

    Some(preferred.min(pulse_total.saturating_sub(1)))
}

pub fn practice_targets(plan: &PracticePlan) -> Result<Vec<PracticeTarget>, String> {
    let harmony_scale = named_scale(plan.harmony_root, &plan.harmony_scale_name)
        .ok_or_else(|| format!("Unknown harmony scale: {}", plan.harmony_scale_name))?;
    let solo_scale = named_scale(plan.solo_scale_root, &plan.solo_scale_name)
        .ok_or_else(|| format!("Unknown solo scale: {}", plan.solo_scale_name))?;

    let progression = build_progression_from_steps(&harmony_scale, &plan.progression_steps);
    if progression.is_empty() {
        return Err("Practice targets require at least one progression chord".to_string());
    }

    let preferred_resolution = plan.tempo_unit.pulses().max(1);
    let mut targets = Vec::new();

    for (step_index, step) in progression.iter().enumerate() {
        let pulse_total = plan
            .step_durations
            .get(step_index)
            .map(|duration| duration.pulses())
            .unwrap_or(plan.tempo_unit.pulses())
            .max(1);
        let solo = solo_notes_for_chord(&step.chord, &solo_scale);
        let contextual = contextual_modal_guidance(step, &solo_scale);
        let scale_targets = if solo.scale_tones.is_empty() {
            solo.chord_tones.clone()
        } else {
            solo.scale_tones.clone()
        };

        match plan.target_strategy() {
            TargetStrategy::StrongBeatChordTones => {
                targets.push(target(
                    step_index,
                    &step.roman,
                    &step.display_name,
                    0,
                    pulse_total,
                    PracticeTargetRole::StrongBeat,
                    100,
                    solo.chord_tones.clone(),
                    format!(
                        "Sur {}, verrouille les notes d'accord {} sur le temps fort.",
                        step.display_name,
                        note_names(&solo.chord_tones)
                    ),
                ));
            }
            TargetStrategy::ModalCharacteristicFirst => {
                targets.push(target(
                    step_index,
                    &step.roman,
                    &step.display_name,
                    0,
                    pulse_total,
                    PracticeTargetRole::ModalColor,
                    100,
                    contextual.focus_tones.clone(),
                    format!(
                        "Sur {}, fais ressortir la couleur modale {}.",
                        step.display_name,
                        note_names(&contextual.focus_tones)
                    ),
                ));

                if let Some(pulse_index) = resolution_pulse(pulse_total, preferred_resolution) {
                    targets.push(target(
                        step_index,
                        &step.roman,
                        &step.display_name,
                        pulse_index,
                        pulse_total,
                        PracticeTargetRole::Resolution,
                        88,
                        contextual.release_tones.clone(),
                        format!(
                            "Sur {}, résous la couleur vers {}.",
                            step.display_name,
                            note_names(&contextual.release_tones)
                        ),
                    ));
                }
            }
            TargetStrategy::ResolveOnNextBeat => {
                let tension_tones = if !step.outside_harmony_tones.is_empty() {
                    step.outside_harmony_tones.clone()
                } else if !contextual.focus_tones.is_empty() {
                    contextual.focus_tones.clone()
                } else {
                    scale_targets.clone()
                };

                targets.push(target(
                    step_index,
                    &step.roman,
                    &step.display_name,
                    0,
                    pulse_total,
                    PracticeTargetRole::ModalColor,
                    95,
                    tension_tones.clone(),
                    format!(
                        "Sur {}, vise d'abord {} avant de résoudre.",
                        step.display_name,
                        note_names(&tension_tones)
                    ),
                ));

                if let Some(pulse_index) = resolution_pulse(pulse_total, preferred_resolution) {
                    targets.push(target(
                        step_index,
                        &step.roman,
                        &step.display_name,
                        pulse_index,
                        pulse_total,
                        PracticeTargetRole::Resolution,
                        92,
                        contextual.release_tones.clone(),
                        format!(
                            "Sur {}, atterris proprement sur {}.",
                            step.display_name,
                            note_names(&contextual.release_tones)
                        ),
                    ));
                }
            }
            TargetStrategy::FollowPhraseGuide => {
                targets.push(target(
                    step_index,
                    &step.roman,
                    &step.display_name,
                    0,
                    pulse_total,
                    PracticeTargetRole::PhraseStart,
                    95,
                    solo.chord_tones.clone(),
                    format!(
                        "Démarre la phrase sur {} avec {}.",
                        step.display_name,
                        note_names(&solo.chord_tones)
                    ),
                ));

                if pulse_total >= 3 {
                    targets.push(target(
                        step_index,
                        &step.roman,
                        &step.display_name,
                        pulse_total / 2,
                        pulse_total,
                        PracticeTargetRole::Passing,
                        64,
                        scale_targets.clone(),
                        format!(
                            "Passe par {} sans quitter la position.",
                            note_names(&scale_targets)
                        ),
                    ));
                }

                if let Some(pulse_index) = resolution_pulse(pulse_total, pulse_total.saturating_sub(1))
                {
                    targets.push(target(
                        step_index,
                        &step.roman,
                        &step.display_name,
                        pulse_index,
                        pulse_total,
                        PracticeTargetRole::PhraseAnswer,
                        88,
                        contextual.release_tones.clone(),
                        format!(
                            "Réponds la phrase sur {} avec {}.",
                            step.display_name,
                            note_names(&contextual.release_tones)
                        ),
                    ));
                }
            }
            TargetStrategy::ScaleRun => {
                let scale_sequence = solo_scale.pitch_classes();
                let scale_len = scale_sequence.len().max(1);
                let up_down_len = if scale_len <= 2 { scale_len } else { scale_len * 2 - 2 };

                for pulse_index in 0..pulse_total {
                    let pitch_index = match plan.scale_run_direction {
                        ScaleRunDirection::Ascending => (pulse_index as usize) % scale_len,
                        ScaleRunDirection::Descending => {
                            let offset = (pulse_index as usize) % scale_len;
                            scale_len.saturating_sub(1).saturating_sub(offset)
                        }
                        ScaleRunDirection::UpDown => {
                            let idx = (pulse_index as usize) % up_down_len;
                            if idx < scale_len { idx } else { up_down_len - idx }
                        }
                    };
                    let pitch = scale_sequence[pitch_index];
                    targets.push(target(
                        step_index,
                        &step.roman,
                        &step.display_name,
                        pulse_index,
                        pulse_total,
                        PracticeTargetRole::ScaleNote,
                        80,
                        vec![pitch],
                        format!(
                            "Joue {} en alternate picking dans la gamme {}.",
                            pitch.name(),
                            solo_scale.name
                        ),
                    ));
                }
            }
            TargetStrategy::ChordToneRun => {
                let mut chord_sequence = step.chord.pitch_classes();
                if chord_sequence.is_empty() {
                    chord_sequence = solo.chord_tones.clone();
                }
                if chord_sequence.is_empty() {
                    chord_sequence = scale_targets.clone();
                }
                let chord_len = chord_sequence.len().max(1);
                let up_down_len = if chord_len <= 2 { chord_len } else { chord_len * 2 - 2 };

                for pulse_index in 0..pulse_total {
                    let pitch_index = match plan.scale_run_direction {
                        ScaleRunDirection::Ascending => (pulse_index as usize) % chord_len,
                        ScaleRunDirection::Descending => {
                            let offset = (pulse_index as usize) % chord_len;
                            chord_len.saturating_sub(1).saturating_sub(offset)
                        }
                        ScaleRunDirection::UpDown => {
                            let idx = (pulse_index as usize) % up_down_len;
                            if idx < chord_len { idx } else { up_down_len - idx }
                        }
                    };
                    let pitch = chord_sequence[pitch_index];
                    targets.push(target(
                        step_index,
                        &step.roman,
                        &step.display_name,
                        pulse_index,
                        pulse_total,
                        PracticeTargetRole::ArpeggioNote,
                        85,
                        vec![pitch],
                        format!(
                            "Arpège {} en sweeping sur {}.",
                            step.display_name,
                            pitch.name(),
                        ),
                    ));
                }
            }
        }
    }

    Ok(targets)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::notes::PitchClass;
    use crate::practice::session::{
        InputMode, PracticeNoteValue, PracticePlanArgs, ScaleRunDirection, build_practice_plan,
    };

    #[test]
    fn strong_beat_exercise_targets_every_step() {
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

        let targets = practice_targets(&plan).expect("targets should build");

        assert_eq!(targets.len(), plan.progression_steps.len());
        assert!(targets
            .iter()
            .all(|target| target.role == PracticeTargetRole::StrongBeat));
    }

    #[test]
    fn modal_color_exercise_surfaces_color_and_resolution() {
        let plan = build_practice_plan(PracticePlanArgs {
            exercise_id: "modal-color-resolve",
            harmony_root: PitchClass::new(2),
            harmony_scale_name: "Dorian",
            solo_scale_root: PitchClass::new(2),
            solo_scale_name: "Dorian",
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

        let targets = practice_targets(&plan).expect("targets should build");

        assert!(targets.iter().any(|target| {
            target.role == PracticeTargetRole::ModalColor
                && target.pitch_classes.contains(&PitchClass::new(11))
        }));
        assert!(targets.iter().any(|target| {
            target.role == PracticeTargetRole::Resolution
                && target.pitch_classes.contains(&PitchClass::new(9))
        }));
    }

    #[test]
    fn scale_run_targets_create_one_target_per_pulse() {
        let plan = build_practice_plan(PracticePlanArgs {
            exercise_id: "scale-speed-picking",
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

        let targets = practice_targets(&plan).expect("targets should build");

        assert_eq!(targets.len(), plan.progression_steps.len() * 4);
        assert!(targets.iter().all(|target| target.role == PracticeTargetRole::ScaleNote));
    }
}
