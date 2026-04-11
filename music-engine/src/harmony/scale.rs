use crate::core::{intervals::Interval, notes::PitchClass};

/// Une scale = une root + une séquence ordonnée d'intervalles depuis la root.
/// Les modes sont des rotations de cette séquence — jamais des entités indépendantes.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Scale {
    pub root: PitchClass,
    pub name: &'static str,
    /// Intervalles depuis la root (ne contient pas l'unisson ni l'octave)
    pub intervals: Vec<Interval>,
}

impl Scale {
    pub fn new(root: PitchClass, name: &'static str, intervals: Vec<Interval>) -> Self {
        Scale { root, name, intervals }
    }

    /// Toutes les pitch classes de la scale (root incluse)
    pub fn pitch_classes(&self) -> Vec<PitchClass> {
        let mut pcs = vec![self.root];
        for &interval in &self.intervals {
            pcs.push(self.root.apply(interval));
        }
        pcs
    }

    /// Nombre de notes dans la scale
    pub fn note_count(&self) -> usize {
        self.intervals.len() + 1
    }

    /// Vérifie si une pitch class appartient à la scale
    pub fn contains(&self, pc: PitchClass) -> bool {
        self.pitch_classes().contains(&pc)
    }

    /// Retourne le mode à la position donnée (0 = premier mode = la scale elle-même)
    /// Les intervalles sont recalculés depuis la nouvelle root.
    pub fn mode(&self, degree: usize) -> Scale {
        let pcs = self.pitch_classes();
        let len = pcs.len();
        assert!(degree < len, "degree out of range");

        let new_root = pcs[degree];

        let intervals: Vec<Interval> = (1..len)
            .map(|i| new_root.interval_to(pcs[(degree + i) % len]))
            .collect();

        let name = self.mode_name(degree);

        Scale { root: new_root, name, intervals }
    }

    /// Nom du mode à un degré donné — affichage uniquement.
    /// Seule la gamme majeure a des noms de modes standards.
    pub fn mode_name(&self, degree: usize) -> &'static str {
        match self.name {
            "Major" => match degree {
                0 => "Ionian",
                1 => "Dorian",
                2 => "Phrygian",
                3 => "Lydian",
                4 => "Mixolydian",
                5 => "Aeolian",
                6 => "Locrian",
                _ => "Unknown",
            },
            _ => self.name,
        }
    }

    /// Quel degré de cette scale correspond à une root donnée?
    /// Retourne None si la root n'est pas dans la scale.
    pub fn degree_of(&self, root: PitchClass) -> Option<usize> {
        self.pitch_classes().iter().position(|&pc| pc == root)
    }
}

// --- Scales de base ---

use crate::core::intervals::*;

/// Major scale (Ionian) — W W H W W W H
pub fn major_scale(root: PitchClass) -> Scale {
    Scale::new(root, "Major", vec![
        MAJOR_SECOND,
        MAJOR_THIRD,
        PERFECT_FOURTH,
        PERFECT_FIFTH,
        MAJOR_SIXTH,
        MAJOR_SEVENTH,
    ])
}

/// Natural minor scale (Aeolian) — W H W W H W W
pub fn natural_minor_scale(root: PitchClass) -> Scale {
    Scale::new(root, "Natural Minor", vec![
        MAJOR_SECOND,
        MINOR_THIRD,
        PERFECT_FOURTH,
        PERFECT_FIFTH,
        MINOR_SIXTH,
        MINOR_SEVENTH,
    ])
}

/// Pentatonic major — 5 notes
pub fn pentatonic_major_scale(root: PitchClass) -> Scale {
    Scale::new(root, "Pentatonic Major", vec![
        MAJOR_SECOND,
        MAJOR_THIRD,
        PERFECT_FIFTH,
        MAJOR_SIXTH,
    ])
}

/// Pentatonic minor — 5 notes
pub fn pentatonic_minor_scale(root: PitchClass) -> Scale {
    Scale::new(root, "Pentatonic Minor", vec![
        MINOR_THIRD,
        PERFECT_FOURTH,
        PERFECT_FIFTH,
        MINOR_SEVENTH,
    ])
}

/// Blues scale — pentatonique mineur + blue note (tritone)
pub fn blues_scale(root: PitchClass) -> Scale {
    Scale::new(root, "Blues", vec![
        MINOR_THIRD,
        PERFECT_FOURTH,
        TRITONE,
        PERFECT_FIFTH,
        MINOR_SEVENTH,
    ])
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::notes::PitchClass;

    fn c() -> PitchClass { PitchClass::new(0) }

    #[test]
    fn c_major_has_7_notes() {
        assert_eq!(major_scale(c()).note_count(), 7);
    }

    #[test]
    fn c_major_contains_f_and_g() {
        let scale = major_scale(c());
        assert!(scale.contains(PitchClass::new(5))); // F
        assert!(scale.contains(PitchClass::new(7))); // G
    }

    #[test]
    fn c_major_does_not_contain_f_sharp() {
        assert!(!major_scale(c()).contains(PitchClass::new(6)));
    }

    #[test]
    fn natural_minor_has_7_notes() {
        assert_eq!(natural_minor_scale(c()).note_count(), 7);
    }

    #[test]
    fn pentatonic_minor_has_5_notes() {
        assert_eq!(pentatonic_minor_scale(c()).note_count(), 5);
    }

    #[test]
    fn blues_scale_has_6_notes() {
        assert_eq!(blues_scale(c()).note_count(), 6);
    }

    #[test]
    fn c_major_mode_1_is_dorian_root_d() {
        let dorian = major_scale(c()).mode(1);
        assert_eq!(dorian.root.name(), "D");
        assert_eq!(dorian.name, "Dorian");
    }

    #[test]
    fn c_major_mode_5_is_aeolian_root_a() {
        let aeolian = major_scale(c()).mode(5);
        assert_eq!(aeolian.root.name(), "A");
        assert_eq!(aeolian.name, "Aeolian");
    }

    #[test]
    fn mode_5_of_c_major_matches_a_natural_minor() {
        let aeolian = major_scale(c()).mode(5);
        let a_minor = natural_minor_scale(PitchClass::new(9));
        assert_eq!(aeolian.pitch_classes(), a_minor.pitch_classes());
    }

    #[test]
    fn degree_of_finds_correct_position() {
        let scale = major_scale(c());
        assert_eq!(scale.degree_of(PitchClass::new(0)), Some(0)); // C = degree 0
        assert_eq!(scale.degree_of(PitchClass::new(9)), Some(5)); // A = degree 5
        assert_eq!(scale.degree_of(PitchClass::new(6)), None);    // F# pas dans C major
    }
}