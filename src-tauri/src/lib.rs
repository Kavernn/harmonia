use music_engine::api::{
  note, build_chord, analyze_chord, diatonic_chords,
  build_progression, common_progressions,
  solo_notes_for_chord,
  fret_positions, tuning_standard, tuning_custom,
  beat_pattern, common_beat_patterns, BeatFeel, BeatStyle,
  ChordQuality, ConfidenceLevel,
};
use music_engine::harmony::scale::{
  major_scale, natural_minor_scale,
  pentatonic_major_scale, pentatonic_minor_scale, blues_scale,
};
use music_engine::core::notes::PitchClass;
use serde::{Deserialize, Serialize};

// --- DTOs ---

#[derive(Serialize)]
pub struct DetectedModeDto {
  pub name: String,
  pub degree: usize,
  pub root: String,
}

#[derive(Serialize)]
pub struct ScaleSuggestionDto {
  pub scale_name: String,
  pub scale_root: String,
  pub confidence: String,
  pub matching_notes: Vec<String>,
  pub outside_notes: Vec<String>,
  pub reason: String,
  pub notes: Vec<String>,
  pub mode: Option<DetectedModeDto>,
}

#[derive(Serialize)]
pub struct DiatonicChordDto {
  pub degree: usize,
  pub roman: String,
  pub display_name: String,
  pub quality: String,
  pub notes: Vec<String>,
}

#[derive(Serialize)]
pub struct NamedProgressionDto {
  pub name: String,
  pub degrees: Vec<usize>,
  pub feel: String,
}

#[derive(Serialize)]
pub struct ProgressionChordDto {
  pub degree: usize,
  pub roman: String,
  pub display_name: String,
  pub quality: String,
  pub chord_tones: Vec<String>,
  pub scale_tones: Vec<String>,
}

#[derive(Serialize)]
pub struct FretPositionDto {
    pub string: usize,
    pub fret: u8,
    pub note: String,
    pub is_chord_tone: bool,
    pub is_root: bool,    // ← nouveau
    pub is_avoid: bool,   // ← nouveau
}

#[derive(Serialize)]
pub struct BeatStepEventDto {
    pub step: u8,
    pub voice: String,
    pub velocity: u8,
}

#[derive(Serialize)]
pub struct BeatPatternDto {
    pub name: String,
    pub style: String,
    pub style_id: String,
    pub steps_per_bar: u8,
    pub swing: u8,
    pub events: Vec<BeatStepEventDto>,
}

// --- Requests ---

#[derive(Deserialize)]
pub struct AnalyzeChordRequest {
  pub root: u8,
  pub quality: String,
  pub min_confidence: Option<String>,
}

#[derive(Deserialize)]
pub struct DiatonicRequest {
  pub scale_root: u8,
  pub scale_name: String,
}

#[derive(Deserialize)]
pub struct BuildProgressionRequest {
  pub scale_root: u8,
  pub scale_name: String,
  pub degrees: Vec<usize>,
}

#[derive(Deserialize)]
pub struct FretboardRequest {
  pub scale_root: u8,
  pub scale_name: String,
  pub chord_degree: usize,
  pub max_fret: Option<u8>,
  pub tuning_notes: Option<Vec<u8>>,
}

fn request_tuning(notes: &Option<Vec<u8>>) -> Result<music_engine::api::Tuning, String> {
    let notes = match notes {
        Some(notes) => notes,
        None => return Ok(tuning_standard()),
    };

    if !(6..=8).contains(&notes.len()) {
        return Err(format!("Unsupported string count: {}", notes.len()));
    }

    Ok(tuning_custom(notes.clone()))
}

// --- Helpers ---

fn parse_quality(s: &str) -> Result<ChordQuality, String> {
  match s {
      "major"      => Ok(ChordQuality::Major),
      "minor"      => Ok(ChordQuality::Minor),
      "power"      => Ok(ChordQuality::Power),
      "diminished" => Ok(ChordQuality::Diminished),
      "sus2"       => Ok(ChordQuality::Sus2),
      "sus4"       => Ok(ChordQuality::Sus4),
      other        => Err(format!("Unknown chord quality: {}", other)),
  }
}

fn parse_confidence(s: &str) -> Result<ConfidenceLevel, String> {
  match s {
      "high"   => Ok(ConfidenceLevel::High),
      "medium" => Ok(ConfidenceLevel::Medium),
      "low"    => Ok(ConfidenceLevel::Low),
      other    => Err(format!("Unknown confidence level: {}", other)),
  }
}

fn pc_names(pcs: &[PitchClass]) -> Vec<String> {
  pcs.iter().map(|n| n.name().to_string()).collect()
}

fn make_scale(root: PitchClass, name: &str) -> Result<music_engine::harmony::scale::Scale, String> {
  match name {
      "Major"            => Ok(major_scale(root)),
      "Natural Minor"    => Ok(natural_minor_scale(root)),
      "Pentatonic Major" => Ok(pentatonic_major_scale(root)),
      "Pentatonic Minor" => Ok(pentatonic_minor_scale(root)),
      "Blues"            => Ok(blues_scale(root)),
      other              => Err(format!("Unknown scale: {}", other)),
  }
}

fn parse_beat_style(s: &str) -> Result<BeatStyle, String> {
  match s {
      "rock" => Ok(BeatStyle::Rock),
      "boom_bap" => Ok(BeatStyle::BoomBap),
      "four_on_the_floor" => Ok(BeatStyle::FourOnTheFloor),
      "trap" => Ok(BeatStyle::Trap),
      "half_time" => Ok(BeatStyle::HalfTime),
      other => Err(format!("Unknown beat style: {}", other)),
  }
}

fn beat_style_id(style: BeatStyle) -> String {
  match style {
      BeatStyle::Rock => "rock",
      BeatStyle::BoomBap => "boom_bap",
      BeatStyle::FourOnTheFloor => "four_on_the_floor",
      BeatStyle::Trap => "trap",
      BeatStyle::HalfTime => "half_time",
  }.to_string()
}

fn beat_pattern_dto(pattern: music_engine::api::BeatPattern) -> BeatPatternDto {
  BeatPatternDto {
      name: pattern.name.to_string(),
      style: pattern.style.label().to_string(),
      style_id: beat_style_id(pattern.style),
      steps_per_bar: pattern.steps_per_bar,
      swing: pattern.swing,
      events: pattern.events.into_iter().map(|event| BeatStepEventDto {
          step: event.step,
          voice: event.voice.label().to_string(),
          velocity: event.velocity,
      }).collect(),
  }
}

// --- Commands ---

#[tauri::command]
fn analyze_chord_command(request: AnalyzeChordRequest) -> Result<Vec<ScaleSuggestionDto>, String> {
  let root = note(request.root);
  let quality = parse_quality(&request.quality)?;
  let min_confidence = parse_confidence(request.min_confidence.as_deref().unwrap_or("high"))?;
  let chord = build_chord(root, quality);
  let suggestions = analyze_chord(&chord, min_confidence);

  Ok(suggestions.into_iter().map(|s| ScaleSuggestionDto {
      scale_name:     s.scale.name.to_string(),
      scale_root:     s.scale.root.name().to_string(),
      confidence:     s.confidence().label().to_string(),
      matching_notes: pc_names(&s.compatibility.matching_notes),
      outside_notes:  pc_names(&s.compatibility.outside_notes),
      reason:         s.compatibility.reason.to_string(),
      notes:          pc_names(&s.scale.pitch_classes()),
      mode: s.mode.map(|m| DetectedModeDto {
          name:   m.name.to_string(),
          degree: m.degree,
          root:   m.root.name().to_string(),
      }),
  }).collect())
}

#[tauri::command]
fn diatonic_chords_command(request: DiatonicRequest) -> Result<Vec<DiatonicChordDto>, String> {
  let root = PitchClass::new(request.scale_root);
  let scale = make_scale(root, &request.scale_name)?;
  let chords = diatonic_chords(&scale);

  Ok(chords.into_iter().map(|d| DiatonicChordDto {
      degree:       d.degree,
      roman:        d.roman.to_string(),
      display_name: d.display_name(),
      quality:      d.quality.label().to_string(),
      notes:        pc_names(&d.chord.pitch_classes()),
  }).collect())
}

#[tauri::command]
fn common_progressions_command() -> Vec<NamedProgressionDto> {
  common_progressions().into_iter().map(|p| NamedProgressionDto {
      name:    p.name.to_string(),
      degrees: p.degrees,
      feel:    p.feel.to_string(),
  }).collect()
}

#[tauri::command]
fn common_beat_patterns_command() -> Vec<BeatPatternDto> {
  common_beat_patterns().into_iter().map(beat_pattern_dto).collect()
}

#[tauri::command]
fn beat_pattern_command(request: BeatPatternRequest) -> Result<BeatPatternDto, String> {
  let style = parse_beat_style(&request.style)?;
  let feel = BeatFeel {
      intensity: request.intensity.unwrap_or(100),
      swing: request.swing.unwrap_or(0),
  };
  Ok(beat_pattern_dto(beat_pattern(style, feel)))
}

#[tauri::command]
fn build_progression_command(request: BuildProgressionRequest) -> Result<Vec<ProgressionChordDto>, String> {
  let root = PitchClass::new(request.scale_root);
  let scale = make_scale(root, &request.scale_name)?;
  let progression = build_progression(&scale, &request.degrees);

  Ok(progression.into_iter().map(|pc| {
      let solo = solo_notes_for_chord(&pc.chord, &scale);
      ProgressionChordDto {
          degree:       pc.degree,
          roman:        pc.roman.to_string(),
          display_name: pc.display_name,
          quality:      pc.quality,
          chord_tones:  pc_names(&solo.chord_tones),
          scale_tones:  pc_names(&solo.scale_tones),
      }
  }).collect())
}

#[tauri::command]
fn fretboard_command(request: FretboardRequest) -> Result<Vec<FretPositionDto>, String> {
  let root = PitchClass::new(request.scale_root);
  let scale = make_scale(root, &request.scale_name)?;
  let progression = build_progression(&scale, &[request.chord_degree]);

  if progression.is_empty() {
      return Err(format!("Degree {} out of range for scale {}", request.chord_degree, request.scale_name));
  }

  let pc = &progression[0];
  let solo = solo_notes_for_chord(&pc.chord, &scale);
  let tuning = request_tuning(&request.tuning_notes)?;
  let max_fret = request.max_fret.unwrap_or(12);
  let positions = fret_positions(&tuning, &solo.chord_tones, &solo.scale_tones, max_fret);

  Ok(positions.into_iter().map(|p| FretPositionDto {
      string:        p.string,
      fret:          p.fret,
      note:          p.pitch_class.name().to_string(),
      is_chord_tone: p.is_chord_tone,
      is_root: false,
      is_avoid: false,
  }).collect())
}

#[derive(Deserialize)]
pub struct ScaleFretboardRequest {
    pub scale_root: u8,
    pub scale_name: String,
    pub max_fret: Option<u8>,
    pub tuning_notes: Option<Vec<u8>>,
}

#[derive(Deserialize)]
pub struct BeatPatternRequest {
    pub style: String,
    pub intensity: Option<u8>,
    pub swing: Option<u8>,
}

#[tauri::command]
fn scale_fretboard_command(request: ScaleFretboardRequest) -> Result<Vec<FretPositionDto>, String> {
    let root = PitchClass::new(request.scale_root);
    let scale = make_scale(root, &request.scale_name)?;
    let tuning = request_tuning(&request.tuning_notes)?;
    let max_fret = request.max_fret.unwrap_or(24);
    let scale_pcs = scale.pitch_classes();

    // Toutes les 12 notes sur le manche
    let all_pcs: Vec<PitchClass> = (0..12).map(PitchClass::new).collect();
    let avoid_pcs: Vec<PitchClass> = all_pcs.iter()
        .copied()
        .filter(|pc| !scale_pcs.contains(pc))
        .collect();

    // Notes de la scale
    let positions = fret_positions(&tuning, &[], &scale_pcs, max_fret);
    // Notes à éviter
    let avoid_positions = fret_positions(&tuning, &[], &avoid_pcs, max_fret);

    let mut result: Vec<FretPositionDto> = positions.into_iter().map(|p| FretPositionDto {
        string:        p.string,
        fret:          p.fret,
        note:          p.pitch_class.name().to_string(),
        is_chord_tone: false,
        is_root:       false,
        is_avoid:      false,
    }).collect();

    // Ajoute les avoid notes
    for p in avoid_positions {
        result.push(FretPositionDto {
            string:        p.string,
            fret:          p.fret,
            note:          p.pitch_class.name().to_string(),
            is_chord_tone: false,
            is_root:       false,
            is_avoid:      true,
        });
    }

    Ok(result)
}

// --- Entry point ---

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
      .setup(|app| {
          if cfg!(debug_assertions) {
              app.handle().plugin(
                  tauri_plugin_log::Builder::default()
                      .level(log::LevelFilter::Info)
                      .build(),
              )?;
          }
          Ok(())
      })
      .invoke_handler(tauri::generate_handler![
          analyze_chord_command,
          diatonic_chords_command,
          common_progressions_command,
          common_beat_patterns_command,
          beat_pattern_command,
          build_progression_command,
          fretboard_command,
          scale_fretboard_command,

      ])
      .run(tauri::generate_context!())
      .expect("error while running tauri application");
}
