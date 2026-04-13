use crate::core::notes::PitchClass;
use crate::harmony::{chord::Chord, scale::Scale};

/// Niveau de confiance d'une compatibilité musicale.
/// Toujours expliqué — jamais une boîte noire.
#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord)]
pub enum Confidence {
    Low,
    Medium,
    High,
}

impl Confidence {
    pub fn label(&self) -> &'static str {
        match self {
            Confidence::Low => "low",
            Confidence::Medium => "medium",
            Confidence::High => "high",
        }
    }
}

/// Résultat d'une compatibilité accord ↔ scale.
#[derive(Debug, Clone)]
pub struct CompatibilityResult {
    pub confidence: Confidence,
    /// Notes de l'accord présentes dans la scale
    pub matching_notes: Vec<PitchClass>,
    /// Notes de l'accord absentes de la scale (tensions)
    pub outside_notes: Vec<PitchClass>,
    /// Raison lisible — toujours expliquée
    pub reason: &'static str,
}

impl CompatibilityResult {
    pub fn is_compatible(&self) -> bool {
        self.outside_notes.is_empty()
    }
}

/// Calcule la compatibilité entre un accord et une scale.
///
/// Règles :
/// - High   : toutes les notes de l'accord sont dans la scale
/// - Medium : une note hors scale (tension acceptable)
/// - Low    : deux notes ou plus hors scale
///
/// Les power chords (ambigus) reçoivent un bonus : si root + quinte
/// sont dans la scale, confidence = High même sans tierce.
pub fn chord_scale_compatibility(chord: &Chord, scale: &Scale) -> CompatibilityResult {
    let chord_pcs = chord.pitch_classes();
    let scale_pcs = scale.pitch_classes();

    let matching_notes: Vec<PitchClass> = chord_pcs
        .iter()
        .copied()
        .filter(|pc| scale_pcs.contains(pc))
        .collect();

    let outside_notes: Vec<PitchClass> = chord_pcs
        .iter()
        .copied()
        .filter(|pc| !scale_pcs.contains(pc))
        .collect();

    let outside_count = outside_notes.len();

    let (confidence, reason) = if outside_count == 0 {
        (Confidence::High, "All chord tones are in the scale")
    } else if outside_count == 1 {
        (
            Confidence::Medium,
            "One chord tone outside the scale — creates tension",
        )
    } else {
        (Confidence::Low, "Multiple chord tones outside the scale")
    };

    CompatibilityResult {
        confidence,
        matching_notes,
        outside_notes,
        reason,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::notes::PitchClass;
    use crate::harmony::chord::{diminished_chord, major_chord, minor_chord, power_chord};
    use crate::harmony::scale::{major_scale, natural_minor_scale};

    fn c() -> PitchClass {
        PitchClass::new(0)
    }
    fn a() -> PitchClass {
        PitchClass::new(9)
    }

    #[test]
    fn c_major_chord_in_c_major_scale_is_high() {
        let result = chord_scale_compatibility(&major_chord(c()), &major_scale(c()));
        assert_eq!(result.confidence, Confidence::High);
        assert!(result.is_compatible());
    }

    #[test]
    fn c_minor_chord_in_c_major_scale_is_medium() {
        // Eb n'est pas dans C major → 1 note dehors = Medium (tension)
        let result = chord_scale_compatibility(&minor_chord(c()), &major_scale(c()));
        assert_eq!(result.confidence, Confidence::Medium);
        assert!(!result.is_compatible());
    }

    #[test]
    fn c_power_chord_in_c_major_scale_is_high() {
        // C + G sont tous les deux dans C major
        let result = chord_scale_compatibility(&power_chord(c()), &major_scale(c()));
        assert_eq!(result.confidence, Confidence::High);
    }

    #[test]
    fn a_minor_chord_in_c_major_scale_is_high() {
        // A C E — tous dans C major
        let result = chord_scale_compatibility(&minor_chord(a()), &major_scale(c()));
        assert_eq!(result.confidence, Confidence::High);
    }

    #[test]
    fn outside_notes_are_correctly_identified() {
        // C minor (C Eb G) dans C major (pas de Eb)
        let result = chord_scale_compatibility(&minor_chord(c()), &major_scale(c()));
        assert_eq!(result.outside_notes.len(), 1);
        assert_eq!(result.outside_notes[0], PitchClass::new(3)); // Eb
    }

    #[test]
    fn matching_notes_are_correctly_identified() {
        // C minor dans C major : C et G matchent
        let result = chord_scale_compatibility(&minor_chord(c()), &major_scale(c()));
        assert_eq!(result.matching_notes.len(), 2);
    }

    #[test]
    fn b_diminished_in_c_major_is_high() {
        // B dim = B D F — tous diatoniques à C major → High
        let b = PitchClass::new(11);
        let result = chord_scale_compatibility(&diminished_chord(b), &major_scale(c()));
        assert_eq!(result.confidence, Confidence::High);
    }

    #[test]
    fn a_minor_chord_in_a_minor_scale_is_high() {
        let result = chord_scale_compatibility(&minor_chord(a()), &natural_minor_scale(a()));
        assert_eq!(result.confidence, Confidence::High);
    }
}
