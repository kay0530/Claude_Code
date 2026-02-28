import { useRef, useEffect } from 'react';
import { SKILL_CATEGORIES } from '../../data/skillCategories';

export default function SkillRadarChart({ skills, size = 200, color = '#3B82F6' }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const cx = size / 2;
    const cy = size / 2;
    const maxRadius = size * 0.38;
    const categories = SKILL_CATEGORIES;
    const n = categories.length;
    const angleStep = (2 * Math.PI) / n;
    const startAngle = -Math.PI / 2;

    ctx.clearRect(0, 0, size, size);

    // Draw grid circles
    for (let level = 2; level <= 10; level += 2) {
      const r = (level / 10) * maxRadius;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, 2 * Math.PI);
      ctx.strokeStyle = '#E5E7EB';
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }

    // Draw axis lines and labels
    ctx.font = `${Math.max(9, size * 0.045)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < n; i++) {
      const angle = startAngle + i * angleStep;
      const x = cx + maxRadius * Math.cos(angle);
      const y = cy + maxRadius * Math.sin(angle);

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(x, y);
      ctx.strokeStyle = '#D1D5DB';
      ctx.lineWidth = 0.5;
      ctx.stroke();

      // Labels
      const labelR = maxRadius + size * 0.08;
      const lx = cx + labelR * Math.cos(angle);
      const ly = cy + labelR * Math.sin(angle);
      ctx.fillStyle = '#6B7280';

      // Shorten labels for small sizes
      const label = size < 180
        ? categories[i].nameJa.substring(0, 4)
        : categories[i].nameJa.length > 6
          ? categories[i].nameJa.substring(0, 6)
          : categories[i].nameJa;
      ctx.fillText(label, lx, ly);
    }

    // Draw data polygon
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const angle = startAngle + i * angleStep;
      const value = skills[categories[i].key] || 0;
      const r = (value / 10) * maxRadius;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = color + '33';
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw data points
    for (let i = 0; i < n; i++) {
      const angle = startAngle + i * angleStep;
      const value = skills[categories[i].key] || 0;
      const r = (value / 10) * maxRadius;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();
    }
  }, [skills, size, color]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: size }}
    />
  );
}
