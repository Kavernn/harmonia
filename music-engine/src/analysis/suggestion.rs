use crate::core::notes::PitchClass;
use crate::harmony::chord::Chord;
use crate::harmony::scale::{
    Scale, major_scale, natural_minor_scale,
    pentatonic_major_scale, pentatonic_minor_scale, blues_scale,
};
use crate::analysis::compatibility::{chord_scale_compatibility, Confidence, CompatibilityResult};

/// Une suggestion de scale pour un accord donné.
#[derive(Debug, Clone)]
pub struct ScaleSuggestion {
    pub scale: Scale,
    pub compatibility: CompatibilityResult,
}

impl ScaleSuggestion {
    pub fn confidence(&self) -> &Confidence {
        &self.compatibility.confidence
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
        pentatonic_major_scale(root),
        pentatonic_minor_scale(root),
        blues_scale(root),
    ]
}

/// Suggère des scales compatibles avec un accord donné.
/// Retourne les résultats triés par confiance décroissante.
/// Filtre en dessous du seuil minimum de confiance.
pub fn suggest_scales(chord: &Chord, min_confidence: Confidence) -> Vec<ScaleSuggestion> {
    let mut suggestions: Vec<ScaleSuggestion> = all_roots()
        .into_iter()
        .flat_map(|root| candidate_scales(root))
        .map(|scale| {
            let compatibility = chord_scale_compatibility(chord, &scale);
            ScaleSuggestion { scale, compatibility }
        })
        .filter(|s| s.compatibility.confidence >= min_confidence)
        .collect();

    // Tri : High en premier, puis Medium, puis Low
    suggestions.sort_by(|a, b| b.confidence().cmp(a.confidence()));
    suggestions
}

/// Suggère uniquement les scales à haute confiance
pub fn suggest_scales_high(chord: &Chord) -> Vec<ScaleSuggestion> {
    suggest_scales(chord, Confidence::High)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::harmony::chord::{major_chord, minor_chord, power_chord};

    fn c() -> PitchClass { PitchClass::new(0) }
    fn a() -> PitchClass { PitchClass::new(9) }

    #[test]
    fn c_major_chord_suggests_c_major_scale() {
        let suggestions = suggest_scales_high(&major_chord(c()));
        let names: Vec<&str> = suggestions.iter().map(|s| s.scale.name).collect();
        assert!(names.contains(&"Major"));
    }

    #[test]
    fn c_major_chord_high_suggestions_are_all_high_confidence() {
        let suggestions = suggest_scales_high(&major_chord(c()));
        assert!(suggestions.iter().all(|s| *s.confidence() == Confidence::High));
    }

    #[test]
    fn a_minor_chord_suggests_a_minor_scale() {
        let suggestions = suggest_scales_high(&minor_chord(a()));
        let has_a_minor = suggestions.iter().any(|s| {
            s.scale.name == "Natural Minor" && s.scale.root == a()
        });
        assert!(has_a_minor);
    }

    #[test]
    fn power_chord_has_multiple_high_suggestions() {
        // Ambigu → compatible avec plus de scales
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
        assert!(suggestions.iter().all(|s| *s.confidence() >= Confidence::High));
    }

    #[test]
    fn c_minor_chord_does_not_suggest_c_major_as_high() {
        let suggestions = suggest_scales_high(&minor_chord(c()));
        let has_c_major = suggestions.iter().any(|s| {
            s.scale.name == "Major" && s.scale.root == c()
        });
        assert!(!has_c_major);
    }
}