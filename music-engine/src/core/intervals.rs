/// Un intervalle est une distance en demi-tons entre deux notes.
/// Toute la logique musicale repose sur ces valeurs — jamais sur des noms de notes.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct Interval(pub u8);

impl Interval {
    pub fn semitones(self) -> u8 {
        self.0
    }
}

// Intervalles nommés — les constantes de base du moteur
pub const UNISON: Interval         = Interval(0);
pub const MINOR_SECOND: Interval   = Interval(1);
pub const MAJOR_SECOND: Interval   = Interval(2);
pub const MINOR_THIRD: Interval    = Interval(3);
pub const MAJOR_THIRD: Interval    = Interval(4);
pub const PERFECT_FOURTH: Interval = Interval(5);
pub const TRITONE: Interval        = Interval(6);
pub const PERFECT_FIFTH: Interval  = Interval(7);
pub const MINOR_SIXTH: Interval    = Interval(8);
pub const MAJOR_SIXTH: Interval    = Interval(9);
pub const MINOR_SEVENTH: Interval  = Interval(10);
pub const MAJOR_SEVENTH: Interval  = Interval(11);
pub const OCTAVE: Interval         = Interval(12);

impl Interval {
    /// Réduit l'intervalle dans une octave (0–11)
    pub fn normalize(self) -> Self {
        Interval(self.0 % 12)
    }

    /// Nom lisible pour affichage — jamais utilisé dans la logique musicale
    pub fn name(self) -> &'static str {
        match self.0 % 12 {
            0  => "Unison",
            1  => "Minor 2nd",
            2  => "Major 2nd",
            3  => "Minor 3rd",
            4  => "Major 3rd",
            5  => "Perfect 4th",
            6  => "Tritone",
            7  => "Perfect 5th",
            8  => "Minor 6th",
            9  => "Major 6th",
            10 => "Minor 7th",
            11 => "Major 7th",
            _  => "Unknown",
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn perfect_fifth_is_7_semitones() {
        assert_eq!(PERFECT_FIFTH.semitones(), 7);
    }

    #[test]
    fn octave_normalizes_to_unison() {
        assert_eq!(OCTAVE.normalize(), UNISON);
    }

    #[test]
    fn tritone_name() {
        assert_eq!(TRITONE.name(), "Tritone");
    }

    #[test]
    fn interval_ordering() {
        assert!(MINOR_THIRD < MAJOR_THIRD);
        assert!(PERFECT_FIFTH > PERFECT_FOURTH);
    }
}