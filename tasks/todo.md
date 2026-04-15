# Harmonia — TODO

> Audit initial 2026-04-15. Stack: Tauri + React/TS + Rust music-engine.
> Panels: Dashboard · Jam · Practice · Fretboard · Riff · Palettes · Beat

---

## 🔴 CRITIQUE — Blockers fonctionnels

- [ ] **RiffLab sans playback** : on génère un riff mais on ne peut pas l'entendre. C'est la feature centrale — il faut un bouton Play qui joue les steps générés via `useAudio` (note par note au tempo).

- [ ] **BeatMaker sans transport autonome** : le beat ne joue que quand le Jam transport tourne. Il faut un bouton Play/Stop indépendant dans BeatMakerPanel qui loop la pattern seule.

- [x] **Audio context autoplay bloqué** : `unlockAudio()` déjà appelé dans `startJam` et `startPractice` — géré. (2026-04-15)

- [x] **RiffLab sans playback** : bouton Play/Stop dans RiffLabPanel, scheduler `setInterval` dans `useComposerState.startRiffPlayback()`, notes jouées via `audio.playGuideTone(midi)`. (2026-04-15)

- [x] **BeatMaker sans transport autonome** : bouton Play/Stop autonome dans BeatMakerPanel, `startBeatPlayback()`/`stopBeatPlayback()` dans `useComposerState`, loop via `setInterval` + `audio.playBeatStep()`. (2026-04-15)

- [x] **Dashboard vide au rechargement** : `dashboardProps.lastSession` tombe en fallback sur `sessionHistory[0]`, `bestCleanBpm` calculé comme max all-time depuis `sessionHistory`. (2026-04-15)

- [x] **Sections Riff Lab non persistées** : toutes les `useState` locales de RiffLabPanel migrées en `usePersistentState` avec clés `harmonia.riff-*`. (2026-04-15)

---

## 🟠 HAUTE PRIORITÉ — UX bloquante

- [x] **RiffLab : génération + lock steps** : bouton Shuffle (seed aléatoire), label "Variation" au lieu de "Seed", lock strip cliquable sous le tab (carré cyan = locké), PRNG reste cohérent même avec locks, bouton "Clear locks (N)". (2026-04-15)

- [ ] **RiffLab : pas de fretboard visuel** : le tab preview est en ASCII texte. Ajouter le composant `<Fretboard>` en dessous du tab pour visualiser les notes du riff sur le manche (les frets utilisés en surbrillance).

- [ ] **Dashboard : historique de pratique** : graphique BPM 7 sessions, total minutes, sessions totales — affiché. Reste à ajouter: miniature per-exercise breakdown. (partiellement fait 2026-04-15)

- [x] **BeatMaker : preview sonore au clic** : `onPreviewVoice(voice)` appelé à chaque clic de step via `audio.playBeatStep` single hit. (2026-04-15)

- [x] **BeatMaker : labels temps forts** : beats 1/2/3/4 affichés en gras accent sur les downbeats (steps 0/4/8/12), "·" discret sur les off-beats. (2026-04-15)

- [x] **Sample cache LRU** : éviction automatique dès que `sampleCacheRef` dépasse 64 entrées — suppression de l'entrée la plus ancienne. (2026-04-15)

- [x] **Raccourcis clavier cheatsheet** : bouton `?` dans le header, modale overlay avec 4 groupes (Navigation, Transport, Fretboard, Général), kbd stylisés. (2026-04-15)

- [ ] **Practice : pas de backing beat pendant l'exercice** : la Practice engine tourne seule sans la beat pattern. Ajouter une option "Jouer le groove pendant la pratique" qui active `useBeatComposer` en sync avec le tempo de practice.

- [ ] **Progression Jam : impossible de sauvegarder une progression personnalisée** : on peut construire une progression custom mais elle n'est pas sauvegardable avec un nom. Ajouter un bouton "Sauvegarder comme preset" qui l'ajoute à `namedProgs` en localStorage.

- [ ] **Sample cache non borné** : ~~résolu~~ LRU déjà appliqué ci-dessus.

---

## 🟡 MOYENNE — Qualité & cohérence

- [x] **Header navigation dupliqué** : supprimé le groupe "Workflow: Practice · Fretboard · Riff" redondant. Shortcut hint condensé en une ligne. (2026-04-15)

- [x] **RiffLab : seed peu intuitive** : champ renommé "Variation", bouton "Shuffle" pour randomiser. (2026-04-15)

- [ ] **Raccourcis clavier non discoverables** : le texte des shortcuts est sur une seule ligne compressée en haut à droite (`⌘K · Space · D · W · R...`). Personne ne le lit. Remplacer par un bouton `?` qui ouvre une modale de cheatsheet.

- [ ] **Practice : BPM découplé du BPM global** : le BPM de practice (`practiceEngine.currentBpm`) est séparé du BPM global de Jam. Confusant. Soit les unifier, soit les labeller clairement ("Practice BPM" vs "Jam BPM").

- [ ] **Fretboard Mastery : pas de légende des couleurs** : les points sur le fretboard ont des couleurs (chord tones, avoid, characteristic...) mais aucune légende dans ce panel. Ajouter une légende en bas du fretboard.

- [ ] **Pas d'état de chargement pour les suggestions de gammes** : si l'appel Tauri échoue ou prend du temps, `loading=true` mais l'UI ne montre rien d'explicite (pas de spinner visible dans ScaleSuggestionsPanel selon l'explore). Vérifier et ajouter un état vide clair avec message d'erreur si `error` est truthy.

- [ ] **RiffLab : seed peu intuitive** : le champ "Seed" (string → hash → PRNG) est un concept développeur. Remplacer par un label "Variation" + un bouton "Nouvelle variation" qui génère une seed aléatoire.

- [ ] **BeatMaker : pas de label de temps forts** : la grille 16 steps n'a que des numéros. Ajouter une indication visuelle des temps (1, 2, 3, 4) en surbrillance pour orienter le musicien.

- [ ] **Dashboard : boutons "Practice / Fretboard / Riff" sans contexte** : les 3 boutons quicklink n'affichent aucune info contextuelle (ex: "tu travailles E Dorian" ou "ta prochaine position: frets 5-9"). Enrichir avec les infos de `selectedScale` et `scalePositions`.

- [ ] **Pas de feedback quand Export MIDI réussit** : le bouton export MIDI déclenche un download silencieux. Ajouter un bref toast "Fichier MIDI téléchargé".

---

## 🟢 BASSE PRIORITÉ — Polish & architecture

- [ ] **Persistance projets sur disque** : l'ARCHITECTURE.md prévoit `projects/SongName/song.json` mais tout est en localStorage. Implémenter via Tauri `fs` API : save/load projet JSON (progressions + sections riff + settings beat).

- [ ] **Métronome visuel** : pendant le Jam et la Practice, aucun repère visuel du tempo. Ajouter un indicateur de beat simple (flash sur le temps 1, ou pulse sur tous les temps) dans le header.

- [ ] **Sidebar filter** : `sidebarFilter` et `onFilterTextChange` existent dans les props du sidebar mais pas sûr que ça filtre quelque chose d'utile. Vérifier et soit compléter (filtrer les presets d'accordage) soit supprimer.

- [ ] **Pas de dark/light mode** : l'app est dark-only. Le design system CSS variables est prêt pour un switch. Ajouter un toggle (pas prioritaire — le dark convient à un studio).

- [ ] **Tests React hooks** : zéro tests sur `usePracticeEngine`, `useAudio`, `useJamTransport`. Le music-engine Rust est très bien testé mais la glue TypeScript ne l'est pas. Ajouter au moins des tests sur `practiceMath.ts` et `transportMath.ts` si pas déjà là.

- [ ] **`useScaleAnalysis` : appels Tauri non annulés** : si le root/scale change rapidement, plusieurs appels Tauri peuvent être en vol simultanément. Ajouter un `AbortController` ou un ref `requestId` pour ignorer les réponses périmées.

- [ ] **Fretboard Mastery : auto-rotate sans indicateur de progression** : quand `autoRotate` est actif, rien n'indique le temps restant avant la prochaine rotation. Ajouter une progress bar ou un countdown discret.

---

## 📋 ORDRE D'ATTAQUE RECOMMANDÉ

1. **Audio unlock** (5 min, bloque tout le son)
2. **RiffLab playback** (core feature manquante)
3. **BeatMaker transport autonome** (feature complète bloquée)
4. **Dashboard persistence** (l'app semble morte à chaque relaunch)
5. **Sections riff persistées** (perte de données)
6. **RiffLab : lock steps + chord-tone priority** (composition réelle)
7. **Dashboard : historique + stats** (valeur long terme)
8. **Nettoyage navigation header** (confusion UX)
9. **Sample cache LRU** (stabilité long terme)
10. Reste de la liste dans l'ordre
