const random = (min, max) => Math.random() * (max - min) + min;

export class LightningStorm {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.bolts = [];
    this.flash = 0;
    this.running = true;
    this.resize = this.resize.bind(this);
    this.frame = this.frame.bind(this);
    this.resize();
    window.addEventListener("resize", this.resize, { passive: true });
    requestAnimationFrame(this.frame);
  }

  resize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  strike({ x = random(this.width * 0.15, this.width * 0.85), intensity = 1 } = {}) {
    if (!this.running) return;

    const points = [{ x, y: -20 }];
    let currentX = x;
    let y = -20;

    while (y < this.height * random(0.52, 0.92)) {
      y += random(20, 48);
      currentX += random(-34, 34);
      points.push({ x: currentX, y });
    }

    this.bolts.push({ points, life: 1, intensity });
    this.flash = Math.max(this.flash, 0.34 * intensity);
  }

  cinematicStrike() {
    this.strike({ x: this.width * 0.5, intensity: 1.5 });
    window.setTimeout(() => this.strike({ x: this.width * 0.47, intensity: 0.7 }), 105);
  }

  frame() {
    const { ctx, width, height } = this;
    ctx.clearRect(0, 0, width, height);

    if (this.flash > 0.01) {
      ctx.fillStyle = `rgba(196, 235, 255, ${this.flash})`;
      ctx.fillRect(0, 0, width, height);
      this.flash *= 0.72;
    }

    this.bolts = this.bolts.filter((bolt) => {
      bolt.life *= 0.82;
      if (bolt.life < 0.02) return false;

      ctx.save();
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.beginPath();
      bolt.points.forEach((point, index) => {
        if (index === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
      });
      ctx.shadowBlur = 22;
      ctx.shadowColor = "#78d7ff";
      ctx.strokeStyle = `rgba(218, 246, 255, ${bolt.life})`;
      ctx.lineWidth = 1.15 * bolt.intensity;
      ctx.stroke();
      ctx.shadowBlur = 4;
      ctx.strokeStyle = `rgba(255, 255, 255, ${bolt.life})`;
      ctx.lineWidth = 0.45;
      ctx.stroke();
      ctx.restore();
      return true;
    });

    requestAnimationFrame(this.frame);
  }

  destroy() {
    this.running = false;
    window.removeEventListener("resize", this.resize);
  }
}
