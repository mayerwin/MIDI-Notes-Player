/**
 * MIDI Notes Player — Main Application
 */
import { parseNotes, midiToNoteName, midiToNoteNotation, midiToSolfegeNotation } from './midi-parser.js'
import { INSTRUMENTS, loadInstrument, playNote, stopAll, getAudioContext, ensureAudioReady, setVolume } from './player.js'

// Für Elise opening theme (MIDI numbers)
const FUR_ELISE = '76, 75, 76, 75, 76, 71, 74, 72, 69, 60, 64, 69, 71, 64, 68, 71, 72, 64, 76, 75, 76, 75, 76, 71, 74, 72, 69, 60, 64, 69, 71, 64, 72, 71, 69'

// DOM elements
const instrumentSelect = document.getElementById('instrument-select')
const notesInput = document.getElementById('notes-input')
const notesPreview = document.getElementById('notes-preview')
const playBtn = document.getElementById('play-btn')
const pauseBtn = document.getElementById('pause-btn')
const playIcon = playBtn.querySelector('.icon-play')
const stopIcon = playBtn.querySelector('.icon-stop')
const playLabel = playBtn.querySelector('.play-label')
const loadFurEliseBtn = document.getElementById('load-fur-elise')
const clearBtn = document.getElementById('clear-btn')
const convertBtn = document.getElementById('convert-btn')
const convertMenu = document.getElementById('convert-menu')
const copyBtn = document.getElementById('copy-btn')
const togglePreviewBtn = document.getElementById('toggle-preview-btn')
const previewDivider = document.querySelector('.preview-divider')
const tempoSlider = document.getElementById('tempo-slider')
const tempoValue = document.getElementById('tempo-value')
const durationSlider = document.getElementById('duration-slider')
const durationValue = document.getElementById('duration-value')
const volumeSlider = document.getElementById('volume-slider')
const volumeValue = document.getElementById('volume-value')
const nowPlaying = document.getElementById('now-playing')
const progressBar = document.getElementById('progress-bar')
const currentNoteDisplay = document.getElementById('current-note-display')

// State
let isPlaying = false
let isPaused = false
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

  const hasNotes = tokens.length > 0
  previewDivider.classList.toggle('hidden', !hasNotes)
  notesPreview.classList.toggle('hidden', !hasNotes)
  if (!hasNotes) return

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

function getVolume() {
  return parseInt(volumeSlider.value, 10)
}

// Playback state for pause/resume
let playbackNoteIndex = 0
let playbackValidTokens = []
let playbackValidIndices = []

async function startPlayback() {
  if (isPlaying && !isPaused) {
    stopPlayback()
    return
  }

  // Resume from pause
  if (isPaused) {
    isPaused = false
    pauseBtn.querySelector('span').textContent = 'Pause'
    playNext()
    return
  }

  // Determine tokens to play: selected text only, or all
  const selStart = notesInput.selectionStart
  const selEnd = notesInput.selectionEnd
  const hasSelection = selStart !== selEnd

  let tokensToPlay
  if (hasSelection) {
    // Filter to tokens that overlap with the selection range
    tokensToPlay = currentTokens.filter(t =>
      t.valid && t.start < selEnd && t.end > selStart
    )
  } else {
    tokensToPlay = currentTokens.filter(t => t.valid)
  }
  if (tokensToPlay.length === 0) return

  // Ensure audio context is running and instrument is loaded
  await ensureAudioReady()
  if (!instrumentLoaded && !instrumentLoading) {
    await handleInstrumentChange()
  }
  if (!instrumentLoaded) return

  isPlaying = true
  isPaused = false
  setPlayingUI(true)
  nowPlaying.classList.remove('hidden')

  playbackValidTokens = tokensToPlay
  playbackNoteIndex = 0

  // Map played tokens back to their original indices for preview highlighting
  playbackValidIndices = tokensToPlay.map(t => currentTokens.indexOf(t))

  playNext()
}

function playNext() {
  if (!isPlaying || isPaused || playbackNoteIndex >= playbackValidTokens.length) {
    if (playbackNoteIndex >= playbackValidTokens.length) {
      stopPlayback()
    }
    return
  }

  const token = playbackValidTokens[playbackNoteIndex]
  const originalIndex = playbackValidIndices[playbackNoteIndex]
  const totalNotes = playbackValidTokens.length

  // Highlight current note in preview
  highlightToken(originalIndex)

  // Highlight current note in textarea
  highlightTextareaToken(currentTokens[originalIndex])

  // Update progress
  progressBar.style.width = `${((playbackNoteIndex + 1) / totalNotes) * 100}%`
  currentNoteDisplay.textContent = `${token.name}  (MIDI ${token.midi})`

  // Play the note
  playNote(token.midi, getNoteDuration())

  playbackNoteIndex++
  const interval = getTempoMs()
  playbackTimeout = setTimeout(playNext, interval)
}

function pausePlayback() {
  if (!isPlaying) return
  isPaused = !isPaused
  if (isPaused) {
    clearTimeout(playbackTimeout)
    stopAll()
    pauseBtn.querySelector('span').textContent = 'Resume'
  } else {
    pauseBtn.querySelector('span').textContent = 'Pause'
    playNext()
  }
}

function stopPlayback() {
  isPlaying = false
  isPaused = false
  clearTimeout(playbackTimeout)
  stopAll()
  setPlayingUI(false)
  clearHighlights()
  clearTextareaHighlight()

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
    pauseBtn.classList.remove('hidden')
  } else {
    playBtn.classList.remove('playing')
    playIcon.style.display = 'block'
    stopIcon.style.display = 'none'
    playLabel.textContent = 'Play'
    pauseBtn.classList.add('hidden')
    pauseBtn.querySelector('span').textContent = 'Pause'
  }
}

function highlightToken(index) {
  clearHighlights()
  const el = notesPreview.querySelector(`[data-index="${index}"]`)
  if (el) {
    el.classList.add('active')
    // Scroll within the preview container only (not the page)
    const container = notesPreview
    const elTop = el.offsetTop - container.offsetTop
    const elBottom = elTop + el.offsetHeight
    const scrollTop = container.scrollTop
    const viewHeight = container.clientHeight

    if (elTop < scrollTop) {
      container.scrollTop = elTop
    } else if (elBottom > scrollTop + viewHeight) {
      container.scrollTop = elBottom - viewHeight
    }
  }
}

function clearHighlights() {
  notesPreview.querySelectorAll('.note-token.active').forEach(el => {
    el.classList.remove('active')
  })
}

function highlightTextareaToken(token) {
  if (!token || token.start === undefined) return
  notesInput.focus()
  notesInput.setSelectionRange(token.start, token.end)
}

function clearTextareaHighlight() {
  // Clear selection by collapsing to end
  const len = notesInput.value.length
  notesInput.setSelectionRange(len, len)
}

// ─── Convert ────────────────────────────────────────────────

function convertNotes(format) {
  const tokens = parseNotes(notesInput.value)
  const validTokens = tokens.filter(t => t.valid)
  if (validTokens.length === 0) return

  let converted
  switch (format) {
    case 'midi':
      converted = validTokens.map(t => String(t.midi))
      break
    case 'note':
      converted = validTokens.map(t => midiToNoteNotation(t.midi, false))
      break
    case 'note-compact':
      converted = validTokens.map(t => midiToNoteNotation(t.midi, true))
      break
    case 'solfege':
      converted = validTokens.map(t => midiToSolfegeNotation(t.midi, false))
      break
    case 'solfege-compact':
      converted = validTokens.map(t => midiToSolfegeNotation(t.midi, true))
      break
    default:
      return
  }

  // Detect original separator style
  const input = notesInput.value
  let separator = ', '
  if (/,\s/.test(input)) separator = ', '
  else if (/\s/.test(input) && !input.includes(',')) separator = ' '
  else if (input.includes('|')) separator = ' | '

  notesInput.value = converted.join(separator)
  updatePreview()
}

// ─── Copy ───────────────────────────────────────────────────

async function copyToClipboard() {
  try {
    await navigator.clipboard.writeText(notesInput.value)
    const originalText = copyBtn.textContent
    copyBtn.textContent = 'Copied!'
    setTimeout(() => { copyBtn.textContent = originalText }, 1500)
  } catch {
    // Fallback
    notesInput.select()
    document.execCommand('copy')
  }
}

// ─── Tempo, Duration & Spacing display ──────────────────────

function updateTempoDisplay() {
  tempoValue.textContent = `${tempoSlider.value} BPM`
}

function updateDurationDisplay() {
  durationValue.textContent = `${parseFloat(durationSlider.value).toFixed(2)}s`
}

function updateVolumeDisplay() {
  volumeValue.textContent = `${getVolume()}%`
  setVolume(getVolume())
}

// ─── Event Listeners ───────────────────────────────────────

instrumentSelect.addEventListener('change', handleInstrumentChange)
notesInput.addEventListener('input', schedulePreviewUpdate)
playBtn.addEventListener('click', startPlayback)
pauseBtn.addEventListener('click', pausePlayback)

loadFurEliseBtn.addEventListener('click', () => {
  notesInput.value = FUR_ELISE
  updatePreview()
})

clearBtn.addEventListener('click', () => {
  notesInput.value = ''
  updatePreview()
  if (isPlaying) stopPlayback()
})

// Convert button & menu
convertBtn.addEventListener('click', (e) => {
  e.stopPropagation()
  convertMenu.classList.toggle('hidden')
})

convertMenu.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-format]')
  if (btn) {
    convertNotes(btn.dataset.format)
    convertMenu.classList.add('hidden')
  }
})

// Close convert menu on outside click
document.addEventListener('click', () => {
  convertMenu.classList.add('hidden')
})

copyBtn.addEventListener('click', copyToClipboard)

togglePreviewBtn.addEventListener('click', () => {
  const collapsed = notesPreview.classList.toggle('collapsed')
  togglePreviewBtn.classList.toggle('collapsed', collapsed)
})

tempoSlider.addEventListener('input', updateTempoDisplay)
durationSlider.addEventListener('input', updateDurationDisplay)
volumeSlider.addEventListener('input', updateVolumeDisplay)

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
  updateSpacingDisplay()

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
