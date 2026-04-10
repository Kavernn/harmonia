
Riff Composer – Architecture Overview
1. Purpose of this project
Riff Composer is a macOS creative tool for music producers, focused on:

Guitar- and riff-first composition
Harmony exploration (chords, scales, modes)
Song structure and tension management
Fast export to Ableton (MIDI-first workflow)

This project is not a web product, not a SaaS, and not user-facing at scale.
It is a professional personal tool, designed to grow over time into a permanent studio instrument.

2. Core architectural principle

The musical engine is completely independent from the application UI.

This guarantees:

Long-term scalability
Safe refactoring
Multiple frontends (console, macOS app, potential plugin)
A stable core that evolves slowly and safely

The project follows a layered, domain-driven architecture.

3. High-level architecture
riff-composer/
├── music-engine/      ← musical intelligence (pure logic)
├── app/               ← macOS application shell (Tauri + UI)
├── projects/          ← local user data (songs, presets)
└── ARCHITECTURE.md    ← this document

Rule:
music-engine must NEVER depend on app.

4. music-engine (Core Musical Engine)
Responsibility
The music-engine folder contains all musical logic:

Notes and intervals
Chords
Scales and modes
Musical analysis (compatibility, ambiguity, tension)
Riff and progression analysis (future)

This layer:

Contains no UI code
Contains no audio
Contains no DAW-specific logic
Is fully testable and deterministic


Internal structure
music-engine/
├── core/        ← musical primitives
├── harmony/     ← chords, scales, modes
├── analysis/    ← intelligence, matching, tension
├── riff/        ← riff-related analysis (future)
├── progression/← song structure logic (future)
├── rhythm/      ← grooves & rhythm (future)
└── index.ts     ← public API


4.1 core/
Purpose:
Define the absolute foundations of musical representation.
Contents:

Note values (0–11 semitones)
Interval definitions
Tunings (standard, drop D, etc.)

Rules:

All music is represented in intervals
Notes names exist only for display
No assumptions about style (pop/rock/metal)

This layer changes very rarely.

4.2 harmony/
Purpose:
Musical vocabulary.
Contents:

Chord definitions (including incomplete chords like power chords)
Scale definitions
Mode definitions as rotations of scales

Important concepts:

Chords are defined by root + intervals
Modes are views on scales, never independent entities
Power chords and ambiguity are first-class citizens


4.3 analysis/
Purpose:
Musical intelligence and interpretation.
This is where the app becomes smart.
Contents:

Chord ↔ scale compatibility
Scale ↔ mode suggestion
Confidence levels (high / medium / low)
Future: tension, stability, ambiguity metrics

Rules:

This layer never introduces new musical facts
It only interprets existing musical data
Analysis is always explainable and deterministic

This layer is expected to evolve frequently.

4.4 Future domains
These modules do not exist yet, but are planned:

riff/: note clusters, riff ambiguity, guitar-centric logic
progression/: sections, movement, song dynamics
rhythm/: grooves, time, rhythmic tension

Each domain:

Is isolated
Depends only on core, harmony, and analysis
Can be added or removed without breaking others


5. Public API design
The musical engine exposes high-level, stable APIs.
Example (conceptual):
analyzeChord(chord) → AnalysisResult

The UI, CLI, or any future integration should never:

Recompute musical logic
Reinterpret data differently
Contain hidden music rules

All intelligence lives in music-engine.

6. app (macOS Application)
Responsibility
The app folder contains:

The macOS application shell (Tauri)
The UI (React or similar)
Keyboard shortcuts, drag & drop, file dialogs
Audio preview and MIDI export

Important:

This layer is replaceable
UI and UX WILL change over time
The core musical engine must not


7. Data storage
The application uses local-first storage.
projects/
├── SongName/
│   ├── song.json
│   ├── chords.mid
│   ├── bass.mid
│   └── notes.md

Design goals:

Human-readable files
Easy backup
Compatible with macOS Finder, Git, and Time Machine

No mandatory cloud or database dependency.

8. Scalability rules
This project is considered scalable if:

A new musical feature can be added without modifying existing ones
The musical engine works without the UI
The UI can be replaced without touching the engine
New styles emerge from rules, not hard-coded presets


9. What NOT to do (very important)

Do not put musical logic in the UI
Do not create circular dependencies between domains
Do not optimize prematurely for performance or users
Do not hard-code genre-specific behavior


10. Guiding philosophy
Riff Composer is designed as:

A musical intelligence layer, not a generator.

It should:

Assist creativity, not replace it
Suggest, not decide
Explain, not obscure
Grow organically without technical debt


11. Contributor guideline (for any dev)
Before adding code, ask:

Is this musical logic or presentation?
Does this belong in an existing domain?
Can this be composed instead of hard-coded?
Would deleting this file remove only one idea?

If not, refactor before committing.