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
        use crate::core::intervals::{MINOR_THIRD, MAJOR_THIRD};
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

/// Accord sus2 — root + seconde majeure + quinte
pub fn sus2_chord(root: PitchClass) -> Chord {
    Chord::new(root, vec![MAJOR_SECOND, PERFECT_FIFTH])
}

/// Accord sus4 — root + quarte + quinte
pub fn sus4_chord(root: PitchClass) -> Chord {
    Chord::new(root, vec![PERFECT_FOURTH, PERFECT_FIFTH])
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::notes::PitchClass;

    fn c() -> PitchClass { PitchClass::new(0) }
    fn e() -> PitchClass { PitchClass::new(4) }
    fn g() -> PitchClass { PitchClass::new(7) }

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
}