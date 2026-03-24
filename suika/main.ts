import './style.css';
import { Engine, Render, Runner, World, Bodies, Body, Events, Composite } from 'matter-js';
import { FRUITS } from './fruits';

// --- State ---
let score = 0;
let isGameOver = false;
let isDropping = false;

// We drop from first 5 fruit types
const getRandomFruit = () => FRUITS[Math.floor(Math.random() * 5)];

let currentFruit = getRandomFruit();
let nextFruit = getRandomFruit();

const scoreElement = document.getElementById('score') as HTMLSpanElement;
const nextFruitDisplay = document.getElementById('next-fruit-display') as HTMLDivElement;
const container = document.getElementById('game-container') as HTMLElement;
const shakeBtn = document.getElementById('shake-btn') as HTMLButtonElement;

let lastShakeTime = 0;
const SHAKE_COOLDOWN = 60000; // 60 seconds

shakeBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  if (isGameOver) return;
  
  const now = Date.now();
  if (now - lastShakeTime < SHAKE_COOLDOWN && lastShakeTime !== 0) return;
  
  lastShakeTime = now;
  shakeBtn.disabled = true;
  shakeBtn.innerText = 'Cooling down...';
  
  // Trigger CSS shake animation
  container.classList.add('shake-animation');
  setTimeout(() => container.classList.remove('shake-animation'), 400);

  // Update button every second
  const interval = setInterval(() => {
    const elapsed = Date.now() - lastShakeTime;
    const remaining = Math.ceil((SHAKE_COOLDOWN - elapsed) / 1000);
    if (remaining <= 0) {
      clearInterval(interval);
      shakeBtn.disabled = false;
      shakeBtn.innerText = 'Shake Box 🌪️';
    } else {
      shakeBtn.innerText = `Ready in ${remaining}s`;
    }
  }, 1000);

  const bodies = Composite.allBodies(world);
  bodies.forEach(b => {
    const body = b as any;
    if (body.fruitLevel !== undefined && body.hasCollided) {
      // Jumble them upwards and randomly sideways
      const forceMag = body.mass * 0.04; 
      Body.applyForce(body, body.position, {
        x: (Math.random() - 0.5) * forceMag,
        y: -forceMag * 1.5
      });
    }
  });
});

const updateUI = () => {
  scoreElement.innerText = score.toString();
  (nextFruitDisplay as HTMLImageElement).src = nextFruit.image;
};

updateUI();

// --- Engine Setup ---
const width = 600;
const height = 800;

const engine = Engine.create();
const world = engine.world;

const render = Render.create({
  element: container,
  engine: engine,
  options: {
    width,
    height,
    wireframes: false,
    background: 'transparent',
  },
});

Render.run(render);
const runner = Runner.create();
Runner.run(runner, engine);

// --- Boundaries ---
const wallOptions = {
  isStatic: true,
  render: { fillStyle: '#e6cc98' },
};

const ground = Bodies.rectangle(width / 2, height + 30, width, 60, wallOptions);
const leftWall = Bodies.rectangle(-30, height / 2, 60, height, wallOptions);
const rightWall = Bodies.rectangle(width + 30, height / 2, 60, height, wallOptions);

const topLine = Bodies.rectangle(width / 2, 150, width, 2, {
  isStatic: true,
  isSensor: true,
  render: { fillStyle: '#ff0000', opacity: 0.5 },
  label: 'topLine'
});

World.add(world, [ground, leftWall, rightWall, topLine]);

// --- Input & Preview ---
let currentMouseX = width / 2;
let previewBody: Body | null = null;

const updatePreview = () => {
  if (isGameOver) return;
  if (previewBody) {
    World.remove(world, previewBody);
  }
  const r = currentFruit.radius;
  currentMouseX = Math.max(r, Math.min(width - r, currentMouseX));
  
  const scale = ((r * 2) / 512) * 1.35; // Inflate visual size to compensate for transparent padding
  previewBody = Bodies.circle(currentMouseX, 50, r, {
    isStatic: true,
    isSensor: true,
    render: {
      sprite: { texture: currentFruit.image, xScale: scale, yScale: scale },
      opacity: 0.5
    }
  });
  World.add(world, previewBody);
};

updatePreview();

container.addEventListener('mousemove', (e) => {
  if (isGameOver || isDropping) return;
  const rect = container.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  
  const r = currentFruit.radius;
  currentMouseX = Math.max(r, Math.min(width - r, mouseX));
  
  if (previewBody) {
    Body.setPosition(previewBody, { x: currentMouseX, y: 50 });
  }
});

container.addEventListener('click', () => {
  if (isGameOver || isDropping) return;
  isDropping = true;
  
  if (previewBody) {
    World.remove(world, previewBody);
    previewBody = null;
  }
  
  const r = currentFruit.radius;
  const scale = ((r * 2) / 512) * 1.35;
  const fruitCircle = Bodies.circle(currentMouseX, 50, r, {
    restitution: 0.2, // bounciness
    render: {
      sprite: { texture: currentFruit.image, xScale: scale, yScale: scale }
    },
    friction: 0.5,
  }) as any;
  
  fruitCircle.fruitLevel = currentFruit.level;
  fruitCircle.hasCollided = false;
  
  World.add(world, fruitCircle);
  
  setTimeout(() => {
    if (isGameOver) return;
    currentFruit = nextFruit;
    nextFruit = getRandomFruit();
    updateUI();
    isDropping = false;
    updatePreview();
  }, 1000);
});

// --- Logic & Collision ---
Events.on(engine, 'collisionStart', (event) => {
  event.pairs.forEach((collision) => {
    if (isGameOver) return;
    
    const bodyA = collision.bodyA as any;
    const bodyB = collision.bodyB as any;
    
    // Mark as collided with something
    if (bodyA.fruitLevel !== undefined && bodyB.label !== 'topLine') bodyA.hasCollided = true;
    if (bodyB.fruitLevel !== undefined && bodyA.label !== 'topLine') bodyB.hasCollided = true;
    
    // Merging logic
    if (bodyA.fruitLevel !== undefined && bodyB.fruitLevel !== undefined) {
      if (bodyA.fruitLevel === bodyB.fruitLevel) {
        const level = bodyA.fruitLevel;
        if (level === 8) return; // Tier 9 maximum
        
        // Prevent double merge
        if (bodyA.isMerging || bodyB.isMerging) return;
        bodyA.isMerging = true;
        bodyB.isMerging = true;
        
        const nextFruitDef = FRUITS[level + 1];
        const midX = (bodyA.position.x + bodyB.position.x) / 2;
        const midY = (bodyA.position.y + bodyB.position.y) / 2;
        
        score += nextFruitDef.score;
        updateUI();
        
        World.remove(world, [bodyA, bodyB]);
        
        const nr = nextFruitDef.radius;
        const scale = ((nr * 2) / 512) * 1.35;
        const newFruit = Bodies.circle(midX, midY, nr, {
          restitution: 0.2,
          render: {
            sprite: { texture: nextFruitDef.image, xScale: scale, yScale: scale }
          },
          friction: 0.5,
        }) as any;
        
        newFruit.fruitLevel = nextFruitDef.level;
        newFruit.hasCollided = true; // Was spawned from collision
        
        World.add(world, newFruit);
      }
    }
  });
});

// Game Over check
Events.on(engine, 'beforeUpdate', () => {
  if (isGameOver) return;
  const bodies = Composite.allBodies(world);
  
  for (const b of bodies) {
    const body = b as any;
    // If a dynamically dropped fruit that has collided rests above the line
    if (body.fruitLevel !== undefined && body.hasCollided) {
      if (body.position.y - body.circleRadius < 150) {
        if (Math.abs(body.velocity.y) < 0.2 && Math.abs(body.velocity.x) < 0.2) {
          isGameOver = true;
          alert(`Game Over! Final Score: ${score}`);
          break;
        }
      }
    }
  }
});
