use crate::core::notes::PitchClass;
use crate::core::tuning::Tuning;

/// Une note sur le manche — corde + frette
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct FretPosition {
    pub string: usize,     // 0 = corde la plus grave
    pub fret: u8,          // 0 = corde à vide
    pub pitch_class: PitchClass,
    pub is_chord_tone: bool,
}

/// Calcule toutes les positions sur le manche pour un ensemble de notes.
///
/// `fret_range` : plage de frettes à couvrir (ex: 0..=12)
/// `chord_tones` : notes de l'accord (affichées différemment)
/// `scale_tones` : notes de la scale (affichées comme notes de passage)
pub fn fret_positions(
    tuning: &Tuning,
    chord_tones: &[PitchClass],
    scale_tones: &[PitchClass],
    max_fret: u8,
) -> Vec<FretPosition> {
    let all_notes: Vec<(PitchClass, bool)> = chord_tones.iter()
        .map(|&pc| (pc, true))
        .chain(scale_tones.iter().map(|&pc| (pc, false)))
        .collect();

    let mut positions = Vec::new();

    for (string_idx, &open_note) in tuning.strings.iter().enumerate() {
        for fret in 0..=max_fret {
            let note_at_fret = PitchClass::new(open_note.value() + fret);
            for &(pc, is_chord_tone) in &all_notes {
                if note_at_fret == pc {
                    positions.push(FretPosition {
                        string: string_idx,
                        fret,
                        pitch_class: pc,
                        is_chord_tone,
                    });
                }
            }
        }
    }

    positions
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::tuning::standard;
    use crate::core::notes::PitchClass;

    fn c() -> PitchClass { PitchClass::new(0) }
    fn e() -> PitchClass { PitchClass::new(4) }
    fn g() -> PitchClass { PitchClass::new(7) }

    #[test]
    fn c_major_triad_has_positions_on_all_strings() {
        let tuning = standard();
        let positions = fret_positions(&tuning, &[c(), e(), g()], &[], 12);
        let strings_used: std::collections::HashSet<usize> =
            positions.iter().map(|p| p.string).collect();
        assert_eq!(strings_used.len(), 6);
    }

    #[test]
    fn open_e_string_fret_0_is_e() {
        let tuning = standard();
        // Corde 0 (low E) à vide = E (pitch class 4)
        let positions = fret_positions(&tuning, &[e()], &[], 0);
        assert!(positions.iter().any(|p| p.string == 0 && p.fret == 0));
    }

    #[test]
    fn chord_tones_are_flagged_correctly() {
        let tuning = standard();
        let positions = fret_positions(&tuning, &[c()], &[e()], 12);
        let c_pos: Vec<_> = positions.iter().filter(|p| p.pitch_class == c()).collect();
        let e_pos: Vec<_> = positions.iter().filter(|p| p.pitch_class == e()).collect();
        assert!(c_pos.iter().all(|p| p.is_chord_tone));
        assert!(e_pos.iter().all(|p| !p.is_chord_tone));
    }

    #[test]
    fn no_positions_beyond_max_fret() {
        let tuning = standard();
        let positions = fret_positions(&tuning, &[c(), e(), g()], &[], 5);
        assert!(positions.iter().all(|p| p.fret <= 5));
    }

    #[test]
    fn fret_count_is_reasonable_for_c_major_scale() {
        let tuning = standard();
        let scale_notes: Vec<PitchClass> = [0,2,4,5,7,9,11].iter().map(|&n| PitchClass::new(n)).collect();
        let positions = fret_positions(&tuning, &[], &scale_notes, 12);
        // 7 notes × 6 cordes × environ 2 positions par octave = beaucoup
        assert!(positions.len() > 20);
    }
}