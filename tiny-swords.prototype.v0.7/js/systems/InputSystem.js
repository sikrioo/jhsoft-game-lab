import { GAME } from '../config/constants.js';

export class InputSystem {
  constructor(scene) {
    this.scene = scene;
    this.isTouchDevice = this.detectTouchDevice();
    this.joystick = {
      active: false,
      pointerId: null,
      baseX: 0,
      baseY: 0,
      knobX: 0,
      knobY: 0,
      dx: 0,
      dy: 0,
      strength: 0,
    };
    this.buttons = {
      attack: false,
      guard: false,
      sprint: false,
    };
    this.createTouchUI();
    this.bindTouchEvents();
  }

  detectTouchDevice() {
    return window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }

  createTouchUI() {
    const root = document.createElement('div');
    root.id = 'touch-controls';
    root.innerHTML = `
      <div id="touch-stick-area">
        <div id="touch-stick-base">
          <div id="touch-stick-knob"></div>
        </div>
      </div>
      <div id="touch-buttons">
        <button class="touch-btn touch-btn-guard" data-action="guard">GUARD</button>
        <button class="touch-btn touch-btn-sprint" data-action="sprint">RUN</button>
        <button class="touch-btn touch-btn-attack" data-action="attack">ATK</button>
      </div>
    `;
    document.body.appendChild(root);
    this.root = root;
    this.stickArea = root.querySelector('#touch-stick-area');
    this.stickBase = root.querySelector('#touch-stick-base');
    this.stickKnob = root.querySelector('#touch-stick-knob');
    this.buttonEls = root.querySelectorAll('.touch-btn');
    this.setVisible(this.isTouchDevice);
  }

  setVisible(visible) {
    if (!this.root) return;
    this.root.style.display = visible ? 'block' : 'none';
  }

  bindTouchEvents() {
    if (!this.root) return;

    const stop = (event) => {
      event.preventDefault();
      event.stopPropagation();
    };

    this.stickArea.addEventListener('pointerdown', (event) => {
      stop(event);
      this.joystick.active = true;
      this.joystick.pointerId = event.pointerId;
      this.stickArea.setPointerCapture(event.pointerId);
      this.joystick.baseX = event.clientX;
      this.joystick.baseY = event.clientY;
      this.joystick.knobX = event.clientX;
      this.joystick.knobY = event.clientY;
      this.renderStick();
    });

    this.stickArea.addEventListener('pointermove', (event) => {
      if (!this.joystick.active || this.joystick.pointerId !== event.pointerId) return;
      stop(event);
      this.joystick.knobX = event.clientX;
      this.joystick.knobY = event.clientY;
      this.updateStickVector();
      this.renderStick();
    });

    const releaseStick = (event) => {
      if (this.joystick.pointerId !== event.pointerId) return;
      stop(event);
      this.joystick.active = false;
      this.joystick.pointerId = null;
      this.joystick.dx = 0;
      this.joystick.dy = 0;
      this.joystick.strength = 0;
      this.stickBase.style.transform = 'translate(-50%, -50%)';
      this.stickKnob.style.transform = 'translate(-50%, -50%)';
    };

    this.stickArea.addEventListener('pointerup', releaseStick);
    this.stickArea.addEventListener('pointercancel', releaseStick);

    this.buttonEls.forEach((button) => {
      const action = button.dataset.action;
      button.addEventListener('pointerdown', (event) => {
        stop(event);
        this.buttons[action] = true;
        button.classList.add('is-pressed');
        button.setPointerCapture(event.pointerId);
      });
      const releaseButton = (event) => {
        stop(event);
        this.buttons[action] = false;
        button.classList.remove('is-pressed');
      };
      button.addEventListener('pointerup', releaseButton);
      button.addEventListener('pointercancel', releaseButton);
      button.addEventListener('pointerleave', releaseButton);
    });
  }

  updateStickVector() {
    const rawDx = this.joystick.knobX - this.joystick.baseX;
    const rawDy = this.joystick.knobY - this.joystick.baseY;
    const dist = Math.hypot(rawDx, rawDy);
    const max = GAME.touchJoystickRadius;
    if (dist <= 4) {
      this.joystick.dx = 0;
      this.joystick.dy = 0;
      this.joystick.strength = 0;
      return;
    }
    const clamped = Math.min(dist, max);
    this.joystick.dx = rawDx / dist;
    this.joystick.dy = rawDy / dist;
    this.joystick.strength = clamped / max;
  }

  renderStick() {
    const max = GAME.touchJoystickRadius;
    const rawDx = this.joystick.knobX - this.joystick.baseX;
    const rawDy = this.joystick.knobY - this.joystick.baseY;
    const dist = Math.hypot(rawDx, rawDy);
    const clamped = Math.min(dist, max);
    const nx = dist > 0 ? rawDx / dist : 0;
    const ny = dist > 0 ? rawDy / dist : 0;
    const knobX = nx * clamped;
    const knobY = ny * clamped;

    this.stickBase.style.left = `${this.joystick.baseX}px`;
    this.stickBase.style.top = `${this.joystick.baseY}px`;
    this.stickBase.style.transform = 'translate(-50%, -50%)';
    this.stickKnob.style.transform = `translate(calc(-50% + ${knobX}px), calc(-50% + ${knobY}px))`;
  }

  getTouchMovementVector() {
    if (!this.isTouchDevice || !this.joystick.active || this.joystick.strength <= 0) {
      return { x: 0, y: 0, strength: 0 };
    }
    return {
      x: this.joystick.dx,
      y: this.joystick.dy,
      strength: this.joystick.strength,
    };
  }

  isTouchAttackDown() {
    return this.isTouchDevice && this.buttons.attack;
  }

  isTouchGuardDown() {
    return this.isTouchDevice && this.buttons.guard;
  }

  isTouchSprintDown() {
    return this.isTouchDevice && this.buttons.sprint;
  }
}
