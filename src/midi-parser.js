/**
 * MIDI Parser — converts any text input into parsed MIDI note tokens.
 *
 * Supports:
 *  - MIDI numbers: 0–127
 *  - Note names: C4, Eb5, F#3, Db2, etc.
 *  - Any separator (commas, spaces, pipes, dashes, semicolons, etc.)
 */

// Note name → semitone offset from C
const NOTE_MAP = {
  C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11,
}

// Regex to match note names like C4, Eb5, F#3, Db-1, etc.
const NOTE_NAME_RE = /^([A-Ga-g])(#{1,2}|b{1,2})?(-?\d)$/

/**
 * Parse a note name string (e.g. "Eb5") into a MIDI number.
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

  const octave = parseInt(octaveStr, 10)
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
 * Each token is: { raw, midi, name, valid }
 * - raw: the original text token
 * - midi: the resolved MIDI number (or null if invalid)
 * - name: the human-readable note name (or null)
 * - valid: boolean
 */
export function parseNotes(input) {
  if (!input || !input.trim()) return []

  // Split on anything that isn't: a digit, a letter, a # sign, or a minus (for octave -1)
  const tokens = input
    .split(/[^a-gA-G0-9#b\-]+/)
    .map(t => t.trim())
    .filter(t => t.length > 0)

  return tokens.map(raw => {
    // First, try as a plain MIDI number
    if (/^\d+$/.test(raw)) {
      const num = parseInt(raw, 10)
      if (num >= 0 && num <= 127) {
        return { raw, midi: num, name: midiToNoteName(num), valid: true }
      }
      return { raw, midi: null, name: null, valid: false }
    }

    // Then, try as a note name
    const midi = noteNameToMidi(raw)
    if (midi !== null) {
      return { raw, midi, name: midiToNoteName(midi), valid: true }
    }

    // Invalid
    return { raw, midi: null, name: null, valid: false }
  })
}
