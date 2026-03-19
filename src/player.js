/**
 * Audio Player — loads SoundFont instruments and plays MIDI notes
 * via the Web Audio API using the soundfont-player library.
 */
import Soundfont from 'soundfont-player'

// General MIDI instrument list (subset of most useful ones)
export const INSTRUMENTS = [
  { id: 'acoustic_grand_piano', name: 'Grand Piano' },
  { id: 'bright_acoustic_piano', name: 'Bright Piano' },
  { id: 'electric_grand_piano', name: 'Electric Grand Piano' },
  { id: 'honkytonk_piano', name: 'Honky-tonk Piano' },
  { id: 'electric_piano_1', name: 'Electric Piano 1' },
  { id: 'electric_piano_2', name: 'Electric Piano 2' },
  { id: 'harpsichord', name: 'Harpsichord' },
  { id: 'clavinet', name: 'Clavinet' },
  { id: 'celesta', name: 'Celesta' },
  { id: 'glockenspiel', name: 'Glockenspiel' },
  { id: 'music_box', name: 'Music Box' },
  { id: 'vibraphone', name: 'Vibraphone' },
  { id: 'marimba', name: 'Marimba' },
  { id: 'xylophone', name: 'Xylophone' },
  { id: 'tubular_bells', name: 'Tubular Bells' },
  { id: 'church_organ', name: 'Church Organ' },
  { id: 'reed_organ', name: 'Reed Organ' },
  { id: 'accordion', name: 'Accordion' },
  { id: 'harmonica', name: 'Harmonica' },
  { id: 'acoustic_guitar_nylon', name: 'Nylon Guitar' },
  { id: 'acoustic_guitar_steel', name: 'Steel Guitar' },
  { id: 'electric_guitar_jazz', name: 'Jazz Guitar' },
  { id: 'electric_guitar_clean', name: 'Clean Electric Guitar' },
  { id: 'overdriven_guitar', name: 'Overdriven Guitar' },
  { id: 'distortion_guitar', name: 'Distortion Guitar' },
  { id: 'acoustic_bass', name: 'Acoustic Bass' },
  { id: 'electric_bass_finger', name: 'Electric Bass (Finger)' },
  { id: 'slap_bass_1', name: 'Slap Bass' },
  { id: 'violin', name: 'Violin' },
  { id: 'viola', name: 'Viola' },
  { id: 'cello', name: 'Cello' },
  { id: 'contrabass', name: 'Contrabass' },
  { id: 'orchestral_harp', name: 'Orchestral Harp' },
  { id: 'string_ensemble_1', name: 'String Ensemble' },
  { id: 'choir_aahs', name: 'Choir Aahs' },
  { id: 'trumpet', name: 'Trumpet' },
  { id: 'trombone', name: 'Trombone' },
  { id: 'french_horn', name: 'French Horn' },
  { id: 'tuba', name: 'Tuba' },
  { id: 'soprano_sax', name: 'Soprano Sax' },
  { id: 'alto_sax', name: 'Alto Sax' },
  { id: 'tenor_sax', name: 'Tenor Sax' },
  { id: 'clarinet', name: 'Clarinet' },
  { id: 'flute', name: 'Flute' },
  { id: 'piccolo', name: 'Piccolo' },
  { id: 'ocarina', name: 'Ocarina' },
  { id: 'pan_flute', name: 'Pan Flute' },
  { id: 'steel_drums', name: 'Steel Drums' },
  { id: 'kalimba', name: 'Kalimba' },
]

let audioContext = null
let currentInstrument = null
let currentInstrumentId = null
let gainNode = null

/**
 * Get or create the AudioContext (must be called after user gesture).
 */
export function getAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)()
  }
  if (audioContext.state === 'suspended') {
    audioContext.resume()
  }
  if (!gainNode) {
    gainNode = audioContext.createGain()
    gainNode.gain.value = 2.5
    gainNode.connect(audioContext.destination)
  }
  return audioContext
}

/**
 * Load a soundfont instrument by its General MIDI id.
 * Caches the instrument if already loaded.
 */
export async function loadInstrument(instrumentId) {
  if (currentInstrumentId === instrumentId && currentInstrument) {
    return currentInstrument
  }

  const ac = getAudioContext()
  currentInstrument = await Soundfont.instrument(ac, instrumentId, {
    soundfont: 'MusyngKite',
    format: 'ogg',
    destination: gainNode,
  })
  currentInstrumentId = instrumentId
  return currentInstrument
}

/**
 * Play a single MIDI note.
 * @param {number} midi - MIDI note number (0-127)
 * @param {number} duration - Duration in seconds
 * @returns {object} The playing note (can call .stop() on it)
 */
export function playNote(midi, duration = 0.5) {
  if (!currentInstrument) return null
  return currentInstrument.play(midi, getAudioContext().currentTime, { duration })
}

/**
 * Stop all currently playing notes.
 */
export function stopAll() {
  if (currentInstrument) {
    currentInstrument.stop()
  }
}
