// Sound configuration
const EMERGENCY_SOUND_URL = '/sounds/emergency-alert.mp3';
const VIBRATION_PATTERN = [200, 100, 200, 100, 200]; // Three pulses

let audioContext: AudioContext | null = null;
let alertBuffer: AudioBuffer | null = null;

// Initialize audio context and load sound
const initializeAudio = async () => {
  try {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const response = await fetch(EMERGENCY_SOUND_URL);
    const arrayBuffer = await response.arrayBuffer();
    alertBuffer = await audioContext.decodeAudioData(arrayBuffer);
  } catch (error) {
    console.error('Failed to initialize audio:', error);
  }
};

// Play emergency sound with fallback
const playSound = async () => {
  try {
    // Initialize audio if not already done
    if (!audioContext || !alertBuffer) {
      await initializeAudio();
    }

    if (audioContext && alertBuffer) {
      const source = audioContext.createBufferSource();
      source.buffer = alertBuffer;
      source.connect(audioContext.destination);
      source.start(0);
    } else {
      // Fallback to basic Audio API
      const audio = new Audio(EMERGENCY_SOUND_URL);
      await audio.play();
    }
  } catch (error) {
    console.error('Failed to play emergency sound:', error);
  }
};

// Trigger device vibration
const vibrate = () => {
  if (navigator.vibrate) {
    navigator.vibrate(VIBRATION_PATTERN);
  }
};

// Main function to play emergency alert
export const playEmergencyAlert = async () => {
  // Play sound and vibrate simultaneously
  await Promise.all([
    playSound(),
    vibrate()
  ]);

  // Repeat alert after 5 seconds if not acknowledged
  const repeatTimeout = setTimeout(() => {
    playEmergencyAlert();
  }, 5000);

  // Return function to cancel repeat
  return () => clearTimeout(repeatTimeout);
};

// Request necessary permissions
export const requestNotificationPermissions = async () => {
  try {
    // Request audio permission by trying to create AudioContext
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Load audio file
    await initializeAudio();
    
    // Request vibration permission by trying to vibrate (0ms)
    if (navigator.vibrate) {
      navigator.vibrate(0);
    }
    
    return true;
  } catch (error) {
    console.error('Failed to get notification permissions:', error);
    return false;
  }
}; 