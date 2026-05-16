export class FxCanvas {
  constructor(canvas, root) {
    this.canvas = canvas;
    this.root = root;
    this.ctx = canvas.getContext("2d");
    this.particles = [];
    this.flashAlpha = 0;
    this.flashColor = "#d4a020";
    this.flashDecay = 0.05;
    this.bgTintColor = null;
    this.bgTintAlpha = 0;
  }

  resize() {
    this.canvas.width = this.root.offsetWidth;
    this.canvas.height = this.root.offsetHeight;
  }

  start() {
    const loop = () => {
      this.draw();
      requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);
  }

  flash(color, strength = 0.7, decay = 0.05) {
    this.flashAlpha = strength;
    this.flashColor = color;
    this.flashDecay = decay;
  }

  tint(color, duration = 1500) {
    this.bgTintColor = color;
    this.bgTintAlpha = 0.25;
    window.setTimeout(() => {
      this.bgTintColor = null;
    }, duration);
  }

  emitBurst(x, y, count, color) {
    for (let index = 0; index < count; index += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 6;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 3,
        life: 1,
        decay: 0.013 + Math.random() * 0.02,
        radius: 3 + Math.random() * 5,
        color,
      });
    }
  }

  emitStarBurst(x, y, count, color) {
    for (let index = 0; index < count; index += 1) {
      const angle = (index / count) * Math.PI * 2;
      const speed = 1.5 + Math.random() * 4;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        life: 1,
        decay: 0.01 + Math.random() * 0.015,
        radius: 4 + Math.random() * 5,
        color,
        star: true,
        rotation: Math.random() * Math.PI,
      });
    }
  }

  emitLightning(x1, y1, x2, y2, color) {
    let previousX = x1;
    let previousY = y1;

    for (let index = 0; index < 6; index += 1) {
      const progress = (index + 1) / 6;
      const nextX = x1 + (x2 - x1) * progress + (Math.random() - 0.5) * 40;
      const nextY = y1 + (y2 - y1) * progress + (Math.random() - 0.5) * 30;

      this.particles.push({
        type: "line",
        x1: previousX,
        y1: previousY,
        x2: nextX,
        y2: nextY,
        life: 1,
        decay: 0.15 + Math.random() * 0.1,
        color,
        lineWidth: 1.5 + Math.random() * 2,
      });

      previousX = nextX;
      previousY = nextY;
    }
  }

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    if (this.bgTintColor && this.bgTintAlpha > 0) {
      this.ctx.globalAlpha = this.bgTintAlpha * 0.55;
      this.ctx.fillStyle = this.bgTintColor;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.globalAlpha = 1;
      this.bgTintAlpha = Math.max(0, this.bgTintAlpha - 0.006);
    }

    if (this.flashAlpha > 0) {
      this.ctx.globalAlpha = this.flashAlpha * 0.5;
      this.ctx.fillStyle = this.flashColor;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.globalAlpha = 1;
      this.flashAlpha = Math.max(0, this.flashAlpha - this.flashDecay);
    }

    this.particles = this.particles.filter((particle) => {
      if (particle.type === "line") {
        particle.life -= particle.decay;
        if (particle.life <= 0) {
          return false;
        }

        this.ctx.globalAlpha = particle.life;
        this.ctx.strokeStyle = particle.color;
        this.ctx.lineWidth = particle.lineWidth ?? 2;
        this.ctx.beginPath();
        this.ctx.moveTo(particle.x1, particle.y1);
        this.ctx.lineTo(particle.x2, particle.y2);
        this.ctx.stroke();
        return true;
      }

      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.vy += 0.14;
      particle.life -= particle.decay;

      if (particle.life <= 0) {
        return false;
      }

      this.ctx.globalAlpha = particle.life;
      this.ctx.fillStyle = particle.color;

      if (particle.star) {
        particle.rotation += 0.07;
        this.drawStarShape(particle.x, particle.y, particle.radius * particle.life, particle.rotation);
      } else {
        this.ctx.beginPath();
        this.ctx.arc(
          particle.x,
          particle.y,
          Math.max(0.5, particle.radius * particle.life),
          0,
          Math.PI * 2,
        );
        this.ctx.fill();
      }

      return true;
    });

    this.ctx.globalAlpha = 1;
  }

  drawStarShape(x, y, radius, rotation) {
    this.ctx.beginPath();

    for (let index = 0; index < 10; index += 1) {
      const angle = rotation + index * (Math.PI / 5);
      const pointRadius = index % 2 === 0 ? radius : radius * 0.4;

      if (index === 0) {
        this.ctx.moveTo(x + Math.cos(angle) * pointRadius, y + Math.sin(angle) * pointRadius);
      } else {
        this.ctx.lineTo(x + Math.cos(angle) * pointRadius, y + Math.sin(angle) * pointRadius);
      }
    }

    this.ctx.closePath();
    this.ctx.fill();
  }
}
