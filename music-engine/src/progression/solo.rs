use crate::core::notes::PitchClass;
use crate::harmony::chord::Chord;
use crate::harmony::scale::Scale;
use crate::progression::builder::ProgressionChord;

/// Notes disponibles pour une mélodie ou un solo sur un accord donné.
/// Classées par priorité : chord tones d'abord, puis scale tones.
#[derive(Debug, Clone)]
pub struct SoloNotes {
    pub chord_tones: Vec<PitchClass>,  // Notes de l'accord — priorité haute
    pub scale_tones: Vec<PitchClass>,  // Notes de la scale pas dans l'accord
    pub avoid_notes: Vec<PitchClass>,  // Notes hors scale — à éviter
}

impl SoloNotes {
    /// Toutes les notes utilisables (chord + scale), dans l'ordre de priorité
    pub fn all_usable(&self) -> Vec<PitchClass> {
        let mut notes = self.chord_tones.clone();
        notes.extend(&self.scale_tones);
        notes
    }
}

/// Calcule les notes disponibles pour un solo sur un accord dans le contexte d'une scale.
pub fn solo_notes_for_chord(chord: &Chord, scale: &Scale) -> SoloNotes {
    let chord_pcs: Vec<PitchClass> = chord.pitch_classes();
    let scale_pcs: Vec<PitchClass> = scale.pitch_classes();

    let scale_tones: Vec<PitchClass> = scale_pcs.iter()
        .copied()
        .filter(|pc| !chord_pcs.contains(pc))
        .collect();

    let all_notes: Vec<PitchClass> = (0..12).map(PitchClass::new).collect();
    let avoid_notes: Vec<PitchClass> = all_notes.iter()
        .copied()
        .filter(|pc| !scale_pcs.contains(pc))
        .collect();

    SoloNotes { chord_tones: chord_pcs, scale_tones, avoid_notes }
}

/// Calcule les notes de solo pour chaque accord d'une progression.
pub fn solo_notes_for_progression(
    progression: &[ProgressionChord],
    scale: &Scale,
) -> Vec<SoloNotes> {
    progression.iter()
        .map(|pc| solo_notes_for_chord(&pc.chord, scale))
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::notes::PitchClass;
    use crate::harmony::chord::major_chord;
    use crate::harmony::scale::major_scale;
    use crate::progression::builder::build_progression;

    fn c() -> PitchClass { PitchClass::new(0) }

    #[test]
    fn c_major_chord_in_c_major_scale_has_3_chord_tones() {
        let notes = solo_notes_for_chord(&major_chord(c()), &major_scale(c()));
        assert_eq!(notes.chord_tones.len(), 3);
    }

    #[test]
    fn c_major_chord_in_c_major_scale_has_4_scale_tones() {
        let notes = solo_notes_for_chord(&major_chord(c()), &major_scale(c()));
        assert_eq!(notes.scale_tones.len(), 4);
    }

    #[test]
    fn avoid_notes_are_outside_scale() {
        let notes = solo_notes_for_chord(&major_chord(c()), &major_scale(c()));
        assert_eq!(notes.avoid_notes.len(), 5);
    }

    #[test]
    fn all_usable_is_chord_tones_first() {
        let notes = solo_notes_for_chord(&major_chord(c()), &major_scale(c()));
        let usable = notes.all_usable();
        assert_eq!(usable[0], PitchClass::new(0)); // C
        assert_eq!(usable[1], PitchClass::new(4)); // E
        assert_eq!(usable[2], PitchClass::new(7)); // G
    }

    #[test]
    fn progression_solo_notes_count_matches_progression_length() {
        let scale = major_scale(c());
        let prog = build_progression(&scale, &[0, 3, 4, 0]);
        let solo = solo_notes_for_progression(&prog, &scale);
        assert_eq!(solo.len(), prog.len());
    }

    #[test]
    fn chord_tones_are_always_in_usable() {
        let scale = major_scale(c());
        let prog = build_progression(&scale, &[0, 3, 4]);
        let solo = solo_notes_for_progression(&prog, &scale);
        for (i, notes) in solo.iter().enumerate() {
            for ct in &notes.chord_tones {
                assert!(notes.all_usable().contains(ct),
                    "chord tone {:?} missing from usable at step {}", ct, i);
            }
        }
    }
}