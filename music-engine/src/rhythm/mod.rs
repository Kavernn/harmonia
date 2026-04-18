#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DrumVoice {
    Kick,
    Snare,
    ClosedHat,
    OpenHat,
    Clap,
    Perc,
}

impl DrumVoice {
    pub fn label(&self) -> &'static str {
        match self {
            DrumVoice::Kick => "Kick",
            DrumVoice::Snare => "Snare",
            DrumVoice::ClosedHat => "Closed Hat",
            DrumVoice::OpenHat => "Open Hat",
            DrumVoice::Clap => "Clap",
            DrumVoice::Perc => "Perc",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BeatStyle {
    Rock,
    BoomBap,
    FourOnTheFloor,
    Trap,
    HalfTime,
    Funk,
    Shuffle,
    Latin,
    Jazz,
}

impl BeatStyle {
    pub fn label(&self) -> &'static str {
        match self {
            BeatStyle::Rock => "Rock",
            BeatStyle::BoomBap => "Boom Bap",
            BeatStyle::FourOnTheFloor => "Four on the Floor",
            BeatStyle::Trap => "Trap",
            BeatStyle::HalfTime => "Half-Time",
            BeatStyle::Funk => "Funk",
            BeatStyle::Shuffle => "Shuffle",
            BeatStyle::Latin => "Latin",
            BeatStyle::Jazz => "Jazz",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct StepEvent {
    pub step: u8,
    pub voice: DrumVoice,
    pub velocity: u8,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct BeatPattern {
    pub name: &'static str,
    pub style: BeatStyle,
    pub steps_per_bar: u8,
    pub events: Vec<StepEvent>,
    pub swing: u8,
}

impl BeatPattern {
    pub fn events_at_step(&self, step: u8) -> Vec<StepEvent> {
        self.events
            .iter()
            .copied()
            .filter(|event| event.step == step)
            .collect()
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BeatFeel {
    pub intensity: u8,
    pub swing: u8,
}

fn clamp_u8(value: u8, min: u8, max: u8) -> u8 {
    value.max(min).min(max)
}

fn hats_every_eighth(velocity: u8) -> Vec<StepEvent> {
    [0, 2, 4, 6, 8, 10, 12, 14]
        .iter()
        .map(|&step| StepEvent {
            step,
            voice: DrumVoice::ClosedHat,
            velocity,
        })
        .collect()
}

fn hats_every_sixteenth(base_velocity: u8, accent_velocity: u8) -> Vec<StepEvent> {
    (0..16)
        .map(|step| StepEvent {
            step,
            voice: DrumVoice::ClosedHat,
            velocity: if step % 4 == 0 {
                accent_velocity
            } else {
                base_velocity
            },
        })
        .collect()
}

fn with_feel(
    name: &'static str,
    style: BeatStyle,
    mut events: Vec<StepEvent>,
    feel: BeatFeel,
) -> BeatPattern {
    let intensity = clamp_u8(feel.intensity, 1, 127);
    for event in &mut events {
        event.velocity = clamp_u8(
            ((event.velocity as u16 * intensity as u16) / 100) as u8,
            1,
            127,
        );
    }

    BeatPattern {
        name,
        style,
        steps_per_bar: 16,
        events,
        swing: clamp_u8(feel.swing, 0, 75),
    }
}

pub fn beat_pattern(style: BeatStyle, feel: BeatFeel) -> BeatPattern {
    match style {
        BeatStyle::Rock => {
            let mut events = vec![
                StepEvent {
                    step: 0,
                    voice: DrumVoice::Kick,
                    velocity: 118,
                },
                StepEvent {
                    step: 4,
                    voice: DrumVoice::Snare,
                    velocity: 116,
                },
                StepEvent {
                    step: 8,
                    voice: DrumVoice::Kick,
                    velocity: 110,
                },
                StepEvent {
                    step: 12,
                    voice: DrumVoice::Snare,
                    velocity: 116,
                },
                StepEvent {
                    step: 10,
                    voice: DrumVoice::Kick,
                    velocity: 86,
                },
            ];
            events.extend(hats_every_eighth(74));
            with_feel("Rock Backbeat", style, events, feel)
        }
        BeatStyle::BoomBap => {
            let mut events = vec![
                StepEvent {
                    step: 0,
                    voice: DrumVoice::Kick,
                    velocity: 120,
                },
                StepEvent {
                    step: 3,
                    voice: DrumVoice::Kick,
                    velocity: 80,
                },
                StepEvent {
                    step: 4,
                    voice: DrumVoice::Snare,
                    velocity: 120,
                },
                StepEvent {
                    step: 8,
                    voice: DrumVoice::Kick,
                    velocity: 112,
                },
                StepEvent {
                    step: 12,
                    voice: DrumVoice::Snare,
                    velocity: 122,
                },
                StepEvent {
                    step: 12,
                    voice: DrumVoice::Clap,
                    velocity: 94,
                },
            ];
            events.extend(hats_every_sixteenth(46, 70));
            with_feel("Boom Bap Pocket", style, events, feel)
        }
        BeatStyle::FourOnTheFloor => {
            let mut events = vec![
                StepEvent {
                    step: 0,
                    voice: DrumVoice::Kick,
                    velocity: 120,
                },
                StepEvent {
                    step: 4,
                    voice: DrumVoice::Kick,
                    velocity: 120,
                },
                StepEvent {
                    step: 8,
                    voice: DrumVoice::Kick,
                    velocity: 120,
                },
                StepEvent {
                    step: 12,
                    voice: DrumVoice::Kick,
                    velocity: 120,
                },
                StepEvent {
                    step: 4,
                    voice: DrumVoice::Clap,
                    velocity: 108,
                },
                StepEvent {
                    step: 12,
                    voice: DrumVoice::Clap,
                    velocity: 108,
                },
                StepEvent {
                    step: 6,
                    voice: DrumVoice::OpenHat,
                    velocity: 80,
                },
                StepEvent {
                    step: 14,
                    voice: DrumVoice::OpenHat,
                    velocity: 80,
                },
            ];
            events.extend(hats_every_eighth(78));
            with_feel("Four on the Floor", style, events, feel)
        }
        BeatStyle::Trap => {
            let mut events = vec![
                StepEvent {
                    step: 0,
                    voice: DrumVoice::Kick,
                    velocity: 118,
                },
                StepEvent {
                    step: 7,
                    voice: DrumVoice::Kick,
                    velocity: 78,
                },
                StepEvent {
                    step: 10,
                    voice: DrumVoice::Kick,
                    velocity: 92,
                },
                StepEvent {
                    step: 4,
                    voice: DrumVoice::Snare,
                    velocity: 120,
                },
                StepEvent {
                    step: 12,
                    voice: DrumVoice::Snare,
                    velocity: 124,
                },
                StepEvent {
                    step: 15,
                    voice: DrumVoice::Perc,
                    velocity: 72,
                },
            ];
            events.extend(hats_every_sixteenth(52, 76));
            with_feel("Trap Grid", style, events, feel)
        }
        BeatStyle::HalfTime => {
            let mut events = vec![
                StepEvent { step: 0, voice: DrumVoice::Kick, velocity: 120 },
                StepEvent { step: 6, voice: DrumVoice::Kick, velocity: 84 },
                StepEvent { step: 8, voice: DrumVoice::Snare, velocity: 122 },
                StepEvent { step: 11, voice: DrumVoice::Kick, velocity: 92 },
                StepEvent { step: 14, voice: DrumVoice::Perc, velocity: 70 },
            ];
            events.extend(hats_every_eighth(76));
            with_feel("Half-Time Weight", style, events, feel)
        }
        BeatStyle::Funk => {
            // Groove funk syncopé — kick sur les 1 et & du 3, snare sur 2 et 4
            let events = vec![
                StepEvent { step: 0, voice: DrumVoice::Kick, velocity: 120 },
                StepEvent { step: 3, voice: DrumVoice::Kick, velocity: 78 },
                StepEvent { step: 4, voice: DrumVoice::Snare, velocity: 110 },
                StepEvent { step: 6, voice: DrumVoice::Kick, velocity: 68 },
                StepEvent { step: 7, voice: DrumVoice::Kick, velocity: 88 },
                StepEvent { step: 9, voice: DrumVoice::Clap, velocity: 84 },
                StepEvent { step: 10, voice: DrumVoice::Kick, velocity: 72 },
                StepEvent { step: 12, voice: DrumVoice::Snare, velocity: 112 },
                StepEvent { step: 14, voice: DrumVoice::Kick, velocity: 76 },
                // Hats 16th avec accentuation syncopée
                StepEvent { step: 0, voice: DrumVoice::ClosedHat, velocity: 88 },
                StepEvent { step: 1, voice: DrumVoice::ClosedHat, velocity: 52 },
                StepEvent { step: 2, voice: DrumVoice::ClosedHat, velocity: 72 },
                StepEvent { step: 3, voice: DrumVoice::ClosedHat, velocity: 48 },
                StepEvent { step: 4, voice: DrumVoice::ClosedHat, velocity: 84 },
                StepEvent { step: 5, voice: DrumVoice::ClosedHat, velocity: 50 },
                StepEvent { step: 6, voice: DrumVoice::ClosedHat, velocity: 70 },
                StepEvent { step: 7, voice: DrumVoice::OpenHat, velocity: 74 },
                StepEvent { step: 8, voice: DrumVoice::ClosedHat, velocity: 88 },
                StepEvent { step: 9, voice: DrumVoice::ClosedHat, velocity: 52 },
                StepEvent { step: 10, voice: DrumVoice::ClosedHat, velocity: 70 },
                StepEvent { step: 11, voice: DrumVoice::ClosedHat, velocity: 48 },
                StepEvent { step: 12, voice: DrumVoice::ClosedHat, velocity: 84 },
                StepEvent { step: 13, voice: DrumVoice::ClosedHat, velocity: 50 },
                StepEvent { step: 14, voice: DrumVoice::ClosedHat, velocity: 72 },
                StepEvent { step: 15, voice: DrumVoice::OpenHat, velocity: 68 },
            ];
            with_feel("Funk Pocket", style, events, feel)
        }
        BeatStyle::Shuffle => {
            // Shuffle/blues — feel ternaire simulé avec vélocités
            let mut events = vec![
                StepEvent { step: 0, voice: DrumVoice::Kick, velocity: 118 },
                StepEvent { step: 4, voice: DrumVoice::Snare, velocity: 114 },
                StepEvent { step: 6, voice: DrumVoice::Kick, velocity: 76 },
                StepEvent { step: 8, voice: DrumVoice::Kick, velocity: 108 },
                StepEvent { step: 10, voice: DrumVoice::Kick, velocity: 68 },
                StepEvent { step: 12, voice: DrumVoice::Snare, velocity: 116 },
            ];
            // Hats shuffle : accent sur les temps, silence sur les & pour simuler le ternaire
            for step in [0u8, 2, 4, 6, 8, 10, 12, 14] {
                events.push(StepEvent {
                    step,
                    voice: DrumVoice::ClosedHat,
                    velocity: if step % 4 == 0 { 92 } else { 58 },
                });
            }
            with_feel("Shuffle Blues", style, events, feel)
        }
        BeatStyle::Latin => {
            // Groove Latin / bossa-nova
            let events = vec![
                StepEvent { step: 0, voice: DrumVoice::Kick, velocity: 112 },
                StepEvent { step: 3, voice: DrumVoice::Kick, velocity: 72 },
                StepEvent { step: 6, voice: DrumVoice::Kick, velocity: 88 },
                StepEvent { step: 8, voice: DrumVoice::Snare, velocity: 90 },
                StepEvent { step: 9, voice: DrumVoice::Kick, velocity: 68 },
                StepEvent { step: 11, voice: DrumVoice::Kick, velocity: 78 },
                StepEvent { step: 12, voice: DrumVoice::Snare, velocity: 86 },
                StepEvent { step: 14, voice: DrumVoice::Kick, velocity: 74 },
                // Clave rythmique sur Perc
                StepEvent { step: 0, voice: DrumVoice::Perc, velocity: 96 },
                StepEvent { step: 3, voice: DrumVoice::Perc, velocity: 80 },
                StepEvent { step: 6, voice: DrumVoice::Perc, velocity: 88 },
                StepEvent { step: 8, voice: DrumVoice::Perc, velocity: 94 },
                StepEvent { step: 11, voice: DrumVoice::Perc, velocity: 78 },
                // Hats légers sur les croches
                StepEvent { step: 0, voice: DrumVoice::ClosedHat, velocity: 62 },
                StepEvent { step: 2, voice: DrumVoice::ClosedHat, velocity: 50 },
                StepEvent { step: 4, voice: DrumVoice::ClosedHat, velocity: 62 },
                StepEvent { step: 6, voice: DrumVoice::ClosedHat, velocity: 50 },
                StepEvent { step: 8, voice: DrumVoice::ClosedHat, velocity: 62 },
                StepEvent { step: 10, voice: DrumVoice::ClosedHat, velocity: 50 },
                StepEvent { step: 12, voice: DrumVoice::ClosedHat, velocity: 62 },
                StepEvent { step: 14, voice: DrumVoice::ClosedHat, velocity: 50 },
            ];
            with_feel("Latin Groove", style, events, feel)
        }
        BeatStyle::Jazz => {
            // Jazz ride pattern — ride sur les croches avec swing fort
            let events = vec![
                StepEvent { step: 0, voice: DrumVoice::Kick, velocity: 88 },
                StepEvent { step: 8, voice: DrumVoice::Kick, velocity: 72 },
                // Snare ghost notes (brush feel)
                StepEvent { step: 4, voice: DrumVoice::Snare, velocity: 62 },
                StepEvent { step: 6, voice: DrumVoice::Snare, velocity: 44 },
                StepEvent { step: 12, voice: DrumVoice::Snare, velocity: 64 },
                StepEvent { step: 14, voice: DrumVoice::Snare, velocity: 44 },
                // Ride cymbal (simulé sur ClosedHat)
                StepEvent { step: 0, voice: DrumVoice::ClosedHat, velocity: 90 },
                StepEvent { step: 2, voice: DrumVoice::ClosedHat, velocity: 56 },
                StepEvent { step: 4, voice: DrumVoice::ClosedHat, velocity: 82 },
                StepEvent { step: 6, voice: DrumVoice::ClosedHat, velocity: 52 },
                StepEvent { step: 8, voice: DrumVoice::ClosedHat, velocity: 88 },
                StepEvent { step: 10, voice: DrumVoice::ClosedHat, velocity: 54 },
                StepEvent { step: 12, voice: DrumVoice::ClosedHat, velocity: 82 },
                StepEvent { step: 14, voice: DrumVoice::ClosedHat, velocity: 52 },
                // Open hat sur le 2 et 4 (Charleston)
                StepEvent { step: 4, voice: DrumVoice::OpenHat, velocity: 76 },
                StepEvent { step: 12, voice: DrumVoice::OpenHat, velocity: 76 },
            ];
            with_feel("Jazz Ride", style, events, feel)
        }
    }
}

pub fn common_beat_patterns() -> Vec<BeatPattern> {
    let default_feel = BeatFeel {
        intensity: 100,
        swing: 0,
    };
    [
        BeatStyle::Rock,
        BeatStyle::BoomBap,
        BeatStyle::FourOnTheFloor,
        BeatStyle::Trap,
        BeatStyle::HalfTime,
        BeatStyle::Funk,
        BeatStyle::Shuffle,
        BeatStyle::Latin,
        BeatStyle::Jazz,
    ]
    .into_iter()
    .map(|style| beat_pattern(style, default_feel))
    .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn common_patterns_are_non_empty() {
        assert!(!common_beat_patterns().is_empty());
    }

    #[test]
    fn four_on_the_floor_has_four_kicks() {
        let pattern = beat_pattern(
            BeatStyle::FourOnTheFloor,
            BeatFeel {
                intensity: 100,
                swing: 0,
            },
        );
        let kicks = pattern
            .events
            .iter()
            .filter(|event| event.voice == DrumVoice::Kick)
            .count();
        assert_eq!(kicks, 4);
    }

    #[test]
    fn boom_bap_has_backbeat_snare() {
        let pattern = beat_pattern(
            BeatStyle::BoomBap,
            BeatFeel {
                intensity: 100,
                swing: 0,
            },
        );
        assert!(pattern
            .events
            .iter()
            .any(|event| event.voice == DrumVoice::Snare && event.step == 4));
        assert!(pattern
            .events
            .iter()
            .any(|event| event.voice == DrumVoice::Snare && event.step == 12));
    }

    #[test]
    fn intensity_scales_velocities() {
        let soft = beat_pattern(
            BeatStyle::Rock,
            BeatFeel {
                intensity: 60,
                swing: 0,
            },
        );
        let loud = beat_pattern(
            BeatStyle::Rock,
            BeatFeel {
                intensity: 120,
                swing: 0,
            },
        );
        let soft_kick = soft
            .events
            .iter()
            .find(|event| event.voice == DrumVoice::Kick && event.step == 0)
            .unwrap();
        let loud_kick = loud
            .events
            .iter()
            .find(|event| event.voice == DrumVoice::Kick && event.step == 0)
            .unwrap();
        assert!(soft_kick.velocity < loud_kick.velocity);
    }

    #[test]
    fn events_at_step_filters_correctly() {
        let pattern = beat_pattern(
            BeatStyle::HalfTime,
            BeatFeel {
                intensity: 100,
                swing: 0,
            },
        );
        let events = pattern.events_at_step(8);
        assert!(events.iter().any(|event| event.voice == DrumVoice::Snare));
    }

    #[test]
    fn common_patterns_use_valid_step_positions() {
        for pattern in common_beat_patterns() {
            assert_eq!(pattern.steps_per_bar, 16);
            assert!(pattern
                .events
                .iter()
                .all(|event| event.step < pattern.steps_per_bar));
        }
    }

    #[test]
    fn swing_is_clamped_to_supported_range() {
        let pattern = beat_pattern(
            BeatStyle::Rock,
            BeatFeel {
                intensity: 100,
                swing: 120,
            },
        );
        assert_eq!(pattern.swing, 75);
    }

    #[test]
    fn every_common_pattern_has_a_downbeat_anchor() {
        for pattern in common_beat_patterns() {
            assert!(
                pattern.events.iter().any(|event| event.step == 0),
                "pattern '{}' should anchor the bar on step 0",
                pattern.name
            );
        }
    }
}
