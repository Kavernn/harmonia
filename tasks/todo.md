# Harmonia — TODO

> Audit initial 2026-04-15. Stack: Tauri + React/TS + Rust music-engine.
> Panels: Dashboard · Jam · Practice · Fretboard · Riff · Palettes · Beat

---

## 🔴 CRITIQUE — Blockers fonctionnels

- [x] **Audio context autoplay bloqué** : `unlockAudio()` déjà appelé dans `startJam` et `startPractice` — géré. (2026-04-15)
- [x] **RiffLab sans playback** : bouton Play/Stop dans RiffLabPanel, scheduler `setInterval` dans `useComposerState.startRiffPlayback()`, notes jouées via `audio.playGuideTone(midi)`. (2026-04-15)
- [x] **BeatMaker sans transport autonome** : bouton Play/Stop autonome dans BeatMakerPanel, `startBeatPlayback()`/`stopBeatPlayback()`, loop via `setInterval` + `audio.playBeatStep()`. (2026-04-15)
- [x] **Dashboard vide au rechargement** : fallback sur `sessionHistory[0]`, `bestCleanBpm` max all-time depuis history persisté. (2026-04-15)
- [x] **Sections Riff Lab non persistées** : toutes les `useState` → `usePersistentState`. (2026-04-15)

---

## 🟠 HAUTE PRIORITÉ — UX bloquante

- [x] **RiffLab : lock steps + Shuffle** : lock strip cliquable, PRNG cohérent, bouton Clear locks. (2026-04-15)
- [x] **RiffLab : fretboard visuel** : composant `<Fretboard>` sous le tab preview, fenêtre sync avec position/windowSize. (2026-04-15)
- [x] **BeatMaker : preview sonore au clic** : `onPreviewVoice(voice)` via `audio.playBeatStep` single hit. (2026-04-15)
- [x] **BeatMaker : labels temps forts** : beats 1/2/3/4 en gras accent, off-beats "·". (2026-04-15)
- [x] **Sample cache LRU** : éviction automatique à 64 entrées max. (2026-04-15)
- [x] **Raccourcis clavier cheatsheet** : bouton `?` + modale 4 groupes. (2026-04-15)
- [x] **Practice : groove pendant la pratique** : toggle persistent, `startBeatPlayback()` au lancement de la practice, `stopBeatPlayback()` à l'arrêt. (2026-04-15)
- [x] **Progression Jam : save preset custom** : input + bouton "Sauvegarder", localStorage via `usePersistentState`, merge avec namedProgs Tauri, bouton ✕ pour supprimer. (2026-04-15)

---

## 🟡 MOYENNE — Qualité & cohérence

- [x] **Header navigation dupliqué** : supprimé le groupe "Workflow" redondant, shortcut hint condensé. (2026-04-15)
- [x] **RiffLab : seed → "Variation"** + bouton Shuffle. (2026-04-15)
- [x] **Raccourcis non discoverables** : bouton `?` + modale cheatsheet. (2026-04-15)
- [x] **BeatMaker : labels beats** : downbeats 1/2/3/4 en accent. (2026-04-15)
- [x] **Dashboard : quicklinks avec contexte** : sous-texte "Gamme: E Dorian" dans le bouton Practice si gamme active. (2026-04-15)
- [x] **Export MIDI toast** : "✓ Téléchargé" 2s après le download. (2026-04-15)
- [x] **Fretboard Mastery : légende couleurs** : 5 entrées (Tonique, Gamme, Caractéristiques, Évitement, Résolution) avec cercles colorés. (2026-04-15)
- [x] **ScaleSuggestions error state** : déjà géré — `loading` + `error` affichés. (audit)
- [x] **Sidebar filter** : déjà fonctionnel — filtre accordages ET gammes dans la sidebar. (audit)
- [x] **useScaleAnalysis AbortController** : pattern request ID sur `getSuggestedProgressions` et `getProgressionStepOptions`. (2026-04-15)
- [ ] **Practice : BPM label** : `practiceEngine.currentBpm` vs BPM global Jam — labeller clairement dans l'UI.

---

## 🟢 BASSE PRIORITÉ — Polish & architecture

- [x] **Fretboard Mastery : progress bar auto-rotate** : barre de progression 100ms-tick reset à chaque changement de position. (2026-04-15)
- [ ] **Persistance projets sur disque** : `projects/SongName/song.json` via Tauri `fs` API.
- [ ] **Métronome visuel** : indicateur de beat (flash temps 1) dans le header pendant Jam/Practice.
- [ ] **Pas de dark/light mode** : CSS variables prêt, juste le toggle à ajouter.
- [ ] **Tests React hooks** : `practiceMath.ts` et `transportMath.ts` partiellement testés — couvrir `usePracticeEngine` et `useAudio`.
