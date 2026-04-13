use crate::core::intervals::{
    MAJOR_SECOND, MAJOR_SEVENTH, MAJOR_SIXTH, MAJOR_THIRD, MINOR_SECOND, MINOR_SEVENTH,
    MINOR_SIXTH, MINOR_THIRD, PERFECT_FIFTH, PERFECT_FOURTH, TRITONE,
};
use crate::core::notes::PitchClass;
use crate::harmony::chord::Chord;
use crate::harmony::scale::Scale;
use crate::progression::builder::ProgressionChord;

#[derive(Debug, Clone)]
pub struct ModalGuidance {
    pub characteristic_tones: Vec<PitchClass>,
    pub modal_avoid_tones: Vec<PitchClass>,
    pub resolution_tones: Vec<PitchClass>,
    pub guidance: &'static str,
}

#[derive(Debug, Clone)]
pub struct ContextualModalGuidance {
    pub focus_tones: Vec<PitchClass>,
    pub release_tones: Vec<PitchClass>,
    pub guidance: String,
}

/// Notes disponibles pour une mélodie ou un solo sur un accord donné.
/// Classées par priorité : chord tones d'abord, puis scale tones.
#[derive(Debug, Clone)]
pub struct SoloNotes {
    pub chord_tones: Vec<PitchClass>, // Notes de l'accord — priorité haute
    pub scale_tones: Vec<PitchClass>, // Notes de la scale pas dans l'accord
    pub avoid_notes: Vec<PitchClass>, // Notes hors scale — à éviter
    pub characteristic_tones: Vec<PitchClass>,
    pub modal_avoid_tones: Vec<PitchClass>,
    pub resolution_tones: Vec<PitchClass>,
    pub guidance: &'static str,
}

impl SoloNotes {
    /// Toutes les notes utilisables (chord + scale), dans l'ordre de priorité
    pub fn all_usable(&self) -> Vec<PitchClass> {
        let mut notes = self.chord_tones.clone();
        notes.extend(&self.scale_tones);
        notes
    }
}

fn modal_tones(scale: &Scale, intervals: &[crate::core::intervals::Interval]) -> Vec<PitchClass> {
    intervals
        .iter()
        .map(|interval| scale.root.apply(*interval))
        .filter(|pitch_class| scale.contains(*pitch_class))
        .collect()
}

pub fn modal_guidance(scale: &Scale) -> ModalGuidance {
    match scale.name {
        "Major" | "Ionian" => ModalGuidance {
            characteristic_tones: modal_tones(scale, &[MAJOR_SEVENTH]),
            modal_avoid_tones: modal_tones(scale, &[PERFECT_FOURTH]),
            resolution_tones: vec![scale.root, scale.root.apply(MAJOR_THIRD)],
            guidance: "Ionian: fais entendre la 7 majeure, mais évite de tenir la 4 sur les appuis forts; résous vers 1 ou 3.",
        },
        "Dorian" => ModalGuidance {
            characteristic_tones: modal_tones(scale, &[MAJOR_SIXTH]),
            modal_avoid_tones: vec![],
            resolution_tones: modal_tones(scale, &[PERFECT_FIFTH]),
            guidance: "Dorian: la 6 majeure signe la couleur; fais-la chanter puis repose-toi sur la quinte.",
        },
        "Phrygian" => ModalGuidance {
            characteristic_tones: modal_tones(scale, &[MINOR_SECOND]),
            modal_avoid_tones: vec![],
            resolution_tones: vec![scale.root],
            guidance: "Phrygian: la b2 est la vraie tension modale; effleure-la puis résous-la sur la tonique.",
        },
        "Lydian" => ModalGuidance {
            characteristic_tones: modal_tones(scale, &[TRITONE]),
            modal_avoid_tones: vec![],
            resolution_tones: modal_tones(scale, &[PERFECT_FIFTH]),
            guidance: "Lydian: la #4 ouvre la couleur; laisse-la flotter puis résous-la sur la quinte.",
        },
        "Mixolydian" => ModalGuidance {
            characteristic_tones: modal_tones(scale, &[MINOR_SEVENTH]),
            modal_avoid_tones: modal_tones(scale, &[PERFECT_FOURTH]),
            resolution_tones: vec![scale.root, scale.root.apply(MAJOR_THIRD)],
            guidance: "Mixolydian: la b7 donne la saveur dominante; évite de bloquer sur la 4 et résous vers 1 ou 3.",
        },
        "Natural Minor" | "Aeolian" => ModalGuidance {
            characteristic_tones: modal_tones(scale, &[MINOR_SIXTH]),
            modal_avoid_tones: vec![],
            resolution_tones: modal_tones(scale, &[PERFECT_FIFTH]),
            guidance: "Aeolian: mets la b6 en valeur pour la couleur mineure naturelle, puis repose-toi sur la quinte.",
        },
        "Locrian" => ModalGuidance {
            characteristic_tones: modal_tones(scale, &[MINOR_SECOND, TRITONE]),
            modal_avoid_tones: vec![],
            resolution_tones: vec![scale.root],
            guidance: "Locrian: la b2 et la b5 racontent le mode; fais-les entendre brièvement puis retombe sur la tonique.",
        },
        "Harmonic Minor" => ModalGuidance {
            characteristic_tones: modal_tones(scale, &[MAJOR_SEVENTH]),
            modal_avoid_tones: vec![],
            resolution_tones: vec![scale.root],
            guidance: "Mineur harmonique: la 7 majeure crée l'appel vers la tonique; tends puis résous sur 1.",
        },
        "Locrian Nat6" => ModalGuidance {
            characteristic_tones: modal_tones(scale, &[TRITONE, MAJOR_SIXTH]),
            modal_avoid_tones: vec![],
            resolution_tones: vec![scale.root],
            guidance: "Locrian Nat6: fais entendre la b5 et la 6 majeure pour marquer la couleur, puis repose-toi sur la tonique.",
        },
        "Ionian Augmented" => ModalGuidance {
            characteristic_tones: modal_tones(scale, &[MINOR_SIXTH]),
            modal_avoid_tones: vec![],
            resolution_tones: vec![scale.root, scale.root.apply(MAJOR_THIRD)],
            guidance: "Ionian Augmented: la #5 ouvre l'espace harmonique; fais-la briller puis retombe sur 1 ou 3.",
        },
        "Dorian #4" => ModalGuidance {
            characteristic_tones: modal_tones(scale, &[TRITONE, MAJOR_SIXTH]),
            modal_avoid_tones: vec![],
            resolution_tones: modal_tones(scale, &[PERFECT_FIFTH]),
            guidance: "Dorian #4: la #4 donne l'éclat et la 6 garde l'assise dorienne; résous vers la quinte.",
        },
        "Phrygian Dominant" => ModalGuidance {
            characteristic_tones: modal_tones(scale, &[MINOR_SECOND, MAJOR_THIRD]),
            modal_avoid_tones: vec![],
            resolution_tones: vec![scale.root, scale.root.apply(PERFECT_FIFTH)],
            guidance: "Phrygian Dominant: la b2 et la 3 majeure signent immédiatement le mode; tends puis repose sur 1 ou 5.",
        },
        "Lydian #2" => ModalGuidance {
            characteristic_tones: modal_tones(scale, &[MINOR_THIRD, TRITONE]),
            modal_avoid_tones: vec![],
            resolution_tones: vec![scale.root, scale.root.apply(PERFECT_FIFTH)],
            guidance: "Lydian #2: la #2 et la #4 créent une couleur très ouverte; fais-les entendre puis pose-toi sur 1 ou 5.",
        },
        "Super Locrian bb7" => ModalGuidance {
            characteristic_tones: modal_tones(scale, &[MINOR_SECOND, TRITONE]),
            modal_avoid_tones: vec![],
            resolution_tones: vec![scale.root],
            guidance: "Super Locrian bb7: garde la tension serrée avec la b2 et la b5, puis reviens vite sur la tonique.",
        },
        "Melodic Minor" => ModalGuidance {
            characteristic_tones: modal_tones(scale, &[MAJOR_SIXTH, MAJOR_SEVENTH]),
            modal_avoid_tones: vec![],
            resolution_tones: vec![scale.root],
            guidance: "Mineur mélodique: la 6 et la 7 majeures lissent la tension; reviens vers la tonique pour conclure.",
        },
        "Dorian b2" => ModalGuidance {
            characteristic_tones: modal_tones(scale, &[MINOR_SECOND, MAJOR_SIXTH]),
            modal_avoid_tones: vec![],
            resolution_tones: modal_tones(scale, &[PERFECT_FIFTH]),
            guidance: "Dorian b2: fais entendre la b2 sans perdre la 6 majeure; résous vers la quinte.",
        },
        "Lydian Augmented" => ModalGuidance {
            characteristic_tones: modal_tones(scale, &[TRITONE, MINOR_SIXTH]),
            modal_avoid_tones: vec![],
            resolution_tones: vec![scale.root, scale.root.apply(MAJOR_THIRD)],
            guidance: "Lydian Augmented: la #4 et la #5 donnent la couleur; fais-les chanter puis stabilise sur 1 ou 3.",
        },
        "Lydian Dominant" => ModalGuidance {
            characteristic_tones: modal_tones(scale, &[TRITONE, MINOR_SEVENTH]),
            modal_avoid_tones: vec![],
            resolution_tones: vec![scale.root, scale.root.apply(MAJOR_THIRD)],
            guidance: "Lydian Dominant: la #4 et la b7 créent la tension dominante moderne; résous vers 1 ou 3.",
        },
        "Mixolydian b6" => ModalGuidance {
            characteristic_tones: modal_tones(scale, &[MINOR_SIXTH, MINOR_SEVENTH]),
            modal_avoid_tones: modal_tones(scale, &[PERFECT_FOURTH]),
            resolution_tones: modal_tones(scale, &[PERFECT_FIFTH]),
            guidance: "Mixolydian b6: fais sonner la b6 avec la b7, mais ne reste pas sur la 4; retombe sur la quinte.",
        },
        "Locrian Nat2" => ModalGuidance {
            characteristic_tones: modal_tones(scale, &[MAJOR_SECOND, TRITONE]),
            modal_avoid_tones: vec![],
            resolution_tones: vec![scale.root],
            guidance: "Locrian Nat2: la 2 naturelle allège le mode, mais la b5 reste la vraie couleur; reviens sur la tonique.",
        },
        "Altered" => ModalGuidance {
            characteristic_tones: modal_tones(scale, &[MINOR_SECOND, TRITONE, MINOR_SIXTH]),
            modal_avoid_tones: vec![],
            resolution_tones: vec![scale.root, scale.root.apply(MAJOR_THIRD)],
            guidance: "Altered: serre la tension avec b9, b5 et #5, puis stabilise-la sur 1 ou 3.",
        },
        "Pentatonic Major" | "Pentatonic Minor" => ModalGuidance {
            characteristic_tones: vec![],
            modal_avoid_tones: vec![],
            resolution_tones: vec![scale.root],
            guidance: "Pentatonique: pas de frottement modal fort, vise surtout les notes d'accord et la tonique.",
        },
        "Blues" => ModalGuidance {
            characteristic_tones: modal_tones(scale, &[TRITONE]),
            modal_avoid_tones: vec![],
            resolution_tones: modal_tones(scale, &[PERFECT_FIFTH]),
            guidance: "Blues: la blue note colore la ligne; tends-la puis résous-la sur la quinte.",
        },
        _ => ModalGuidance {
            characteristic_tones: vec![],
            modal_avoid_tones: vec![],
            resolution_tones: vec![scale.root],
            guidance: "Fais entendre la tonique et les notes d'accord avant les couleurs.",
        },
    }
}

fn preferred_modal_tones(
    preferred: &[PitchClass],
    chord_tones: &[PitchClass],
    fallback: PitchClass,
) -> Vec<PitchClass> {
    if preferred.is_empty() {
        return vec![fallback];
    }

    let matching_chord_tones: Vec<PitchClass> = preferred
        .iter()
        .copied()
        .filter(|pitch_class| chord_tones.contains(pitch_class))
        .collect();

    if matching_chord_tones.is_empty() {
        preferred.to_vec()
    } else {
        matching_chord_tones
    }
}

fn note_names(notes: &[PitchClass]) -> String {
    match notes {
        [] => String::new(),
        [note] => note.name().to_string(),
        _ => notes
            .iter()
            .map(|note| note.name().to_string())
            .collect::<Vec<_>>()
            .join(" ou "),
    }
}

pub fn contextual_modal_guidance(
    step: &ProgressionChord,
    scale: &Scale,
) -> ContextualModalGuidance {
    let modal = modal_guidance(scale);
    let chord_tones = step.chord.pitch_classes();
    let focus_tones =
        preferred_modal_tones(&modal.characteristic_tones, &chord_tones, step.chord.root);
    let release_tones =
        preferred_modal_tones(&modal.resolution_tones, &chord_tones, step.chord.root);
    let focus_label = note_names(&focus_tones);
    let release_label = note_names(&release_tones);

    let guidance = match scale.name {
        "Major" | "Ionian" => format!(
            "Sur {}, fais entendre {} puis stabilise sur {}.",
            step.roman, focus_label, release_label,
        ),
        "Dorian" => format!(
            "Sur {}, vise {} puis retombe sur {} pour garder la couleur dorienne.",
            step.roman, focus_label, release_label,
        ),
        "Phrygian" => format!(
            "Sur {}, effleure {} puis résous sur {}.",
            step.roman, focus_label, release_label,
        ),
        "Lydian" => format!(
            "Sur {}, ouvre la ligne avec {} puis pose-la sur {}.",
            step.roman, focus_label, release_label,
        ),
        "Mixolydian" => format!(
            "Sur {}, fais sonner {} puis repose-toi sur {}.",
            step.roman, focus_label, release_label,
        ),
        "Natural Minor" | "Aeolian" => format!(
            "Sur {}, colore avec {} puis repose-toi sur {}.",
            step.roman, focus_label, release_label,
        ),
        "Locrian" => format!(
            "Sur {}, fais passer {} brièvement puis reviens sur {}.",
            step.roman, focus_label, release_label,
        ),
        "Harmonic Minor" => format!(
            "Sur {}, tends avec {} puis conclus sur {}.",
            step.roman, focus_label, release_label,
        ),
        "Melodic Minor" => format!(
            "Sur {}, fais ressortir {} puis retombe sur {}.",
            step.roman, focus_label, release_label,
        ),
        "Phrygian Dominant" => format!(
            "Sur {}, fais sonner {} puis pose la phrase sur {} pour garder la couleur phrygienne dominante.",
            step.roman, focus_label, release_label,
        ),
        "Lydian Dominant" => format!(
            "Sur {}, ouvre avec {} puis stabilise sur {}.",
            step.roman, focus_label, release_label,
        ),
        "Altered" => format!(
            "Sur {}, tends fort avec {} puis relâche vers {}.",
            step.roman, focus_label, release_label,
        ),
        "Lydian Augmented" => format!(
            "Sur {}, fais briller {} puis repose-toi sur {}.",
            step.roman, focus_label, release_label,
        ),
        _ => format!(
            "Sur {}, vise {} puis repose-toi sur {}.",
            step.roman, focus_label, release_label,
        ),
    };

    ContextualModalGuidance {
        focus_tones,
        release_tones,
        guidance,
    }
}

/// Calcule les notes disponibles pour un solo sur un accord dans le contexte d'une scale.
pub fn solo_notes_for_chord(chord: &Chord, scale: &Scale) -> SoloNotes {
    let chord_pcs: Vec<PitchClass> = chord.pitch_classes();
    let scale_pcs: Vec<PitchClass> = scale.pitch_classes();
    let modal = modal_guidance(scale);

    let scale_tones: Vec<PitchClass> = scale_pcs
        .iter()
        .copied()
        .filter(|pc| !chord_pcs.contains(pc))
        .collect();

    let all_notes: Vec<PitchClass> = (0..12).map(PitchClass::new).collect();
    let avoid_notes: Vec<PitchClass> = all_notes
        .iter()
        .copied()
        .filter(|pc| !scale_pcs.contains(pc))
        .collect();

    SoloNotes {
        chord_tones: chord_pcs,
        scale_tones,
        avoid_notes,
        characteristic_tones: modal.characteristic_tones,
        modal_avoid_tones: modal.modal_avoid_tones,
        resolution_tones: modal.resolution_tones,
        guidance: modal.guidance,
    }
}

/// Calcule les notes de solo pour chaque accord d'une progression.
pub fn solo_notes_for_progression(
    progression: &[ProgressionChord],
    scale: &Scale,
) -> Vec<SoloNotes> {
    progression
        .iter()
        .map(|pc| solo_notes_for_chord(&pc.chord, scale))
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::notes::PitchClass;
    use crate::harmony::chord::major_chord;
    use crate::harmony::scale::{dorian_scale, major_scale, mixolydian_scale, phrygian_scale};
    use crate::progression::builder::{build_progression, build_progression_from_steps};

    fn c() -> PitchClass {
        PitchClass::new(0)
    }

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
                assert!(
                    notes.all_usable().contains(ct),
                    "chord tone {:?} missing from usable at step {}",
                    ct,
                    i
                );
            }
        }
    }

    #[test]
    fn usable_notes_exactly_cover_the_scale_context() {
        let scale = major_scale(c());
        let scale_pcs = scale.pitch_classes();
        let prog = build_progression(&scale, &[0, 3, 4, 0]);
        let solo = solo_notes_for_progression(&prog, &scale);

        for notes in solo {
            let usable = notes.all_usable();
            assert_eq!(usable.len(), scale_pcs.len());
            for pitch_class in &scale_pcs {
                assert!(usable.contains(pitch_class));
            }
        }
    }

    #[test]
    fn avoid_notes_never_overlap_with_usable_notes() {
        let scale = major_scale(c());
        let prog = build_progression(&scale, &[0, 3, 4, 0]);
        let solo = solo_notes_for_progression(&prog, &scale);

        for notes in solo {
            let usable = notes.all_usable();
            assert!(notes
                .avoid_notes
                .iter()
                .all(|pitch_class| !usable.contains(pitch_class)));
        }
    }

    #[test]
    fn ionian_marks_four_as_modal_avoid_and_seven_as_characteristic() {
        let notes = solo_notes_for_chord(&major_chord(c()), &major_scale(c()));
        assert!(notes.characteristic_tones.contains(&PitchClass::new(11)));
        assert!(notes.modal_avoid_tones.contains(&PitchClass::new(5)));
        assert!(notes.resolution_tones.contains(&PitchClass::new(0)));
        assert!(notes.resolution_tones.contains(&PitchClass::new(4)));
    }

    #[test]
    fn dorian_surfaces_major_sixth_as_signature() {
        let notes = solo_notes_for_chord(
            &major_chord(PitchClass::new(2)),
            &dorian_scale(PitchClass::new(2)),
        );
        assert!(notes.characteristic_tones.contains(&PitchClass::new(11)));
        assert!(notes.modal_avoid_tones.is_empty());
        assert!(notes.resolution_tones.contains(&PitchClass::new(9)));
    }

    #[test]
    fn phrygian_surfaces_flat_second_for_modal_pull() {
        let modal = modal_guidance(&phrygian_scale(PitchClass::new(4)));
        assert_eq!(modal.characteristic_tones, vec![PitchClass::new(5)]);
        assert_eq!(modal.resolution_tones, vec![PitchClass::new(4)]);
    }

    #[test]
    fn mixolydian_marks_flat_seventh_and_fourth_guidance() {
        let modal = modal_guidance(&mixolydian_scale(PitchClass::new(7)));
        assert!(modal.characteristic_tones.contains(&PitchClass::new(5)));
        assert!(modal.modal_avoid_tones.contains(&PitchClass::new(0)));
        assert!(modal.resolution_tones.contains(&PitchClass::new(7)));
        assert!(modal.resolution_tones.contains(&PitchClass::new(11)));
    }

    #[test]
    fn contextual_dorian_guidance_targets_six_then_five_on_four_chord() {
        let scale = dorian_scale(PitchClass::new(2));
        let progression = build_progression_from_steps(&scale, &["IV".to_string()]);
        let guidance = contextual_modal_guidance(&progression[0], &scale);

        assert_eq!(guidance.focus_tones, vec![PitchClass::new(11)]);
        assert_eq!(guidance.release_tones, vec![PitchClass::new(9)]);
        assert!(guidance.guidance.contains("vise B"));
        assert!(guidance.guidance.contains("A"));
    }

    #[test]
    fn contextual_phrygian_guidance_points_flat_second_back_to_root() {
        let scale = phrygian_scale(PitchClass::new(4));
        let progression = build_progression_from_steps(&scale, &["i".to_string()]);
        let guidance = contextual_modal_guidance(&progression[0], &scale);

        assert_eq!(guidance.focus_tones, vec![PitchClass::new(5)]);
        assert_eq!(guidance.release_tones, vec![PitchClass::new(4)]);
        assert!(guidance.guidance.contains("F"));
        assert!(guidance.guidance.contains("E"));
    }
}
