# Harmonia

Application desktop de référence pour la production musicale et l'entraînement guitare.

Construite avec **Tauri 2** (Rust) + **React 19** (TypeScript).

---

## Fonctionnalités

### Jam
Improvise sur des progressions harmoniques en temps réel.
- Constructeur de progressions diatoniques, empruntées et secondaires
- Analyse harmonique automatique (scales compatibles, guidance modale)
- Strum avec guitare acoustique (soundfont) ou synth pad
- Click track, métronome visuel, tap tempo
- Visualisation du manche en temps réel

### Practice
Entraînement structuré avec ramp de BPM et scoring.
- 10+ exercices : guide tones, arpèges, runs de gammes, résolution modale…
- BPM progressif (start → target, +N par rep propre)
- Scoring temps réel : pitch, timing, cibles harmoniques, résolution
- Input MIDI ou microphone
- Tablature défilante canvas
- Historique de session persistant

### Riff Lab
Compositeur de riffs avec export MIDI.
- Sections A/B/C indépendantes avec BPM propre
- Randomisation PRNG avec seed contrôlable
- Verrouillage de pas (lock steps)
- Export MIDI et ASCII tab

### Beat Maker
Groovebox 16 steps — 9 styles de groove.
- Rock, Boom Bap, Four on the Floor, Trap, Half-Time, Funk, Shuffle, Latin, Jazz
- Contrôle intensity + swing
- Éditeur de pas indépendant par voix (6 voix)

### Fretboard Mastery
Visualisation modale du manche.
- Modes d'affichage : fonction, degré, nom de note
- Highlighting : root, chord tone, color tone, avoid, characteristic, resolution

### Palettes
Suggestions de scales pour improviser sur une grille.
- Analyse chord par chord ou sur toute la progression
- Filtrage par confiance (high / medium / low)
- Guidance modale détaillée

---

## Accords supportés

| Qualité | Symbole | Intervalles |
|---------|---------|-------------|
| Major | C | R 3 5 |
| Minor | Cm | R ♭3 5 |
| Dominant 7 | C7 | R 3 5 ♭7 |
| Major 7 | Cmaj7 | R 3 5 7 |
| Minor 7 | Cm7 | R ♭3 5 ♭7 |
| Minor 7♭5 | Cm7♭5 | R ♭3 ♭5 ♭7 |
| Diminished 7 | Cdim7 | R ♭3 ♭5 ♭♭7 |
| Diminished | Cdim | R ♭3 ♭5 |
| Power | C5 | R 5 |
| Sus2 | Csus2 | R 2 5 |
| Sus4 | Csus4 | R 4 5 |
| Minor/Major 7 | CmMaj7 | R ♭3 5 7 |

---

## Raccourcis clavier

| Touche | Action |
|--------|--------|
| `D` | Dashboard |
| `J` | Jam |
| `W` | Practice |
| `S` | Palettes |
| `B` | Beat |
| `R` | Riff |
| `M` | Fretboard |
| `Space` | Play / Stop |
| `←` / `→` | Accord précédent / suivant |
| `+` / `-` | BPM +1 / -1 |
| `[` | Toggle sidebar |
| `⌘K` ou `/` | Palette de commandes |
| `?` | Aide raccourcis |

---

## Architecture

```
harmonia/
├── music-engine/       # Moteur musical Rust pur (zéro dépendances externes)
│   ├── src/core/       # Notes, intervalles, accordages
│   ├── src/harmony/    # Accords (12 qualités), gammes, modes
│   ├── src/analysis/   # Compatibilité scale↔accord, confidence
│   ├── src/progression/# Progressions, diatonic, solo guidance modale
│   ├── src/practice/   # Exercices, scoring, targets
│   ├── src/rhythm/     # 9 styles de beat 16 steps
│   └── src/riff/       # Positions sur le manche
├── src-tauri/          # Bridge Tauri (Rust → TypeScript via invoke)
└── src/                # Frontend React 19 + TypeScript
    ├── components/     # Panels UI
    ├── hooks/          # State, audio Web API, MIDI, transport, tap tempo
    └── services/       # musicApi.ts (wrappeur invoke Tauri)
```

**Principe :** Toute la logique musicale vit dans `music-engine` (Rust). Le frontend ne fait que visualiser et interagir — aucune logique musicale côté TypeScript.

---

## Dev

```bash
npm install
npm run tauri dev
```

Tests Rust :

```bash
cargo test
```

Type check :

```bash
npx tsc --noEmit
```
