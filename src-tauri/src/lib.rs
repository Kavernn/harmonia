use music_engine::api::{
    analyze_chord, analyze_progression, beat_pattern, build_chord, build_progression,
    build_progression_from_steps, common_beat_patterns, common_progressions,
    compatible_mode_family, contextual_modal_guidance, diatonic_chords, fret_positions,
    modal_guidance, named_scale, note, practice_library, practice_targets,
    score_practice_rep,
    progression_step_options, solo_notes_for_chord, suggested_progressions, tuning_custom,
    tuning_standard, BeatFeel, BeatStyle, ChordQuality, ConfidenceLevel, InputMode,
    PracticeNoteValue, PracticePlanArgs, PracticePerformedNote, PracticeTargetRole,
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
    pub characteristic_notes: Vec<String>,
    pub modal_avoid_notes: Vec<String>,
    pub resolution_notes: Vec<String>,
    pub guidance: String,
    pub mode: Option<DetectedModeDto>,
    pub matching_chords: Option<usize>,
    pub total_chords: Option<usize>,
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
    pub steps: Vec<String>,
    pub feel: String,
}

#[derive(Serialize)]
pub struct ProgressionStepOptionDto {
    pub token: String,
    pub family: String,
}

#[derive(Serialize)]
pub struct CompatibleModeDto {
    pub scale_name: String,
    pub scale_root: String,
    pub notes: Vec<String>,
    pub characteristic_notes: Vec<String>,
    pub modal_avoid_notes: Vec<String>,
    pub resolution_notes: Vec<String>,
    pub guidance: String,
}

#[derive(Serialize)]
pub struct ProgressionChordDto {
    pub degree: usize,
    pub roman: String,
    pub display_name: String,
    pub quality: String,
    pub harmonic_role: String,
    pub target_step: Option<String>,
    pub target_note: Option<String>,
    pub outside_harmony_tones: Vec<String>,
    pub chord_tones: Vec<String>,
    pub scale_tones: Vec<String>,
    pub modal_focus_tones: Vec<String>,
    pub modal_release_tones: Vec<String>,
    pub modal_advice: String,
}

#[derive(Serialize)]
pub struct FretPositionDto {
    pub string: usize,
    pub fret: u8,
    pub note: String,
    pub is_chord_tone: bool,
    pub is_root: bool,  // ← nouveau
    pub is_avoid: bool, // ← nouveau
    pub is_characteristic: bool,
    pub is_modal_avoid: bool,
    pub is_resolution: bool,
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

#[derive(Serialize)]
pub struct PracticeExerciseDto {
    pub id: String,
    pub name: String,
    pub description: String,
    pub category: String,
    pub goal: String,
    pub target_strategy: String,
    pub default_progression_steps: Vec<String>,
    pub default_window_size: u8,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct PracticeTargetDto {
    pub step_index: usize,
    pub step_name: String,
    pub chord_name: String,
    pub pulse_index: u8,
    pub pulse_total: u8,
    pub role: String,
    pub weight: u8,
    pub pitch_classes: Vec<String>,
    pub description: String,
}

#[derive(Deserialize)]
pub struct PracticeRepEventRequest {
    pub step_index: usize,
    pub pulse_index: u8,
    pub midi: u8,
    pub timing_error_ms: i16,
}

#[derive(Deserialize)]
pub struct PracticeRepScoreRequest {
    pub targets: Vec<PracticeTargetDto>,
    pub events: Vec<PracticeRepEventRequest>,
}

#[derive(Serialize)]
pub struct PracticeRepScoreDto {
    pub pitch_score: u8,
    pub timing_score: u8,
    pub target_score: u8,
    pub resolution_score: u8,
    pub total_score: u8,
    pub clean_rep: bool,
    pub matched_targets: usize,
    pub total_targets: usize,
    pub feedback: Vec<String>,
}

#[derive(Serialize)]
pub struct PracticePlanDto {
    pub exercise_id: String,
    pub exercise_name: String,
    pub exercise_description: String,
    pub category: String,
    pub goal: String,
    pub target_strategy: String,
    pub harmony_root: String,
    pub harmony_scale_name: String,
    pub solo_scale_root: String,
    pub solo_scale_name: String,
    pub progression_steps: Vec<String>,
    pub step_durations: Vec<String>,
    pub tempo_unit: String,
    pub tuning_notes: Vec<u8>,
    pub start_bpm: u16,
    pub target_bpm: u16,
    pub bpm_step: u16,
    pub reps_per_level: u8,
    pub count_in_bars: u8,
    pub input_mode: String,
    pub position_start: Option<u8>,
    pub window_size: u8,
    pub targets: Vec<PracticeTargetDto>,
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
pub struct AnalyzeProgressionRequest {
    pub scale_root: u8,
    pub scale_name: String,
    pub steps: Vec<String>,
    pub min_confidence: Option<String>,
}

#[derive(Deserialize)]
pub struct BuildProgressionRequest {
    pub scale_root: u8,
    pub scale_name: String,
    pub steps: Vec<String>,
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
        "major" => Ok(ChordQuality::Major),
        "minor" => Ok(ChordQuality::Minor),
        "power" => Ok(ChordQuality::Power),
        "diminished" => Ok(ChordQuality::Diminished),
        "sus2" => Ok(ChordQuality::Sus2),
        "sus4" => Ok(ChordQuality::Sus4),
        other => Err(format!("Unknown chord quality: {}", other)),
    }
}

fn parse_confidence(s: &str) -> Result<ConfidenceLevel, String> {
    match s {
        "high" => Ok(ConfidenceLevel::High),
        "medium" => Ok(ConfidenceLevel::Medium),
        "low" => Ok(ConfidenceLevel::Low),
        other => Err(format!("Unknown confidence level: {}", other)),
    }
}

fn pc_names(pcs: &[PitchClass]) -> Vec<String> {
    pcs.iter().map(|n| n.name().to_string()).collect()
}

fn make_scale(root: PitchClass, name: &str) -> Result<music_engine::harmony::scale::Scale, String> {
    named_scale(root, name).ok_or_else(|| format!("Unknown scale: {}", name))
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
    }
    .to_string()
}

fn beat_pattern_dto(pattern: music_engine::api::BeatPattern) -> BeatPatternDto {
    BeatPatternDto {
        name: pattern.name.to_string(),
        style: pattern.style.label().to_string(),
        style_id: beat_style_id(pattern.style),
        steps_per_bar: pattern.steps_per_bar,
        swing: pattern.swing,
        events: pattern
            .events
            .into_iter()
            .map(|event| BeatStepEventDto {
                step: event.step,
                voice: event.voice.label().to_string(),
                velocity: event.velocity,
            })
            .collect(),
    }
}

fn parse_practice_note_value(s: &str) -> Result<PracticeNoteValue, String> {
    match s {
        "whole" => Ok(PracticeNoteValue::Whole),
        "half" => Ok(PracticeNoteValue::Half),
        "quarter" => Ok(PracticeNoteValue::Quarter),
        "eighth" => Ok(PracticeNoteValue::Eighth),
        "sixteenth" => Ok(PracticeNoteValue::Sixteenth),
        other => Err(format!("Unknown practice note value: {}", other)),
    }
}

fn parse_input_mode(s: &str) -> Result<InputMode, String> {
    match s {
        "microphone" | "mic" => Ok(InputMode::Microphone),
        "midi" => Ok(InputMode::Midi),
        other => Err(format!("Unknown input mode: {}", other)),
    }
}

fn parse_practice_target_role(s: &str) -> Result<PracticeTargetRole, String> {
    match s {
        "strong_beat" => Ok(PracticeTargetRole::StrongBeat),
        "modal_color" => Ok(PracticeTargetRole::ModalColor),
        "resolution" => Ok(PracticeTargetRole::Resolution),
        "passing" => Ok(PracticeTargetRole::Passing),
        "phrase_start" => Ok(PracticeTargetRole::PhraseStart),
        "phrase_answer" => Ok(PracticeTargetRole::PhraseAnswer),
        other => Err(format!("Unknown practice target role: {}", other)),
    }
}

fn parse_pitch_class_name(name: &str) -> Result<PitchClass, String> {
    match name {
        "C" => Ok(PitchClass::new(0)),
        "C#" => Ok(PitchClass::new(1)),
        "D" => Ok(PitchClass::new(2)),
        "D#" => Ok(PitchClass::new(3)),
        "E" => Ok(PitchClass::new(4)),
        "F" => Ok(PitchClass::new(5)),
        "F#" => Ok(PitchClass::new(6)),
        "G" => Ok(PitchClass::new(7)),
        "G#" => Ok(PitchClass::new(8)),
        "A" => Ok(PitchClass::new(9)),
        "A#" => Ok(PitchClass::new(10)),
        "B" => Ok(PitchClass::new(11)),
        other => Err(format!("Unknown pitch class: {}", other)),
    }
}

fn input_mode_id(mode: InputMode) -> String {
    match mode {
        InputMode::Microphone => "microphone",
        InputMode::Midi => "midi",
    }
    .to_string()
}

fn request_tuning_notes(notes: &Option<Vec<u8>>) -> Result<Vec<u8>, String> {
    Ok(request_tuning(notes)?
        .strings
        .into_iter()
        .map(|pitch_class| pitch_class.value())
        .collect())
}

fn practice_target_dto(target: music_engine::api::PracticeTarget) -> PracticeTargetDto {
    PracticeTargetDto {
        step_index: target.step_index,
        step_name: target.step_name,
        chord_name: target.chord_name,
        pulse_index: target.pulse_index,
        pulse_total: target.pulse_total,
        role: target.role.label().to_string(),
        weight: target.weight,
        pitch_classes: pc_names(&target.pitch_classes),
        description: target.description,
    }
}

fn practice_target_from_dto(target: &PracticeTargetDto) -> Result<music_engine::api::PracticeTarget, String> {
    Ok(music_engine::api::PracticeTarget {
        step_index: target.step_index,
        step_name: target.step_name.clone(),
        chord_name: target.chord_name.clone(),
        pulse_index: target.pulse_index,
        pulse_total: target.pulse_total,
        role: parse_practice_target_role(&target.role)?,
        weight: target.weight,
        pitch_classes: target
            .pitch_classes
            .iter()
            .map(|name| parse_pitch_class_name(name))
            .collect::<Result<Vec<_>, _>>()?,
        description: target.description.clone(),
    })
}

fn practice_rep_score_dto(score: music_engine::api::PracticeRepScore) -> PracticeRepScoreDto {
    PracticeRepScoreDto {
        pitch_score: score.pitch_score,
        timing_score: score.timing_score,
        target_score: score.target_score,
        resolution_score: score.resolution_score,
        total_score: score.total_score,
        clean_rep: score.clean_rep,
        matched_targets: score.matched_targets,
        total_targets: score.total_targets,
        feedback: score.feedback,
    }
}

fn build_practice_plan_from_request(
    request: &PracticePlanRequest,
) -> Result<music_engine::api::PracticePlan, String> {
    let step_durations = request
        .step_durations
        .as_deref()
        .unwrap_or(&[])
        .iter()
        .map(|duration| parse_practice_note_value(duration))
        .collect::<Result<Vec<_>, _>>()?;
    let tempo_unit = parse_practice_note_value(request.tempo_unit.as_deref().unwrap_or("quarter"))?;
    let input_mode = parse_input_mode(request.input_mode.as_deref().unwrap_or("midi"))?;
    let tuning_notes = request_tuning_notes(&request.tuning_notes)?;
    let progression_steps = request.progression_steps.as_deref().unwrap_or(&[]);

    music_engine::api::build_practice_plan(PracticePlanArgs {
        exercise_id: &request.exercise_id,
        harmony_root: PitchClass::new(request.harmony_root),
        harmony_scale_name: &request.harmony_scale_name,
        solo_scale_root: PitchClass::new(request.solo_scale_root),
        solo_scale_name: &request.solo_scale_name,
        progression_steps,
        step_durations: &step_durations,
        tempo_unit,
        tuning_notes: &tuning_notes,
        start_bpm: request.start_bpm.unwrap_or(80),
        target_bpm: request.target_bpm.unwrap_or(110),
        bpm_step: request.bpm_step.unwrap_or(5),
        reps_per_level: request.reps_per_level.unwrap_or(2),
        count_in_bars: request.count_in_bars.unwrap_or(1),
        input_mode,
        position_start: request.position_start,
        window_size: request.window_size,
    })
}

fn practice_plan_dto(plan: music_engine::api::PracticePlan) -> Result<PracticePlanDto, String> {
    let targets = practice_targets(&plan)?
        .into_iter()
        .map(practice_target_dto)
        .collect();

    Ok(PracticePlanDto {
        exercise_id: plan.exercise.id.to_string(),
        exercise_name: plan.exercise.name.to_string(),
        exercise_description: plan.exercise.description.to_string(),
        category: plan.category().label().to_string(),
        goal: plan.goal().label().to_string(),
        target_strategy: plan.target_strategy().label().to_string(),
        harmony_root: plan.harmony_root.name().to_string(),
        harmony_scale_name: plan.harmony_scale_name,
        solo_scale_root: plan.solo_scale_root.name().to_string(),
        solo_scale_name: plan.solo_scale_name,
        progression_steps: plan.progression_steps,
        step_durations: plan
            .step_durations
            .into_iter()
            .map(|duration| duration.label().to_string())
            .collect(),
        tempo_unit: plan.tempo_unit.label().to_string(),
        tuning_notes: plan.tuning_notes,
        start_bpm: plan.start_bpm,
        target_bpm: plan.target_bpm,
        bpm_step: plan.bpm_step,
        reps_per_level: plan.reps_per_level,
        count_in_bars: plan.count_in_bars,
        input_mode: input_mode_id(plan.input_mode),
        position_start: plan.position_start,
        window_size: plan.window_size,
        targets,
    })
}

// --- Commands ---

#[tauri::command]
fn analyze_chord_command(request: AnalyzeChordRequest) -> Result<Vec<ScaleSuggestionDto>, String> {
    let root = note(request.root);
    let quality = parse_quality(&request.quality)?;
    let min_confidence = parse_confidence(request.min_confidence.as_deref().unwrap_or("high"))?;
    let chord = build_chord(root, quality);
    let suggestions = analyze_chord(&chord, min_confidence);

    Ok(suggestions
        .into_iter()
        .map(|s| ScaleSuggestionDto {
            characteristic_notes: pc_names(&modal_guidance(&s.scale).characteristic_tones),
            modal_avoid_notes: pc_names(&modal_guidance(&s.scale).modal_avoid_tones),
            resolution_notes: pc_names(&modal_guidance(&s.scale).resolution_tones),
            guidance: modal_guidance(&s.scale).guidance.to_string(),
            scale_name: s.scale.name.to_string(),
            scale_root: s.scale.root.name().to_string(),
            confidence: s.confidence().label().to_string(),
            matching_notes: pc_names(&s.compatibility.matching_notes),
            outside_notes: pc_names(&s.compatibility.outside_notes),
            reason: s.compatibility.reason.to_string(),
            notes: pc_names(&s.scale.pitch_classes()),
            mode: s.mode.map(|m| DetectedModeDto {
                name: m.name.to_string(),
                degree: m.degree,
                root: m.root.name().to_string(),
            }),
            matching_chords: None,
            total_chords: None,
        })
        .collect())
}

#[tauri::command]
fn analyze_progression_command(
    request: AnalyzeProgressionRequest,
) -> Result<Vec<ScaleSuggestionDto>, String> {
    let root = PitchClass::new(request.scale_root);
    let scale = make_scale(root, &request.scale_name)?;
    let min_confidence = parse_confidence(request.min_confidence.as_deref().unwrap_or("high"))?;
    let progression = build_progression_from_steps(&scale, &request.steps);
    let chords: Vec<_> = progression.iter().map(|step| step.chord.clone()).collect();
    let suggestions = analyze_progression(&chords, min_confidence);

    Ok(suggestions
        .into_iter()
        .map(|suggestion| ScaleSuggestionDto {
            characteristic_notes: pc_names(&modal_guidance(&suggestion.scale).characteristic_tones),
            modal_avoid_notes: pc_names(&modal_guidance(&suggestion.scale).modal_avoid_tones),
            resolution_notes: pc_names(&modal_guidance(&suggestion.scale).resolution_tones),
            guidance: modal_guidance(&suggestion.scale).guidance.to_string(),
            scale_name: suggestion.scale.name.to_string(),
            scale_root: suggestion.scale.root.name().to_string(),
            confidence: suggestion.confidence().label().to_string(),
            matching_notes: pc_names(&suggestion.matching_notes),
            outside_notes: pc_names(&suggestion.outside_notes),
            reason: suggestion.reason.to_string(),
            notes: pc_names(&suggestion.scale.pitch_classes()),
            mode: None,
            matching_chords: Some(suggestion.matching_chords),
            total_chords: Some(suggestion.total_chords),
        })
        .collect())
}

#[tauri::command]
fn diatonic_chords_command(request: DiatonicRequest) -> Result<Vec<DiatonicChordDto>, String> {
    let root = PitchClass::new(request.scale_root);
    let scale = make_scale(root, &request.scale_name)?;
    let chords = diatonic_chords(&scale);

    Ok(chords
        .into_iter()
        .map(|d| DiatonicChordDto {
            degree: d.degree,
            roman: d.roman.to_string(),
            display_name: d.display_name(),
            quality: d.quality.label().to_string(),
            notes: pc_names(&d.chord.pitch_classes()),
        })
        .collect())
}

#[tauri::command]
fn common_progressions_command() -> Vec<NamedProgressionDto> {
    common_progressions()
        .into_iter()
        .map(|p| NamedProgressionDto {
            name: p.name.to_string(),
            steps: p.steps,
            feel: p.feel.to_string(),
        })
        .collect()
}

#[tauri::command]
fn suggested_progressions_command(
    request: DiatonicRequest,
) -> Result<Vec<NamedProgressionDto>, String> {
    let root = PitchClass::new(request.scale_root);
    let scale = make_scale(root, &request.scale_name)?;

    Ok(suggested_progressions(&scale)
        .into_iter()
        .map(|p| NamedProgressionDto {
            name: p.name.to_string(),
            steps: p.steps,
            feel: p.feel.to_string(),
        })
        .collect())
}

#[tauri::command]
fn progression_step_options_command(
    request: DiatonicRequest,
) -> Result<Vec<ProgressionStepOptionDto>, String> {
    let root = PitchClass::new(request.scale_root);
    let scale = make_scale(root, &request.scale_name)?;

    Ok(progression_step_options(&scale)
        .into_iter()
        .map(|option| ProgressionStepOptionDto {
            token: option.token,
            family: option.family,
        })
        .collect())
}

#[tauri::command]
fn compatible_modes_command(request: DiatonicRequest) -> Result<Vec<CompatibleModeDto>, String> {
    let root = PitchClass::new(request.scale_root);
    let scale = make_scale(root, &request.scale_name)?;

    Ok(compatible_mode_family(&scale)
        .unwrap_or_default()
        .into_iter()
        .map(|mode| {
            let modal = modal_guidance(&mode);
            CompatibleModeDto {
                scale_name: mode.name.to_string(),
                scale_root: mode.root.name().to_string(),
                notes: pc_names(&mode.pitch_classes()),
                characteristic_notes: pc_names(&modal.characteristic_tones),
                modal_avoid_notes: pc_names(&modal.modal_avoid_tones),
                resolution_notes: pc_names(&modal.resolution_tones),
                guidance: modal.guidance.to_string(),
            }
        })
        .collect())
}

#[tauri::command]
fn common_beat_patterns_command() -> Vec<BeatPatternDto> {
    common_beat_patterns()
        .into_iter()
        .map(beat_pattern_dto)
        .collect()
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
fn practice_library_command() -> Vec<PracticeExerciseDto> {
    practice_library()
        .into_iter()
        .map(|exercise| PracticeExerciseDto {
            id: exercise.id.to_string(),
            name: exercise.name.to_string(),
            description: exercise.description.to_string(),
            category: exercise.category.label().to_string(),
            goal: exercise.goal.label().to_string(),
            target_strategy: exercise.target_strategy.label().to_string(),
            default_progression_steps: exercise.default_progression_steps,
            default_window_size: exercise.default_window_size,
        })
        .collect()
}

#[tauri::command]
fn practice_plan_command(request: PracticePlanRequest) -> Result<PracticePlanDto, String> {
    let plan = build_practice_plan_from_request(&request)?;
    practice_plan_dto(plan)
}

#[tauri::command]
fn practice_targets_command(request: PracticePlanRequest) -> Result<Vec<PracticeTargetDto>, String> {
    let plan = build_practice_plan_from_request(&request)?;
    Ok(practice_targets(&plan)?
        .into_iter()
        .map(practice_target_dto)
        .collect())
}

#[tauri::command]
fn score_practice_rep_command(request: PracticeRepScoreRequest) -> Result<PracticeRepScoreDto, String> {
    let targets = request
        .targets
        .iter()
        .map(practice_target_from_dto)
        .collect::<Result<Vec<_>, _>>()?;
    let events = request
        .events
        .into_iter()
        .map(|event| PracticePerformedNote {
            step_index: event.step_index,
            pulse_index: event.pulse_index,
            pitch_class: PitchClass::new(event.midi % 12),
            timing_error_ms: event.timing_error_ms,
        })
        .collect::<Vec<_>>();

    Ok(practice_rep_score_dto(score_practice_rep(&targets, &events)))
}

#[tauri::command]
fn build_progression_command(
    request: BuildProgressionRequest,
) -> Result<Vec<ProgressionChordDto>, String> {
    let root = PitchClass::new(request.scale_root);
    let scale = make_scale(root, &request.scale_name)?;
    let progression = build_progression_from_steps(&scale, &request.steps);

    Ok(progression
        .into_iter()
        .map(|pc| {
            let solo = solo_notes_for_chord(&pc.chord, &scale);
            let contextual = contextual_modal_guidance(&pc, &scale);
            ProgressionChordDto {
                degree: pc.degree,
                roman: pc.roman.to_string(),
                display_name: pc.display_name,
                quality: pc.quality,
                harmonic_role: pc.harmonic_role,
                target_step: pc.target_step,
                target_note: pc.target_note.map(|note| note.name().to_string()),
                outside_harmony_tones: pc_names(&pc.outside_harmony_tones),
                chord_tones: pc_names(&solo.chord_tones),
                scale_tones: pc_names(&solo.scale_tones),
                modal_focus_tones: pc_names(&contextual.focus_tones),
                modal_release_tones: pc_names(&contextual.release_tones),
                modal_advice: contextual.guidance,
            }
        })
        .collect())
}

#[tauri::command]
fn fretboard_command(request: FretboardRequest) -> Result<Vec<FretPositionDto>, String> {
    let root = PitchClass::new(request.scale_root);
    let scale = make_scale(root, &request.scale_name)?;
    let progression = build_progression(&scale, &[request.chord_degree]);

    if progression.is_empty() {
        return Err(format!(
            "Degree {} out of range for scale {}",
            request.chord_degree, request.scale_name
        ));
    }

    let pc = &progression[0];
    let solo = solo_notes_for_chord(&pc.chord, &scale);
    let tuning = request_tuning(&request.tuning_notes)?;
    let max_fret = request.max_fret.unwrap_or(12);
    let positions = fret_positions(&tuning, &solo.chord_tones, &solo.scale_tones, max_fret);

    Ok(positions
        .into_iter()
        .map(|p| FretPositionDto {
            string: p.string,
            fret: p.fret,
            note: p.pitch_class.name().to_string(),
            is_chord_tone: p.is_chord_tone,
            is_root: false,
            is_avoid: false,
            is_characteristic: false,
            is_modal_avoid: false,
            is_resolution: false,
        })
        .collect())
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

#[derive(Deserialize)]
pub struct PracticePlanRequest {
    pub exercise_id: String,
    pub harmony_root: u8,
    pub harmony_scale_name: String,
    pub solo_scale_root: u8,
    pub solo_scale_name: String,
    pub progression_steps: Option<Vec<String>>,
    pub step_durations: Option<Vec<String>>,
    pub tempo_unit: Option<String>,
    pub tuning_notes: Option<Vec<u8>>,
    pub start_bpm: Option<u16>,
    pub target_bpm: Option<u16>,
    pub bpm_step: Option<u16>,
    pub reps_per_level: Option<u8>,
    pub count_in_bars: Option<u8>,
    pub input_mode: Option<String>,
    pub position_start: Option<u8>,
    pub window_size: Option<u8>,
}

#[tauri::command]
fn scale_fretboard_command(request: ScaleFretboardRequest) -> Result<Vec<FretPositionDto>, String> {
    let root = PitchClass::new(request.scale_root);
    let scale = make_scale(root, &request.scale_name)?;
    let modal = modal_guidance(&scale);
    let tuning = request_tuning(&request.tuning_notes)?;
    let max_fret = request.max_fret.unwrap_or(24);
    let scale_pcs = scale.pitch_classes();

    // Toutes les 12 notes sur le manche
    let all_pcs: Vec<PitchClass> = (0..12).map(PitchClass::new).collect();
    let avoid_pcs: Vec<PitchClass> = all_pcs
        .iter()
        .copied()
        .filter(|pc| !scale_pcs.contains(pc))
        .collect();

    // Notes de la scale
    let positions = fret_positions(&tuning, &[], &scale_pcs, max_fret);
    // Notes à éviter
    let avoid_positions = fret_positions(&tuning, &[], &avoid_pcs, max_fret);

    let mut result: Vec<FretPositionDto> = positions
        .into_iter()
        .map(|p| FretPositionDto {
            string: p.string,
            fret: p.fret,
            note: p.pitch_class.name().to_string(),
            is_chord_tone: false,
            is_root: false,
            is_avoid: false,
            is_characteristic: modal.characteristic_tones.contains(&p.pitch_class),
            is_modal_avoid: modal.modal_avoid_tones.contains(&p.pitch_class),
            is_resolution: modal.resolution_tones.contains(&p.pitch_class),
        })
        .collect();

    // Ajoute les avoid notes
    for p in avoid_positions {
        result.push(FretPositionDto {
            string: p.string,
            fret: p.fret,
            note: p.pitch_class.name().to_string(),
            is_chord_tone: false,
            is_root: false,
            is_avoid: true,
            is_characteristic: false,
            is_modal_avoid: false,
            is_resolution: false,
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
            analyze_progression_command,
            diatonic_chords_command,
            common_progressions_command,
            suggested_progressions_command,
            progression_step_options_command,
            compatible_modes_command,
            common_beat_patterns_command,
            beat_pattern_command,
            practice_library_command,
            practice_plan_command,
            practice_targets_command,
            score_practice_rep_command,
            build_progression_command,
            fretboard_command,
            scale_fretboard_command,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashSet;

    #[test]
    fn beat_pattern_command_preserves_requested_feel() {
        let pattern = beat_pattern_command(BeatPatternRequest {
            style: "rock".to_string(),
            intensity: Some(110),
            swing: Some(33),
        })
        .expect("beat pattern should build");

        assert_eq!(pattern.steps_per_bar, 16);
        assert_eq!(pattern.swing, 33);
        assert!(!pattern.events.is_empty());
    }

    #[test]
    fn practice_library_command_is_not_empty() {
        let library = practice_library_command();

        assert!(!library.is_empty());
        assert!(library
            .iter()
            .any(|exercise| exercise.id == "guide-tones-strong-beats"));
    }

    #[test]
    fn practice_plan_command_builds_defaults_and_targets() {
        let plan = practice_plan_command(PracticePlanRequest {
            exercise_id: "guide-tones-strong-beats".to_string(),
            harmony_root: 0,
            harmony_scale_name: "Ionian".to_string(),
            solo_scale_root: 0,
            solo_scale_name: "Ionian".to_string(),
            progression_steps: None,
            step_durations: None,
            tempo_unit: None,
            tuning_notes: None,
            start_bpm: Some(82),
            target_bpm: Some(118),
            bpm_step: Some(4),
            reps_per_level: Some(2),
            count_in_bars: Some(1),
            input_mode: Some("midi".to_string()),
            position_start: Some(5),
            window_size: Some(5),
        })
        .expect("practice plan should build");

        assert_eq!(plan.exercise_id, "guide-tones-strong-beats");
        assert_eq!(plan.progression_steps, vec!["ii", "V", "I", "I"]);
        assert_eq!(plan.step_durations, vec!["quarter", "quarter", "quarter", "quarter"]);
        assert_eq!(plan.targets.len(), 4);
        assert!(plan.targets.iter().all(|target| target.role == "strong_beat"));
    }

    #[test]
    fn practice_targets_command_surfaces_modal_color_and_resolution() {
        let targets = practice_targets_command(PracticePlanRequest {
            exercise_id: "modal-color-resolve".to_string(),
            harmony_root: 2,
            harmony_scale_name: "Dorian".to_string(),
            solo_scale_root: 2,
            solo_scale_name: "Dorian".to_string(),
            progression_steps: None,
            step_durations: None,
            tempo_unit: Some("quarter".to_string()),
            tuning_notes: None,
            start_bpm: None,
            target_bpm: None,
            bpm_step: None,
            reps_per_level: None,
            count_in_bars: None,
            input_mode: Some("midi".to_string()),
            position_start: None,
            window_size: None,
        })
        .expect("practice targets should build");

        assert!(targets
            .iter()
            .any(|target| target.role == "modal_color" && target.pitch_classes == vec!["B"]));
        assert!(targets
            .iter()
            .any(|target| target.role == "resolution" && target.pitch_classes == vec!["A"]));
    }

    #[test]
    fn score_practice_rep_command_marks_clean_rep_when_targets_are_hit() {
        let score = score_practice_rep_command(PracticeRepScoreRequest {
            targets: vec![
                PracticeTargetDto {
                    step_index: 0,
                    step_name: "ii".to_string(),
                    chord_name: "Dm".to_string(),
                    pulse_index: 0,
                    pulse_total: 4,
                    role: "strong_beat".to_string(),
                    weight: 100,
                    pitch_classes: vec!["D".to_string(), "F".to_string(), "A".to_string()],
                    description: "Hit the chord tones".to_string(),
                },
                PracticeTargetDto {
                    step_index: 0,
                    step_name: "ii".to_string(),
                    chord_name: "Dm".to_string(),
                    pulse_index: 2,
                    pulse_total: 4,
                    role: "resolution".to_string(),
                    weight: 100,
                    pitch_classes: vec!["A".to_string()],
                    description: "Land on A".to_string(),
                },
            ],
            events: vec![
                PracticeRepEventRequest {
                    step_index: 0,
                    pulse_index: 0,
                    midi: 62,
                    timing_error_ms: 18,
                },
                PracticeRepEventRequest {
                    step_index: 0,
                    pulse_index: 2,
                    midi: 69,
                    timing_error_ms: 24,
                },
            ],
        })
        .expect("rep score should build");

        assert!(score.clean_rep);
        assert_eq!(score.matched_targets, 2);
        assert!(score.total_score >= 95);
    }

    #[test]
    fn build_progression_command_returns_disjoint_chord_and_scale_tones() {
        let progression = build_progression_command(BuildProgressionRequest {
            scale_root: 0,
            scale_name: "Major".to_string(),
            steps: vec!["I".to_string(), "IV".to_string(), "V".to_string()],
        })
        .expect("progression should build");

        assert_eq!(progression.len(), 3);
        for chord in progression {
            let chord_tones: HashSet<_> = chord.chord_tones.iter().cloned().collect();
            let scale_tones: HashSet<_> = chord.scale_tones.iter().cloned().collect();
            assert!(!chord_tones.is_empty());
            assert!(chord_tones.is_disjoint(&scale_tones));
            assert_eq!(chord_tones.len() + scale_tones.len(), 7);
            assert_eq!(chord.harmonic_role, "diatonic");
        }
    }

    #[test]
    fn progression_step_options_command_exposes_borrowed_and_secondary_choices() {
        let options = progression_step_options_command(DiatonicRequest {
            scale_root: 0,
            scale_name: "Major".to_string(),
        })
        .expect("step options should build");

        assert!(options
            .iter()
            .any(|option| option.token == "iv" && option.family == "borrowed"));
        assert!(options
            .iter()
            .any(|option| option.token == "V/V" && option.family == "secondary_dominant"));
    }

    #[test]
    fn compatible_modes_command_lists_relative_modes_for_a_ionian() {
        let modes = compatible_modes_command(DiatonicRequest {
            scale_root: 9,
            scale_name: "Ionian".to_string(),
        })
        .expect("compatible modes should build");

        let labels: Vec<String> = modes
            .iter()
            .map(|mode| format!("{} {}", mode.scale_root, mode.scale_name))
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
    fn compatible_modes_command_lists_harmonic_minor_family() {
        let modes = compatible_modes_command(DiatonicRequest {
            scale_root: 9,
            scale_name: "Harmonic Minor".to_string(),
        })
        .expect("compatible modes should build");

        let labels: Vec<String> = modes
            .iter()
            .map(|mode| format!("{} {}", mode.scale_root, mode.scale_name))
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
    fn compatible_modes_command_lists_melodic_minor_family() {
        let modes = compatible_modes_command(DiatonicRequest {
            scale_root: 9,
            scale_name: "Melodic Minor".to_string(),
        })
        .expect("compatible modes should build");

        let labels: Vec<String> = modes
            .iter()
            .map(|mode| format!("{} {}", mode.scale_root, mode.scale_name))
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
    fn suggested_progressions_command_surfaces_harmonic_minor_mode_lab_presets() {
        let progressions = suggested_progressions_command(DiatonicRequest {
            scale_root: 9,
            scale_name: "Harmonic Minor".to_string(),
        })
        .expect("suggested progressions should build");

        let labels: Vec<String> = progressions
            .iter()
            .map(|progression| progression.name.clone())
            .collect();

        assert!(labels.contains(&"V – VI – V – i".to_string()));
        assert!(labels.contains(&"III+ – VI – V – i".to_string()));
    }

    #[test]
    fn suggested_progressions_command_surfaces_melodic_minor_mode_lab_presets() {
        let progressions = suggested_progressions_command(DiatonicRequest {
            scale_root: 9,
            scale_name: "Melodic Minor".to_string(),
        })
        .expect("suggested progressions should build");

        let labels: Vec<String> = progressions
            .iter()
            .map(|progression| progression.name.clone())
            .collect();

        assert!(labels.contains(&"IV – i lydian dominant".to_string()));
        assert!(labels.contains(&"V – IV – i".to_string()));
    }

    #[test]
    fn analyze_progression_command_prefers_ionian_for_i_iv_v() {
        let suggestions = analyze_progression_command(AnalyzeProgressionRequest {
            scale_root: 0,
            scale_name: "Ionian".to_string(),
            steps: vec![
                "I".to_string(),
                "IV".to_string(),
                "V".to_string(),
                "I".to_string(),
            ],
            min_confidence: Some("high".to_string()),
        })
        .expect("progression analysis should succeed");

        assert!(!suggestions.is_empty());
        assert_eq!(suggestions[0].scale_root, "C");
        assert_eq!(suggestions[0].scale_name, "Ionian");
        assert_eq!(suggestions[0].matching_chords, Some(4));
        assert_eq!(suggestions[0].total_chords, Some(4));
    }

    #[test]
    fn analyze_progression_command_surfaces_modal_palette_for_dorian_vamp() {
        let suggestions = analyze_progression_command(AnalyzeProgressionRequest {
            scale_root: 2,
            scale_name: "Dorian".to_string(),
            steps: vec!["i".to_string(), "IV".to_string(), "i".to_string()],
            min_confidence: Some("high".to_string()),
        })
        .expect("progression analysis should succeed");

        assert!(!suggestions.is_empty());
        assert_eq!(suggestions[0].scale_root, "D");
        assert_eq!(suggestions[0].scale_name, "Dorian");
        assert_eq!(suggestions[0].characteristic_notes, vec!["B"]);
        assert!(suggestions[0].modal_avoid_notes.is_empty());
        assert_eq!(suggestions[0].resolution_notes, vec!["A"]);
    }

    #[test]
    fn build_progression_command_renders_a_ionian_two_five_as_bm_to_e() {
        let progression = build_progression_command(BuildProgressionRequest {
            scale_root: 9,
            scale_name: "Ionian".to_string(),
            steps: vec![
                "ii".to_string(),
                "V".to_string(),
                "ii".to_string(),
                "V".to_string(),
            ],
        })
        .expect("progression should build");

        assert_eq!(progression.len(), 4);
        assert_eq!(progression[0].roman, "ii");
        assert_eq!(progression[0].display_name, "Bm");
        assert_eq!(progression[1].roman, "V");
        assert_eq!(progression[1].display_name, "E");
        assert_eq!(progression[2].display_name, "Bm");
        assert_eq!(progression[3].display_name, "E");
        assert!(progression
            .iter()
            .all(|step| step.harmonic_role == "diatonic"));
    }

    #[test]
    fn analyze_progression_command_prefers_b_dorian_over_a_ionian_for_a_major_two_five_vamp() {
        let suggestions = analyze_progression_command(AnalyzeProgressionRequest {
            scale_root: 9,
            scale_name: "Ionian".to_string(),
            steps: vec![
                "ii".to_string(),
                "V".to_string(),
                "ii".to_string(),
                "V".to_string(),
            ],
            min_confidence: Some("high".to_string()),
        })
        .expect("progression analysis should succeed");

        assert!(!suggestions.is_empty());
        assert_eq!(suggestions[0].scale_root, "B");
        assert_eq!(suggestions[0].scale_name, "Dorian");
        assert_eq!(suggestions[0].matching_chords, Some(4));
        assert_eq!(suggestions[0].total_chords, Some(4));
    }

    #[test]
    fn analyze_progression_command_can_surface_phrygian_dominant_from_harmonic_minor() {
        let suggestions = analyze_progression_command(AnalyzeProgressionRequest {
            scale_root: 9,
            scale_name: "Harmonic Minor".to_string(),
            steps: vec![
                "V".to_string(),
                "VI".to_string(),
                "V".to_string(),
                "i".to_string(),
            ],
            min_confidence: Some("high".to_string()),
        })
        .expect("progression analysis should succeed");

        assert!(!suggestions.is_empty());
        assert_eq!(suggestions[0].scale_root, "E");
        assert_eq!(suggestions[0].scale_name, "Phrygian Dominant");
    }

    #[test]
    fn analyze_progression_command_can_surface_lydian_dominant_from_melodic_minor() {
        let suggestions = analyze_progression_command(AnalyzeProgressionRequest {
            scale_root: 9,
            scale_name: "Melodic Minor".to_string(),
            steps: vec!["IV".to_string(), "i".to_string()],
            min_confidence: Some("high".to_string()),
        })
        .expect("progression analysis should succeed");

        assert!(!suggestions.is_empty());
        assert_eq!(suggestions[0].scale_root, "D");
        assert_eq!(suggestions[0].scale_name, "Lydian Dominant");
    }

    #[test]
    fn scale_fretboard_command_marks_scale_and_avoid_notes_consistently() {
        let scale_notes: HashSet<_> = ["C", "D", "E", "F", "G", "A", "B"]
            .into_iter()
            .map(str::to_string)
            .collect();
        let positions = scale_fretboard_command(ScaleFretboardRequest {
            scale_root: 0,
            scale_name: "Major".to_string(),
            max_fret: Some(12),
            tuning_notes: None,
        })
        .expect("scale fretboard should build");

        assert!(positions.iter().any(|position| position.is_avoid));
        assert!(positions.iter().any(|position| !position.is_avoid));
        for position in positions {
            if position.is_avoid {
                assert!(!scale_notes.contains(&position.note));
            } else {
                assert!(scale_notes.contains(&position.note));
            }
        }
    }

    #[test]
    fn scale_fretboard_command_supports_seven_string_tuning() {
        let positions = scale_fretboard_command(ScaleFretboardRequest {
            scale_root: 0,
            scale_name: "Major".to_string(),
            max_fret: Some(12),
            tuning_notes: Some(vec![11, 4, 9, 2, 7, 11, 4]),
        })
        .expect("seven-string fretboard should build");

        assert!(positions.iter().any(|position| position.string == 6));
    }

    #[test]
    fn scale_fretboard_command_marks_modal_guidance_flags() {
        let positions = scale_fretboard_command(ScaleFretboardRequest {
            scale_root: 7,
            scale_name: "Mixolydian".to_string(),
            max_fret: Some(12),
            tuning_notes: None,
        })
        .expect("modal fretboard should build");

        assert!(positions
            .iter()
            .any(|position| position.note == "F" && position.is_characteristic));
        assert!(positions
            .iter()
            .any(|position| position.note == "C" && position.is_modal_avoid));
        assert!(positions
            .iter()
            .any(|position| position.note == "G" && position.is_resolution));
    }
}
