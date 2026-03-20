/**
 * MIDI Parser — converts any text input into parsed MIDI note tokens.
 *
 * Supports:
 *  - MIDI numbers: 0–127
 *  - Note names: C4, Eb5, F#3, Db2, etc. (octave optional, defaults to 4)
 *  - Solfège: do, ré/re, mi, fa, sol, la, si (with accidentals: b/#/d)
 *    Examples: do, ré, solb, sol#, sold, do1, ré2, solb3, sold4
 *  - Any separator (commas, spaces, pipes, dashes, semicolons, etc.)
 */

// Note name → semitone offset from C
const NOTE_MAP = {
  C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11,
}

// Solfège name → semitone offset from C (supports accented and unaccented)
const SOLFEGE_MAP = {
  do: 0, ut: 0,
  ré: 2, re: 2,
  mi: 4,
  fa: 5,
  sol: 7,
  la: 9,
  si: 11,
}

// Regex for standard note names: C4, Eb5, F#3, Db-1, C (no octave = default 4)
const NOTE_NAME_RE = /^([A-Ga-g])(#{1,2}|b{1,2})?(-?\d)?$/

// Regex for solfège: do, ré2, solb3, sol#4, sold4, etc.
// Accidentals: b (flat), # (sharp), d (dièse = sharp)
const SOLFEGE_RE = /^(do|ut|ré|re|mi|fa|sol|la|si)(#{1,2}|b{1,2}|d)?(-?\d)?$/i

const DEFAULT_OCTAVE = 4

/**
 * Parse a solfège string (e.g. "solb3") into a MIDI number.
 * Returns null if the string isn't a valid solfège note.
 */
function solfegeToMidi(name) {
  const match = name.match(SOLFEGE_RE)
  if (!match) return null

  const [, syllable, accidental, octaveStr] = match
  const base = SOLFEGE_MAP[syllable.toLowerCase()]
  if (base === undefined) return null

  let offset = 0
  if (accidental) {
    if (accidental === '#' || accidental.toLowerCase() === 'd') offset = 1
    else if (accidental === '##') offset = 2
    else if (accidental === 'b') offset = -1
    else if (accidental === 'bb') offset = -2
  }

  const octave = octaveStr !== undefined ? parseInt(octaveStr, 10) : DEFAULT_OCTAVE
  const midi = (octave + 1) * 12 + base + offset

  if (midi < 0 || midi > 127) return null
  return midi
}

/**
 * Parse a note name string (e.g. "Eb5") into a MIDI number.
 * If no octave is specified, defaults to octave 4.
 * Returns null if the string isn't a valid note name.
 */
export function noteNameToMidi(name) {
  const match = name.match(NOTE_NAME_RE)
  if (!match) return null

  const [, letter, accidental, octaveStr] = match
  const base = NOTE_MAP[letter.toUpperCase()]
  if (base === undefined) return null

  let offset = 0
  if (accidental) {
    if (accidental === '#') offset = 1
    else if (accidental === '##') offset = 2
    else if (accidental === 'b') offset = -1
    else if (accidental === 'bb') offset = -2
  }

  const octave = octaveStr !== undefined ? parseInt(octaveStr, 10) : DEFAULT_OCTAVE
  const midi = (octave + 1) * 12 + base + offset

  if (midi < 0 || midi > 127) return null
  return midi
}

/**
 * Convert a MIDI number to a human-readable note name.
 */
const NOTE_NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']

export function midiToNoteName(midi) {
  if (midi < 0 || midi > 127) return null
  const octave = Math.floor(midi / 12) - 1
  const note = NOTE_NAMES[midi % 12]
  return `${note}${octave}`
}

/**
 * Tokenize and parse an input string into an array of note tokens.
 *
 * Each token is: { raw, midi, name, valid, start, end }
 * - raw: the original text token
 * - midi: the resolved MIDI number (or null if invalid)
 * - name: the human-readable note name (or null)
 * - valid: boolean
 * - start: start index in the original input string
 * - end: end index (exclusive) in the original input string
 */
export function parseNotes(input) {
  if (!input || !input.trim()) return []

  // Match tokens with their positions using regex
  const tokenRegex = /[\p{L}0-9#\-]+/gu
  const tokens = []
  let match
  while ((match = tokenRegex.exec(input)) !== null) {
    const raw = match[0].trim()
    if (raw.length > 0) {
      tokens.push({ raw, start: match.index, end: match.index + match[0].length })
    }
  }

  return tokens.map(({ raw, start, end }) => {
    // First, try as a plain MIDI number
    if (/^\d+$/.test(raw)) {
      const num = parseInt(raw, 10)
      if (num >= 0 && num <= 127) {
        return { raw, midi: num, name: midiToNoteName(num), valid: true, start, end }
      }
      return { raw, midi: null, name: null, valid: false, start, end }
    }

    // Try as solfège (do, ré, sol#, solb3, etc.)
    const solfegeMidi = solfegeToMidi(raw)
    if (solfegeMidi !== null) {
      return { raw, midi: solfegeMidi, name: midiToNoteName(solfegeMidi), valid: true, start, end }
    }

    // Then, try as a standard note name (C4, Eb5, G, etc.)
    const midi = noteNameToMidi(raw)
    if (midi !== null) {
      return { raw, midi, name: midiToNoteName(midi), valid: true, start, end }
    }

    // Invalid
    return { raw, midi: null, name: null, valid: false, start, end }
  })
}

// ─── Conversion helpers ─────────────────────────────────────

const NOTE_NAMES_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const NOTE_NAMES_FLAT  = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']

const SOLFEGE_NAMES_SHARP = ['Do', 'Do#', 'Ré', 'Ré#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si']
const SOLFEGE_NAMES_FLAT  = ['Do', 'Réb', 'Ré', 'Mib', 'Mi', 'Fa', 'Solb', 'Sol', 'Lab', 'La', 'Sib', 'Si']

/**
 * Convert a MIDI number to a note name with the accidental style matching the original input.
 * Uses sharp for sharp inputs, flat for flat inputs, and the NOTE_NAMES default otherwise.
 */
function midiToNoteNameStyled(midi, originalRaw) {
  if (midi < 0 || midi > 127) return null
  const octave = Math.floor(midi / 12) - 1
  const semitone = midi % 12
  // Check if original used flat (b) or sharp (#)
  const useFlat = originalRaw && /b/i.test(originalRaw) && !/^[A-Ga-g]/.test(originalRaw) === false
  const hasFlat = originalRaw && originalRaw.includes('b')
  const note = hasFlat ? NOTE_NAMES_FLAT[semitone] : NOTE_NAMES_SHARP[semitone]
  return `${note}${octave}`
}

/**
 * Convert MIDI number to note name in C#/Db notation.
 * @param {number} midi
 * @param {boolean} compact - if true, omit octave 4
 */
export function midiToNoteNotation(midi, compact = false) {
  if (midi < 0 || midi > 127) return String(midi)
  const octave = Math.floor(midi / 12) - 1
  const note = NOTE_NAMES[midi % 12]
  if (compact && octave === 4) return note
  return `${note}${octave}`
}

/**
 * Convert MIDI number to solfège notation.
 * @param {number} midi
 * @param {boolean} compact - if true, omit octave 4
 */
export function midiToSolfegeNotation(midi, compact = false) {
  if (midi < 0 || midi > 127) return String(midi)
  const octave = Math.floor(midi / 12) - 1
  const semitone = midi % 12
  // Use the same accidental preference as the default NOTE_NAMES mapping
  const defaultNote = NOTE_NAMES[semitone]
  const solfege = defaultNote.includes('b') ? SOLFEGE_NAMES_FLAT[semitone] : SOLFEGE_NAMES_SHARP[semitone]
  if (compact && octave === 4) return solfege
  return `${solfege}${octave}`
}
