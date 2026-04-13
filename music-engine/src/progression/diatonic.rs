use crate::core::intervals::{MAJOR_THIRD, MINOR_SIXTH, MINOR_THIRD, PERFECT_FIFTH, TRITONE};
use crate::harmony::chord::Chord;
use crate::harmony::scale::Scale;

/// Chiffrage romain d'un degré (affichage uniquement)
pub const ROMAN: [&str; 7] = ["I", "II", "III", "IV", "V", "VI", "VII"];

/// Un accord diatonique — issu naturellement d'une scale à un degré donné.
#[derive(Debug, Clone)]
pub struct DiatonicChord {
    pub degree: usize, // 0-based (0 = I, 6 = VII)
    pub roman: String, // "I", "ii", "III+", etc.
    pub chord: Chord,
    pub quality: DiatonicQuality,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum DiatonicQuality {
    Major,
    Minor,
    Diminished,
    Augmented,
    /// Pour les scales sans tierce claire (pentatonique, blues)
    Indeterminate,
}

impl DiatonicQuality {
    pub fn label(&self) -> &'static str {
        match self {
            DiatonicQuality::Major => "major",
            DiatonicQuality::Minor => "minor",
            DiatonicQuality::Diminished => "diminished",
            DiatonicQuality::Augmented => "augmented",
            DiatonicQuality::Indeterminate => "indeterminate",
        }
    }
}

impl DiatonicChord {
    /// Nom complet pour l'affichage — ex: "Am", "Bdim", "C"
    pub fn display_name(&self) -> String {
        let root = self.chord.root.name();
        match self.quality {
            DiatonicQuality::Major => root.to_string(),
            DiatonicQuality::Minor => format!("{}m", root),
            DiatonicQuality::Diminished => format!("{}dim", root),
            DiatonicQuality::Augmented => format!("{}+", root),
            DiatonicQuality::Indeterminate => root.to_string(),
        }
    }
}

fn roman_for_quality(degree: usize, quality: &DiatonicQuality) -> String {
    let base = ROMAN[degree % 7];
    match quality {
        DiatonicQuality::Major => base.to_string(),
        DiatonicQuality::Minor => base.to_lowercase(),
        DiatonicQuality::Diminished => format!("{}°", base.to_lowercase()),
        DiatonicQuality::Augmented => format!("{}+", base),
        DiatonicQuality::Indeterminate => base.to_string(),
    }
}

/// Construit l'accord diatonique à un degré donné d'une scale.
/// Empile des tierces depuis la root du degré.
fn build_diatonic_chord(scale: &Scale, degree: usize) -> DiatonicChord {
    let pcs = scale.pitch_classes();
    let len = pcs.len();
    let root = pcs[degree % len];

    // Tierce : 2 degrés plus haut dans la scale
    let third = pcs[(degree + 2) % len];
    // Quinte : 4 degrés plus haut dans la scale
    let fifth = pcs[(degree + 4) % len];

    let third_interval = root.interval_to(third);
    let fifth_interval = root.interval_to(fifth);

    let quality = if third_interval == MAJOR_THIRD && fifth_interval == PERFECT_FIFTH {
        DiatonicQuality::Major
    } else if third_interval == MINOR_THIRD && fifth_interval == PERFECT_FIFTH {
        DiatonicQuality::Minor
    } else if third_interval == MINOR_THIRD && fifth_interval == TRITONE {
        DiatonicQuality::Diminished
    } else if third_interval == MAJOR_THIRD && fifth_interval == MINOR_SIXTH {
        DiatonicQuality::Augmented
    } else {
        DiatonicQuality::Indeterminate
    };

    let intervals = vec![third_interval, fifth_interval];

    DiatonicChord {
        degree,
        roman: roman_for_quality(degree, &quality),
        chord: Chord::new(root, intervals),
        quality,
    }
}

/// Retourne les accords diatoniques d'une scale (un par degré).
/// Pour une gamme majeure à 7 notes → 7 accords (I à VII).
/// Pour une pentatonique à 5 notes → 5 accords.
pub fn diatonic_chords(scale: &Scale) -> Vec<DiatonicChord> {
    let count = scale.note_count();
    (0..count)
        .map(|degree| build_diatonic_chord(scale, degree))
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::notes::PitchClass;
    use crate::harmony::scale::{major_scale, natural_minor_scale};

    fn c() -> PitchClass {
        PitchClass::new(0)
    }
    fn a() -> PitchClass {
        PitchClass::new(9)
    }

    #[test]
    fn c_major_has_7_diatonic_chords() {
        assert_eq!(diatonic_chords(&major_scale(c())).len(), 7);
    }

    #[test]
    fn c_major_degree_0_is_c_major() {
        let chords = diatonic_chords(&major_scale(c()));
        assert_eq!(chords[0].quality, DiatonicQuality::Major);
        assert_eq!(chords[0].chord.root, c());
        assert_eq!(chords[0].roman, "I");
    }

    #[test]
    fn c_major_degree_1_is_d_minor() {
        let chords = diatonic_chords(&major_scale(c()));
        assert_eq!(chords[1].quality, DiatonicQuality::Minor);
        assert_eq!(chords[1].chord.root.name(), "D");
        assert_eq!(chords[1].roman, "ii");
    }

    #[test]
    fn c_major_degree_4_is_g_major() {
        // V = G major
        let chords = diatonic_chords(&major_scale(c()));
        assert_eq!(chords[4].quality, DiatonicQuality::Major);
        assert_eq!(chords[4].chord.root.name(), "G");
        assert_eq!(chords[4].roman, "V");
    }

    #[test]
    fn c_major_degree_6_is_b_diminished() {
        // VII = B diminished
        let chords = diatonic_chords(&major_scale(c()));
        assert_eq!(chords[6].quality, DiatonicQuality::Diminished);
        assert_eq!(chords[6].chord.root.name(), "B");
        assert_eq!(chords[6].roman, "vii°");
    }

    #[test]
    fn c_major_qualities_are_correct_sequence() {
        // I maj, II min, III min, IV maj, V maj, VI min, VII dim
        let chords = diatonic_chords(&major_scale(c()));
        let qualities: Vec<&DiatonicQuality> = chords.iter().map(|c| &c.quality).collect();
        assert_eq!(
            qualities,
            vec![
                &DiatonicQuality::Major,
                &DiatonicQuality::Minor,
                &DiatonicQuality::Minor,
                &DiatonicQuality::Major,
                &DiatonicQuality::Major,
                &DiatonicQuality::Minor,
                &DiatonicQuality::Diminished,
            ]
        );
    }

    #[test]
    fn a_minor_degree_0_is_a_minor() {
        let chords = diatonic_chords(&natural_minor_scale(a()));
        assert_eq!(chords[0].quality, DiatonicQuality::Minor);
        assert_eq!(chords[0].chord.root, a());
        assert_eq!(chords[0].roman, "i");
    }

    #[test]
    fn display_name_formats_correctly() {
        let chords = diatonic_chords(&major_scale(c()));
        assert_eq!(chords[0].display_name(), "C"); // I  = C major
        assert_eq!(chords[1].display_name(), "Dm"); // II = D minor
        assert_eq!(chords[6].display_name(), "Bdim"); // VII= B dim
    }

    #[test]
    fn harmonic_minor_has_augmented_third_degree() {
        use crate::harmony::scale::harmonic_minor_scale;

        let chords = diatonic_chords(&harmonic_minor_scale(a()));
        assert_eq!(chords[2].quality, DiatonicQuality::Augmented);
        assert_eq!(chords[2].roman, "III+");
        assert_eq!(chords[4].quality, DiatonicQuality::Major);
        assert_eq!(chords[4].roman, "V");
    }
}
