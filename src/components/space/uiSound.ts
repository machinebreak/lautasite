// Blips sintetizados estilo terminal para el feedback de UI de la escena espacial.

export type UiSoundName = 'toggle-on' | 'toggle-off' | 'navigate' | 'connect'
let uiSoundContext: AudioContext | null = null
export function playUiSound(sound: UiSoundName) {
  try {
    const AudioContextConstructor = window.AudioContext ?? null
    if (!AudioContextConstructor) return
    uiSoundContext ??= new AudioContextConstructor()
    if (uiSoundContext.state === 'closed') return
    void uiSoundContext.resume()
    const context = uiSoundContext
    const now = context.currentTime
    const sequences: Record<UiSoundName, Array<[OscillatorType, number, number, number, number]>> = {
      // [tipo, frecuencia inicial, despega-en(s), duración(s), volumen]
      'toggle-on': [['square', 480, 0, 0.09, 0.05], ['square', 720, 0.07, 0.14, 0.045]],
      'toggle-off': [['square', 700, 0, 0.09, 0.05], ['square', 420, 0.07, 0.16, 0.045]],
      navigate: [['triangle', 260, 0, 0.22, 0.06], ['sine', 520, 0.02, 0.12, 0.03]],
      connect: [
        ['sine', 392, 0, 0.12, 0.05],
        ['sine', 523.25, 0.08, 0.12, 0.05],
        ['sine', 659.25, 0.16, 0.2, 0.05],
      ],
    }
    for (const [type, frequency, delay, duration, volume] of sequences[sound]) {
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      oscillator.type = type
      const startTime = now + delay
      oscillator.frequency.setValueAtTime(frequency, startTime)
      // Un pequeño barrido descendente le da el toque robótico/tecnológico.
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(40, frequency * 0.86), startTime + duration)
      gain.gain.setValueAtTime(0.0001, startTime)
      gain.gain.exponentialRampToValueAtTime(volume, startTime + 0.012)
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration)
      oscillator.connect(gain)
      gain.connect(context.destination)
      oscillator.start(startTime)
      oscillator.stop(startTime + duration + 0.02)
    }
  } catch {
    // Sin sonido de UI si el entorno no permite AudioContext.
  }
}
