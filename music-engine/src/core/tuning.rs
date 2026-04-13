use crate::core::notes::PitchClass;

/// Un tuning guitare = les pitch classes des cordes à vide, de la plus grave à la plus aiguë.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Tuning {
    pub name: &'static str,
    /// Cordes de la plus grave (index 0) à la plus aiguë
    pub strings: Vec<PitchClass>,
}

impl Tuning {
    pub fn new(name: &'static str, strings: Vec<PitchClass>) -> Tuning {
        Tuning { name, strings }
    }

    pub fn string_count(&self) -> usize {
        self.strings.len()
    }

    pub fn transpose(&self, semitones: i8, name: &'static str) -> Tuning {
        Tuning {
            name,
            strings: self
                .strings
                .iter()
                .map(|pc| {
                    PitchClass::new((pc.value() as i16 + semitones as i16).rem_euclid(12) as u8)
                })
                .collect(),
        }
    }
}

/// E Standard — EADGBE
pub fn standard() -> Tuning {
    Tuning {
        name: "Standard (EADGBE)",
        strings: vec![
            PitchClass::new(4),  // E
            PitchClass::new(9),  // A
            PitchClass::new(2),  // D
            PitchClass::new(7),  // G
            PitchClass::new(11), // B
            PitchClass::new(4),  // E
        ],
    }
}

/// Drop D — DADGBE
pub fn drop_d() -> Tuning {
    Tuning {
        name: "Drop D (DADGBE)",
        strings: vec![
            PitchClass::new(2),  // D
            PitchClass::new(9),  // A
            PitchClass::new(2),  // D
            PitchClass::new(7),  // G
            PitchClass::new(11), // B
            PitchClass::new(4),  // E
        ],
    }
}

/// Open G — DGDGBD
pub fn open_g() -> Tuning {
    Tuning {
        name: "Open G (DGDGBD)",
        strings: vec![
            PitchClass::new(2),  // D
            PitchClass::new(7),  // G
            PitchClass::new(2),  // D
            PitchClass::new(7),  // G
            PitchClass::new(11), // B
            PitchClass::new(2),  // D
        ],
    }
}

/// 7-string standard — BEADGBE
pub fn standard_7() -> Tuning {
    Tuning {
        name: "7-String Standard (BEADGBE)",
        strings: vec![
            PitchClass::new(11), // B
            PitchClass::new(4),  // E
            PitchClass::new(9),  // A
            PitchClass::new(2),  // D
            PitchClass::new(7),  // G
            PitchClass::new(11), // B
            PitchClass::new(4),  // E
        ],
    }
}

pub fn custom(strings: Vec<u8>) -> Tuning {
    Tuning {
        name: "Custom",
        strings: strings.into_iter().map(PitchClass::new).collect(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn standard_has_6_strings() {
        assert_eq!(standard().string_count(), 6);
    }

    #[test]
    fn standard_lowest_string_is_e() {
        assert_eq!(standard().strings[0].name(), "E");
    }

    #[test]
    fn drop_d_lowest_string_is_d() {
        assert_eq!(drop_d().strings[0].name(), "D");
    }

    #[test]
    fn open_g_lowest_string_is_d() {
        assert_eq!(open_g().strings[0].name(), "D");
    }

    #[test]
    fn standard_highest_string_is_e() {
        let s = standard();
        assert_eq!(s.strings[s.string_count() - 1].name(), "E");
    }

    #[test]
    fn standard_7_has_7_strings() {
        assert_eq!(standard_7().string_count(), 7);
    }

    #[test]
    fn transpose_standard_down_one_is_eb() {
        let tuning = standard().transpose(-1, "Eb Standard");
        assert_eq!(tuning.strings[0].name(), "D#");
        assert_eq!(tuning.strings[tuning.string_count() - 1].name(), "D#");
    }

    #[test]
    fn custom_tuning_keeps_order() {
        let tuning = custom(vec![11, 4, 9, 2, 7, 11, 4]);
        assert_eq!(tuning.string_count(), 7);
        assert_eq!(tuning.strings[0].name(), "B");
        assert_eq!(tuning.strings[6].name(), "E");
    }
}
