/**
 * MIDI Notes Player — Main Application
 */
import { parseNotes, midiToNoteName } from './midi-parser.js'
import { INSTRUMENTS, loadInstrument, playNote, stopAll, getAudioContext } from './player.js'

// Für Elise opening theme (MIDI numbers)
const FUR_ELISE = '76, 75, 76, 75, 76, 71, 74, 72, 69, 60, 64, 69, 71, 64, 68, 71, 72, 64, 76, 75, 76, 75, 76, 71, 74, 72, 69, 60, 64, 69, 71, 64, 72, 71, 69'

// DOM elements
const instrumentSelect = document.getElementById('instrument-select')
const notesInput = document.getElementById('notes-input')
const notesPreview = document.getElementById('notes-preview')
const playBtn = document.getElementById('play-btn')
const playIcon = playBtn.querySelector('.icon-play')
const stopIcon = playBtn.querySelector('.icon-stop')
const playLabel = playBtn.querySelector('.play-label')
const loadFurEliseBtn = document.getElementById('load-fur-elise')
const clearBtn = document.getElementById('clear-btn')
const tempoSlider = document.getElementById('tempo-slider')
const tempoValue = document.getElementById('tempo-value')
const durationSlider = document.getElementById('duration-slider')
const durationValue = document.getElementById('duration-value')
const nowPlaying = document.getElementById('now-playing')
const progressBar = document.getElementById('progress-bar')
const currentNoteDisplay = document.getElementById('current-note-display')

// State
let isPlaying = false
let playbackTimeout = null
let currentTokens = []
let instrumentLoaded = false
let instrumentLoading = false

// ─── Instrument Selector ───────────────────────────────────

function populateInstruments() {
  INSTRUMENTS.forEach(inst => {
    const option = document.createElement('option')
    option.value = inst.id
    option.textContent = inst.name
    instrumentSelect.appendChild(option)
  })
  // Default: Grand Piano
  instrumentSelect.value = 'acoustic_grand_piano'
}

async function handleInstrumentChange() {
  const id = instrumentSelect.value
  instrumentLoaded = false
  instrumentLoading = true
  instrumentSelect.disabled = true

  try {
    getAudioContext() // ensure context is resumed
    await loadInstrument(id)
    instrumentLoaded = true
  } catch (err) {
    console.error('Failed to load instrument:', err)
  } finally {
    instrumentLoading = false
    instrumentSelect.disabled = false
  }
}

// ─── Notes Input & Preview ─────────────────────────────────

function updatePreview() {
  const tokens = parseNotes(notesInput.value)
  currentTokens = tokens
  notesPreview.innerHTML = ''

  if (tokens.length === 0) return

  tokens.forEach((token, i) => {
    const el = document.createElement('span')
    el.className = `note-token${token.valid ? '' : ' invalid'}`
    el.dataset.index = i

    const main = document.createElement('span')
    main.textContent = token.raw

    el.appendChild(main)

    if (token.valid && token.name) {
      // Show the note name as a small label if input was a number, or MIDI number if input was a name
      const label = document.createElement('span')
      label.className = 'note-label'
      // If the raw input is a number, show the note name; otherwise show the MIDI number
      label.textContent = /^\d+$/.test(token.raw) ? token.name : token.midi
      el.appendChild(label)
    }

    if (token.valid) {
      el.title = `MIDI ${token.midi} — ${token.name}`
    } else {
      el.title = `Invalid note: "${token.raw}"`
    }

    notesPreview.appendChild(el)
  })
}

// Debounced preview update
let previewTimer = null
function schedulePreviewUpdate() {
  clearTimeout(previewTimer)
  previewTimer = setTimeout(updatePreview, 150)
}

// ─── Playback ──────────────────────────────────────────────

function getTempoMs() {
  // Convert BPM to ms per note
  return (60 / parseInt(tempoSlider.value, 10)) * 1000
}

function getNoteDuration() {
  return parseFloat(durationSlider.value)
}

async function startPlayback() {
  if (isPlaying) {
    stopPlayback()
    return
  }

  const validTokens = currentTokens.filter(t => t.valid)
  if (validTokens.length === 0) return

  // Ensure instrument is loaded
  if (!instrumentLoaded && !instrumentLoading) {
    await handleInstrumentChange()
  }
  if (!instrumentLoaded) return

  isPlaying = true
  setPlayingUI(true)
  nowPlaying.classList.remove('hidden')

  const interval = getTempoMs()
  const totalNotes = validTokens.length
  let noteIndex = 0

  // Map valid tokens to their original indices for highlighting
  const validIndices = currentTokens
    .map((t, i) => t.valid ? i : -1)
    .filter(i => i !== -1)

  function playNext() {
    if (!isPlaying || noteIndex >= totalNotes) {
      stopPlayback()
      return
    }

    const token = validTokens[noteIndex]
    const originalIndex = validIndices[noteIndex]

    // Highlight current note
    highlightToken(originalIndex)

    // Update progress
    progressBar.style.width = `${((noteIndex + 1) / totalNotes) * 100}%`
    currentNoteDisplay.textContent = `${token.name}  (MIDI ${token.midi})`

    // Play the note
    playNote(token.midi, getNoteDuration())

    noteIndex++
    playbackTimeout = setTimeout(playNext, interval)
  }

  playNext()
}

function stopPlayback() {
  isPlaying = false
  clearTimeout(playbackTimeout)
  stopAll()
  setPlayingUI(false)
  clearHighlights()

  // Reset progress after a short delay
  setTimeout(() => {
    if (!isPlaying) {
      nowPlaying.classList.add('hidden')
      progressBar.style.width = '0%'
      currentNoteDisplay.textContent = ''
    }
  }, 300)
}

function setPlayingUI(playing) {
  if (playing) {
    playBtn.classList.add('playing')
    playIcon.style.display = 'none'
    stopIcon.style.display = 'block'
    playLabel.textContent = 'Stop'
  } else {
    playBtn.classList.remove('playing')
    playIcon.style.display = 'block'
    stopIcon.style.display = 'none'
    playLabel.textContent = 'Play'
  }
}

function highlightToken(index) {
  clearHighlights()
  const el = notesPreview.querySelector(`[data-index="${index}"]`)
  if (el) {
    el.classList.add('active')
    // Scroll into view if needed
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }
}

function clearHighlights() {
  notesPreview.querySelectorAll('.note-token.active').forEach(el => {
    el.classList.remove('active')
  })
}

// ─── Tempo & Duration display ──────────────────────────────

function updateTempoDisplay() {
  tempoValue.textContent = `${tempoSlider.value} BPM`
}

function updateDurationDisplay() {
  durationValue.textContent = `${parseFloat(durationSlider.value).toFixed(2)}s`
}

// ─── Event Listeners ───────────────────────────────────────

instrumentSelect.addEventListener('change', handleInstrumentChange)
notesInput.addEventListener('input', schedulePreviewUpdate)
playBtn.addEventListener('click', startPlayback)

loadFurEliseBtn.addEventListener('click', () => {
  notesInput.value = FUR_ELISE
  updatePreview()
})

clearBtn.addEventListener('click', () => {
  notesInput.value = ''
  updatePreview()
  if (isPlaying) stopPlayback()
})

tempoSlider.addEventListener('input', updateTempoDisplay)
durationSlider.addEventListener('input', updateDurationDisplay)

// Keyboard shortcut: Space to play/stop (when not in textarea)
document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && e.target !== notesInput) {
    e.preventDefault()
    startPlayback()
  }
  if (e.code === 'Escape' && isPlaying) {
    stopPlayback()
  }
})

// ─── Initialize ────────────────────────────────────────────

function init() {
  populateInstruments()
  updateTempoDisplay()
  updateDurationDisplay()

  // Pre-load default instrument on first interaction
  const loadOnInteraction = async () => {
    document.removeEventListener('click', loadOnInteraction)
    document.removeEventListener('keydown', loadOnInteraction)
    await handleInstrumentChange()
  }
  document.addEventListener('click', loadOnInteraction)
  document.addEventListener('keydown', loadOnInteraction)

  // Load Für Elise by default for easy testing
  notesInput.value = FUR_ELISE
  updatePreview()
}

init()
