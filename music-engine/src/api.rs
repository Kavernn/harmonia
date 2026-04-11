//! Public API du music-engine.
//!
//! C'est la seule surface que le frontend (Tauri, CLI, plugin) doit utiliser.
//! Les modules internes (core, harmony, analysis) sont des détails d'implémentation.
//!
//! Règle : si une fonction n'est pas ici, le frontend ne devrait pas l'appeler.

use crate::core::notes::PitchClass;
use crate::harmony::chord::{
    Chord,
    major_chord, minor_chord, power_chord,
    diminished_chord, sus2_chord, sus4_chord,
};
use crate::analysis::compatibility::Confidence;
use crate::analysis::suggestion::{ScaleSuggestion, suggest_scales};

// --- Types re-exportés pour que le frontend n'ait pas à importer les sous-modules ---

pub use crate::core::notes::PitchClass as Note;
pub use crate::harmony::chord::Chord as ChordType;
pub use crate::harmony::scale::Scale as ScaleType;
pub use crate::analysis::compatibility::{Confidence as ConfidenceLevel, CompatibilityResult};
pub use crate::analysis::suggestion::{ScaleSuggestion as Suggestion, DetectedMode};
pub use crate::progression::diatonic::{diatonic_chords, DiatonicChord, DiatonicQuality};
pub use crate::progression::builder::{build_progression, common_progressions, NamedProgression, ProgressionChord};
pub use crate::progression::solo::{solo_notes_for_chord, solo_notes_for_progression, SoloNotes};
pub use crate::riff::fretboard::{fret_positions, FretPosition};
pub use crate::core::tuning::{standard as tuning_standard, drop_d, open_g, Tuning};

// --- Constructeurs de notes ---

/// Crée une note depuis un index de demi-ton (0 = C, 1 = C#, ..., 11 = B)
pub fn note(semitone: u8) -> Note {
    PitchClass::new(semitone)
}

// --- Constructeurs d'accords ---

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ChordQuality {
    Major,
    Minor,
    Power,
    Diminished,
    Sus2,
    Sus4,
}

/// Crée un accord depuis une note root et une qualité
pub fn build_chord(root: Note, quality: ChordQuality) -> ChordType {
    match quality {
        ChordQuality::Major      => major_chord(root),
        ChordQuality::Minor      => minor_chord(root),
        ChordQuality::Power      => power_chord(root),
        ChordQuality::Diminished => diminished_chord(root),
        ChordQuality::Sus2       => sus2_chord(root),
        ChordQuality::Sus4       => sus4_chord(root),
    }
}

// --- Analyse principale ---

/// Analyse un accord et retourne les scales compatibles.
///
/// C'est la fonction principale du moteur.
/// Le frontend l'appelle, lit les résultats, affiche — sans aucune logique musicale.
///
/// `min_confidence` filtre les résultats :
/// - High   : toutes les notes de l'accord sont dans la scale
/// - Medium : une note hors scale (tension)
/// - Low    : deux notes ou plus hors scale
pub fn analyze_chord(chord: &ChordType, min_confidence: ConfidenceLevel) -> Vec<Suggestion> {
    suggest_scales(chord, min_confidence)
}

/// Raccourci : retourne uniquement les suggestions à haute confiance
pub fn analyze_chord_strict(chord: &ChordType) -> Vec<Suggestion> {
    analyze_chord(chord, ConfidenceLevel::High)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn analyze_c_major_returns_suggestions() {
        let c = note(0);
        let chord = build_chord(c, ChordQuality::Major);
        let results = analyze_chord_strict(&chord);
        assert!(!results.is_empty(), "should return at least one suggestion");
    }

    #[test]
    fn analyze_c_major_includes_c_major_scale() {
        let c = note(0);
        let chord = build_chord(c, ChordQuality::Major);
        let results = analyze_chord_strict(&chord);
        let has_c_major = results.iter().any(|s| {
            s.scale.name == "Major" && s.scale.root == note(0)
        });
        assert!(has_c_major);
    }

    #[test]
    fn analyze_power_chord_returns_more_than_major() {
        let c = note(0);
        let power = build_chord(c, ChordQuality::Power);
        let major = build_chord(c, ChordQuality::Major);
        let power_count = analyze_chord_strict(&power).len();
        let major_count = analyze_chord_strict(&major).len();
        assert!(power_count > major_count, "ambiguous chord should match more scales");
    }

    #[test]
    fn all_chord_qualities_build_without_panic() {
        let root = note(0);
        let qualities = [
            ChordQuality::Major, ChordQuality::Minor, ChordQuality::Power,
            ChordQuality::Diminished, ChordQuality::Sus2, ChordQuality::Sus4,
        ];
        for q in qualities {
            let chord = build_chord(root, q);
            let _ = analyze_chord_strict(&chord);
        }
    }

    #[test]
    fn confidence_filter_works() {
        let c = note(0);
        let chord = build_chord(c, ChordQuality::Minor);
        let high = analyze_chord(&chord, ConfidenceLevel::High).len();
        let medium = analyze_chord(&chord, ConfidenceLevel::Medium).len();
        assert!(medium >= high, "medium filter should return at least as many results");
    }

    #[test]
    fn all_results_respect_min_confidence() {
        let c = note(0);
        let chord = build_chord(c, ChordQuality::Major);
        let results = analyze_chord(&chord, ConfidenceLevel::High);
        assert!(results.iter().all(|s| *s.confidence() == ConfidenceLevel::High));
    }
}