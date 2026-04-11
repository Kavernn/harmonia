use crate::harmony::chord::Chord;
use crate::harmony::scale::Scale;
use crate::progression::diatonic::diatonic_chords;

/// Un accord dans une progression — degré + accord construit
#[derive(Debug, Clone)]
pub struct ProgressionChord {
    pub degree: usize,
    pub roman: &'static str,
    pub chord: Chord,
    pub display_name: String,
    pub quality: String,
}

/// Une progression nommée — liste de degrés + nom
#[derive(Debug, Clone)]
pub struct NamedProgression {
    pub name: &'static str,
    pub degrees: Vec<usize>,
    pub feel: &'static str,
}

/// Bibliothèque de progressions communes
pub fn common_progressions() -> Vec<NamedProgression> {
    vec![
        NamedProgression { name: "I – IV – V – I",     degrees: vec![0, 3, 4, 0], feel: "Classic rock / blues" },
        NamedProgression { name: "I – V – vi – IV",    degrees: vec![0, 4, 5, 3], feel: "Pop anthem" },
        NamedProgression { name: "ii – V – I",         degrees: vec![1, 4, 0],    feel: "Jazz cadence" },
        NamedProgression { name: "I – IV – vi – V",    degrees: vec![0, 3, 5, 4], feel: "Melodic rock" },
        NamedProgression { name: "vi – IV – I – V",    degrees: vec![5, 3, 0, 4], feel: "Minor feel / emotional" },
        NamedProgression { name: "I – iii – IV – V",   degrees: vec![0, 2, 3, 4], feel: "Lift / pre-chorus" },
        NamedProgression { name: "i – VII – VI – VII", degrees: vec![0, 6, 5, 6], feel: "Heavy / Aeolian" },
        NamedProgression { name: "I – IV – I – V",     degrees: vec![0, 3, 0, 4], feel: "12-bar blues core" },
    ]
}

/// Construit une progression depuis une liste de degrés (0-based) et une scale.
/// Les degrés hors range sont ignorés silencieusement.
pub fn build_progression(scale: &Scale, degrees: &[usize]) -> Vec<ProgressionChord> {
    let diatonic = diatonic_chords(scale);
    let len = diatonic.len();

    degrees.iter()
        .filter(|&&d| d < len)
        .map(|&d| {
            let dc = &diatonic[d];
            ProgressionChord {
                degree:       dc.degree,
                roman:        dc.roman,
                chord:        dc.chord.clone(),
                display_name: dc.display_name(),
                quality:      dc.quality.label().to_string(),
            }
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::notes::PitchClass;
    use crate::harmony::scale::major_scale;

    fn c() -> PitchClass { PitchClass::new(0) }

    #[test]
    fn i_iv_v_i_gives_4_chords() {
        let prog = build_progression(&major_scale(c()), &[0, 3, 4, 0]);
        assert_eq!(prog.len(), 4);
    }

    #[test]
    fn i_iv_v_i_correct_names() {
        let prog = build_progression(&major_scale(c()), &[0, 3, 4, 0]);
        assert_eq!(prog[0].display_name, "C");
        assert_eq!(prog[1].display_name, "F");
        assert_eq!(prog[2].display_name, "G");
        assert_eq!(prog[3].display_name, "C");
    }

    #[test]
    fn out_of_range_degrees_are_ignored() {
        let prog = build_progression(&major_scale(c()), &[0, 99, 4]);
        assert_eq!(prog.len(), 2);
    }

    #[test]
    fn common_progressions_are_non_empty() {
        assert!(!common_progressions().is_empty());
    }

    #[test]
    fn all_common_progressions_build_on_c_major() {
        let scale = major_scale(c());
        for np in common_progressions() {
            let prog = build_progression(&scale, &np.degrees);
            assert!(!prog.is_empty(), "progression '{}' produced no chords", np.name);
        }
    }
}
