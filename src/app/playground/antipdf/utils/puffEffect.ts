function random(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export function createPuffEffect(rect: DOMRect): void {
  const particleCount = 88;
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const spawnRadiusX = 56;
  const spawnRadiusY = 20;

  for (let i = 0; i < particleCount; i++) {
    const span = document.createElement('span');
    span.classList.add('puff-particle');

    // Small square particles (2-5px)
    const size = random(1.5, 5);
    span.style.width = `${size}px`;
    span.style.height = `${size}px`;

    // Limit to a few discrete colors
    const palette = [
      'rgba(110, 140, 165, 0.8)',
      'rgb(154, 190, 219, 0.8)',
      'rgb(187, 197, 205, 0.8)',
    ];
    span.style.backgroundColor = palette[Math.floor(Math.random() * palette.length)];

    // Spawn near center
    const angle = random(0, Math.PI * 2);
    const startRadius = random(0, 1);
    const startX = centerX + Math.cos(angle) * spawnRadiusX * startRadius;
    const startY = centerY + Math.sin(angle) * spawnRadiusY * startRadius;

    span.style.left = `${startX}px`;
    span.style.top = `${startY}px`;

    // Travel outward
    const travelDist = random(200, 500);
    const tx = Math.cos(angle) * travelDist - 50;
    const ty = Math.sin(angle) * travelDist - 50;
    const rot = random(0, 360);

    span.style.setProperty('--tx', `${tx}%`);
    span.style.setProperty('--ty', `${ty}%`);
    span.style.setProperty('--rot', `${rot}deg`);

    // Animation duration
    const duration = random(0.25, 1.0);
    span.style.setProperty('--duration', `${duration}s`);

    document.body.appendChild(span);

    setTimeout(() => {
      span.remove();
    }, duration * 2000);
  }
}
