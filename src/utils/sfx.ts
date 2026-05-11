let _actx: AudioContext | null = null
function getCtx(): AudioContext {
  if (!_actx || _actx.state === 'closed') {
    _actx = new (window.AudioContext || (window as any).webkitAudioContext)()
  }
  if (_actx.state === 'suspended') _actx.resume()
  return _actx
}
function playTone(freq: number, type: OscillatorType, duration: number, gain = 0.3, delay = 0) {
  try {
    const ctx = getCtx()
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.connect(g); g.connect(ctx.destination)
    osc.type = type; osc.frequency.value = freq
    const t = ctx.currentTime + delay
    g.gain.setValueAtTime(gain, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + duration)
    osc.start(t); osc.stop(t + duration)
  } catch {}
}
export const SFX = {
  buzz:    () => { playTone(150,'sawtooth',0.05,0.5); playTone(300,'square',0.06,0.35,0.03); playTone(450,'sine',0.08,0.2,0.06) },
  correct: () => { [523,659,784,1047].forEach((f,i) => playTone(f,'sine',0.25,0.35,i*0.09)) },
  wrong:   () => { playTone(200,'sawtooth',0.35,0.4); playTone(140,'sawtooth',0.3,0.3,0.12); playTone(100,'square',0.2,0.2,0.25) },
  skip:    () => { playTone(440,'sine',0.12,0.18); playTone(330,'sine',0.1,0.15,0.13) },
  qstart:  () => { playTone(660,'sine',0.08,0.18); playTone(880,'sine',0.07,0.14,0.09); playTone(1100,'sine',0.06,0.1,0.18) },
  tick:    () => playTone(880,'sine',0.04,0.07),
  urgent:  () => { playTone(960,'square',0.1,0.07); playTone(720,'square',0.08,0.06,0.06) },
  win:     () => { [523,659,784,880,1047,1319,1568].forEach((f,i) => playTone(f,'sine',0.6,0.4,i*0.07)) },
}
