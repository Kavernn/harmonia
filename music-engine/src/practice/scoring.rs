use crate::core::notes::PitchClass;

use super::targets::{PracticeTarget, PracticeTargetRole};

#[derive(Debug, Clone)]
pub struct PracticePerformedNote {
    pub step_index: usize,
    pub pulse_index: u8,
    pub pitch_class: PitchClass,
    pub timing_error_ms: i16,
}

#[derive(Debug, Clone)]
pub struct PracticeRepScore {
    pub pitch_score: u8,
    pub timing_score: u8,
    pub target_score: u8,
    pub resolution_score: u8,
    pub total_score: u8,
    pub clean_rep: bool,
    pub matched_targets: usize,
    pub total_targets: usize,
    pub feedback: Vec<String>,
}

fn weighted_percentage(weighted_total: u32, weight_sum: u32) -> u8 {
    if weight_sum == 0 {
        return 100;
    }

    ((weighted_total as f32 / weight_sum as f32).round() as u32)
        .clamp(0, 100) as u8
}

fn timing_bucket_score(error_ms: i16) -> u32 {
    let abs = error_ms.unsigned_abs();
    if abs <= 70 {
        100
    } else if abs <= 140 {
        65
    } else {
        0
    }
}

fn event_matches_target(target: &PracticeTarget, event: &PracticePerformedNote) -> bool {
    target.step_index == event.step_index
        && target.pulse_index == event.pulse_index
        && target.pitch_classes.contains(&event.pitch_class)
}

fn best_event_for_target<'a>(
    target: &PracticeTarget,
    events: &'a [PracticePerformedNote],
) -> Option<&'a PracticePerformedNote> {
    events
        .iter()
        .filter(|event| event_matches_target(target, event))
        .min_by_key(|event| event.timing_error_ms.unsigned_abs())
}

fn is_resolution_role(role: PracticeTargetRole) -> bool {
    matches!(role, PracticeTargetRole::Resolution | PracticeTargetRole::PhraseAnswer)
}

pub fn score_practice_rep(
    targets: &[PracticeTarget],
    events: &[PracticePerformedNote],
) -> PracticeRepScore {
    if targets.is_empty() {
        return PracticeRepScore {
            pitch_score: 0,
            timing_score: 0,
            target_score: 0,
            resolution_score: 0,
            total_score: 0,
            clean_rep: false,
            matched_targets: 0,
            total_targets: 0,
            feedback: vec!["No practice targets were available for this rep.".to_string()],
        };
    }

    let mut weight_sum = 0_u32;
    let mut pitch_weighted = 0_u32;
    let mut timing_weighted = 0_u32;
    let mut target_weighted = 0_u32;
    let mut resolution_weight_sum = 0_u32;
    let mut resolution_weighted = 0_u32;
    let mut matched_targets = 0_usize;
    let mut missed_feedback = Vec::new();

    for target in targets {
        let weight = target.weight as u32;
        weight_sum += weight;

        if let Some(event) = best_event_for_target(target, events) {
            matched_targets += 1;
            pitch_weighted += 100 * weight;
            target_weighted += 100 * weight;
            timing_weighted += timing_bucket_score(event.timing_error_ms) * weight;

            if is_resolution_role(target.role) {
                resolution_weight_sum += weight;
                resolution_weighted += 100 * weight;
            }
        } else {
            if is_resolution_role(target.role) {
                resolution_weight_sum += weight;
            }

            missed_feedback.push(format!(
                "Missed {} on {} pulse {} (expected {}).",
                target.role.label(),
                target.chord_name,
                target.pulse_index + 1,
                target
                    .pitch_classes
                    .iter()
                    .map(|note| note.name().to_string())
                    .collect::<Vec<_>>()
                    .join(", "),
            ));
        }
    }

    let pitch_score = weighted_percentage(pitch_weighted, weight_sum);
    let timing_score = weighted_percentage(timing_weighted, weight_sum);
    let target_score = weighted_percentage(target_weighted, weight_sum);
    let resolution_score = weighted_percentage(resolution_weighted, resolution_weight_sum);
    let total_score = ((pitch_score as f32 * 0.35)
        + (timing_score as f32 * 0.30)
        + (target_score as f32 * 0.25)
        + (resolution_score as f32 * 0.10))
        .round() as u8;
    let clean_rep = pitch_score >= 80 && timing_score >= 75 && target_score >= 80;

    let mut feedback = vec![format!(
        "Targets hit: {}/{}.",
        matched_targets,
        targets.len(),
    )];
    feedback.extend(missed_feedback.into_iter().take(3));

    PracticeRepScore {
        pitch_score,
        timing_score,
        target_score,
        resolution_score,
        total_score,
        clean_rep,
        matched_targets,
        total_targets: targets.len(),
        feedback,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::practice::targets::{PracticeTarget, PracticeTargetRole};

    fn target(role: PracticeTargetRole, pulse_index: u8, pitch_classes: &[u8]) -> PracticeTarget {
        PracticeTarget {
            step_index: 0,
            step_name: "ii".to_string(),
            chord_name: "Dm".to_string(),
            pulse_index,
            pulse_total: 4,
            role,
            weight: 100,
            pitch_classes: pitch_classes.iter().copied().map(PitchClass::new).collect(),
            description: "target".to_string(),
        }
    }

    #[test]
    fn clean_rep_scores_high_when_targets_are_hit_in_time() {
        let targets = vec![
            target(PracticeTargetRole::StrongBeat, 0, &[2, 5, 9]),
            target(PracticeTargetRole::Resolution, 2, &[9]),
        ];
        let events = vec![
            PracticePerformedNote {
                step_index: 0,
                pulse_index: 0,
                pitch_class: PitchClass::new(2),
                timing_error_ms: 20,
            },
            PracticePerformedNote {
                step_index: 0,
                pulse_index: 2,
                pitch_class: PitchClass::new(9),
                timing_error_ms: 25,
            },
        ];

        let score = score_practice_rep(&targets, &events);

        assert!(score.clean_rep);
        assert_eq!(score.matched_targets, 2);
        assert!(score.total_score >= 95);
    }

    #[test]
    fn wrong_pitch_misses_target_and_breaks_clean_rep() {
        let targets = vec![target(PracticeTargetRole::StrongBeat, 0, &[2, 5, 9])];
        let events = vec![PracticePerformedNote {
            step_index: 0,
            pulse_index: 0,
            pitch_class: PitchClass::new(4),
            timing_error_ms: 15,
        }];

        let score = score_practice_rep(&targets, &events);

        assert!(!score.clean_rep);
        assert_eq!(score.matched_targets, 0);
        assert_eq!(score.target_score, 0);
        assert_eq!(score.pitch_score, 0);
    }

    #[test]
    fn late_target_reduces_timing_score() {
        let targets = vec![target(PracticeTargetRole::StrongBeat, 0, &[2, 5, 9])];
        let events = vec![PracticePerformedNote {
            step_index: 0,
            pulse_index: 0,
            pitch_class: PitchClass::new(2),
            timing_error_ms: 110,
        }];

        let score = score_practice_rep(&targets, &events);

        assert_eq!(score.pitch_score, 100);
        assert_eq!(score.target_score, 100);
        assert_eq!(score.timing_score, 65);
        assert!(!score.clean_rep);
    }
}
