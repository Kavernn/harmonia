use crate::core::intervals::Interval;

/// Une note = une pitch class (0–11 demi-tons).
/// Le nom de la note n'existe que pour l'affichage — jamais pour la logique.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct PitchClass(pub u8);

impl PitchClass {
    /// Crée une pitch class en s'assurant qu'elle est dans 0–11
    pub fn new(value: u8) -> Self {
        PitchClass(value % 12)
    }

    pub fn value(self) -> u8 {
        self.0
    }

    /// Applique un intervalle et retourne la nouvelle pitch class
    pub fn apply(self, interval: Interval) -> Self {
        PitchClass::new(self.0 + interval.semitones())
    }

    /// Distance en demi-tons vers une autre pitch class (ascendant, 0–11)
    pub fn interval_to(self, other: PitchClass) -> Interval {
        let dist = (other.0 + 12 - self.0) % 12;
        Interval(dist)
    }

    /// Nom par défaut (notation # uniquement — le choix b/# est une question d'affichage)
    pub fn name(self) -> &'static str {
        match self.0 {
            0  => "C",
            1  => "C#",
            2  => "D",
            3  => "D#",
            4  => "E",
            5  => "F",
            6  => "F#",
            7  => "G",
            8  => "G#",
            9  => "A",
            10 => "A#",
            11 => "B",
            _  => unreachable!(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::intervals::{PERFECT_FIFTH, OCTAVE, MINOR_THIRD};

    #[test]
    fn new_wraps_correctly() {
        assert_eq!(PitchClass::new(12), PitchClass::new(0));
        assert_eq!(PitchClass::new(13), PitchClass::new(1));
    }

    #[test]
    fn apply_perfect_fifth_from_c_gives_g() {
        let c = PitchClass::new(0);
        let g = c.apply(PERFECT_FIFTH);
        assert_eq!(g.name(), "G");
    }

    #[test]
    fn apply_octave_returns_same_pitch_class() {
        let a = PitchClass::new(9);
        assert_eq!(a.apply(OCTAVE), PitchClass::new(9));
    }

    #[test]
    fn interval_to_c_to_e_is_major_third() {
        let c = PitchClass::new(0);
        let e = PitchClass::new(4);
        assert_eq!(c.interval_to(e).semitones(), 4);
    }

    #[test]
    fn interval_to_wraps_around_octave() {
        // G → E : distance montante = 9 demi-tons
        let g = PitchClass::new(7);
        let e = PitchClass::new(4);
        assert_eq!(g.interval_to(e).semitones(), 9);
    }

    #[test]
    fn minor_third_from_a_gives_c() {
        let a = PitchClass::new(9);
        let c = a.apply(MINOR_THIRD);
        assert_eq!(c.name(), "C");
    }
}