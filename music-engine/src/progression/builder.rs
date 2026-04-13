use crate::core::intervals::PERFECT_FIFTH;
use crate::core::notes::PitchClass;
use crate::harmony::chord::{augmented_chord, diminished_chord, major_chord, minor_chord, Chord};
use crate::harmony::scale::Scale;
use crate::progression::diatonic::diatonic_chords;

/// Un accord dans une progression — degré + accord construit
#[derive(Debug, Clone)]
pub struct ProgressionChord {
    pub degree: usize,
    pub roman: String,
    pub chord: Chord,
    pub display_name: String,
    pub quality: String,
    pub harmonic_role: String,
    pub target_step: Option<String>,
    pub target_note: Option<PitchClass>,
    pub outside_harmony_tones: Vec<PitchClass>,
}

/// Une progression nommée — liste de fonctions harmoniques + nom
#[derive(Debug, Clone)]
pub struct NamedProgression {
    pub name: &'static str,
    pub steps: Vec<String>,
    pub feel: &'static str,
}

#[derive(Debug, Clone)]
pub struct ProgressionStepOption {
    pub token: String,
    pub family: String,
}

fn named_progression(name: &'static str, steps: &[&str], feel: &'static str) -> NamedProgression {
    NamedProgression {
        name,
        steps: steps.iter().map(|step| (*step).to_string()).collect(),
        feel,
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum ParsedQuality {
    Major,
    Minor,
    Diminished,
    Augmented,
}

impl ParsedQuality {
    fn label(self) -> &'static str {
        match self {
            ParsedQuality::Major => "major",
            ParsedQuality::Minor => "minor",
            ParsedQuality::Diminished => "diminished",
            ParsedQuality::Augmented => "augmented",
        }
    }

    fn build(self, root: PitchClass) -> Chord {
        match self {
            ParsedQuality::Major => major_chord(root),
            ParsedQuality::Minor => minor_chord(root),
            ParsedQuality::Diminished => diminished_chord(root),
            ParsedQuality::Augmented => augmented_chord(root),
        }
    }

    fn display_name(self, root: PitchClass) -> String {
        match self {
            ParsedQuality::Major => root.name().to_string(),
            ParsedQuality::Minor => format!("{}m", root.name()),
            ParsedQuality::Diminished => format!("{}dim", root.name()),
            ParsedQuality::Augmented => format!("{}+", root.name()),
        }
    }
}

#[derive(Debug, Clone)]
struct ParsedStep {
    degree: usize,
    root: PitchClass,
    quality: ParsedQuality,
    harmonic_role: &'static str,
    target_step: Option<String>,
    target_note: Option<PitchClass>,
}

/// Bibliothèque de progressions communes, y compris quelques couleurs non diatoniques utiles.
pub fn common_progressions() -> Vec<NamedProgression> {
    vec![
        named_progression(
            "I – IV – V – I",
            &["I", "IV", "V", "I"],
            "Classic rock / blues",
        ),
        named_progression("I – V – vi – IV", &["I", "V", "vi", "IV"], "Pop anthem"),
        named_progression("ii – V – I", &["ii", "V", "I"], "Jazz cadence"),
        named_progression(
            "i – iv – V – i",
            &["i", "iv", "V", "i"],
            "Minor cadence / harmonic pull",
        ),
        named_progression(
            "I – iv – I – V",
            &["I", "iv", "I", "V"],
            "Borrowed iv / cinematic",
        ),
        named_progression(
            "I – bVII – IV – I",
            &["I", "bVII", "IV", "I"],
            "Modal interchange / rock",
        ),
        named_progression(
            "ii – V/V – V – I",
            &["ii", "V/V", "V", "I"],
            "Secondary dominant pull",
        ),
        named_progression(
            "i – bVII – bVI – V",
            &["i", "bVII", "bVI", "V"],
            "Heavy minor / Aeolian to dominant",
        ),
    ]
}

pub fn suggested_progressions(scale: &Scale) -> Vec<NamedProgression> {
    let mut progressions = common_progressions();

    match scale.name {
        "Ionian" | "Major" => {
            progressions.push(named_progression(
                "ii – V vamp",
                &["ii", "V", "ii", "V"],
                "Dorian / Mixolydian practice over the major family",
            ));
        }
        "Dorian" => {
            progressions.push(named_progression(
                "i – IV dorian vamp",
                &["i", "IV", "i", "IV"],
                "Hear the major 6 over a minor center",
            ));
        }
        "Phrygian" => {
            progressions.push(named_progression(
                "i – II phrygian vamp",
                &["i", "II", "i", "II"],
                "Flat 2 pull back to the tonic",
            ));
        }
        "Lydian" => {
            progressions.push(named_progression(
                "I – II lydian vamp",
                &["I", "II", "I", "II"],
                "Sharp 4 color without leaving the mode",
            ));
        }
        "Mixolydian" => {
            progressions.push(named_progression(
                "I – VII – IV mixolydian",
                &["I", "VII", "IV", "I"],
                "Flat 7 dominant color with a rock cadence",
            ));
        }
        "Aeolian" | "Natural Minor" => {
            progressions.push(named_progression(
                "i – VII – VI – VII",
                &["i", "VII", "VI", "VII"],
                "Natural minor loop for dark melodic lines",
            ));
        }
        "Harmonic Minor" => {
            progressions.push(named_progression(
                "V – VI – V – i",
                &["V", "VI", "V", "i"],
                "Phrygian Dominant focus on V before resolving to i",
            ));
            progressions.push(named_progression(
                "III+ – VI – V – i",
                &["III+", "VI", "V", "i"],
                "Ionian Augmented then dominant pull back home",
            ));
            progressions.push(named_progression(
                "i – VI – V – i",
                &["i", "VI", "V", "i"],
                "Classical harmonic minor gravity",
            ));
        }
        "Melodic Minor" => {
            progressions.push(named_progression(
                "IV – i lydian dominant",
                &["IV", "i", "IV", "i"],
                "Lydian Dominant spotlight over IV before the tonic",
            ));
            progressions.push(named_progression(
                "ii – V – i",
                &["ii", "V", "i"],
                "Dorian b2 into melodic minor tonic",
            ));
            progressions.push(named_progression(
                "V – IV – i",
                &["V", "IV", "i"],
                "Mixolydian b6 toward Lydian Dominant then home",
            ));
        }
        _ => {}
    }

    progressions
}

fn pitch_with_shift(root: PitchClass, shift: i8) -> PitchClass {
    PitchClass::new(((root.value() as i16 + shift as i16).rem_euclid(12)) as u8)
}

fn roman_degree(roman: &str) -> Option<usize> {
    match roman {
        "I" => Some(0),
        "II" => Some(1),
        "III" => Some(2),
        "IV" => Some(3),
        "V" => Some(4),
        "VI" => Some(5),
        "VII" => Some(6),
        _ => None,
    }
}

fn parse_simple_step(scale: &Scale, token: &str) -> Option<(usize, PitchClass, ParsedQuality)> {
    let mut accidental_shift = 0_i8;
    let mut body = token.trim();

    while let Some(rest) = body.strip_prefix('b') {
        accidental_shift -= 1;
        body = rest;
    }
    while let Some(rest) = body.strip_prefix('#') {
        accidental_shift += 1;
        body = rest;
    }

    let (quality, roman_body) = if let Some(rest) = body.strip_suffix("dim") {
        (ParsedQuality::Diminished, rest)
    } else if let Some(rest) = body.strip_suffix('°') {
        (ParsedQuality::Diminished, rest)
    } else if let Some(rest) = body.strip_suffix("aug") {
        (ParsedQuality::Augmented, rest)
    } else if let Some(rest) = body.strip_suffix('+') {
        (ParsedQuality::Augmented, rest)
    } else if body.chars().any(|character| character.is_ascii_lowercase()) {
        (ParsedQuality::Minor, body)
    } else {
        (ParsedQuality::Major, body)
    };

    let degree = roman_degree(&roman_body.to_ascii_uppercase())?;
    let diatonic_root = *scale.pitch_classes().get(degree)?;
    Some((
        degree,
        pitch_with_shift(diatonic_root, accidental_shift),
        quality,
    ))
}

fn parse_secondary_dominant(scale: &Scale, token: &str) -> Option<ParsedStep> {
    let (source, target) = token.split_once('/')?;
    if source.trim() != "V" {
        return None;
    }

    let target_step = target.trim().to_string();
    let (target_degree, target_root, _) = parse_simple_step(scale, &target_step)?;
    let dominant_root = target_root.apply(PERFECT_FIFTH);
    Some(ParsedStep {
        degree: target_degree,
        root: dominant_root,
        quality: ParsedQuality::Major,
        harmonic_role: "secondary_dominant",
        target_step: Some(target_step),
        target_note: Some(target_root),
    })
}

fn is_diatonic_step(
    scale: &Scale,
    degree: usize,
    root: PitchClass,
    quality: ParsedQuality,
) -> bool {
    diatonic_chords(scale)
        .get(degree)
        .map(|reference| {
            reference.chord.root == root && reference.quality.label() == quality.label()
        })
        .unwrap_or(false)
}

fn parse_progression_step(scale: &Scale, token: &str) -> Option<ParsedStep> {
    if let Some(parsed) = parse_secondary_dominant(scale, token) {
        return Some(parsed);
    }

    let (degree, root, quality) = parse_simple_step(scale, token)?;
    let harmonic_role = if is_diatonic_step(scale, degree, root, quality) {
        "diatonic"
    } else {
        "borrowed"
    };

    Some(ParsedStep {
        degree,
        root,
        quality,
        harmonic_role,
        target_step: None,
        target_note: None,
    })
}

fn progression_chord_from_step(scale: &Scale, token: &str) -> Option<ProgressionChord> {
    let parsed = parse_progression_step(scale, token)?;
    let chord = parsed.quality.build(parsed.root);
    let scale_pcs = scale.pitch_classes();
    let outside_harmony_tones: Vec<PitchClass> = chord
        .pitch_classes()
        .into_iter()
        .filter(|pitch_class| !scale_pcs.contains(pitch_class))
        .collect();

    Some(ProgressionChord {
        degree: parsed.degree,
        roman: token.to_string(),
        display_name: parsed.quality.display_name(parsed.root),
        quality: parsed.quality.label().to_string(),
        harmonic_role: parsed.harmonic_role.to_string(),
        target_step: parsed.target_step,
        target_note: parsed.target_note,
        outside_harmony_tones,
        chord,
    })
}

/// Construit une progression depuis une liste de symboles harmoniques.
/// Supporte les degrés diatoniques, quelques emprunts (ex: iv, bVII) et V/x.
pub fn build_progression_from_steps(scale: &Scale, steps: &[String]) -> Vec<ProgressionChord> {
    steps
        .iter()
        .filter_map(|step| progression_chord_from_step(scale, step))
        .collect()
}

/// Construit une progression depuis une liste de degrés diatoniques (compat rétro).
pub fn build_progression(scale: &Scale, degrees: &[usize]) -> Vec<ProgressionChord> {
    let diatonic = diatonic_chords(scale);
    let steps: Vec<String> = degrees
        .iter()
        .filter_map(|degree| diatonic.get(*degree).map(|chord| chord.roman.clone()))
        .collect();
    build_progression_from_steps(scale, &steps)
}

pub fn progression_step_options(scale: &Scale) -> Vec<ProgressionStepOption> {
    let mut options: Vec<ProgressionStepOption> = diatonic_chords(scale)
        .into_iter()
        .map(|chord| ProgressionStepOption {
            token: chord.roman,
            family: "diatonic".to_string(),
        })
        .collect();

    let advanced_tokens = [
        "iv", "IV", "bVII", "bVI", "bIII", "I", "V", "V/ii", "V/iii", "V/IV", "V/V", "V/vi",
        "V/III", "V/iv", "V/VI", "V/VII",
    ];

    for token in advanced_tokens {
        let Some(chord) = progression_chord_from_step(scale, token) else {
            continue;
        };

        if chord.harmonic_role == "diatonic" || options.iter().any(|option| option.token == token) {
            continue;
        }

        options.push(ProgressionStepOption {
            token: token.to_string(),
            family: chord.harmonic_role,
        });
    }

    options
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::notes::PitchClass;
    use crate::harmony::scale::{
        dorian_scale, harmonic_minor_scale, major_scale, melodic_minor_scale,
    };
    use crate::progression::diatonic::diatonic_chords;

    fn c() -> PitchClass {
        PitchClass::new(0)
    }
    fn a() -> PitchClass {
        PitchClass::new(9)
    }

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
    fn suggested_progressions_include_harmonic_minor_mode_lab_presets() {
        let suggestions = suggested_progressions(&harmonic_minor_scale(a()));
        let labels: Vec<&str> = suggestions
            .iter()
            .map(|progression| progression.name)
            .collect();

        assert!(labels.contains(&"V – VI – V – i"));
        assert!(labels.contains(&"III+ – VI – V – i"));
        assert!(labels.contains(&"i – VI – V – i"));
    }

    #[test]
    fn suggested_progressions_include_melodic_minor_mode_lab_presets() {
        let suggestions = suggested_progressions(&melodic_minor_scale(a()));
        let labels: Vec<&str> = suggestions
            .iter()
            .map(|progression| progression.name)
            .collect();

        assert!(labels.contains(&"IV – i lydian dominant"));
        assert!(labels.contains(&"ii – V – i"));
        assert!(labels.contains(&"V – IV – i"));
    }

    #[test]
    fn all_common_progressions_build_on_c_major() {
        let scale = major_scale(c());
        for np in common_progressions() {
            let prog = build_progression_from_steps(&scale, &np.steps);
            assert!(
                !prog.is_empty(),
                "progression '{}' produced no chords",
                np.name
            );
        }
    }

    #[test]
    fn suggested_harmonic_minor_progressions_build_on_a_harmonic_minor() {
        let scale = harmonic_minor_scale(a());
        for progression in suggested_progressions(&scale) {
            let built = build_progression_from_steps(&scale, &progression.steps);
            assert!(
                !built.is_empty(),
                "suggested progression '{}' produced no chords",
                progression.name
            );
        }
    }

    #[test]
    fn suggested_melodic_minor_progressions_build_on_a_melodic_minor() {
        let scale = melodic_minor_scale(a());
        for progression in suggested_progressions(&scale) {
            let built = build_progression_from_steps(&scale, &progression.steps);
            assert!(
                !built.is_empty(),
                "suggested progression '{}' produced no chords",
                progression.name
            );
        }
    }

    #[test]
    fn diatonic_builder_matches_reference_chords() {
        let scale = major_scale(c());
        let diatonic = diatonic_chords(&scale);
        let prog = build_progression(&scale, &[0, 1, 2, 3, 4, 5, 6]);

        for chord in prog {
            let reference = &diatonic[chord.degree];
            assert_eq!(chord.roman, reference.roman);
            assert_eq!(chord.display_name, reference.display_name());
            assert_eq!(chord.quality, reference.quality.label());
            assert_eq!(chord.chord.pitch_classes(), reference.chord.pitch_classes());
        }
    }

    #[test]
    fn borrowed_flat_seven_builds_major_chord_outside_the_scale() {
        let scale = major_scale(c());
        let prog = build_progression_from_steps(
            &scale,
            &["I".to_string(), "bVII".to_string(), "IV".to_string()],
        );

        assert_eq!(prog[1].roman, "bVII");
        assert_eq!(prog[1].display_name, "A#");
        assert_eq!(prog[1].quality, "major");
        assert_eq!(prog[1].harmonic_role, "borrowed");
        assert_eq!(prog[1].outside_harmony_tones, vec![PitchClass::new(10)]);
    }

    #[test]
    fn secondary_dominant_resolves_to_target_degree() {
        let scale = major_scale(c());
        let prog = build_progression_from_steps(
            &scale,
            &[
                "ii".to_string(),
                "V/V".to_string(),
                "V".to_string(),
                "I".to_string(),
            ],
        );

        assert_eq!(prog[1].roman, "V/V");
        assert_eq!(prog[1].display_name, "D");
        assert_eq!(prog[1].quality, "major");
        assert_eq!(prog[1].harmonic_role, "secondary_dominant");
        assert_eq!(prog[1].target_step.as_deref(), Some("V"));
        assert_eq!(prog[1].target_note, Some(PitchClass::new(7)));
        assert_eq!(prog[1].outside_harmony_tones, vec![PitchClass::new(6)]);
    }

    #[test]
    fn harmonic_minor_keeps_major_five() {
        let scale = harmonic_minor_scale(a());
        let prog = build_progression_from_steps(
            &scale,
            &[
                "i".to_string(),
                "iv".to_string(),
                "V".to_string(),
                "i".to_string(),
            ],
        );

        assert_eq!(prog[2].display_name, "E");
        assert_eq!(prog[2].quality, "major");
        assert_eq!(prog[2].harmonic_role, "diatonic");
    }

    #[test]
    fn progression_step_options_include_advanced_colors() {
        let scale = major_scale(c());
        let options = progression_step_options(&scale);

        assert!(options
            .iter()
            .any(|option| option.token == "iv" && option.family == "borrowed"));
        assert!(options
            .iter()
            .any(|option| option.token == "V/V" && option.family == "secondary_dominant"));
    }

    #[test]
    fn dorian_progressions_build_from_modal_tonic() {
        let scale = dorian_scale(PitchClass::new(2));
        let progression =
            build_progression_from_steps(&scale, &["i".to_string(), "IV".to_string()]);

        assert_eq!(progression.len(), 2);
        assert_eq!(progression[0].display_name, "Dm");
        assert_eq!(progression[1].display_name, "G");
        assert!(progression
            .iter()
            .all(|step| step.harmonic_role == "diatonic"));
    }

    #[test]
    fn dorian_step_options_surface_modal_degree_qualities() {
        let scale = dorian_scale(PitchClass::new(2));
        let options = progression_step_options(&scale);

        assert!(options
            .iter()
            .any(|option| option.token == "i" && option.family == "diatonic"));
        assert!(options
            .iter()
            .any(|option| option.token == "IV" && option.family == "diatonic"));
        assert!(options
            .iter()
            .any(|option| option.token == "vi°" && option.family == "diatonic"));
    }
}
