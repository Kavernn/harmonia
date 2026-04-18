use crate::core::{intervals::Interval, notes::PitchClass};

/// Un accord = une root + un ensemble d'intervalles.
/// Les power chords sont des accords valides (intervalles incomplets = ambiguïté tonale intentionnelle).
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Chord {
    pub root: PitchClass,
    pub intervals: Vec<Interval>,
}

impl Chord {
    pub fn new(root: PitchClass, intervals: Vec<Interval>) -> Self {
        Chord { root, intervals }
    }

    /// Retourne les pitch classes de l'accord
    pub fn pitch_classes(&self) -> Vec<PitchClass> {
        let mut pcs = vec![self.root];
        for &interval in &self.intervals {
            pcs.push(self.root.apply(interval));
        }
        pcs
    }

    /// Nombre de notes dans l'accord (root incluse)
    pub fn note_count(&self) -> usize {
        self.intervals.len() + 1
    }

    /// Vrai si l'accord est ambigu (pas de tierce — ex: power chord)
    pub fn is_ambiguous(&self) -> bool {
        use crate::core::intervals::{MAJOR_THIRD, MINOR_THIRD};
        !self.intervals.contains(&MINOR_THIRD) && !self.intervals.contains(&MAJOR_THIRD)
    }
}

// --- Constructeurs d'accords courants ---

use crate::core::intervals::*;

/// Power chord — root + quinte (ambigu majeur/mineur)
pub fn power_chord(root: PitchClass) -> Chord {
    Chord::new(root, vec![PERFECT_FIFTH])
}

/// Accord majeur — root + tierce majeure + quinte
pub fn major_chord(root: PitchClass) -> Chord {
    Chord::new(root, vec![MAJOR_THIRD, PERFECT_FIFTH])
}

/// Accord mineur — root + tierce mineure + quinte
pub fn minor_chord(root: PitchClass) -> Chord {
    Chord::new(root, vec![MINOR_THIRD, PERFECT_FIFTH])
}

/// Accord diminué — root + tierce mineure + quinte diminuée
pub fn diminished_chord(root: PitchClass) -> Chord {
    Chord::new(root, vec![MINOR_THIRD, TRITONE])
}

/// Accord augmenté — root + tierce majeure + quinte augmentée
pub fn augmented_chord(root: PitchClass) -> Chord {
    Chord::new(root, vec![MAJOR_THIRD, MINOR_SIXTH])
}

/// Accord sus2 — root + seconde majeure + quinte
pub fn sus2_chord(root: PitchClass) -> Chord {
    Chord::new(root, vec![MAJOR_SECOND, PERFECT_FIFTH])
}

/// Accord sus4 — root + quarte + quinte
pub fn sus4_chord(root: PitchClass) -> Chord {
    Chord::new(root, vec![PERFECT_FOURTH, PERFECT_FIFTH])
}

/// Accord dominant 7 — root + tierce majeure + quinte + septième mineure
pub fn dominant7_chord(root: PitchClass) -> Chord {
    Chord::new(root, vec![MAJOR_THIRD, PERFECT_FIFTH, MINOR_SEVENTH])
}

/// Accord major 7 — root + tierce majeure + quinte + septième majeure
pub fn major7_chord(root: PitchClass) -> Chord {
    Chord::new(root, vec![MAJOR_THIRD, PERFECT_FIFTH, MAJOR_SEVENTH])
}

/// Accord minor 7 — root + tierce mineure + quinte + septième mineure
pub fn minor7_chord(root: PitchClass) -> Chord {
    Chord::new(root, vec![MINOR_THIRD, PERFECT_FIFTH, MINOR_SEVENTH])
}

/// Accord half-diminished (m7b5) — root + tierce mineure + quinte diminuée + septième mineure
pub fn minor7b5_chord(root: PitchClass) -> Chord {
    Chord::new(root, vec![MINOR_THIRD, TRITONE, MINOR_SEVENTH])
}

/// Accord diminué complet (dim7) — root + tierce mineure + quinte diminuée + septième diminuée
pub fn diminished7_chord(root: PitchClass) -> Chord {
    Chord::new(root, vec![MINOR_THIRD, TRITONE, MAJOR_SIXTH])
}

/// Accord minor-major 7 — root + tierce mineure + quinte + septième majeure
pub fn minor_major7_chord(root: PitchClass) -> Chord {
    Chord::new(root, vec![MINOR_THIRD, PERFECT_FIFTH, MAJOR_SEVENTH])
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::notes::PitchClass;

    fn c() -> PitchClass {
        PitchClass::new(0)
    }
    fn e() -> PitchClass {
        PitchClass::new(4)
    }
    fn g() -> PitchClass {
        PitchClass::new(7)
    }

    #[test]
    fn major_chord_has_3_notes() {
        assert_eq!(major_chord(c()).note_count(), 3);
    }

    #[test]
    fn c_major_pitch_classes_are_c_e_g() {
        let pcs = major_chord(c()).pitch_classes();
        assert!(pcs.contains(&c()));
        assert!(pcs.contains(&e()));
        assert!(pcs.contains(&g()));
    }

    #[test]
    fn power_chord_is_ambiguous() {
        assert!(power_chord(c()).is_ambiguous());
    }

    #[test]
    fn major_chord_is_not_ambiguous() {
        assert!(!major_chord(c()).is_ambiguous());
    }

    #[test]
    fn minor_chord_is_not_ambiguous() {
        assert!(!minor_chord(c()).is_ambiguous());
    }

    #[test]
    fn power_chord_has_2_notes() {
        assert_eq!(power_chord(c()).note_count(), 2);
    }

    #[test]
    fn sus2_is_ambiguous() {
        assert!(sus2_chord(c()).is_ambiguous());
    }

    #[test]
    fn diminished_root_is_correct() {
        assert_eq!(diminished_chord(c()).root, c());
    }

    #[test]
    fn augmented_chord_has_augmented_fifth() {
        let pcs = augmented_chord(c()).pitch_classes();
        assert!(pcs.contains(&c()));
        assert!(pcs.contains(&PitchClass::new(4)));
        assert!(pcs.contains(&PitchClass::new(8)));
    }

    #[test]
    fn dominant7_chord_has_4_notes() {
        assert_eq!(dominant7_chord(c()).note_count(), 4);
    }

    #[test]
    fn c_dominant7_pitch_classes_are_c_e_g_bb() {
        let pcs = dominant7_chord(c()).pitch_classes();
        assert!(pcs.contains(&c()));
        assert!(pcs.contains(&PitchClass::new(4)));  // E
        assert!(pcs.contains(&PitchClass::new(7)));  // G
        assert!(pcs.contains(&PitchClass::new(10))); // Bb
    }

    #[test]
    fn c_major7_pitch_classes_are_c_e_g_b() {
        let pcs = major7_chord(c()).pitch_classes();
        assert!(pcs.contains(&PitchClass::new(11))); // B
    }

    #[test]
    fn c_minor7b5_has_tritone() {
        let pcs = minor7b5_chord(c()).pitch_classes();
        assert!(pcs.contains(&PitchClass::new(6)));  // Gb (tritone)
        assert!(pcs.contains(&PitchClass::new(10))); // Bb
    }

    #[test]
    fn c_diminished7_has_4_notes_symmetrically_spaced() {
        let pcs = diminished7_chord(c()).pitch_classes();
        assert_eq!(pcs.len(), 4);
        assert!(pcs.contains(&PitchClass::new(3)));  // Eb
        assert!(pcs.contains(&PitchClass::new(6)));  // Gb
        assert!(pcs.contains(&PitchClass::new(9)));  // A (dim7)
    }
}
