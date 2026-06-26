/**
 * Воспроизводит MP3-файл буквы из /audio/letters/ или /audio/nikud/
 */

let currentAudio = null;

export function speakLetter(letter) {
  if (!letter?.audioFile) return;

  // Остановить предыдущий звук
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
  }

  const folder = letter.isFinalForm || !letter.groupId || letter.groupId <= 5
    ? 'letters'
    : 'letters';

  currentAudio = new Audio(`/audio/letters/${letter.audioFile}`);
  currentAudio.volume = 1;
  currentAudio.play().catch(e => console.warn('[speak] error:', e));
}

export function speakNikud(nikud) {
  if (!nikud?.id) return;

  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
  }

  currentAudio = new Audio(`/audio/nikud/${nikud.id}.mp3`);
  currentAudio.volume = 1;
  currentAudio.play().catch(e => console.warn('[speak] error:', e));
}
