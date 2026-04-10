/* ============================================================================
 * Harmonia – Musical Analysis Types
 *
 * This file defines the shared musical vocabulary used by the entire engine.
 * These types are STYLE-AGNOSTIC and must remain stable over time.
 * ============================================================================
 */

import { NoteValue } from "../core/notes";

/* ---------------------------------------------------------------------------
 * Input
 * ---------------------------------------------------------------------------
 */

export interface ChordInput {
  root: NoteValue;
  type: string;
}

/* ---------------------------------------------------------------------------
 * Core musical dimensions
 * ---------------------------------------------------------------------------
 */

export enum HarmonicDensity {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high"
}

export enum AmbiguityLevel {
  NONE = "none",
  CONTROLLED = "controlled",
  HIGH = "high"
}

export enum StabilityLevel {
  STABLE = "stable",
  UNSTABLE = "unstable",
  SUSPENDED = "suspended"
}

export enum MusicalRole {
  FOUNDATION = "foundation",
  TENSION = "tension",
  TRANSITION = "transition",
  RELEASE = "release"
}

export enum ConfidenceLevel {
  HIGH = "high",
  MEDIUM = "medium"
}

/* ---------------------------------------------------------------------------
 * Note-level analysis
 * ---------------------------------------------------------------------------
 */

export enum NoteRole {
  ESSENTIAL = "essential",
  TOLERATED = "tolerated",
  CONFLICTING = "conflicting"
}

export interface NoteAnalysis {
  note: NoteValue;
  role: NoteRole;
  reason: string;
}

/* ---------------------------------------------------------------------------
 * Harmonic suggestions
 * ---------------------------------------------------------------------------
 */

export interface ModeSuggestion {
  name: string;
  parentScale: string;
  confidence: ConfidenceLevel;
}

/* ---------------------------------------------------------------------------
 * Chord analysis output
 * ---------------------------------------------------------------------------
 */

export interface ChordAnalysis {
  /* -----------------------------------------------------------------------
   * Factual chord description
   * -----------------------------------------------------------------------
   */
  chord: {
    name: string;
    root: NoteValue;
    notes: NoteValue[];
    missingDegrees: string[];
    density: HarmonicDensity;
  };

  /* -----------------------------------------------------------------------
   * Structural interpretation
   * -----------------------------------------------------------------------
   */
  structure: {
    completeness: "complete" | "incomplete";
    ambiguity: AmbiguityLevel;
    stability: StabilityLevel;
  };

  /* -----------------------------------------------------------------------
   * Harmonic space opened by the chord
   * -----------------------------------------------------------------------
   */
  harmonicSpace: {
    modes: ModeSuggestion[];
  };

  /* -----------------------------------------------------------------------
   * Musical intent (high-level understanding)
   * -----------------------------------------------------------------------
   */
  intent: {
    perceivedRole: MusicalRole;
    expressiveRange: "narrow" | "medium" | "wide";
  };

  /* -----------------------------------------------------------------------
   * Analysis & warnings
   * -----------------------------------------------------------------------
   */
  warnings: string[];

  /* -----------------------------------------------------------------------
   * Optional note-level analysis
   * -----------------------------------------------------------------------
   */
  noteAnalysis?: NoteAnalysis[];
}
