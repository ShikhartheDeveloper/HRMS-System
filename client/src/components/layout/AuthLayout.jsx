import React, { useState, useEffect, useRef, useCallback } from 'react';

/* ───────────────────────── TYPEWRITER ───────────────────────── */
const CinematicWord = ({ word, delay = 0 }) => {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <span
      className="inline-block overflow-hidden"
      style={{
        transform: visible ? 'translateY(0)' : 'translateY(110%)',
        opacity: visible ? 1 : 0,
        transition: 'transform 0.9s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.9s ease',
        transitionDelay: `${delay}ms`,
      }}
    >
      {word}
    </span>
  );
};

/* ───────────────────────── TRAVELING LIGHT BORDER ───────────────────────── */
const TravelingBorder = ({ width = 440, height = 520 }) => {
  const perimeter = 2 * (width + height);
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none z-0"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      fill="none"
    >
      <defs>
        <linearGradient id="border-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="transparent" />
          <stop offset="40%" stopColor="#00F5D4" />
          <stop offset="60%" stopColor="#C9A84C" />
          <stop offset="100%" stopColor="transparent" />
        </linearGradient>
      </defs>
      <rect
        x="0.5" y="0.5"
        width={width - 1} height={height - 1}
        rx="20" ry="20"
        stroke="url(#border-grad)"
        strokeWidth="1.5"
        strokeDasharray={`80 ${perimeter - 80}`}
        className="animate-border-glow"
        style={{ strokeDashoffset: 0 }}
      />
      {/* Static dim border */}
      <rect
        x="0.5" y="0.5"
        width={width - 1} height={height - 1}
        rx="20" ry="20"
        stroke="rgba(255,255,255,0.06)"
        strokeWidth="1"
      />
    </svg>
  );
};

/* ───────────────────────── MAIN LAYOUT ───────────────────────── */
const AuthLayout = ({ children }) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const [ready, setReady] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 100);
    return () => clearTimeout(t);
  }, []);

  /* ── Mouse tracking ── */
  const handleMouseMove = useCallback((e) => {
    mouseRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [handleMouseMove]);

  /* ── Canvas: Aurora + HexGrid + Particles + Orbital Network ── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;
    let W, H;

    const resize = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W;
      canvas.height = H;
    };
    resize();
    window.addEventListener('resize', resize);

    /* ── Aurora blobs ── */
    const blobs = [
      { x: 0.25, y: 0.3, r: 420, color: [26, 5, 51], speed: 0.0004, phase: 0 },
      { x: 0.7, y: 0.6, r: 380, color: [0, 26, 31], speed: 0.0003, phase: 2 },
      { x: 0.5, y: 0.8, r: 350, color: [10, 10, 46], speed: 0.0005, phase: 4 },
      { x: 0.15, y: 0.7, r: 300, color: [123, 47, 190], speed: 0.00035, phase: 1 },
      { x: 0.85, y: 0.2, r: 280, color: [0, 245, 212], speed: 0.00025, phase: 3 },
    ];

    /* ── Hex grid cells ── */
    const hexSize = 32;
    const hexH = hexSize * Math.sqrt(3);
    const hexW = hexSize * 2;

    const drawHex = (cx, cy, size, alpha) => {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 6;
        const px = cx + size * Math.cos(angle);
        const py = cy + size * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.strokeStyle = `rgba(0, 245, 212, ${alpha})`;
      ctx.lineWidth = 0.6;
      ctx.stroke();
    };

    /* ── Starfield particles (3 depth layers) ── */
    const stars = [];
    for (let i = 0; i < 120; i++) {
      stars.push({
        x: Math.random() * 3000 - 500,
        y: Math.random() * 2000 - 300,
        z: Math.random() * 3 + 0.5,
        size: Math.random() * 1.4 + 0.3,
        opacity: Math.random() * 0.5 + 0.15,
        twinklePhase: Math.random() * Math.PI * 2,
        twinkleSpeed: Math.random() * 0.02 + 0.008,
      });
    }

    /* ── Orbital Network nodes ── */
    const netCx = () => W * 0.5;
    const netCy = () => H * 0.42;
    const nodes = [
      { orbit: 0, angle: 0, speed: 0, size: 14, color: '#00F5D4', bloom: 22, label: '' },
      { orbit: 80, angle: 0, speed: 0.006, size: 7, color: '#00F5D4', bloom: 12, label: 'People' },
      { orbit: 80, angle: 2.09, speed: 0.006, size: 6.5, color: '#7B2FBE', bloom: 10, label: 'Payroll' },
      { orbit: 80, angle: 4.19, speed: 0.006, size: 7.5, color: '#C9A84C', bloom: 11, label: 'Talent' },
      { orbit: 140, angle: 0.5, speed: -0.003, size: 5.5, color: '#00F5D4', bloom: 8, label: 'Analytics' },
      { orbit: 140, angle: 1.7, speed: -0.003, size: 5, color: '#7B2FBE', bloom: 8, label: 'Benefits' },
      { orbit: 140, angle: 2.9, speed: -0.003, size: 5.5, color: '#C9A84C', bloom: 9, label: 'Compliance' },
      { orbit: 140, angle: 4.1, speed: -0.003, size: 5, color: '#00F5D4', bloom: 8, label: 'Time' },
      { orbit: 140, angle: 5.3, speed: -0.003, size: 5.5, color: '#7B2FBE', bloom: 8, label: 'Docs' },
      { orbit: 200, angle: 0.3, speed: 0.0015, size: 4, color: '#C9A84C', bloom: 6 },
      { orbit: 200, angle: 1.3, speed: 0.0015, size: 3.5, color: '#00F5D4', bloom: 6 },
      { orbit: 200, angle: 2.3, speed: 0.0015, size: 4, color: '#7B2FBE', bloom: 6 },
      { orbit: 200, angle: 3.3, speed: 0.0015, size: 3.5, color: '#C9A84C', bloom: 6 },
      { orbit: 200, angle: 4.3, speed: 0.0015, size: 4, color: '#00F5D4', bloom: 6 },
      { orbit: 200, angle: 5.3, speed: 0.0015, size: 3.5, color: '#7B2FBE', bloom: 6 },
    ];

    /* ── Energy pulse particles traveling along connections ── */
    const pulses = [];
    const spawnPulse = (fromX, fromY, toX, toY, color) => {
      pulses.push({
        fromX, fromY, toX, toY,
        t: 0, speed: 0.008 + Math.random() * 0.006,
        color, size: 2 + Math.random() * 1.5,
      });
    };

    let pulseTimer = 0;
    let time = 0;

    const animate = () => {
      time += 1;
      ctx.clearRect(0, 0, W, H);

      /* ── 1. Dark base ── */
      ctx.fillStyle = '#050508';
      ctx.fillRect(0, 0, W, H);

      /* ── 2. Aurora blobs ── */
      blobs.forEach((b) => {
        b.phase += b.speed;
        const bx = b.x * W + Math.sin(b.phase) * 60;
        const by = b.y * H + Math.cos(b.phase * 0.7) * 40;
        const grad = ctx.createRadialGradient(bx, by, 0, bx, by, b.r);
        grad.addColorStop(0, `rgba(${b.color[0]},${b.color[1]},${b.color[2]},0.25)`);
        grad.addColorStop(0.5, `rgba(${b.color[0]},${b.color[1]},${b.color[2]},0.08)`);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
      });

      /* ── 3. Hex grid (mouse-reactive) ── */
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      for (let row = -1; row < H / hexH + 2; row++) {
        for (let col = -1; col < W / (hexW * 0.75) + 2; col++) {
          const cx = col * hexW * 0.75;
          const cy = row * hexH + (col % 2 === 1 ? hexH / 2 : 0);
          const dist = Math.hypot(mx - cx, my - cy);
          const maxDist = 200;
          let alpha = 0.03;
          if (dist < maxDist) {
            const proximity = 1 - dist / maxDist;
            alpha = 0.03 + proximity * 0.18;
          }
          drawHex(cx, cy, hexSize, alpha);
        }
      }

      /* ── 4. Starfield particles with parallax ── */
      const parallaxX = (mx - W / 2) * 0.02;
      const parallaxY = (my - H / 2) * 0.02;

      stars.forEach((s) => {
        s.twinklePhase += s.twinkleSpeed;
        const twinkle = 0.5 + 0.5 * Math.sin(s.twinklePhase);
        const px = s.x + parallaxX * s.z;
        const py = s.y + parallaxY * s.z;
        const wrappedX = ((px % W) + W) % W;
        const wrappedY = ((py % H) + H) % H;

        ctx.fillStyle = `rgba(232, 244, 248, ${s.opacity * twinkle})`;
        ctx.beginPath();
        ctx.arc(wrappedX, wrappedY, s.size / s.z, 0, Math.PI * 2);
        ctx.fill();
      });

      /* ── 5. Orbital Network ── */
      const ncx = netCx();
      const ncy = netCy();

      // Update node positions
      nodes.forEach((n) => {
        n.angle += n.speed;
        if (n.orbit === 0) {
          n.px = ncx;
          n.py = ncy;
        } else {
          n.px = ncx + Math.cos(n.angle) * n.orbit;
          n.py = ncy + Math.sin(n.angle) * n.orbit;
        }
      });

      // Orbit rings (very subtle)
      [80, 140, 200].forEach((r) => {
        ctx.beginPath();
        ctx.arc(ncx, ncy, r, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,255,255,0.025)';
        ctx.lineWidth = 0.8;
        ctx.stroke();
      });

      // Connection lines — energy streams
      const center = nodes[0];
      for (let i = 1; i < nodes.length; i++) {
        const n = nodes[i];
        ctx.beginPath();
        ctx.moveTo(center.px, center.py);
        ctx.lineTo(n.px, n.py);

        // Mouse proximity glow
        const midX = (center.px + n.px) / 2;
        const midY = (center.py + n.py) / 2;
        const distToMouse = Math.hypot(mx - midX, my - midY);
        const lineAlpha = distToMouse < 150 ? 0.15 + (1 - distToMouse / 150) * 0.2 : 0.06;

        ctx.strokeStyle = `rgba(0, 245, 212, ${lineAlpha})`;
        ctx.lineWidth = distToMouse < 150 ? 1.2 : 0.6;
        ctx.stroke();

        // Cross connections within same orbit
        if (i < nodes.length - 1 && nodes[i + 1].orbit === n.orbit) {
          ctx.beginPath();
          ctx.moveTo(n.px, n.py);
          ctx.lineTo(nodes[i + 1].px, nodes[i + 1].py);
          ctx.strokeStyle = `rgba(123, 47, 190, ${lineAlpha * 0.5})`;
          ctx.lineWidth = 0.4;
          ctx.stroke();
        }
      }

      // Spawn energy pulses
      pulseTimer++;
      if (pulseTimer % 30 === 0 && pulses.length < 20) {
        const srcIdx = Math.floor(Math.random() * (nodes.length - 1)) + 1;
        const src = nodes[srcIdx];
        spawnPulse(center.px, center.py, src.px, src.py, src.color);
      }

      // Animate pulses
      for (let i = pulses.length - 1; i >= 0; i--) {
        const p = pulses[i];
        p.t += p.speed;
        if (p.t >= 1) { pulses.splice(i, 1); continue; }
        const px = p.fromX + (p.toX - p.fromX) * p.t;
        const py = p.fromY + (p.toY - p.fromY) * p.t;

        ctx.shadowColor = p.color;
        ctx.shadowBlur = 12;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(px, py, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Draw nodes with bloom
      nodes.forEach((n) => {
        // Node hover detection
        const dMouse = Math.hypot(mx - n.px, my - n.py);
        const hovered = dMouse < 30;
        const drawSize = hovered ? n.size * 1.4 : n.size + Math.sin(time * 0.03 + n.angle) * 1.2;

        // Bloom glow
        ctx.shadowColor = n.color;
        ctx.shadowBlur = hovered ? n.bloom * 2.5 : n.bloom;

        // Outer glow ring
        ctx.fillStyle = n.color;
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.arc(n.px, n.py, drawSize + 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Core
        ctx.fillStyle = n.color;
        ctx.beginPath();
        ctx.arc(n.px, n.py, drawSize, 0, Math.PI * 2);
        ctx.fill();

        // Inner white core
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.beginPath();
        ctx.arc(n.px, n.py, drawSize * 0.35, 0, Math.PI * 2);
        ctx.fill();

        // Label
        if (n.label && hovered) {
          ctx.fillStyle = 'rgba(232,244,248,0.8)';
          ctx.font = '500 10px Inter, system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(n.label, n.px, n.py - drawSize - 8);
        }
      });

      animId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative w-screen h-screen overflow-hidden bg-[#050508]" style={{ fontFamily: "'Inter', 'Space Grotesk', system-ui, sans-serif" }}>
      {/* Full-screen Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full z-0" />

      {/* ── Top-Left Logo with Arc-Draw ── */}
      <div className="absolute top-8 left-10 z-30 flex items-center gap-3">
        <svg width="42" height="42" viewBox="0 0 42 42" className="overflow-visible">
          <defs>
            <linearGradient id="logo-grad" x1="0" y1="0" x2="42" y2="42">
              <stop offset="0%" stopColor="#00F5D4" />
              <stop offset="100%" stopColor="#7B2FBE" />
            </linearGradient>
          </defs>
          <rect
            x="1" y="1" width="40" height="40" rx="12"
            fill="rgba(0,245,212,0.08)"
            stroke="url(#logo-grad)"
            strokeWidth="1.5"
            strokeDasharray="160"
            className="animate-logo-draw"
          />
          <text
            x="21" y="28"
            textAnchor="middle"
            fill="url(#logo-grad)"
            fontSize="20"
            fontWeight="800"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            H
          </text>
        </svg>
        <span className="text-lg font-bold tracking-tight opacity-0 animate-logo-text" style={{
          background: 'linear-gradient(135deg, #E8F4F8 0%, rgba(232,244,248,0.5) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          HRMS Elite
        </span>
      </div>

      {/* ── Hero Typography ── */}
      <div className="absolute z-20 pointer-events-none select-none hidden lg:block"
        style={{ top: '12%', left: '8%' }}
      >
        {/* Line 1: YOUR PEOPLE. */}
        <div className="overflow-hidden">
          <h1 className="font-extrabold tracking-tight leading-none" style={{
            fontSize: 'clamp(2.5rem, 6vw, 5rem)',
            background: 'linear-gradient(135deg, #E8F4F8 0%, rgba(232,244,248,0.6) 60%, #C9A84C 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundSize: '200% 100%',
          }}>
            <CinematicWord word="YOUR PEOPLE." delay={300} />
          </h1>
        </div>

        {/* Line 2: SIMPLIFIED. */}
        <div className="overflow-hidden mt-1">
          <h1 className="font-extrabold tracking-tight leading-none" style={{
            fontSize: 'clamp(2.5rem, 6vw, 5rem)',
            background: 'linear-gradient(135deg, #00F5D4 0%, #7B2FBE 50%, #C9A84C 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundSize: '200% 100%',
          }}>
            <CinematicWord word="SIMPLIFIED." delay={700} />
          </h1>
        </div>

        {/* Subheadline with laser scan */}
        <div className="mt-6 overflow-hidden">
          <p className="text-sm font-normal tracking-wide max-w-md leading-relaxed"
            style={{
              opacity: ready ? 1 : 0,
              transition: 'opacity 1.2s ease 1.5s',
              background: 'linear-gradient(90deg, transparent 0%, rgba(232,244,248,0.7) 20%, rgba(0,245,212,0.9) 50%, rgba(232,244,248,0.7) 80%, transparent 100%)',
              backgroundSize: '200% 100%',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              animation: ready ? 'laser-scan 4s linear infinite 2s' : 'none',
            }}
          >
            The operating system for your workforce. Attendance, payroll,
            org structures, and talent — unified in one intelligence-driven platform.
          </p>
        </div>
      </div>

      {/* ── Workspace Entry Card ── */}
      <div className="absolute z-30 flex items-center justify-center p-4 w-full md:w-auto"
        style={{
          right: isMobile ? 'auto' : 'clamp(4%, 8vw, 12%)',
          left: isMobile ? '50%' : 'auto',
          top: '50%',
          transform: isMobile ? 'translate(-50%, -50%)' : 'translateY(-50%)',
          opacity: ready ? 1 : 0,
          transition: 'opacity 0.8s ease 0.5s, transform 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.5s',
          maxWidth: '90vw'
        }}
      >
        <div className="relative w-full md:w-[420px] rounded-[20px] overflow-visible"
          style={{
            background: 'rgba(255,255,255,0.025)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
          }}
        >
          {/* Traveling light border */}
          {!isMobile ? (
            <TravelingBorder width={420} height={500} />
          ) : (
            <div className="absolute inset-0 rounded-[20px] border border-white/10 pointer-events-none" />
          )}

          {/* Card content */}
          <div className="relative z-10 p-6 md:p-10 space-y-6">
            {children}
          </div>
        </div>
      </div>

      {/* ── Bottom Subtle Branding ── */}
      <div className="absolute bottom-6 left-10 z-20 flex items-center gap-4" style={{
        opacity: ready ? 1 : 0,
        transition: 'opacity 1s ease 2.5s',
      }}>
        <div className="flex gap-1.5">
          {['#00F5D4', '#7B2FBE', '#C9A84C', '#FF2D55'].map((c, i) => (
            <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: c, opacity: 0.6 }} />
          ))}
        </div>
        <span className="text-[10px] font-medium tracking-widest uppercase" style={{ color: 'rgba(232,244,248,0.25)' }}>
          Enterprise HR Intelligence
        </span>
      </div>
    </div>
  );
};

export default AuthLayout;
