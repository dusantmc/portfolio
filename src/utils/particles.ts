/**
 * Greeting Hand Particle Animation Utility
 * 
 * Spawns animated particles when the greeting hand is clicked.
 * Each particle falls with gravity, bounces, and collides with other particles.
 */

// Particle image paths
const PARTICLE_IMAGES = [
  '/particles/particle1.png',
  '/particles/particle2.png',
  '/particles/particle3.png',
  '/particles/particle4.png',
  '/particles/particle5.png',
] as const;

// Weight distribution for particle spawn probability
// Adjust these values to change spawn frequency (must sum to 1.0)
// [particle1, particle2, particle3, particle4, particle5]
const PARTICLE_WEIGHTS = [0.35, 0.35, 0.2, 0.05, 0.05] as const;

// Physics constants - adjust these to change animation behavior
const GRAVITY = 0.5; // Gravity strength (pixels per frame squared)
const BOUNCE_DAMPING = 0.65; // Energy retained after bounce (0-1, lower = more damping)
const VELOCITY_DAMPING = 0.98; // Continuous velocity damping per frame (0-1, lower = more damping)
const HORIZONTAL_DRIFT = 0.3; // Random horizontal movement strength
const HORIZONTAL_DRIFT_DAMPING = 0.995; // Horizontal drift damping (slows over time)
const COLLISION_DISTANCE = 80; // Distance threshold for collision detection (pixels)
const COLLISION_BOUNCE = 0.4; // Bounce strength when particles collide
const SETTLE_TIME = 5000; // Time before particle fades out (milliseconds)
const FADE_DURATION = 500; // Fade out duration (milliseconds)
const MIN_VELOCITY_TO_BOUNCE = 1.5; // Minimum velocity required to bounce (pixels per frame)
const ROTATION_SPEED = 0.1; // Rotation speed multiplier (degrees per velocity unit)

interface Particle {
  element: HTMLImageElement;
  x: number;
  y: number;
  vx: number; // velocity x
  vy: number; // velocity y
  rotation: number; // current rotation in degrees
  rotationSpeed: number; // rotation speed in degrees per frame
  size: number;
  imageIndex: number;
  isSettled: boolean;
  settledAt: number | null;
  removed: boolean;
}

// Store all active particles for collision detection
const activeParticles: Particle[] = [];

/**
 * Selects a random particle image based on weighted probabilities
 */
function selectRandomParticle(): number {
  const random = Math.random();
  let cumulative = 0;
  
  for (let i = 0; i < PARTICLE_WEIGHTS.length; i++) {
    cumulative += PARTICLE_WEIGHTS[i];
    if (random <= cumulative) {
      return i;
    }
  }
  
  return 0; // Fallback to first particle
}

/**
 * Creates a particle element and adds it to the DOM
 */
function createParticleElement(imageIndex: number): HTMLImageElement {
  const img = document.createElement('img');
  img.src = PARTICLE_IMAGES[imageIndex];
  img.style.position = 'fixed';
  img.style.width = '64px';
  img.style.height = '64px';
  img.style.pointerEvents = 'none';
  img.style.zIndex = '9999';
  img.style.willChange = 'transform, opacity';
  img.style.transition = `opacity ${FADE_DURATION}ms ease-out`;
  img.style.opacity = '1';
  img.style.left = '0';
  img.style.top = '0';
  img.style.transformOrigin = 'center center'; // Rotate around center
  document.body.appendChild(img);
  return img;
}

/**
 * Checks if two particles are colliding and applies bounce
 */
function checkCollision(particle: Particle, other: Particle): void {
  const dx = particle.x - other.x;
  const dy = particle.y - other.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  if (distance < COLLISION_DISTANCE && distance > 0) {
    // Calculate collision angle
    const angle = Math.atan2(dy, dx);
    const force = COLLISION_BOUNCE * (1 - distance / COLLISION_DISTANCE);
    
    // Apply bounce force
    particle.vx += Math.cos(angle) * force;
    particle.vy += Math.sin(angle) * force;
    other.vx -= Math.cos(angle) * force;
    other.vy -= Math.sin(angle) * force;
  }
}

/**
 * Updates particle physics and position
 */
function updateParticle(particle: Particle, deltaTime: number): void {
  if (particle.removed || particle.isSettled) {
    return;
  }
  
  const viewportHeight = window.innerHeight;
  const viewportWidth = window.innerWidth;
  const bottom = viewportHeight - particle.size;
  
  // Normalize delta time to 60fps for consistent physics (cap at 2x to prevent large jumps)
  const normalizedDelta = Math.min(deltaTime / 16.67, 2);
  
  // Apply continuous velocity damping (natural energy loss)
  particle.vx *= Math.pow(VELOCITY_DAMPING, normalizedDelta);
  particle.vy *= Math.pow(VELOCITY_DAMPING, normalizedDelta);
  
  // Apply gravity
  particle.vy += GRAVITY * normalizedDelta;
  
  // Add slight horizontal drift (damped over time)
  const driftStrength = HORIZONTAL_DRIFT * Math.pow(HORIZONTAL_DRIFT_DAMPING, normalizedDelta);
  particle.vx += (Math.random() - 0.5) * driftStrength * normalizedDelta;
  
  // Update rotation based on velocity (faster particles rotate more)
  const velocityMagnitude = Math.sqrt(particle.vx * particle.vx + particle.vy * particle.vy);
  particle.rotation += particle.rotationSpeed * normalizedDelta * velocityMagnitude;
  
  // Update position
  particle.x += particle.vx * normalizedDelta;
  particle.y += particle.vy * normalizedDelta;
  
  // Boundary checks
  if (particle.x < 0) {
    particle.x = 0;
    particle.vx *= -0.5;
  } else if (particle.x > viewportWidth - particle.size) {
    particle.x = viewportWidth - particle.size;
    particle.vx *= -0.5;
  }
  
  // Bounce on bottom - use velocity-based settling instead of bounce count
  if (particle.y >= bottom) {
    particle.y = bottom;
    
    // Only bounce if velocity is significant enough
    if (Math.abs(particle.vy) > MIN_VELOCITY_TO_BOUNCE) {
      particle.vy *= -BOUNCE_DAMPING;
      particle.vx *= 0.92; // Reduce horizontal velocity on bounce
      // Add slight rotation change on bounce
      particle.rotationSpeed *= -0.8;
    } else {
      // Velocity is too low, settle the particle
      particle.vy = 0;
      particle.vx *= 0.85;
      particle.rotationSpeed *= 0.9; // Slow rotation when settling
      if (!particle.isSettled) {
        particle.isSettled = true;
        particle.settledAt = Date.now();
      }
    }
  }
  
  // Check collisions with other particles
  for (const other of activeParticles) {
    if (other !== particle && !other.removed && !other.isSettled) {
      checkCollision(particle, other);
    }
  }
  
  // Apply additional damping when settled
  if (particle.isSettled) {
    particle.vx *= 0.95;
    particle.vy *= 0.95;
    particle.rotationSpeed *= 0.98;
  }
  
  // Update DOM element position and rotation
  particle.element.style.left = `${particle.x}px`;
  particle.element.style.top = `${particle.y}px`;
  particle.element.style.transform = `translate(0, 0) rotate(${particle.rotation}deg)`;
}

/**
 * Removes settled particles after SETTLE_TIME
 */
function checkSettledParticles(): void {
  const now = Date.now();
  
  for (let i = activeParticles.length - 1; i >= 0; i--) {
    const particle = activeParticles[i];
    
    if (particle.isSettled && particle.settledAt !== null) {
      const elapsed = now - particle.settledAt;
      
      if (elapsed >= SETTLE_TIME) {
        // Start fade out
        particle.element.style.opacity = '0';
        
        // Remove after fade completes
        setTimeout(() => {
          if (particle.element.parentNode) {
            particle.element.parentNode.removeChild(particle.element);
          }
          particle.removed = true;
          
          // Remove from active particles array
          const index = activeParticles.indexOf(particle);
          if (index > -1) {
            activeParticles.splice(index, 1);
          }
        }, FADE_DURATION);
      }
    }
  }
}

/**
 * Animation loop using requestAnimationFrame
 */
let animationFrameId: number | null = null;
let lastTime = performance.now();

function animate(): void {
  const currentTime = performance.now();
  const deltaTime = currentTime - lastTime;
  lastTime = currentTime;
  
  // Update all particles
  for (const particle of activeParticles) {
    updateParticle(particle, deltaTime);
  }
  
  // Check for particles that need to be removed
  checkSettledParticles();
  
  // Continue animation if there are active particles
  if (activeParticles.length > 0) {
    animationFrameId = requestAnimationFrame(animate);
  } else {
    animationFrameId = null;
  }
}

/**
 * Spawns a new particle at the specified coordinates
 * 
 * @param clientX - X coordinate of the click event
 * @param clientY - Y coordinate of the click event
 */
export function spawnGreetingParticle(clientX: number, clientY: number): void {
  if (typeof window === 'undefined' || !document.body) {
    console.warn('Cannot spawn particle: window or document.body not available');
    return;
  }

  // Select random particle image based on weights
  const imageIndex = selectRandomParticle();
  
  // Create particle element
  const element = createParticleElement(imageIndex);
  
  // Add slight random offset from click position
  const offsetX = (Math.random() - 0.5) * 30;
  const offsetY = (Math.random() - 0.5) * 30;
  
  // Create particle object
  const particle: Particle = {
    element,
    x: clientX + offsetX,
    y: clientY + offsetY - 48, // Spawn 20px higher
    vx: (Math.random() - 0.5) * 2, // Initial horizontal velocity
    vy: -Math.random() * 4 - 8, // Initial upward velocity (increased for more upward motion)
    rotation: 0, // Start at 0 degrees
    rotationSpeed: (Math.random() - 0.5) * ROTATION_SPEED * 2, // Random rotation speed
    size: 64,
    imageIndex,
    isSettled: false,
    settledAt: null,
    removed: false,
  };
  
  // Set initial position immediately
  element.style.left = `${particle.x}px`;
  element.style.top = `${particle.y}px`;
  element.style.transform = 'translate(0, 0)';
  element.style.opacity = '1';
  
  // Handle image load error
  element.onerror = () => {
    console.error(`Failed to load particle image: ${PARTICLE_IMAGES[imageIndex]}`);
    if (element.parentNode) {
      element.parentNode.removeChild(element);
    }
    const index = activeParticles.indexOf(particle);
    if (index > -1) {
      activeParticles.splice(index, 1);
    }
  };
  
  // Add to active particles
  activeParticles.push(particle);
  
  // Start animation loop if not already running
  if (animationFrameId === null) {
    lastTime = performance.now();
    animationFrameId = requestAnimationFrame(animate);
  }
}

/**
 * Cleans up all particles (useful for cleanup on unmount)
 */
export function cleanupParticles(): void {
  // Cancel animation loop
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  
  // Remove all particle elements
  for (const particle of activeParticles) {
    if (particle.element.parentNode) {
      particle.element.parentNode.removeChild(particle.element);
    }
  }
  
  // Clear array
  activeParticles.length = 0;
}

