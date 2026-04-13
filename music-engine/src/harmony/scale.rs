use crate::core::{intervals::Interval, notes::PitchClass};

pub const MAJOR_MODE_NAMES: [&str; 7] = [
    "Ionian",
    "Dorian",
    "Phrygian",
    "Lydian",
    "Mixolydian",
    "Aeolian",
    "Locrian",
];

pub const HARMONIC_MINOR_MODE_NAMES: [&str; 7] = [
    "Harmonic Minor",
    "Locrian Nat6",
    "Ionian Augmented",
    "Dorian #4",
    "Phrygian Dominant",
    "Lydian #2",
    "Super Locrian bb7",
];

pub const MELODIC_MINOR_MODE_NAMES: [&str; 7] = [
    "Melodic Minor",
    "Dorian b2",
    "Lydian Augmented",
    "Lydian Dominant",
    "Mixolydian b6",
    "Locrian Nat2",
    "Altered",
];

#[derive(Clone, Copy)]
enum ModeFamily {
    Major,
    HarmonicMinor,
    MelodicMinor,
}

fn mode_family_rotation(name: &str) -> Option<(ModeFamily, usize)> {
    match name {
        "Major" | "Ionian" => Some((ModeFamily::Major, 0)),
        "Dorian" => Some((ModeFamily::Major, 1)),
        "Phrygian" => Some((ModeFamily::Major, 2)),
        "Lydian" => Some((ModeFamily::Major, 3)),
        "Mixolydian" => Some((ModeFamily::Major, 4)),
        "Natural Minor" | "Aeolian" => Some((ModeFamily::Major, 5)),
        "Locrian" => Some((ModeFamily::Major, 6)),
        "Harmonic Minor" => Some((ModeFamily::HarmonicMinor, 0)),
        "Locrian Nat6" => Some((ModeFamily::HarmonicMinor, 1)),
        "Ionian Augmented" => Some((ModeFamily::HarmonicMinor, 2)),
        "Dorian #4" => Some((ModeFamily::HarmonicMinor, 3)),
        "Phrygian Dominant" => Some((ModeFamily::HarmonicMinor, 4)),
        "Lydian #2" => Some((ModeFamily::HarmonicMinor, 5)),
        "Super Locrian bb7" => Some((ModeFamily::HarmonicMinor, 6)),
        "Melodic Minor" => Some((ModeFamily::MelodicMinor, 0)),
        "Dorian b2" => Some((ModeFamily::MelodicMinor, 1)),
        "Lydian Augmented" => Some((ModeFamily::MelodicMinor, 2)),
        "Lydian Dominant" => Some((ModeFamily::MelodicMinor, 3)),
        "Mixolydian b6" => Some((ModeFamily::MelodicMinor, 4)),
        "Locrian Nat2" => Some((ModeFamily::MelodicMinor, 5)),
        "Altered" => Some((ModeFamily::MelodicMinor, 6)),
        _ => None,
    }
}

fn mode_family_names(family: ModeFamily) -> &'static [&'static str; 7] {
    match family {
        ModeFamily::Major => &MAJOR_MODE_NAMES,
        ModeFamily::HarmonicMinor => &HARMONIC_MINOR_MODE_NAMES,
        ModeFamily::MelodicMinor => &MELODIC_MINOR_MODE_NAMES,
    }
}

fn canonical_mode_name(name: &str) -> &str {
    match name {
        "Major" => "Ionian",
        "Natural Minor" => "Aeolian",
        other => other,
    }
}

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
        Scale {
            root,
            name,
            intervals,
        }
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

        Scale {
            root: new_root,
            name,
            intervals,
        }
    }

    /// Nom du mode à un degré donné — affichage uniquement.
    /// Les familles modales se nomment en rotation depuis le centre modal courant.
    pub fn mode_name(&self, degree: usize) -> &'static str {
        match mode_family_rotation(self.name) {
            Some((family, rotation)) if degree < mode_family_names(family).len() => {
                mode_family_names(family)[(rotation + degree) % mode_family_names(family).len()]
            }
            _ => self.name,
        }
    }

    /// Quel degré de cette scale correspond à une root donnée?
    /// Retourne None si la root n'est pas dans la scale.
    pub fn degree_of(&self, root: PitchClass) -> Option<usize> {
        self.pitch_classes().iter().position(|&pc| pc == root)
    }
}

fn base_scale_for_family(family: ModeFamily, root: PitchClass) -> Scale {
    match family {
        ModeFamily::Major => ionian_scale(root),
        ModeFamily::HarmonicMinor => harmonic_minor_scale(root),
        ModeFamily::MelodicMinor => melodic_minor_scale(root),
    }
}

pub fn compatible_mode_family(scale: &Scale) -> Option<Vec<Scale>> {
    let (family, rotation) = mode_family_rotation(scale.name)?;
    let pitch_classes = scale.pitch_classes();
    let mode_names = mode_family_names(family);

    if pitch_classes.len() != mode_names.len() {
        return None;
    }

    let parent_root = pitch_classes[(pitch_classes.len() - rotation) % pitch_classes.len()];
    let parent_scale = base_scale_for_family(family, parent_root);
    let mut family_scales: Vec<Scale> = (0..mode_names.len())
        .map(|degree| parent_scale.mode(degree))
        .collect();

    let current_name = canonical_mode_name(scale.name);
    if let Some(index) = family_scales
        .iter()
        .position(|candidate| candidate.root == scale.root && candidate.name == current_name)
    {
        family_scales.rotate_left(index);
    }

    Some(family_scales)
}

pub fn compatible_major_mode_family(scale: &Scale) -> Option<Vec<Scale>> {
    compatible_mode_family(scale)
}

// --- Scales de base ---

use crate::core::intervals::*;

/// Major scale (Ionian) — W W H W W W H
pub fn major_scale(root: PitchClass) -> Scale {
    Scale::new(
        root,
        "Major",
        vec![
            MAJOR_SECOND,
            MAJOR_THIRD,
            PERFECT_FOURTH,
            PERFECT_FIFTH,
            MAJOR_SIXTH,
            MAJOR_SEVENTH,
        ],
    )
}

/// Ionian — W W H W W W H
pub fn ionian_scale(root: PitchClass) -> Scale {
    Scale::new(
        root,
        "Ionian",
        vec![
            MAJOR_SECOND,
            MAJOR_THIRD,
            PERFECT_FOURTH,
            PERFECT_FIFTH,
            MAJOR_SIXTH,
            MAJOR_SEVENTH,
        ],
    )
}

/// Dorian — W H W W W H W
pub fn dorian_scale(root: PitchClass) -> Scale {
    Scale::new(
        root,
        "Dorian",
        vec![
            MAJOR_SECOND,
            MINOR_THIRD,
            PERFECT_FOURTH,
            PERFECT_FIFTH,
            MAJOR_SIXTH,
            MINOR_SEVENTH,
        ],
    )
}

/// Phrygian — H W W W H W W
pub fn phrygian_scale(root: PitchClass) -> Scale {
    Scale::new(
        root,
        "Phrygian",
        vec![
            MINOR_SECOND,
            MINOR_THIRD,
            PERFECT_FOURTH,
            PERFECT_FIFTH,
            MINOR_SIXTH,
            MINOR_SEVENTH,
        ],
    )
}

/// Lydian — W W W H W W H
pub fn lydian_scale(root: PitchClass) -> Scale {
    Scale::new(
        root,
        "Lydian",
        vec![
            MAJOR_SECOND,
            MAJOR_THIRD,
            TRITONE,
            PERFECT_FIFTH,
            MAJOR_SIXTH,
            MAJOR_SEVENTH,
        ],
    )
}

/// Mixolydian — W W H W W H W
pub fn mixolydian_scale(root: PitchClass) -> Scale {
    Scale::new(
        root,
        "Mixolydian",
        vec![
            MAJOR_SECOND,
            MAJOR_THIRD,
            PERFECT_FOURTH,
            PERFECT_FIFTH,
            MAJOR_SIXTH,
            MINOR_SEVENTH,
        ],
    )
}

/// Aeolian — W H W W H W W
pub fn aeolian_scale(root: PitchClass) -> Scale {
    Scale::new(
        root,
        "Aeolian",
        vec![
            MAJOR_SECOND,
            MINOR_THIRD,
            PERFECT_FOURTH,
            PERFECT_FIFTH,
            MINOR_SIXTH,
            MINOR_SEVENTH,
        ],
    )
}

/// Locrian — H W W H W W W
pub fn locrian_scale(root: PitchClass) -> Scale {
    Scale::new(
        root,
        "Locrian",
        vec![
            MINOR_SECOND,
            MINOR_THIRD,
            PERFECT_FOURTH,
            TRITONE,
            MINOR_SIXTH,
            MINOR_SEVENTH,
        ],
    )
}

/// 2nd mode of harmonic minor
pub fn locrian_nat6_scale(root: PitchClass) -> Scale {
    Scale::new(
        root,
        "Locrian Nat6",
        vec![
            MINOR_SECOND,
            MINOR_THIRD,
            PERFECT_FOURTH,
            TRITONE,
            MAJOR_SIXTH,
            MINOR_SEVENTH,
        ],
    )
}

/// 3rd mode of harmonic minor
pub fn ionian_augmented_scale(root: PitchClass) -> Scale {
    Scale::new(
        root,
        "Ionian Augmented",
        vec![
            MAJOR_SECOND,
            MAJOR_THIRD,
            PERFECT_FOURTH,
            MINOR_SIXTH,
            MAJOR_SIXTH,
            MAJOR_SEVENTH,
        ],
    )
}

/// 4th mode of harmonic minor
pub fn dorian_sharp_four_scale(root: PitchClass) -> Scale {
    Scale::new(
        root,
        "Dorian #4",
        vec![
            MAJOR_SECOND,
            MINOR_THIRD,
            TRITONE,
            PERFECT_FIFTH,
            MAJOR_SIXTH,
            MINOR_SEVENTH,
        ],
    )
}

/// 5th mode of harmonic minor
pub fn phrygian_dominant_scale(root: PitchClass) -> Scale {
    Scale::new(
        root,
        "Phrygian Dominant",
        vec![
            MINOR_SECOND,
            MAJOR_THIRD,
            PERFECT_FOURTH,
            PERFECT_FIFTH,
            MINOR_SIXTH,
            MINOR_SEVENTH,
        ],
    )
}

/// 6th mode of harmonic minor
pub fn lydian_sharp_two_scale(root: PitchClass) -> Scale {
    Scale::new(
        root,
        "Lydian #2",
        vec![
            MINOR_THIRD,
            MAJOR_THIRD,
            TRITONE,
            PERFECT_FIFTH,
            MAJOR_SIXTH,
            MAJOR_SEVENTH,
        ],
    )
}

/// 7th mode of harmonic minor
pub fn super_locrian_bb7_scale(root: PitchClass) -> Scale {
    Scale::new(
        root,
        "Super Locrian bb7",
        vec![
            MINOR_SECOND,
            MINOR_THIRD,
            MAJOR_THIRD,
            TRITONE,
            MINOR_SIXTH,
            MAJOR_SIXTH,
        ],
    )
}

/// Natural minor scale (Aeolian) — W H W W H W W
pub fn natural_minor_scale(root: PitchClass) -> Scale {
    Scale::new(
        root,
        "Natural Minor",
        vec![
            MAJOR_SECOND,
            MINOR_THIRD,
            PERFECT_FOURTH,
            PERFECT_FIFTH,
            MINOR_SIXTH,
            MINOR_SEVENTH,
        ],
    )
}

/// Harmonic minor — W H W W H WH H
pub fn harmonic_minor_scale(root: PitchClass) -> Scale {
    Scale::new(
        root,
        "Harmonic Minor",
        vec![
            MAJOR_SECOND,
            MINOR_THIRD,
            PERFECT_FOURTH,
            PERFECT_FIFTH,
            MINOR_SIXTH,
            MAJOR_SEVENTH,
        ],
    )
}

/// Melodic minor (ascending) — W H W W W W H
pub fn melodic_minor_scale(root: PitchClass) -> Scale {
    Scale::new(
        root,
        "Melodic Minor",
        vec![
            MAJOR_SECOND,
            MINOR_THIRD,
            PERFECT_FOURTH,
            PERFECT_FIFTH,
            MAJOR_SIXTH,
            MAJOR_SEVENTH,
        ],
    )
}

/// 2nd mode of melodic minor
pub fn dorian_flat_two_scale(root: PitchClass) -> Scale {
    Scale::new(
        root,
        "Dorian b2",
        vec![
            MINOR_SECOND,
            MINOR_THIRD,
            PERFECT_FOURTH,
            PERFECT_FIFTH,
            MAJOR_SIXTH,
            MINOR_SEVENTH,
        ],
    )
}

/// 3rd mode of melodic minor
pub fn lydian_augmented_scale(root: PitchClass) -> Scale {
    Scale::new(
        root,
        "Lydian Augmented",
        vec![
            MAJOR_SECOND,
            MAJOR_THIRD,
            TRITONE,
            MINOR_SIXTH,
            MAJOR_SIXTH,
            MAJOR_SEVENTH,
        ],
    )
}

/// 4th mode of melodic minor
pub fn lydian_dominant_scale(root: PitchClass) -> Scale {
    Scale::new(
        root,
        "Lydian Dominant",
        vec![
            MAJOR_SECOND,
            MAJOR_THIRD,
            TRITONE,
            PERFECT_FIFTH,
            MAJOR_SIXTH,
            MINOR_SEVENTH,
        ],
    )
}

/// 5th mode of melodic minor
pub fn mixolydian_flat_six_scale(root: PitchClass) -> Scale {
    Scale::new(
        root,
        "Mixolydian b6",
        vec![
            MAJOR_SECOND,
            MAJOR_THIRD,
            PERFECT_FOURTH,
            PERFECT_FIFTH,
            MINOR_SIXTH,
            MINOR_SEVENTH,
        ],
    )
}

/// 6th mode of melodic minor
pub fn locrian_nat_two_scale(root: PitchClass) -> Scale {
    Scale::new(
        root,
        "Locrian Nat2",
        vec![
            MAJOR_SECOND,
            MINOR_THIRD,
            PERFECT_FOURTH,
            TRITONE,
            MINOR_SIXTH,
            MINOR_SEVENTH,
        ],
    )
}

/// 7th mode of melodic minor
pub fn altered_scale(root: PitchClass) -> Scale {
    Scale::new(
        root,
        "Altered",
        vec![
            MINOR_SECOND,
            MINOR_THIRD,
            MAJOR_THIRD,
            TRITONE,
            MINOR_SIXTH,
            MINOR_SEVENTH,
        ],
    )
}

pub fn named_scale(root: PitchClass, name: &str) -> Option<Scale> {
    Some(match name {
        "Major" => major_scale(root),
        "Ionian" => ionian_scale(root),
        "Dorian" => dorian_scale(root),
        "Phrygian" => phrygian_scale(root),
        "Lydian" => lydian_scale(root),
        "Mixolydian" => mixolydian_scale(root),
        "Natural Minor" | "Aeolian" => aeolian_scale(root),
        "Locrian" => locrian_scale(root),
        "Harmonic Minor" => harmonic_minor_scale(root),
        "Locrian Nat6" => locrian_nat6_scale(root),
        "Ionian Augmented" => ionian_augmented_scale(root),
        "Dorian #4" => dorian_sharp_four_scale(root),
        "Phrygian Dominant" => phrygian_dominant_scale(root),
        "Lydian #2" => lydian_sharp_two_scale(root),
        "Super Locrian bb7" => super_locrian_bb7_scale(root),
        "Melodic Minor" => melodic_minor_scale(root),
        "Dorian b2" => dorian_flat_two_scale(root),
        "Lydian Augmented" => lydian_augmented_scale(root),
        "Lydian Dominant" => lydian_dominant_scale(root),
        "Mixolydian b6" => mixolydian_flat_six_scale(root),
        "Locrian Nat2" => locrian_nat_two_scale(root),
        "Altered" => altered_scale(root),
        "Pentatonic Major" => pentatonic_major_scale(root),
        "Pentatonic Minor" => pentatonic_minor_scale(root),
        "Blues" => blues_scale(root),
        _ => return None,
    })
}

/// Pentatonic major — 5 notes
pub fn pentatonic_major_scale(root: PitchClass) -> Scale {
    Scale::new(
        root,
        "Pentatonic Major",
        vec![MAJOR_SECOND, MAJOR_THIRD, PERFECT_FIFTH, MAJOR_SIXTH],
    )
}

/// Pentatonic minor — 5 notes
pub fn pentatonic_minor_scale(root: PitchClass) -> Scale {
    Scale::new(
        root,
        "Pentatonic Minor",
        vec![MINOR_THIRD, PERFECT_FOURTH, PERFECT_FIFTH, MINOR_SEVENTH],
    )
}

/// Blues scale — pentatonique mineur + blue note (tritone)
pub fn blues_scale(root: PitchClass) -> Scale {
    Scale::new(
        root,
        "Blues",
        vec![
            MINOR_THIRD,
            PERFECT_FOURTH,
            TRITONE,
            PERFECT_FIFTH,
            MINOR_SEVENTH,
        ],
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::notes::PitchClass;

    fn c() -> PitchClass {
        PitchClass::new(0)
    }

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
    fn harmonic_minor_has_7_notes() {
        assert_eq!(harmonic_minor_scale(c()).note_count(), 7);
    }

    #[test]
    fn harmonic_minor_raises_the_seventh() {
        assert!(harmonic_minor_scale(c()).contains(PitchClass::new(11)));
        assert!(!harmonic_minor_scale(c()).contains(PitchClass::new(10)));
    }

    #[test]
    fn melodic_minor_has_7_notes() {
        assert_eq!(melodic_minor_scale(c()).note_count(), 7);
    }

    #[test]
    fn melodic_minor_raises_sixth_and_seventh() {
        let scale = melodic_minor_scale(c());
        assert!(scale.contains(PitchClass::new(9)));
        assert!(scale.contains(PitchClass::new(11)));
        assert!(!scale.contains(PitchClass::new(8)));
        assert!(!scale.contains(PitchClass::new(10)));
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
    fn d_dorian_matches_second_mode_of_c_major() {
        let from_mode = major_scale(c()).mode(1);
        let direct = dorian_scale(PitchClass::new(2));
        assert_eq!(from_mode.pitch_classes(), direct.pitch_classes());
        assert_eq!(direct.name, "Dorian");
    }

    #[test]
    fn e_phrygian_contains_flat_second() {
        let scale = phrygian_scale(PitchClass::new(4));
        let notes: Vec<_> = scale
            .pitch_classes()
            .into_iter()
            .map(|pc| pc.name())
            .collect();
        assert_eq!(notes, vec!["E", "F", "G", "A", "B", "C", "D"]);
    }

    #[test]
    fn g_mixolydian_contains_flat_seventh() {
        let scale = mixolydian_scale(PitchClass::new(7));
        let notes: Vec<_> = scale
            .pitch_classes()
            .into_iter()
            .map(|pc| pc.name())
            .collect();
        assert_eq!(notes, vec!["G", "A", "B", "C", "D", "E", "F"]);
    }

    #[test]
    fn modal_mode_names_rotate_from_current_mode() {
        let scale = dorian_scale(PitchClass::new(2));
        assert_eq!(scale.mode_name(0), "Dorian");
        assert_eq!(scale.mode_name(1), "Phrygian");
        assert_eq!(scale.mode_name(5), "Locrian");
        assert_eq!(scale.mode_name(6), "Ionian");
    }

    #[test]
    fn degree_of_finds_correct_position() {
        let scale = major_scale(c());
        assert_eq!(scale.degree_of(PitchClass::new(0)), Some(0)); // C = degree 0
        assert_eq!(scale.degree_of(PitchClass::new(9)), Some(5)); // A = degree 5
        assert_eq!(scale.degree_of(PitchClass::new(6)), None); // F# pas dans C major
    }

    #[test]
    fn compatible_major_mode_family_from_a_ionian_lists_relative_modes() {
        let family = compatible_major_mode_family(&ionian_scale(PitchClass::new(9)))
            .expect("ionian family should exist");

        let labels: Vec<String> = family
            .iter()
            .map(|scale| format!("{} {}", scale.root.name(), scale.name))
            .collect();

        assert_eq!(
            labels,
            vec![
                "A Ionian",
                "B Dorian",
                "C# Phrygian",
                "D Lydian",
                "E Mixolydian",
                "F# Aeolian",
                "G# Locrian",
            ]
        );
    }

    #[test]
    fn compatible_major_mode_family_starts_from_current_modal_center() {
        let family = compatible_major_mode_family(&dorian_scale(PitchClass::new(11)))
            .expect("dorian family should exist");

        assert_eq!(family[0].root.name(), "B");
        assert_eq!(family[0].name, "Dorian");
        assert_eq!(family[1].root.name(), "C#");
        assert_eq!(family[1].name, "Phrygian");
        assert_eq!(family[6].root.name(), "A");
        assert_eq!(family[6].name, "Ionian");
    }

    #[test]
    fn compatible_mode_family_from_a_harmonic_minor_lists_relative_modes() {
        let family = compatible_mode_family(&harmonic_minor_scale(PitchClass::new(9)))
            .expect("harmonic minor family should exist");

        let labels: Vec<String> = family
            .iter()
            .map(|scale| format!("{} {}", scale.root.name(), scale.name))
            .collect();

        assert_eq!(
            labels,
            vec![
                "A Harmonic Minor",
                "B Locrian Nat6",
                "C Ionian Augmented",
                "D Dorian #4",
                "E Phrygian Dominant",
                "F Lydian #2",
                "G# Super Locrian bb7",
            ]
        );
    }

    #[test]
    fn compatible_mode_family_from_a_melodic_minor_lists_relative_modes() {
        let family = compatible_mode_family(&melodic_minor_scale(PitchClass::new(9)))
            .expect("melodic minor family should exist");

        let labels: Vec<String> = family
            .iter()
            .map(|scale| format!("{} {}", scale.root.name(), scale.name))
            .collect();

        assert_eq!(
            labels,
            vec![
                "A Melodic Minor",
                "B Dorian b2",
                "C Lydian Augmented",
                "D Lydian Dominant",
                "E Mixolydian b6",
                "F# Locrian Nat2",
                "G# Altered",
            ]
        );
    }

    #[test]
    fn named_scale_builds_derived_harmonic_minor_and_melodic_minor_modes() {
        let harmonic = named_scale(PitchClass::new(4), "Phrygian Dominant")
            .expect("phrygian dominant should build");
        let melodic = named_scale(PitchClass::new(7), "Lydian Dominant")
            .expect("lydian dominant should build");

        assert_eq!(harmonic.name, "Phrygian Dominant");
        assert_eq!(
            harmonic
                .pitch_classes()
                .into_iter()
                .map(|pc| pc.name())
                .collect::<Vec<_>>(),
            vec!["E", "F", "G#", "A", "B", "C", "D"]
        );
        assert_eq!(melodic.name, "Lydian Dominant");
        assert_eq!(
            melodic
                .pitch_classes()
                .into_iter()
                .map(|pc| pc.name())
                .collect::<Vec<_>>(),
            vec!["G", "A", "B", "C#", "D", "E", "F"]
        );
    }
}
