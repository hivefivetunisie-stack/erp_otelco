/**
 * Web Audio API synthesizer for tactile POS cash register feedback.
 * Works natively, client-side, with zero static assets.
 */
export function playPOSSound(type: 'beep' | 'cash' | 'click' | 'error', isMuted: boolean) {
  if (isMuted) return;
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    if (type === 'beep') {
      // High-pitched grocery scanner beep
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1300, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.08);
    } else if (type === 'cash') {
      // Classic mechanical mechanical register ka-ching
      const osc1 = audioCtx.createOscillator();
      const osc2 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      const gain2 = audioCtx.createGain();
      
      osc1.frequency.setValueAtTime(2100, audioCtx.currentTime);
      gain1.gain.setValueAtTime(0.04, audioCtx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);
      
      osc2.frequency.setValueAtTime(1550, audioCtx.currentTime + 0.06);
      gain2.gain.setValueAtTime(0.03, audioCtx.currentTime + 0.06);
      gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
      
      osc1.connect(gain1); gain1.connect(audioCtx.destination);
      osc2.connect(gain2); gain2.connect(audioCtx.destination);
      
      osc1.start(); osc1.stop(audioCtx.currentTime + 0.35);
      osc2.start(); osc2.stop(audioCtx.currentTime + 0.5);
    } else if (type === 'click') {
      // Light click sound for the numeric tactile keypad
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(580, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.02, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.04);
    } else if (type === 'error') {
      // Low dual-tone buzzer on bad actions or out-of-stock clicks
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.28);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.28);
    }
  } catch (e) {
    console.warn("Audio Context blocked or un-supported:", e);
  }
}
