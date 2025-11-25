import { useEffect, useMemo, useRef, useState } from 'react'
import { CircleHelp, Download, Play, Square, X } from 'lucide-react'
import Midi from 'jsmidgen'
import {
  DEGREE_EMOTIONS,
  DEGREE_LIST,
  DEGREE_TO_INDEX,
  MOVEMENT_META_MAP,
  MOVEMENT_TABS,
  type DegreeKey,
  type MovementKey,
} from '../data/degreeEmotions'

const DIATONIC_CHORDS: Record<DegreeKey, { pitches: number[]; symbol: string; notes: string }> = {
  'Ⅰ': { pitches: [60, 64, 67], symbol: 'C', notes: 'C E G' },
  'Ⅱ': { pitches: [62, 65, 69], symbol: 'Dm', notes: 'D F A' },
  'Ⅲ': { pitches: [64, 67, 71], symbol: 'Em', notes: 'E G B' },
  'Ⅳ': { pitches: [65, 69, 72], symbol: 'F', notes: 'F A C' },
  'Ⅴ': { pitches: [67, 71, 74], symbol: 'G', notes: 'G B D' },
  'Ⅵ': { pitches: [69, 72, 76], symbol: 'Am', notes: 'A C E' },
  'Ⅶ': { pitches: [71, 74, 77], symbol: 'Bdim', notes: 'B D F' },
}

const TOTAL_BARS = 8
const NOTES_PER_BAR = 8
const BARS_PER_PAGE = 4
const BPM = 120
const EIGHTH_DURATION = (60 / BPM) / 2
const MIDI_TICKS_PER_BEAT = 480
const EIGHTH_NOTE_TICKS = MIDI_TICKS_PER_BEAT / 2

interface SequenceCell {
  degree: DegreeKey
  movement: MovementKey
}

type Sequence = (SequenceCell | null)[][]

const createEmptySequence = (): Sequence =>
  Array.from({ length: TOTAL_BARS }, () =>
    Array.from({ length: NOTES_PER_BAR }, () => null),
  )

const findPreviousFilledCell = (
  sequence: Sequence,
  barIndex: number,
  noteIndex: number,
): SequenceCell | null => {
  const flatIndex = barIndex * NOTES_PER_BAR + noteIndex
  for (let i = flatIndex - 1; i >= 0; i -= 1) {
    const bar = Math.floor(i / NOTES_PER_BAR)
    const note = i % NOTES_PER_BAR
    const cell = sequence[bar][note]
    if (cell) {
      return cell
    }
  }
  return null
}

const deriveMovement = (previous: DegreeKey | null, next: DegreeKey): MovementKey => {
  if (!previous) return 'same'
  const diff = DEGREE_TO_INDEX[next] - DEGREE_TO_INDEX[previous]
  if (diff === 0) return 'same'
  const direction = diff > 0 ? 'up' : 'down'
  const distance = Math.abs(diff)

  if (distance === 1) {
    return direction === 'up' ? 'step_up' : 'step_down'
  }
  if (distance === 2) {
    return direction === 'up' ? 'skip_up' : 'skip_down'
  }
  return direction === 'up' ? 'leap_up' : 'leap_down'
}

const midiToFrequency = (midi: number): number =>
  440 * Math.pow(2, (midi - 69) / 12)

const MusicArchitect = () => {
  const [sequence, setSequence] = useState<Sequence>(createEmptySequence)
  const [selectedCell, setSelectedCell] = useState({ bar: 0, note: 0 })
  const [currentBar, setCurrentBar] = useState(0)
  const [showMovementGuide, setShowMovementGuide] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)

  const audioContextRef = useRef<AudioContext | null>(null)
  const activeNodesRef = useRef<Array<{ osc: OscillatorNode; gain: GainNode }>>([])
  const playbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const visibleBars = useMemo(
    () => sequence.slice(currentBar, currentBar + BARS_PER_PAGE),
    [sequence, currentBar],
  )

  const previousFilledCell = useMemo(
    () => findPreviousFilledCell(sequence, selectedCell.bar, selectedCell.note),
    [sequence, selectedCell],
  )

  const rangeLabel = `${currentBar + 1}-${Math.min(currentBar + BARS_PER_PAGE, TOTAL_BARS)}`
  const hasNotes = useMemo(
    () => sequence.some((barRow) => barRow.some(Boolean)),
    [sequence],
  )

  const ensureVisible = (barIndex: number) => {
    const desiredStart = Math.floor(barIndex / BARS_PER_PAGE) * BARS_PER_PAGE
    if (desiredStart !== currentBar) {
      setCurrentBar(desiredStart)
    }
  }

  const handleCellSelect = (barIndex: number, noteIndex: number) => {
    setSelectedCell({ bar: barIndex, note: noteIndex })
    ensureVisible(barIndex)
  }

  const moveToNextCell = (barIndex: number, noteIndex: number) => {
    if (barIndex === TOTAL_BARS - 1 && noteIndex === NOTES_PER_BAR - 1) {
      return
    }

    let nextBar = barIndex
    let nextNote = noteIndex + 1

    if (nextNote >= NOTES_PER_BAR) {
      nextNote = 0
      nextBar = Math.min(TOTAL_BARS - 1, barIndex + 1)
    }

    setSelectedCell({ bar: nextBar, note: nextNote })
    ensureVisible(nextBar)
  }

  const cleanupNodes = () => {
    activeNodesRef.current.forEach(({ osc }) => {
      try {
        osc.stop()
      } catch (err) {
        // ignore if already stopped
      }
    })
    activeNodesRef.current = []
  }

  const stopPlayback = () => {
    if (playbackTimeoutRef.current) {
      clearTimeout(playbackTimeoutRef.current)
      playbackTimeoutRef.current = null
    }
    cleanupNodes()
    setIsPlaying(false)
  }

  useEffect(
    () => () => {
      stopPlayback()
      audioContextRef.current?.close()
    },
    [],
  )

  const handleDegreeSelect = (degree: DegreeKey) => {
    const { bar, note } = selectedCell
    const previous = findPreviousFilledCell(sequence, bar, note)
    const movement = deriveMovement(previous?.degree ?? null, degree)

    setSequence((prev) =>
      prev.map((barRow, barIndex) => {
        if (barIndex !== bar) return barRow
        return barRow.map((cell, noteIndex) => {
          if (noteIndex !== note) return cell
          return { degree, movement }
        })
      }),
    )

    moveToNextCell(bar, note)
  }

  const goToPage = (direction: 'prev' | 'next') => {
    setCurrentBar((prev) => {
      if (direction === 'prev') {
        return Math.max(0, prev - BARS_PER_PAGE)
      }
      return Math.min(TOTAL_BARS - BARS_PER_PAGE, prev + BARS_PER_PAGE)
    })
  }

  const ensureAudioContext = async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext()
    }
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume()
    }
    return audioContextRef.current
  }

  const handlePlay = async () => {
    if (isPlaying) return

    const ctx = await ensureAudioContext()
    const startTime = ctx.currentTime + 0.1
    let scheduledAny = false
    let lastScheduledStep = -1

    cleanupNodes()

    sequence.forEach((barRow, barIndex) => {
      barRow.forEach((cell, noteIndex) => {
        if (!cell) return
        scheduledAny = true
        const stepIndex = barIndex * NOTES_PER_BAR + noteIndex
        lastScheduledStep = Math.max(lastScheduledStep, stepIndex)
        const noteStart = startTime + stepIndex * EIGHTH_DURATION

        const chord = DIATONIC_CHORDS[cell.degree]
        chord.pitches.forEach((midi) => {
          const frequency = midiToFrequency(midi)
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()

          osc.type = 'sine'
          osc.frequency.value = frequency

          gain.gain.setValueAtTime(0.001, noteStart)
          gain.gain.linearRampToValueAtTime(0.2, noteStart + 0.01)
          gain.gain.exponentialRampToValueAtTime(0.001, noteStart + EIGHTH_DURATION * 0.9)

          osc.connect(gain).connect(ctx.destination)
          osc.start(noteStart)
          osc.stop(noteStart + EIGHTH_DURATION)

          activeNodesRef.current.push({ osc, gain })
        })
      })
    })

    if (!scheduledAny) {
      return
    }

    setIsPlaying(true)
    const totalDuration = (lastScheduledStep + 1) * EIGHTH_DURATION * 1000
    playbackTimeoutRef.current = setTimeout(() => {
      setIsPlaying(false)
      cleanupNodes()
      playbackTimeoutRef.current = null
    }, totalDuration)
  }

  const buildMidiFile = () => {
    const midiFile = new Midi.File({ ticks: MIDI_TICKS_PER_BEAT })
    const track = new Midi.Track()
    midiFile.addTrack(track)
    track.setTempo(BPM)

    let pendingDelta = 0

    sequence.forEach((barRow) => {
      barRow.forEach((cell) => {
        if (!cell) {
          pendingDelta += EIGHTH_NOTE_TICKS
          return
        }

        const chord = DIATONIC_CHORDS[cell.degree]
        chord.pitches.forEach((midiNumber, index) => {
          const delta = index === 0 ? pendingDelta : 0
          track.addNote(0, midiNumber, EIGHTH_NOTE_TICKS, delta)
        })
        pendingDelta = 0
      })
    })

    return midiFile
  }

  const handleExportMidi = () => {
    if (!hasNotes) return

    const midiFile = buildMidiFile()
    // jsmidgenのtoUint8ArrayはTypedArray.from(string)の仕様変更で全ゼロになるため手動で変換
    const midiBytesString = midiFile.toBytes()
    const byteArray = new Uint8Array(midiBytesString.length)
    for (let i = 0; i < midiBytesString.length; i += 1) {
      byteArray[i] = midiBytesString.charCodeAt(i)
    }
    const blob = new Blob([byteArray], { type: 'audio/midi' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'music-architect.mid'
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  const isFirstPage = currentBar === 0
  const isLastPage = currentBar === TOTAL_BARS - BARS_PER_PAGE
  const currentCell = sequence[selectedCell.bar][selectedCell.note]
  const selectedCellMovement = currentCell?.movement ?? null

  return (
    <div className="music-architect">
      <header className="sequencer-header">
        <div>
          <p className="eyebrow">現在の表示</p>
          <h1 className="range">小節 {rangeLabel}</h1>
        </div>
        <div className="transport">
          <button
            className="transport-btn"
            aria-label="play"
            type="button"
            onClick={handlePlay}
            disabled={isPlaying}
          >
            <Play size={18} /> {isPlaying ? '再生中' : '再生'}
          </button>
          <button
            className="transport-btn"
            aria-label="stop"
            type="button"
            onClick={stopPlayback}
            disabled={!isPlaying}
          >
            <Square size={18} /> 停止
          </button>
          <button
            className="transport-btn"
            aria-label="save-midi"
            type="button"
            onClick={handleExportMidi}
            disabled={!hasNotes}
          >
            <Download size={18} /> MIDI保存
          </button>
        </div>
      </header>

      <section className="sequencer" aria-label="シーケンサ">
        {visibleBars.map((barRow, index) => {
          const barNumber = currentBar + index
          return (
            <div key={`bar-${barNumber}`} className="bar">
              <div className="bar-header">
                <span className="bar-number">小節 {barNumber + 1}</span>
                <span className="bar-length">8 音</span>
              </div>
              <div className="notes-row">
                {barRow.map((cell, noteIndex) => {
                  const globalBarIndex = barNumber
                  const isSelected =
                    selectedCell.bar === globalBarIndex &&
                    selectedCell.note === noteIndex
                  const movementColor = cell ? cell.movement : undefined
                  const groupingIndex = Math.floor(noteIndex / 2)
                  const chordLabel = cell ? DIATONIC_CHORDS[cell.degree].symbol : ''

                  return (
                    <button
                      key={`note-${barNumber}-${noteIndex}`}
                      type="button"
                      className={`note-cell group-${groupingIndex} ${movementColor ?? ''} ${
                        isSelected ? 'selected' : ''
                      }`}
                      onClick={() => handleCellSelect(globalBarIndex, noteIndex)}
                    >
                      {cell ? (
                        <span className="note-label">
                          <span className="note-degree">{cell.degree}</span>
                          <span className="note-chord">{chordLabel}</span>
                        </span>
                      ) : (
                        ''
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </section>

      <section className="emotion-palette" aria-label="感情パレット">
        <div className="palette-header">
          <div>
            <p className="eyebrow">感情パレット</p>
            <h2 className="palette-title">度数を選択</h2>
          </div>
          <button
            type="button"
            className="info-button"
            onClick={() => setShowMovementGuide((prev) => !prev)}
            aria-pressed={showMovementGuide}
          >
            <CircleHelp size={18} />
          </button>
          {showMovementGuide && (
            <div className="movement-guide" role="dialog" aria-label="音の動きガイド">
              <button
                type="button"
                className="guide-close"
                aria-label="ガイドを閉じる"
                onClick={() => setShowMovementGuide(false)}
              >
                <X size={16} />
              </button>
              {MOVEMENT_TABS.map((tab) => (
                <div
                  key={tab.key}
                  className={`movement-tab ${selectedCellMovement === tab.key ? 'active' : ''}`}
                >
                  <span className="tab-label" style={{ color: tab.color }}>
                    {tab.label}
                  </span>
                  <span className="tab-description">{tab.description}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="degree-buttons">
          {DEGREE_LIST.map((degree) => {
            const movementSuggestion = deriveMovement(
              previousFilledCell?.degree ?? null,
              degree,
            )
            const movementMeta = MOVEMENT_META_MAP[movementSuggestion]
            const emotionLabel = DEGREE_EMOTIONS[degree][movementSuggestion]
            const chordMeta = DIATONIC_CHORDS[degree]

            return (
              <button
                key={degree}
                type="button"
                className={`degree-button ${movementSuggestion}`}
                onClick={() => handleDegreeSelect(degree)}
              >
                <span className="movement-badge" style={{ color: movementMeta.color }}>
                  {movementMeta.label}
                </span>
                <span className="degree-symbol">{degree}</span>
                <span className="chord-name">{chordMeta.symbol} · {chordMeta.notes}</span>
                <span className="degree-emotion">{emotionLabel}</span>
              </button>
            )
          })}
        </div>
      </section>

      <nav className="navigation" aria-label="小節ナビゲーション">
        <button
          type="button"
          className="nav-btn"
          onClick={() => goToPage('prev')}
          disabled={isFirstPage}
        >
          前4小節
        </button>
        <div className="nav-label">{rangeLabel}</div>
        <button
          type="button"
          className="nav-btn"
          onClick={() => goToPage('next')}
          disabled={isLastPage}
        >
          次4小節
        </button>
      </nav>
    </div>
  )
}

export default MusicArchitect
