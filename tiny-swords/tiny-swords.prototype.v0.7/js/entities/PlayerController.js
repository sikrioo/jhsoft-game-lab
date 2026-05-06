import { CHARACTER_TYPES, GAME } from '../config/constants.js';

export class PlayerController {
  constructor(scene, hud, inputSystem, characterType = 'warrior') {
    this.scene = scene;
    this.hud = hud;
    this.inputSystem = inputSystem;
    this.character = CHARACTER_TYPES[characterType] || CHARACTER_TYPES.warrior;

    this.sprite = scene.physics.add.sprite(GAME.mapW / 2, GAME.mapH / 2, this.character.idleKey);
    this.sprite.setScale(this.character.scale);
    this.sprite.setCollideWorldBounds(true);
    this.sprite.setDepth(10);
    this.sprite.play(this.character.idleAnim);

    this.hp = GAME.maxHp;
    this.guard = GAME.maxGuard;
    this.state = 'idle';
    this.facing = 1;
    this.attackCooldown = 0;
    this.guardCooldown = 0;
    this.isGuardBroken = false;
    this.alive = true;
    this.respawning = false;
    this.prevTouchAttack = false;

    this.keys = scene.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      z: Phaser.Input.Keyboard.KeyCodes.Z,
      x: Phaser.Input.Keyboard.KeyCodes.X,
      shift: Phaser.Input.Keyboard.KeyCodes.SHIFT,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE,
    });
    this.cursors = scene.input.keyboard.createCursorKeys();

    this.sprite.on(`animationcomplete-${this.character.attackAnim}`, () => {
      if (this.state === 'attack' && this.alive) this.setState('idle', this.character.idleAnim, 'IDLE');
    });

    // PC: 마우스 클릭 = 공격. 모바일 터치 버튼은 InputSystem에서 처리.
    scene.input.on('pointerdown', (pointer, _objects, event) => {
      if (this.inputSystem?.isTouchDevice) return;
      if (event) event.stopPropagation();
      this.requestAttack();
    });
  }

  reset(x, y) {
    this.sprite.setPosition(x, y).setAlpha(1).setAngle(0).setActive(true).setVisible(true);
    this.sprite.body.enable = true;
    this.hp = GAME.maxHp;
    this.guard = GAME.maxGuard;
    this.state = 'idle';
    this.isGuardBroken = false;
    this.alive = true;
    this.respawning = false;
    this.prevTouchAttack = false;
    this.sprite.play(this.character.idleAnim, true);
    this.hud.setState('IDLE');
  }

  update(dt, bots, damageSystem, slashSystem) {
    if (!this.alive) {
      this.sprite.setVelocity(0, 0);
      this.hud.setGuardVisible(false);
      return;
    }

    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    if (!this.isGuardBroken) this.guardCooldown = 0;

    this.updateFacing();

    const touchAttack = this.inputSystem?.isTouchAttackDown() || false;
    const touchAttackJustDown = touchAttack && !this.prevTouchAttack;
    this.prevTouchAttack = touchAttack;

    const attackJD = Phaser.Input.Keyboard.JustDown(this.keys.z) || touchAttackJustDown || this.consumeRequestedAttack();
    const guardHeld = (this.keys.x.isDown || this.inputSystem?.isTouchGuardDown()) && !this.isGuardBroken;

    if (this.state === 'attack') {
      this.sprite.setVelocity(0, 0);
      return;
    }

    if (guardHeld && this.guard > 0) {
      if (this.state !== 'guard') this.setState('guard', this.character.guardAnim, 'GUARD');
      this.sprite.setVelocity(0, 0);
      this.guard = Math.max(0, this.guard - GAME.guardDrain * dt);
      if (this.guard <= 0) {
        this.isGuardBroken = true;
        this.setState('idle', this.character.idleAnim, 'IDLE');
        this.hud.showDmgFloat('GUARD BREAK', this.sprite.x, this.sprite.y - 30, '#3a8ab0', '13px');
      }
      this.hud.setGuardVisible(true);
      return;
    }

    this.hud.setGuardVisible(false);
    if (this.state === 'guard') this.setState('idle', this.character.idleAnim, 'IDLE');

    if (this.isGuardBroken) {
      this.guardCooldown += dt;
      if (this.guardCooldown >= 2) {
        this.isGuardBroken = false;
        this.guardCooldown = 0;
      }
      this.guard = Math.min(GAME.maxGuard, this.guard + GAME.guardRegen * 0.3 * dt);
    } else {
      this.guard = Math.min(GAME.maxGuard, this.guard + GAME.guardRegen * dt);
    }

    if (attackJD && this.attackCooldown <= 0) {
      this.attackCooldown = this.character.attackCooldown;
      this.setState('attack', this.character.attackAnim, this.character.attackMode === 'ranged' ? 'SHOOT' : 'ATTACK');
      this.sprite.setVelocity(0, 0);

      if (this.character.attackMode === 'ranged') {
        const target = this.getPointerWorldPoint();
        this.scene.time.delayedCall(130, () => {
          if (!this.alive) return;
          damageSystem.playerShootArrow(this, bots, target.x, target.y);
        });
      } else {
        damageSystem.playerAttack(this, bots);
        slashSystem.draw(this.sprite.x, this.sprite.y, this.facing);
      }
      return;
    }

    this.updateMovement();
  }

  requestAttack() {
    this.attackRequested = true;
  }

  consumeRequestedAttack() {
    const requested = this.attackRequested === true;
    this.attackRequested = false;
    return requested;
  }

  getPointerWorldPoint() {
    const pointer = this.scene.input.activePointer;
    if (!pointer) return { x: this.sprite.x + this.facing * 100, y: this.sprite.y };
    return this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
  }

  updateFacing() {
    const touchMove = this.inputSystem?.getTouchMovementVector();
    if (touchMove && touchMove.strength > 0.05) {
      this.setFacing(touchMove.x);
      return;
    }

    const pointer = this.scene.input.activePointer;
    if (!pointer || this.inputSystem?.isTouchDevice) return;
    const worldPoint = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
    this.setFacing(worldPoint.x - this.sprite.x);
  }

  setFacing(dx) {
    if (dx < -0.01) {
      this.facing = -1;
      this.sprite.setFlipX(true);
    } else if (dx > 0.01) {
      this.facing = 1;
      this.sprite.setFlipX(false);
    }
  }

  updateMovement() {
    let vx = 0;
    let vy = 0;

    const touchMove = this.inputSystem?.getTouchMovementVector();
    const touchSprint = this.inputSystem?.isTouchSprintDown() || (touchMove?.strength || 0) >= GAME.touchSprintThreshold;
    const sprinting = this.keys.shift.isDown || touchSprint;
    const speed = sprinting ? GAME.speed * GAME.sprintMultiplier : GAME.speed;

    if (this.keys.space.isDown) {
      this.sprite.setVelocity(0, 0);
      if (this.state !== 'idle') this.setState('idle', this.character.idleAnim, 'IDLE');
      return;
    }

    if (touchMove && touchMove.strength > 0.05) {
      const analogSpeed = speed * Phaser.Math.Clamp(touchMove.strength, 0.35, 1);
      vx = touchMove.x * analogSpeed;
      vy = touchMove.y * analogSpeed;
    } else {
      const left = this.cursors.left.isDown || this.keys.left.isDown;
      const right = this.cursors.right.isDown || this.keys.right.isDown;
      const up = this.cursors.up.isDown || this.keys.up.isDown;
      const down = this.cursors.down.isDown || this.keys.down.isDown;

      if (left) vx = -speed;
      if (right) vx = speed;
      if (up) vy = -speed;
      if (down) vy = speed;
      if (vx && vy) {
        vx *= 0.707;
        vy *= 0.707;
      }
    }

    this.sprite.setVelocity(vx, vy);
    const moving = vx !== 0 || vy !== 0;
    if (moving && this.state !== 'run') this.setState('run', this.character.runAnim, sprinting ? 'SPRINT' : 'RUN');
    else if (!moving && this.state !== 'idle') this.setState('idle', this.character.idleAnim, 'IDLE');
    else if (moving && sprinting) this.hud.setState('SPRINT');
    else if (moving) this.hud.setState('RUN');
  }

  setState(state, anim, label) {
    this.state = state;
    this.sprite.play(anim, true);
    this.hud.setState(label);
  }
}
