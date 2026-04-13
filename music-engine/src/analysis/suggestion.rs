use crate::analysis::compatibility::{chord_scale_compatibility, CompatibilityResult, Confidence};
use crate::core::notes::PitchClass;
use crate::harmony::chord::Chord;
use crate::harmony::scale::{
    aeolian_scale, blues_scale, compatible_mode_family, dorian_scale, harmonic_minor_scale,
    ionian_scale, locrian_scale, lydian_scale, major_scale, melodic_minor_scale, mixolydian_scale,
    natural_minor_scale, pentatonic_major_scale, pentatonic_minor_scale, phrygian_scale, Scale,
};
use std::collections::{HashMap, HashSet};

/// Le mode détecté pour un accord dans une scale donnée.
/// Ex: Am dans C major → Aeolian (degree 5)
#[derive(Debug, Clone)]
pub struct DetectedMode {
    pub name: &'static str,
    pub degree: usize,
    pub root: PitchClass,
}

/// Une suggestion de scale pour un accord donné.
#[derive(Debug, Clone)]
pub struct ScaleSuggestion {
    pub scale: Scale,
    pub compatibility: CompatibilityResult,
    /// Mode détecté si la root de l'accord est dans la scale
    pub mode: Option<DetectedMode>,
}

impl ScaleSuggestion {
    pub fn confidence(&self) -> &Confidence {
        &self.compatibility.confidence
    }
}

/// Une suggestion de palette pour une progression complète.
#[derive(Debug, Clone)]
pub struct ProgressionScaleSuggestion {
    pub scale: Scale,
    pub confidence: Confidence,
    pub matching_notes: Vec<PitchClass>,
    pub outside_notes: Vec<PitchClass>,
    pub reason: &'static str,
    pub matching_chords: usize,
    pub total_chords: usize,
}

impl ProgressionScaleSuggestion {
    pub fn confidence(&self) -> &Confidence {
        &self.confidence
    }
}

/// Toutes les roots candidates (les 12 pitch classes)
fn all_roots() -> Vec<PitchClass> {
    (0..12).map(PitchClass::new).collect()
}

/// Toutes les scales candidates à tester
fn candidate_scales(root: PitchClass) -> Vec<Scale> {
    vec![
        major_scale(root),
        natural_minor_scale(root),
        harmonic_minor_scale(root),
        melodic_minor_scale(root),
        pentatonic_major_scale(root),
        pentatonic_minor_scale(root),
        blues_scale(root),
    ]
}

fn progression_candidate_scales(root: PitchClass) -> Vec<Scale> {
    let mut scales = compatible_mode_family(&ionian_scale(root)).unwrap_or_else(|| {
        vec![
            ionian_scale(root),
            dorian_scale(root),
            phrygian_scale(root),
            lydian_scale(root),
            mixolydian_scale(root),
            aeolian_scale(root),
            locrian_scale(root),
        ]
    });

    scales.extend(
        compatible_mode_family(&harmonic_minor_scale(root))
            .unwrap_or_else(|| vec![harmonic_minor_scale(root)]),
    );
    scales.extend(
        compatible_mode_family(&melodic_minor_scale(root))
            .unwrap_or_else(|| vec![melodic_minor_scale(root)]),
    );
    scales.extend([
        major_scale(root),
        natural_minor_scale(root),
        pentatonic_major_scale(root),
        pentatonic_minor_scale(root),
        blues_scale(root),
    ]);
    scales
}

/// Détecte le mode joué par un accord dans une scale.
/// Basé sur la root de l'accord — si elle est dans la scale,
/// on retourne le mode correspondant à ce degré.
fn detect_mode(chord: &Chord, scale: &Scale) -> Option<DetectedMode> {
    let degree = scale.degree_of(chord.root)?;
    let name = scale.mode_name(degree);
    Some(DetectedMode {
        name,
        degree,
        root: chord.root,
    })
}

/// Suggère des scales compatibles avec un accord donné.
/// Retourne les résultats triés par confiance décroissante.
pub fn suggest_scales(chord: &Chord, min_confidence: Confidence) -> Vec<ScaleSuggestion> {
    let mut suggestions: Vec<ScaleSuggestion> = all_roots()
        .into_iter()
        .flat_map(|root| candidate_scales(root))
        .map(|scale| {
            let compatibility = chord_scale_compatibility(chord, &scale);
            let mode = detect_mode(chord, &scale);
            ScaleSuggestion {
                scale,
                compatibility,
                mode,
            }
        })
        .filter(|s| s.compatibility.confidence >= min_confidence)
        .collect();

    suggestions.sort_by(|a, b| b.confidence().cmp(a.confidence()));
    suggestions
}

/// Suggère uniquement les scales à haute confiance
pub fn suggest_scales_high(chord: &Chord) -> Vec<ScaleSuggestion> {
    suggest_scales(chord, Confidence::High)
}

fn unique_pitch_classes(pitch_classes: Vec<PitchClass>) -> Vec<PitchClass> {
    let mut seen = HashSet::new();
    let mut unique: Vec<PitchClass> = pitch_classes
        .into_iter()
        .filter(|pitch_class| seen.insert(pitch_class.value()))
        .collect();
    unique.sort_by_key(|pitch_class| pitch_class.value());
    unique
}

fn progression_reason(
    worst_confidence: &Confidence,
    matching_chords: usize,
    total_chords: usize,
) -> &'static str {
    if matching_chords == total_chords {
        return "All progression chords fit the palette";
    }

    match worst_confidence {
        Confidence::High => "Most progression chords fit the palette cleanly",
        Confidence::Medium => "Some chords add one color tone outside the palette",
        Confidence::Low => "Several chord tones fall outside the palette",
    }
}

fn pitch_signature(scale: &Scale) -> Vec<u8> {
    let mut signature: Vec<u8> = scale
        .pitch_classes()
        .into_iter()
        .map(|pitch_class| pitch_class.value())
        .collect();
    signature.sort();
    signature
}

fn is_explicit_mode(name: &str) -> bool {
    matches!(
        name,
        "Ionian"
            | "Dorian"
            | "Phrygian"
            | "Lydian"
            | "Mixolydian"
            | "Aeolian"
            | "Locrian"
            | "Locrian Nat6"
            | "Ionian Augmented"
            | "Dorian #4"
            | "Phrygian Dominant"
            | "Lydian #2"
            | "Super Locrian bb7"
            | "Dorian b2"
            | "Lydian Augmented"
            | "Lydian Dominant"
            | "Mixolydian b6"
            | "Locrian Nat2"
            | "Altered"
    )
}

fn prefer_progression_label(candidate: &Scale, current: &Scale, tonic: PitchClass) -> bool {
    let candidate_matches_tonic = candidate.root == tonic;
    let current_matches_tonic = current.root == tonic;
    if candidate_matches_tonic != current_matches_tonic {
        return candidate_matches_tonic;
    }

    let candidate_is_mode = is_explicit_mode(candidate.name);
    let current_is_mode = is_explicit_mode(current.name);
    if candidate_is_mode != current_is_mode {
        return candidate_is_mode;
    }

    candidate.root.value() < current.root.value()
        || (candidate.root == current.root && candidate.name < current.name)
}

/// Suggère des palettes de solo compatibles avec une progression complète.
/// La confiance retenue est le pire cas rencontré sur la grille.
pub fn suggest_scales_for_progression(
    chords: &[Chord],
    min_confidence: Confidence,
) -> Vec<ProgressionScaleSuggestion> {
    if chords.is_empty() {
        return Vec::new();
    }

    let tonic = chords[0].root;
    let mut suggestions_by_signature: HashMap<Vec<u8>, ProgressionScaleSuggestion> = all_roots()
        .into_iter()
        .flat_map(progression_candidate_scales)
        .filter_map(|scale| {
            let compatibilities: Vec<CompatibilityResult> = chords
                .iter()
                .map(|chord| chord_scale_compatibility(chord, &scale))
                .collect();

            let worst_confidence = compatibilities
                .iter()
                .map(|compatibility| compatibility.confidence.clone())
                .min()
                .unwrap_or(Confidence::Low);
            let matching_chords = compatibilities
                .iter()
                .filter(|compatibility| compatibility.outside_notes.is_empty())
                .count();
            let matching_notes = unique_pitch_classes(
                compatibilities
                    .iter()
                    .flat_map(|compatibility| compatibility.matching_notes.iter().copied())
                    .collect(),
            );
            let outside_notes = unique_pitch_classes(
                compatibilities
                    .iter()
                    .flat_map(|compatibility| compatibility.outside_notes.iter().copied())
                    .collect(),
            );

            let suggestion = ProgressionScaleSuggestion {
                scale,
                confidence: worst_confidence.clone(),
                matching_notes,
                outside_notes,
                reason: progression_reason(
                    &worst_confidence,
                    matching_chords,
                    compatibilities.len(),
                ),
                matching_chords,
                total_chords: compatibilities.len(),
            };

            if suggestion.confidence < min_confidence {
                return None;
            }

            Some(suggestion)
        })
        .fold(HashMap::new(), |mut grouped, suggestion| {
            let signature = pitch_signature(&suggestion.scale);
            let should_replace = grouped
                .get(&signature)
                .map(|current| prefer_progression_label(&suggestion.scale, &current.scale, tonic))
                .unwrap_or(true);

            if should_replace {
                grouped.insert(signature, suggestion);
            }

            grouped
        });

    let mut suggestions: Vec<ProgressionScaleSuggestion> = suggestions_by_signature
        .drain()
        .map(|(_, suggestion)| suggestion)
        .collect();

    suggestions.sort_by(|a, b| {
        b.confidence
            .cmp(&a.confidence)
            .then_with(|| b.matching_chords.cmp(&a.matching_chords))
            .then_with(|| a.outside_notes.len().cmp(&b.outside_notes.len()))
            .then_with(|| (b.scale.root == tonic).cmp(&(a.scale.root == tonic)))
            .then_with(|| a.scale.root.value().cmp(&b.scale.root.value()))
            .then_with(|| a.scale.name.cmp(b.scale.name))
    });
    suggestions
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::harmony::chord::{major_chord, minor_chord, power_chord};

    fn c() -> PitchClass {
        PitchClass::new(0)
    }
    fn a() -> PitchClass {
        PitchClass::new(9)
    }

    #[test]
    fn c_major_chord_suggests_c_major_scale() {
        let suggestions = suggest_scales_high(&major_chord(c()));
        let names: Vec<&str> = suggestions.iter().map(|s| s.scale.name).collect();
        assert!(names.contains(&"Major"));
    }

    #[test]
    fn c_major_chord_high_suggestions_are_all_high_confidence() {
        let suggestions = suggest_scales_high(&major_chord(c()));
        assert!(suggestions
            .iter()
            .all(|s| *s.confidence() == Confidence::High));
    }

    #[test]
    fn a_minor_chord_suggests_a_minor_scale() {
        let suggestions = suggest_scales_high(&minor_chord(a()));
        let has_a_minor = suggestions
            .iter()
            .any(|s| s.scale.name == "Natural Minor" && s.scale.root == a());
        assert!(has_a_minor);
    }

    #[test]
    fn power_chord_has_multiple_high_suggestions() {
        let suggestions = suggest_scales_high(&power_chord(c()));
        assert!(suggestions.len() > 3);
    }

    #[test]
    fn suggestions_are_sorted_high_first() {
        let suggestions = suggest_scales(&major_chord(c()), Confidence::Low);
        let confidences: Vec<&Confidence> = suggestions.iter().map(|s| s.confidence()).collect();
        for window in confidences.windows(2) {
            assert!(window[0] >= window[1]);
        }
    }

    #[test]
    fn no_suggestions_below_min_confidence() {
        let suggestions = suggest_scales(&major_chord(c()), Confidence::High);
        assert!(suggestions
            .iter()
            .all(|s| *s.confidence() >= Confidence::High));
    }

    #[test]
    fn c_minor_chord_does_not_suggest_c_major_as_high() {
        let suggestions = suggest_scales_high(&minor_chord(c()));
        let has_c_major = suggestions
            .iter()
            .any(|s| s.scale.name == "Major" && s.scale.root == c());
        assert!(!has_c_major);
    }

    #[test]
    fn a_minor_in_c_major_detects_aeolian_mode() {
        let suggestions = suggest_scales_high(&minor_chord(a()));
        let c_major_suggestion = suggestions
            .iter()
            .find(|s| s.scale.name == "Major" && s.scale.root == c());
        assert!(c_major_suggestion.is_some());
        let mode = c_major_suggestion.unwrap().mode.as_ref().unwrap();
        assert_eq!(mode.name, "Aeolian");
        assert_eq!(mode.degree, 5);
    }

    #[test]
    fn c_major_in_c_major_detects_ionian_mode() {
        let suggestions = suggest_scales_high(&major_chord(c()));
        let c_major_suggestion = suggestions
            .iter()
            .find(|s| s.scale.name == "Major" && s.scale.root == c());
        let mode = c_major_suggestion.unwrap().mode.as_ref().unwrap();
        assert_eq!(mode.name, "Ionian");
        assert_eq!(mode.degree, 0);
    }

    #[test]
    fn progression_suggestions_prefer_ionian_label_for_i_iv_v() {
        let chords = vec![
            major_chord(c()),
            major_chord(PitchClass::new(5)),
            major_chord(PitchClass::new(7)),
        ];
        let suggestions = suggest_scales_for_progression(&chords, Confidence::High);

        assert!(!suggestions.is_empty());
        let best = &suggestions[0];
        assert_eq!(best.scale.root, c());
        assert_eq!(best.scale.name, "Ionian");
        assert_eq!(best.matching_chords, 3);
        assert_eq!(best.total_chords, 3);
    }

    #[test]
    fn progression_suggestions_report_tensions_when_palette_is_partial() {
        let chords = vec![
            major_chord(c()),
            major_chord(PitchClass::new(5)),
            major_chord(PitchClass::new(7)),
        ];
        let suggestions = suggest_scales_for_progression(&chords, Confidence::Medium);
        let c_major_pentatonic = suggestions
            .iter()
            .find(|suggestion| {
                suggestion.scale.root == c() && suggestion.scale.name == "Pentatonic Major"
            })
            .expect("C major pentatonic should still be considered over I-IV-V");

        assert_eq!(c_major_pentatonic.confidence, Confidence::Medium);
        assert!(c_major_pentatonic
            .outside_notes
            .iter()
            .any(|note| note.name() == "B"));
    }

    #[test]
    fn progression_suggestions_prefer_modal_tonic_for_dorian_vamp() {
        let chords = vec![
            minor_chord(PitchClass::new(2)),
            major_chord(PitchClass::new(7)),
        ];
        let suggestions = suggest_scales_for_progression(&chords, Confidence::High);

        assert!(!suggestions.is_empty());
        assert_eq!(suggestions[0].scale.root.name(), "D");
        assert_eq!(suggestions[0].scale.name, "Dorian");
        assert_eq!(suggestions[0].matching_chords, 2);
    }

    #[test]
    fn progression_suggestions_can_surface_phrygian_dominant_from_harmonic_minor_family() {
        let chords = vec![
            major_chord(PitchClass::new(4)),
            major_chord(PitchClass::new(5)),
            major_chord(PitchClass::new(4)),
            minor_chord(PitchClass::new(9)),
        ];
        let suggestions = suggest_scales_for_progression(&chords, Confidence::High);

        assert!(!suggestions.is_empty());
        assert_eq!(suggestions[0].scale.root.name(), "E");
        assert_eq!(suggestions[0].scale.name, "Phrygian Dominant");
    }

    #[test]
    fn progression_suggestions_can_surface_lydian_dominant_from_melodic_minor_family() {
        let chords = vec![
            major_chord(PitchClass::new(2)),
            minor_chord(PitchClass::new(9)),
        ];
        let suggestions = suggest_scales_for_progression(&chords, Confidence::High);

        assert!(!suggestions.is_empty());
        assert_eq!(suggestions[0].scale.root.name(), "D");
        assert_eq!(suggestions[0].scale.name, "Lydian Dominant");
    }
}
