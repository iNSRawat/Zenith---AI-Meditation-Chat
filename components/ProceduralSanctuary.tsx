import React, { useEffect, useRef } from 'react';

interface ProceduralSanctuaryProps {
  atmosphere: string;
  className?: string;
}

export const ProceduralSanctuary: React.FC<ProceduralSanctuaryProps> = ({ atmosphere, className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || 800);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 450);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };
    window.addEventListener('resize', handleResize);

    // Color palettes based on atmosphere
    let bgColors = ['#0f172a', '#1e1b4b', '#020617'];
    let particleColor = 'rgba(199, 210, 254, ';
    let glowColor = 'rgba(99, 102, 241, 0.15)';

    if (atmosphere.includes('Ocean') || atmosphere.includes('Water')) {
      bgColors = ['#082f49', '#0c4a6e', '#030712'];
      particleColor = 'rgba(186, 230, 253, ';
      glowColor = 'rgba(14, 165, 233, 0.15)';
    } else if (atmosphere.includes('Zen') || atmosphere.includes('Garden') || atmosphere.includes('Nature')) {
      bgColors = ['#064e3b', '#022c22', '#051b14'];
      particleColor = 'rgba(167, 243, 208, ';
      glowColor = 'rgba(16, 185, 129, 0.15)';
    } else if (atmosphere.includes('Meadow') || atmosphere.includes('Sun') || atmosphere.includes('Golden')) {
      bgColors = ['#451a03', '#271003', '#0a0502'];
      particleColor = 'rgba(254, 215, 170, ';
      glowColor = 'rgba(245, 158, 11, 0.12)';
    } else if (atmosphere.includes('Star') || atmosphere.includes('Cosmic')) {
      bgColors = ['#1e1b4b', '#0f0c29', '#000000'];
      particleColor = 'rgba(224, 231, 255, ';
      glowColor = 'rgba(139, 92, 246, 0.18)';
    }

    // Particle nodes
    const particles: Array<{
      x: number;
      y: number;
      radius: number;
      vx: number;
      vy: number;
      alpha: number;
      pulseSpeed: number;
    }> = [];

    const particleCount = 45;
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 2.5 + 1,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -Math.random() * 0.4 - 0.1,
        alpha: Math.random() * 0.7 + 0.2,
        pulseSpeed: Math.random() * 0.02 + 0.01,
      });
    }

    let time = 0;

    const render = () => {
      time += 0.005;

      // Base gradient
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, bgColors[0]);
      grad.addColorStop(0.5, bgColors[1]);
      grad.addColorStop(1, bgColors[2]);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Ethereal subtle wave orbs
      const orbX = width * 0.5 + Math.sin(time) * 60;
      const orbY = height * 0.4 + Math.cos(time * 0.8) * 40;
      const orbGrad = ctx.createRadialGradient(orbX, orbY, 10, orbX, orbY, Math.max(width, height) * 0.6);
      orbGrad.addColorStop(0, glowColor);
      orbGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = orbGrad;
      ctx.fillRect(0, 0, width, height);

      // Render floating particles
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.alpha += Math.sin(time * 30 * p.pulseSpeed) * 0.005;

        if (p.y < 0) {
          p.y = height + 10;
          p.x = Math.random() * width;
        }
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `${particleColor}${Math.max(0.1, Math.min(0.8, p.alpha))})`;
        ctx.shadowBlur = 8;
        ctx.shadowColor = 'rgba(255,255,255,0.4)';
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [atmosphere]);

  return <canvas ref={canvasRef} className={`w-full h-full block ${className}`} />;
};
