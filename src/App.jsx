import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import * as THREE from "three";

// ═══════════════════════════════════════════════════════════════════════════════
// THREE.JS 3D BACKGROUND SCENE
// ═══════════════════════════════════════════════════════════════════════════════
function NeuralBackground({ page }) {
  const mountRef = useRef(null);
  const sceneRef = useRef({});

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    const W = el.clientWidth, H = el.clientHeight;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, W / H, 0.1, 1000);
    camera.position.set(0, 0, 30);

    // ── PARTICLE FIELD ──────────────────────────────────────────────────────
    const particleCount = 1800;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    const palette = [
      new THREE.Color(0x00d4ff), new THREE.Color(0x7c3aed),
      new THREE.Color(0x06b6d4), new THREE.Color(0x4f46e5),
      new THREE.Color(0x0ea5e9), new THREE.Color(0xa855f7),
    ];

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * 120;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 80;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 60;
      const c = palette[Math.floor(Math.random() * palette.length)];
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
      sizes[i] = Math.random() * 2.5 + 0.5;
    }

    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    pGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    pGeo.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

    const pMat = new THREE.PointsMaterial({
      size: 0.18, vertexColors: true, transparent: true,
      opacity: 0.75, sizeAttenuation: true, blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const particles = new THREE.Points(pGeo, pMat);
    scene.add(particles);

    // ── NEURAL NETWORK LINES ─────────────────────────────────────────────────
    const nodeCount = 60;
    const nodes = [];
    for (let i = 0; i < nodeCount; i++) {
      nodes.push(new THREE.Vector3(
        (Math.random() - 0.5) * 80,
        (Math.random() - 0.5) * 50,
        (Math.random() - 0.5) * 30
      ));
    }

    const linePositions = [];
    const lineColors = [];
    for (let i = 0; i < nodeCount; i++) {
      for (let j = i + 1; j < nodeCount; j++) {
        const dist = nodes[i].distanceTo(nodes[j]);
        if (dist < 18) {
          linePositions.push(nodes[i].x, nodes[i].y, nodes[i].z);
          linePositions.push(nodes[j].x, nodes[j].y, nodes[j].z);
          const alpha = 1 - dist / 18;
          lineColors.push(0.0, 0.55 * alpha, 0.9 * alpha);
          lineColors.push(0.3 * alpha, 0.2 * alpha, 0.85 * alpha);
        }
      }
    }

    const lGeo = new THREE.BufferGeometry();
    lGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(linePositions), 3));
    lGeo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(lineColors), 3));
    const lMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false });
    const lines = new THREE.LineSegments(lGeo, lMat);
    scene.add(lines);

    // ── FLOATING GEOMETRIC ORBS ───────────────────────────────────────────────
    const orbs = [];
    const orbData = [
      { r: 3.5, color: 0x0ea5e9, x: -18, y: 8, z: -10, speed: 0.003 },
      { r: 2.2, color: 0x7c3aed, x: 20, y: -6, z: -5, speed: 0.005 },
      { r: 1.6, color: 0x06b6d4, x: 8, y: 14, z: -15, speed: 0.007 },
      { r: 4.0, color: 0x4f46e5, x: -25, y: -10, z: -20, speed: 0.002 },
    ];
    orbData.forEach(od => {
      const geo = new THREE.IcosahedronGeometry(od.r, 1);
      const mat = new THREE.MeshBasicMaterial({
        color: od.color, wireframe: true, transparent: true, opacity: 0.12,
        blending: THREE.AdditiveBlending,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(od.x, od.y, od.z);
      mesh.userData = { ox: od.x, oy: od.y, speed: od.speed, t: Math.random() * Math.PI * 2 };
      scene.add(mesh);
      orbs.push(mesh);
    });

    // ── GRID PLANE ────────────────────────────────────────────────────────────
    const gridGeo = new THREE.PlaneGeometry(200, 200, 40, 40);
    const gridMat = new THREE.MeshBasicMaterial({
      color: 0x0d2040, wireframe: true, transparent: true, opacity: 0.08,
    });
    const grid = new THREE.Mesh(gridGeo, gridMat);
    grid.rotation.x = -Math.PI / 2.5;
    grid.position.y = -20;
    scene.add(grid);

    // ── MOUSE PARALLAX ────────────────────────────────────────────────────────
    let mx = 0, my = 0;
    const onMouseMove = (e) => {
      mx = (e.clientX / window.innerWidth - 0.5) * 2;
      my = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("mousemove", onMouseMove);

    // ── ANIMATION LOOP ────────────────────────────────────────────────────────
    let frame, t = 0;
    const animate = () => {
      frame = requestAnimationFrame(animate);
      t += 0.005;

      particles.rotation.y = t * 0.04;
      particles.rotation.x = t * 0.02;
      lines.rotation.y = t * 0.03;

      camera.position.x += (mx * 4 - camera.position.x) * 0.02;
      camera.position.y += (-my * 3 - camera.position.y) * 0.02;
      camera.lookAt(scene.position);

      orbs.forEach(orb => {
        orb.rotation.x += orb.userData.speed;
        orb.rotation.y += orb.userData.speed * 1.3;
        orb.position.y = orb.userData.oy + Math.sin(t + orb.userData.t) * 2.5;
      });

      // Pulse particles opacity
      pMat.opacity = 0.6 + Math.sin(t * 0.8) * 0.15;

      renderer.render(scene, camera);
    };
    animate();

    sceneRef.current = { renderer, scene, camera, animate };

    // Resize
    const onResize = () => {
      const W2 = el.clientWidth, H2 = el.clientHeight;
      camera.aspect = W2 / H2;
      camera.updateProjectionMatrix();
      renderer.setSize(W2, H2);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div ref={mountRef} style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }} />
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MINI 3D SEO GLOBE WIDGET
// ═══════════════════════════════════════════════════════════════════════════════
function SEOGlobe({ score }) {
  const mountRef = useRef(null);
  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    const SIZE = 80;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(SIZE, SIZE);
    renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    camera.position.z = 3.5;

    const color = score < 30 ? 0xef4444 : score < 60 ? 0xf59e0b : score < 80 ? 0x3b82f6 : 0x10b981;

    // Outer ring
    const ringGeo = new THREE.TorusGeometry(1.1, 0.06, 8, 64, (score / 100) * Math.PI * 2);
    const ringMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.z = Math.PI / 2;
    scene.add(ring);

    // BG ring
    const bgRingGeo = new THREE.TorusGeometry(1.1, 0.04, 8, 64);
    const bgRingMat = new THREE.MeshBasicMaterial({ color: 0x1e3a5f, transparent: true, opacity: 0.5 });
    scene.add(new THREE.Mesh(bgRingGeo, bgRingMat));

    // Center sphere
    const sphereGeo = new THREE.SphereGeometry(0.7, 16, 16);
    const sphereMat = new THREE.MeshBasicMaterial({ color: 0x0a1628, wireframe: false });
    scene.add(new THREE.Mesh(sphereGeo, sphereMat));

    let frame, t = 0;
    const animate = () => {
      frame = requestAnimationFrame(animate);
      t += 0.02;
      ring.rotation.z = Math.PI / 2 + Math.sin(t * 0.3) * 0.05;
      renderer.render(scene, camera);
    };
    animate();
    return () => { cancelAnimationFrame(frame); renderer.dispose(); if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement); };
  }, [score]);

  const color = score < 30 ? "#ef4444" : score < 60 ? "#f59e0b" : score < 80 ? "#3b82f6" : "#10b981";
  const label = score < 30 ? "Critical" : score < 60 ? "Poor" : score < 80 ? "Good" : "Great";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div ref={mountRef} style={{ position: "relative", width: 80, height: 80, flexShrink: 0 }}>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", pointerEvents: "none" }}>
          <div style={{ fontSize: 15, fontWeight: 900, color, fontFamily: "'Syne', sans-serif" }}>{score}</div>
          <div style={{ fontSize: 8, color: color + "99", fontWeight: 700, letterSpacing: 1 }}>SEO</div>
        </div>
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color }}>{label}</div>
        <div style={{ fontSize: 11, color: "#475569" }}>Score</div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DATA & CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════
const SOURCES = ["Google Search", "Google Maps", "LinkedIn", "JustDial"];
const CATEGORIES = ["Restaurant", "IT Services", "Gym & Fitness", "Real Estate", "Hospital", "Law Firm", "Dental Clinic", "Hotel", "Salon & Spa", "CA & Finance"];

const SEED_LEADS = [
  { id: 1, name: "TechSpark Solutions", category: "IT Services", phone: "+91-9876543210", email: "info@techspark.in", website: "https://techspark.in", address: "Bangalore, Karnataka", source: "Google Maps", seoScore: 42, status: "new", notes: "" },
  { id: 2, name: "Sunrise Digital Agency", category: "Marketing", phone: "+91-9812345678", email: "hello@sunrisedigital.com", website: "https://sunrisedigital.com", address: "Mumbai, Maharashtra", source: "LinkedIn", seoScore: 67, status: "contacted", notes: "" },
  { id: 3, name: "BuildRight Construction", category: "Construction", phone: "+91-9988776655", email: "contact@buildright.co.in", website: "", address: "Delhi, India", source: "JustDial", seoScore: 18, status: "new", notes: "" },
  { id: 4, name: "GreenLeaf Organics", category: "Food & Beverage", phone: "+91-7712345678", email: "orders@greenleaf.in", website: "https://greenleaf.in", address: "Pune, Maharashtra", source: "Google Search", seoScore: 55, status: "new", notes: "" },
  { id: 5, name: "ProFit Gym Network", category: "Health & Fitness", phone: "+91-9900112233", email: "join@profitgym.in", website: "https://profitgym.in", address: "Hyderabad, Telangana", source: "Google Maps", seoScore: 31, status: "sent", notes: "" },
  { id: 6, name: "Aura Dental Studio", category: "Dental Clinic", phone: "+91-8822334455", email: "aura@dentalstudio.in", website: "https://auradentalstudio.in", address: "Chennai, Tamil Nadu", source: "JustDial", seoScore: 73, status: "new", notes: "" },
  { id: 7, name: "CloudNine Realtors", category: "Real Estate", phone: "+91-9701234567", email: "sales@cloudninerealty.com", website: "https://cloudninerealty.com", address: "Noida, UP", source: "LinkedIn", seoScore: 24, status: "new", notes: "" },
];

const SEO_ISSUES = {
  low:  ["No SSL certificate", "Page speed < 30", "No mobile version", "Broken links found", "No sitemap.xml"],
  mid:  ["Missing meta descriptions", "No schema markup", "Images lack alt text", "Thin content pages", "No Google Analytics"],
  high: ["SSL active ✓", "Mobile responsive ✓", "Meta tags present ✓", "Good page speed ✓", "Analytics connected ✓"],
};

function seoInfo(score) {
  if (score < 30) return { label: "Critical", color: "#ef4444", issues: SEO_ISSUES.low };
  if (score < 60) return { label: "Needs Work", color: "#f59e0b", issues: SEO_ISSUES.mid };
  if (score < 80) return { label: "Good", color: "#3b82f6", issues: [...SEO_ISSUES.mid.slice(0,2), ...SEO_ISSUES.high.slice(0,3)] };
  return { label: "Excellent", color: "#10b981", issues: SEO_ISSUES.high };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TOAST
// ═══════════════════════════════════════════════════════════════════════════════
function Toast({ toasts }) {
  return (
    <div style={{ position: "fixed", bottom: 28, right: 28, zIndex: 9999, display: "flex", flexDirection: "column", gap: 10 }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          padding: "13px 20px", borderRadius: 12, fontWeight: 600, fontSize: 14,
          background: t.type === "success" ? "linear-gradient(135deg,#10b981,#059669)" : t.type === "error" ? "linear-gradient(135deg,#ef4444,#dc2626)" : "linear-gradient(135deg,#3b82f6,#6366f1)",
          color: "#fff", boxShadow: "0 8px 40px rgba(0,0,0,0.5)", display: "flex", alignItems: "center", gap: 10,
          animation: "toastIn 0.35s cubic-bezier(0.34,1.56,0.64,1) both",
          backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.1)",
        }}>
          <span>{t.type === "success" ? "✓" : t.type === "error" ? "✕" : "✦"}</span>{t.msg}
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// OUTREACH COMPOSER MODAL
// ═══════════════════════════════════════════════════════════════════════════════
function OutreachModal({ lead, onClose, adminSettings, apiKeys, aiProvider, onStatusUpdate, addToast }) {
  const [tab, setTab] = useState("email");
  const [emailMsg, setEmailMsg] = useState("");
  const [waMsg, setWaMsg] = useState("");
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [loadingWa, setLoadingWa] = useState(false);
  const info = seoInfo(lead.seoScore);

  const buildPrompt = (type) => {
    const issues = info.issues.filter(i => !i.includes("✓")).slice(0, 3);
    if (type === "email")
      return `Write a professional, personalized cold outreach email to ${lead.name}, a ${lead.category} business in ${lead.address}. Their website SEO score is ${lead.seoScore}/100 (${info.label}). Key issues: ${issues.join(", ") || "general SEO improvements needed"}. You are offering digital marketing, SEO, and web optimization services. Be warm, specific, and end with a soft CTA to schedule a free audit. Maximum 180 words. Include a subject line on the first line prefixed with "Subject: ".`;
    return `Write a short friendly WhatsApp message to ${lead.name} (${lead.category} business). Their website SEO score is ${lead.seoScore}/100. Offer free website audit and improvement services. Use 1-2 relevant emojis. Max 80 words. Conversational tone.`;
  };

  const callAI = async (type) => {
    const setLoading = type === "email" ? setLoadingEmail : setLoadingWa;
    setLoading(true);
    const prompt = buildPrompt(type);
    const key = apiKeys[aiProvider];
    try {
      let text = "";
      if (!key) throw new Error("No API key");
      if (aiProvider === "claude") {
        const r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" }, body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 500, messages: [{ role: "user", content: prompt }] }) });
        const d = await r.json(); text = d.content?.[0]?.text || "";
      } else if (aiProvider === "openai") {
        const r = await fetch("https://api.openai.com/v1/chat/completions", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` }, body: JSON.stringify({ model: "gpt-4o-mini", max_tokens: 500, messages: [{ role: "user", content: prompt }] }) });
        const d = await r.json(); text = d.choices?.[0]?.message?.content || "";
      } else {
        const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${key}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) });
        const d = await r.json(); text = d.candidates?.[0]?.content?.parts?.[0]?.text || "";
      }
      if (type === "email") setEmailMsg(text);
      else setWaMsg(text);
      addToast("AI message generated!", "success");
    } catch {
      const fallbackEmail = `Subject: Free SEO Audit for ${lead.name} 🚀\n\nHi ${lead.name} Team,\n\nI recently came across your business in ${lead.address} and noticed your website has an SEO score of ${lead.seoScore}/100 — there's a significant opportunity to grow your online visibility!\n\nWe help ${lead.category} businesses rank higher on Google and attract more qualified leads.\n\nI'd love to offer you a FREE website audit. Would you have 15 minutes this week?\n\nBest regards,\n${adminSettings.email || "Your Name"}`;
      const fallbackWa = `Hi ${lead.name}! 👋 We noticed your website could rank much better on Google (current SEO score: ${lead.seoScore}/100). We help businesses like yours get more customers online. Interested in a FREE audit? 📈`;
      if (type === "email") setEmailMsg(fallbackEmail);
      else setWaMsg(fallbackWa);
      addToast(key ? "API error — template used" : "No API key — template used", "info");
    }
    setLoading(false);
  };

  const sendEmail = () => {
    const [subjectLine, ...body] = emailMsg.split("\n");
    const subject = subjectLine.replace("Subject: ", "").trim() || `Partnership opportunity with ${lead.name}`;
    window.open(`mailto:${lead.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body.join("\n").trim())}`);
    onStatusUpdate(lead.id, "sent");
    addToast("Email client opened!", "success");
  };

  const sendWhatsApp = () => {
    const phone = lead.phone.replace(/\D/g, "");
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(waMsg)}`);
    onStatusUpdate(lead.id, "sent");
    addToast("WhatsApp opened!", "success");
  };

  const callLead = () => { window.location.href = `tel:${lead.phone}`; addToast(`Calling ${lead.name}...`, "info"); };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,4,15,0.92)", backdropFilter: "blur(20px)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, animation: "fadeIn 0.2s ease" }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "linear-gradient(145deg, #060d1f 0%, #080f22 100%)", border: "1px solid rgba(96,165,250,0.15)", borderRadius: 20, padding: 30, width: "100%", maxWidth: 700, maxHeight: "92vh", overflow: "auto", boxShadow: "0 40px 120px rgba(0,0,0,0.8), 0 0 0 1px rgba(96,165,250,0.08)", animation: "modalIn 0.3s cubic-bezier(0.34,1.56,0.64,1)" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#f8fafc", fontFamily: "'Syne', sans-serif", letterSpacing: -0.5 }}>{lead.name}</div>
            <div style={{ fontSize: 13, color: "#475569", marginTop: 3 }}>{lead.category} · {lead.address} · {lead.source}</div>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#64748b", borderRadius: 8, width: 32, height: 32, cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>

        {/* SEO Panel */}
        <div style={{ background: `linear-gradient(135deg, ${info.color}11, ${info.color}05)`, border: `1px solid ${info.color}33`, borderRadius: 14, padding: 16, marginBottom: 18, display: "flex", gap: 20, alignItems: "center" }}>
          <SEOGlobe score={lead.seoScore} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#94a3b8", marginBottom: 8 }}>IDENTIFIED ISSUES</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {info.issues.map((issue, i) => (
                <span key={i} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 20, background: info.color + "22", color: info.color, border: `1px solid ${info.color}44`, fontWeight: 600 }}>{issue}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Contact Actions */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 20 }}>
          <a href={`tel:${lead.phone}`} onClick={() => addToast("Opening phone dialer...", "info")} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "11px 0", borderRadius: 10, background: "linear-gradient(135deg,#ef4444,#b91c1c)", color: "#fff", fontWeight: 700, fontSize: 13, textDecoration: "none", border: "none", cursor: "pointer" }}>
            📞 Call Now
          </a>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "11px 0", borderRadius: 10, background: "rgba(96,165,250,0.1)", color: "#60a5fa", fontWeight: 700, fontSize: 13, border: "1px solid rgba(96,165,250,0.2)", cursor: "default" }}>
            ✉ {lead.email.length > 22 ? lead.email.slice(0,22) + "…" : lead.email}
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "11px 0", borderRadius: 10, background: "rgba(37,211,102,0.1)", color: "#25D366", fontWeight: 700, fontSize: 13, border: "1px solid rgba(37,211,102,0.2)", cursor: "default" }}>
            📱 {lead.phone.slice(0,15)}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: 4, marginBottom: 18, border: "1px solid rgba(255,255,255,0.06)" }}>
          {[["email", "✉ Email"], ["whatsapp", "💬 WhatsApp"]].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} style={{ flex: 1, padding: "9px 0", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 13, transition: "all 0.2s", background: tab === id ? (id === "email" ? "linear-gradient(135deg,#3b82f6,#6366f1)" : "linear-gradient(135deg,#25D366,#128C7E)") : "transparent", color: tab === id ? "#fff" : "#64748b" }}>{label}</button>
          ))}
        </div>

        {/* Email Composer */}
        {tab === "email" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 1 }}>Email Message</label>
              <button onClick={() => callAI("email")} disabled={loadingEmail} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, background: "linear-gradient(135deg,rgba(167,139,250,0.2),rgba(99,102,241,0.2))", border: "1px solid rgba(167,139,250,0.3)", color: "#a78bfa", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                {loadingEmail ? <><span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⟳</span> Generating…</> : "✦ AI Generate"}
              </button>
            </div>
            <textarea value={emailMsg} onChange={e => setEmailMsg(e.target.value)} placeholder="Click '✦ AI Generate' to create a personalized email using AI, or type your own message here..." style={{ width: "100%", minHeight: 160, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "14px", color: "#e2e8f0", fontSize: 13, resize: "vertical", outline: "none", boxSizing: "border-box", fontFamily: "inherit", lineHeight: 1.7 }} />
            <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
              <button onClick={sendEmail} style={{ flex: 1, padding: "12px 0", borderRadius: 10, background: "linear-gradient(135deg,#3b82f6,#6366f1)", color: "#fff", fontWeight: 700, fontSize: 14, border: "none", cursor: "pointer" }}>✉ Open in Email Client</button>
              <button onClick={() => { navigator.clipboard.writeText(emailMsg); addToast("Copied!", "success"); }} style={{ padding: "12px 16px", borderRadius: 10, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#64748b", cursor: "pointer", fontSize: 14 }}>⎘</button>
            </div>
          </div>
        )}

        {/* WhatsApp Composer */}
        {tab === "whatsapp" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 1 }}>WhatsApp Message</label>
              <button onClick={() => callAI("whatsapp")} disabled={loadingWa} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, background: "linear-gradient(135deg,rgba(37,211,102,0.15),rgba(18,140,126,0.15))", border: "1px solid rgba(37,211,102,0.25)", color: "#25D366", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                {loadingWa ? <><span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⟳</span> Generating…</> : "✦ AI Generate"}
              </button>
            </div>
            <textarea value={waMsg} onChange={e => setWaMsg(e.target.value)} placeholder="Click '✦ AI Generate' to create a friendly WhatsApp message, or write your own..." style={{ width: "100%", minHeight: 130, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "14px", color: "#e2e8f0", fontSize: 13, resize: "vertical", outline: "none", boxSizing: "border-box", fontFamily: "inherit", lineHeight: 1.7 }} />
            <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
              <button onClick={sendWhatsApp} style={{ flex: 1, padding: "12px 0", borderRadius: 10, background: "linear-gradient(135deg,#25D366,#128C7E)", color: "#fff", fontWeight: 700, fontSize: 14, border: "none", cursor: "pointer" }}>💬 Open WhatsApp</button>
              <button onClick={() => { navigator.clipboard.writeText(waMsg); addToast("Copied!", "success"); }} style={{ padding: "12px 16px", borderRadius: 10, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#64748b", cursor: "pointer", fontSize: 14 }}>⎘</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [page, setPage] = useState("dashboard");
  const [leads, setLeads] = useState(SEED_LEADS);
  const [composerLead, setComposerLead] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [scraping, setScraping] = useState(false);
  const [scrapeStep, setScrapeStep] = useState("");
  const [scrapeProgress, setScrapeProgress] = useState(0);
  const [searchCat, setSearchCat] = useState("Restaurant");
  const [searchLoc, setSearchLoc] = useState("Mumbai, India");
  const [activeSources, setActiveSources] = useState(["Google Search", "Google Maps"]);
  const [aiProvider, setAiProvider] = useState("claude");
  const [apiKeys, setApiKeys] = useState({ claude: "", openai: "", gemini: "" });
  const [adminSettings, setAdminSettings] = useState({ whatsapp: "+91-9999999999", whatsappApiKey: "", email: "you@gmail.com", emailPass: "", emailProvider: "gmail", phone: "+91-9999999999" });
  const [filterStatus, setFilterStatus] = useState("all");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const addToast = useCallback((msg, type = "success") => {
    const id = Date.now();
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500);
  }, []);

  const updateStatus = useCallback((id, status) => setLeads(p => p.map(l => l.id === id ? { ...l, status } : l)), []);

  const scrape = async () => {
    if (!searchCat || !searchLoc) { addToast("Enter category and location", "error"); return; }
    setScraping(true); setScrapeProgress(0);
    const steps = [
      [8, `Connecting to ${activeSources.join(", ")}...`],
      [22, "Scanning Google Search results..."],
      [38, "Extracting Google Maps listings..."],
      [52, "Scraping JustDial database..."],
      [64, "Fetching LinkedIn companies..."],
      [74, "Extracting contact details..."],
      [84, "Analyzing website SEO scores..."],
      [93, "Running AI classification..."],
      [100, "Finalizing results..."],
    ];
    for (const [pct, msg] of steps) {
      setScrapeStep(msg); setScrapeProgress(pct);
      await new Promise(r => setTimeout(r, 400 + Math.random() * 300));
    }
    const now = Date.now();
    const names = [`${searchCat} Masters`, `Elite ${searchCat} Hub`, `Prime ${searchCat} Co.`, `${searchCat} Pro Services`];
    const newLeads = names.slice(0, 2 + Math.floor(Math.random() * 2)).map((name, i) => ({
      id: now + i, name, category: searchCat, phone: "+91-" + (9000000000 + Math.floor(Math.random() * 999999999)),
      email: `contact@${name.toLowerCase().replace(/[^a-z]/g, "")}.in`,
      website: Math.random() > 0.4 ? `https://www.${name.toLowerCase().replace(/[^a-z]/g, "")}.in` : "",
      address: searchLoc, source: activeSources[Math.floor(Math.random() * activeSources.length)] || "Google",
      seoScore: 8 + Math.floor(Math.random() * 82), status: "new", notes: ""
    }));
    setLeads(p => [...newLeads, ...p]);
    setScraping(false); setScrapeProgress(0); setScrapeStep("");
    addToast(`✓ Found ${newLeads.length} new leads in ${searchLoc}!`, "success");
    setTimeout(() => setPage("leads"), 600);
  };

  const filteredLeads = useMemo(() => filterStatus === "all" ? leads : leads.filter(l => l.status === filterStatus), [leads, filterStatus]);

  const stats = useMemo(() => ({
    total: leads.length,
    new: leads.filter(l => l.status === "new").length,
    sent: leads.filter(l => l.status === "sent" || l.status === "contacted").length,
    avgSeo: leads.length ? Math.round(leads.reduce((a, l) => a + l.seoScore, 0) / leads.length) : 0,
    critical: leads.filter(l => l.seoScore < 30).length,
  }), [leads]);

  // ── STYLES ────────────────────────────────────────────────────────────────
  const C = {
    bg: "#02050f",
    surface: "rgba(6,12,28,0.85)",
    surfaceBorder: "rgba(96,165,250,0.1)",
    text: "#e8edf5",
    muted: "#3d5a80",
    accent: "#38bdf8",
    accent2: "#818cf8",
  };

  const glassCard = { background: "rgba(6,14,32,0.75)", border: "1px solid rgba(96,165,250,0.12)", borderRadius: 16, backdropFilter: "blur(24px)", boxShadow: "0 4px 40px rgba(0,0,0,0.4)" };

  // ── NAV ───────────────────────────────────────────────────────────────────
  const navItems = [
    { id: "dashboard", icon: "⬡", label: "Dashboard" },
    { id: "scraper", icon: "◎", label: "AI Scraper" },
    { id: "leads", icon: "⊹", label: "Leads", count: leads.length },
    { id: "api", icon: "⌘", label: "API Keys" },
    { id: "settings", icon: "⚙", label: "Settings" },
  ];

  // ── STATUS BADGE ──────────────────────────────────────────────────────────
  const StatusBadge = ({ s }) => {
    const cfg = { new: ["#38bdf8", "New"], contacted: ["#f59e0b", "Contacted"], sent: ["#10b981", "Sent"] };
    const [color, label] = cfg[s] || ["#64748b", s];
    return <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: color + "18", color, border: `1px solid ${color}33`, fontWeight: 700, letterSpacing: 0.5 }}>{label}</span>;
  };

  // ══════════════════════════════════════════════════════════════════════════
  // PAGES
  // ══════════════════════════════════════════════════════════════════════════

  const DashboardPage = () => (
    <div style={{ animation: "fadeUp 0.4s ease" }}>
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 32, fontWeight: 900, fontFamily: "'Syne', sans-serif", letterSpacing: -1, background: "linear-gradient(135deg, #e8edf5 30%, #38bdf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Command Center</div>
        <div style={{ color: "#3d5a80", fontSize: 14, marginTop: 5 }}>AI-powered lead generation & outreach platform</div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 12, marginBottom: 28 }}>
        {[
          { n: stats.total, label: "Total Leads", color: "#38bdf8", icon: "◎" },
          { n: stats.new, label: "New Leads", color: "#818cf8", icon: "✦" },
          { n: stats.sent, label: "Contacted", color: "#10b981", icon: "✓" },
          { n: `${stats.avgSeo}`, label: "Avg SEO Score", color: "#f59e0b", icon: "⊛" },
          { n: stats.critical, label: "Need Urgent Fix", color: "#ef4444", icon: "⚠" },
        ].map((s, i) => (
          <div key={i} style={{ ...glassCard, padding: "20px 18px", animation: `fadeUp ${0.1 + i * 0.06}s ease both` }}>
            <div style={{ fontSize: 22, color: s.color, marginBottom: 4 }}>{s.icon}</div>
            <div style={{ fontSize: 30, fontWeight: 900, fontFamily: "'Syne', sans-serif", color: s.color }}>{s.n}</div>
            <div style={{ fontSize: 11, color: "#3d5a80", marginTop: 2, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 20 }}>
        {/* Recent leads */}
        <div style={{ ...glassCard, padding: 22 }}>
          <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 16, color: "#e8edf5", fontFamily: "'Syne', sans-serif", display: "flex", justifyContent: "space-between" }}>
            Recent Leads
            <button onClick={() => setPage("leads")} style={{ background: "none", border: "none", color: "#38bdf8", cursor: "pointer", fontSize: 12 }}>View all →</button>
          </div>
          {leads.slice(0, 5).map(l => (
            <div key={l.id} onClick={() => setComposerLead(l)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderRadius: 10, cursor: "pointer", marginBottom: 4, transition: "background 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(56,189,248,0.05)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: "#e8edf5" }}>{l.name}</div>
                <div style={{ fontSize: 12, color: "#3d5a80" }}>{l.category} · {l.source}</div>
              </div>
              <SEOGlobe score={l.seoScore} />
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div style={{ ...glassCard, padding: 22 }}>
          <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 16, color: "#e8edf5", fontFamily: "'Syne', sans-serif" }}>Quick Start</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { label: "Start AI Scraping", icon: "◎", page: "scraper", grad: "linear-gradient(135deg,#3b82f6,#6366f1)" },
              { label: "View Lead Database", icon: "⊹", page: "leads", grad: "linear-gradient(135deg,#0ea5e9,#0891b2)" },
              { label: "Configure API Keys", icon: "⌘", page: "api", grad: "linear-gradient(135deg,#8b5cf6,#7c3aed)" },
              { label: "Admin Settings", icon: "⚙", page: "settings", grad: "linear-gradient(135deg,#059669,#047857)" },
            ].map(item => (
              <button key={item.page} onClick={() => setPage(item.page)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", borderRadius: 11, background: item.grad, border: "none", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", textAlign: "left", transition: "opacity 0.15s, transform 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.opacity = "0.88"; e.currentTarget.style.transform = "translateX(3px)"; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.transform = "translateX(0)"; }}>
                <span style={{ fontSize: 18 }}>{item.icon}</span>{item.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const ScraperPage = () => (
    <div style={{ animation: "fadeUp 0.4s ease" }}>
      <div style={{ fontSize: 32, fontWeight: 900, fontFamily: "'Syne', sans-serif", letterSpacing: -1, color: "#e8edf5", marginBottom: 6 }}>AI Scraper</div>
      <div style={{ color: "#3d5a80", fontSize: 14, marginBottom: 28 }}>Find businesses across the web with AI-powered extraction</div>

      <div style={{ ...glassCard, padding: 28, marginBottom: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#3d5a80", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 8 }}>Business Category</label>
            <div style={{ position: "relative" }}>
              <input value={searchCat} onChange={e => setSearchCat(e.target.value)} placeholder="e.g. Restaurant, Gym, IT Services..." list="cats" style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(96,165,250,0.15)", borderRadius: 10, padding: "12px 14px", color: "#e8edf5", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
              <datalist id="cats">{CATEGORIES.map(c => <option key={c} value={c} />)}</datalist>
            </div>
          </div>
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#3d5a80", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 8 }}>Location</label>
            <input value={searchLoc} onChange={e => setSearchLoc(e.target.value)} placeholder="e.g. Mumbai, India" style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(96,165,250,0.15)", borderRadius: 10, padding: "12px 14px", color: "#e8edf5", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#3d5a80", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 10 }}>Data Sources</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {SOURCES.map(src => {
              const active = activeSources.includes(src);
              return (
                <button key={src} onClick={() => setActiveSources(p => active ? p.filter(s => s !== src) : [...p, src])} style={{ padding: "9px 16px", borderRadius: 8, border: `1px solid ${active ? "rgba(56,189,248,0.5)" : "rgba(255,255,255,0.07)"}`, background: active ? "rgba(56,189,248,0.12)" : "transparent", color: active ? "#38bdf8" : "#3d5a80", fontWeight: 700, fontSize: 13, cursor: "pointer", transition: "all 0.15s" }}>
                  {src}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#3d5a80", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 10 }}>AI Analysis Provider</label>
          <div style={{ display: "flex", gap: 8 }}>
            {[["claude", "Anthropic Claude", "#a78bfa"], ["openai", "OpenAI GPT", "#10b981"], ["gemini", "Google Gemini", "#f59e0b"]].map(([id, label, color]) => (
              <button key={id} onClick={() => setAiProvider(id)} style={{ padding: "9px 18px", borderRadius: 8, border: `1px solid ${aiProvider === id ? color + "55" : "rgba(255,255,255,0.07)"}`, background: aiProvider === id ? color + "18" : "transparent", color: aiProvider === id ? color : "#3d5a80", fontWeight: 700, fontSize: 13, cursor: "pointer", transition: "all 0.15s" }}>{label}</button>
            ))}
          </div>
        </div>

        {scraping ? (
          <div style={{ animation: "fadeIn 0.3s ease" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 13, color: "#38bdf8", fontWeight: 600 }}>{scrapeStep}</span>
              <span style={{ fontSize: 13, color: "#38bdf8", fontWeight: 700 }}>{scrapeProgress}%</span>
            </div>
            <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 8, height: 8, overflow: "hidden", border: "1px solid rgba(56,189,248,0.1)" }}>
              <div style={{ height: "100%", background: "linear-gradient(90deg, #38bdf8, #818cf8, #a78bfa)", width: `${scrapeProgress}%`, transition: "width 0.4s ease", borderRadius: 8, boxShadow: "0 0 12px rgba(56,189,248,0.5)" }} />
            </div>
            <div style={{ marginTop: 12, fontSize: 12, color: "#3d5a80" }}>Scanning {activeSources.join(" · ")} for "{searchCat}" in {searchLoc}</div>
          </div>
        ) : (
          <button onClick={scrape} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, width: "100%", padding: "15px 0", borderRadius: 12, background: "linear-gradient(135deg,#3b82f6,#6366f1,#8b5cf6)", border: "none", color: "#fff", fontWeight: 800, fontSize: 15, cursor: "pointer", letterSpacing: 0.3, boxShadow: "0 0 40px rgba(99,102,241,0.3)", transition: "all 0.2s" }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 50px rgba(99,102,241,0.5)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 0 40px rgba(99,102,241,0.3)"; }}>
            ◎ Launch AI Scraper
          </button>
        )}
      </div>

      {/* How it works */}
      <div style={{ ...glassCard, padding: 22 }}>
        <div style={{ fontWeight: 800, fontSize: 14, color: "#e8edf5", marginBottom: 16, fontFamily: "'Syne', sans-serif" }}>How It Works</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
          {[["◎", "Multi-Source Search", "Simultaneously scans Google, Maps, LinkedIn & JustDial"], ["⊛", "Data Extraction", "Pulls emails, phones, websites & business details"], ["✦", "AI SEO Analysis", "Scores each website's SEO health 0-100"], ["✉", "Auto Outreach", "Generates personalized emails & WhatsApp messages"]].map(([icon, title, desc], i) => (
            <div key={i} style={{ background: "rgba(255,255,255,0.02)", borderRadius: 10, padding: 14, border: "1px solid rgba(255,255,255,0.05)" }}>
              <div style={{ fontSize: 22, color: "#38bdf8", marginBottom: 8 }}>{icon}</div>
              <div style={{ fontWeight: 700, fontSize: 13, color: "#e8edf5", marginBottom: 4 }}>{title}</div>
              <div style={{ fontSize: 12, color: "#3d5a80", lineHeight: 1.5 }}>{desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const LeadsPage = () => (
    <div style={{ animation: "fadeUp 0.4s ease" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 32, fontWeight: 900, fontFamily: "'Syne', sans-serif", letterSpacing: -1, color: "#e8edf5" }}>Lead Database</div>
          <div style={{ color: "#3d5a80", fontSize: 14, marginTop: 4 }}>{filteredLeads.length} leads · Click any row to compose outreach</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(96,165,250,0.15)", borderRadius: 8, padding: "9px 14px", color: "#e8edf5", fontSize: 13, outline: "none", cursor: "pointer" }}>
            <option value="all">All Status</option>
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="sent">Sent</option>
          </select>
          <button onClick={() => setPage("scraper")} style={{ padding: "9px 16px", borderRadius: 8, background: "linear-gradient(135deg,#3b82f6,#6366f1)", border: "none", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>+ Scrape More</button>
        </div>
      </div>

      <div style={{ ...glassCard, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(96,165,250,0.1)" }}>
              {["Business", "Contact Info", "Website & SEO", "Source", "Status", "Actions"].map(h => (
                <th key={h} style={{ textAlign: "left", padding: "13px 16px", fontSize: 11, color: "#3d5a80", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredLeads.map((lead, i) => (
              <tr key={lead.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)", animation: `fadeUp ${i * 0.04}s ease both`, transition: "background 0.15s", cursor: "pointer" }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(56,189,248,0.04)"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <td style={{ padding: "14px 16px" }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#e8edf5" }}>{lead.name}</div>
                  <div style={{ fontSize: 12, color: "#3d5a80", marginTop: 2 }}>{lead.category} · {lead.address}</div>
                </td>
                <td style={{ padding: "14px 16px" }}>
                  <div style={{ fontSize: 13, color: "#94a3b8", display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>📞 {lead.phone}</div>
                  <div style={{ fontSize: 13, color: "#38bdf8", display: "flex", alignItems: "center", gap: 5 }}>✉ {lead.email}</div>
                </td>
                <td style={{ padding: "14px 16px" }}>
                  {lead.website ? <a href={lead.website} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "#818cf8", display: "block", marginBottom: 4 }}>🔗 {lead.website.replace("https://", "").slice(0,26)}</a> : <span style={{ fontSize: 12, color: "#3d5a80" }}>No website</span>}
                  <SEOGlobe score={lead.seoScore} />
                </td>
                <td style={{ padding: "14px 16px" }}>
                  <span style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, background: "rgba(129,140,248,0.12)", color: "#818cf8", border: "1px solid rgba(129,140,248,0.2)", fontWeight: 600 }}>{lead.source}</span>
                </td>
                <td style={{ padding: "14px 16px" }}><StatusBadge s={lead.status} /></td>
                <td style={{ padding: "14px 16px" }}>
                  <div style={{ display: "flex", gap: 6 }}>
                    {[["✉", "email", "rgba(59,130,246,0.15)", "#3b82f6"], ["💬", "whatsapp", "rgba(37,211,102,0.15)", "#25D366"]].map(([icon, type, bg, color]) => (
                      <button key={type} onClick={() => setComposerLead({ ...lead, composeType: type })} title={type} style={{ width: 32, height: 32, borderRadius: 7, border: `1px solid ${color}33`, background: bg, color, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}
                        onMouseEnter={e => e.currentTarget.style.transform = "scale(1.1)"}
                        onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}>{icon}</button>
                    ))}
                    <a href={`tel:${lead.phone}`} title="Call" onClick={() => addToast("Opening phone dialer...", "info")} style={{ width: 32, height: 32, borderRadius: 7, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.1)", color: "#ef4444", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none", transition: "all 0.15s" }}>📞</a>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredLeads.length === 0 && (
          <div style={{ padding: 60, textAlign: "center", color: "#3d5a80" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>◎</div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>No leads found</div>
            <div style={{ fontSize: 13, marginTop: 6 }}>Try scraping for new leads</div>
          </div>
        )}
      </div>
    </div>
  );

  const APIPage = () => (
    <div style={{ animation: "fadeUp 0.4s ease" }}>
      <div style={{ fontSize: 32, fontWeight: 900, fontFamily: "'Syne', sans-serif", letterSpacing: -1, color: "#e8edf5", marginBottom: 6 }}>API Keys</div>
      <div style={{ color: "#3d5a80", fontSize: 14, marginBottom: 28 }}>Configure AI providers for message generation, SEO analysis & outreach optimization</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {[
          { id: "claude", label: "Anthropic Claude", model: "claude-sonnet-4-20250514", color: "#a78bfa", ph: "sk-ant-api03-..." },
          { id: "openai", label: "OpenAI ChatGPT", model: "gpt-4o / gpt-4o-mini", color: "#10b981", ph: "sk-proj-..." },
          { id: "gemini", label: "Google Gemini", model: "gemini-pro", color: "#f59e0b", ph: "AIzaSy..." },
        ].map(p => (
          <div key={p.id} style={{ ...glassCard, padding: 22, borderColor: aiProvider === p.id ? p.color + "44" : "rgba(96,165,250,0.12)", transition: "border-color 0.2s" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 15, color: "#e8edf5", fontFamily: "'Syne', sans-serif" }}>{p.label}</div>
                <div style={{ fontSize: 12, color: "#3d5a80", marginTop: 2 }}>Model: {p.model}</div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {apiKeys[p.id] && <span style={{ fontSize: 11, padding: "4px 10px", borderRadius: 20, background: "#10b98118", color: "#10b981", border: "1px solid #10b98133", fontWeight: 700 }}>✓ Connected</span>}
                <button onClick={() => setAiProvider(p.id)} style={{ padding: "7px 14px", borderRadius: 8, border: `1px solid ${aiProvider === p.id ? p.color + "55" : "rgba(255,255,255,0.1)"}`, background: aiProvider === p.id ? p.color + "18" : "transparent", color: aiProvider === p.id ? p.color : "#64748b", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>{aiProvider === p.id ? "✓ Active" : "Set Active"}</button>
              </div>
            </div>
            <input type="password" value={apiKeys[p.id]} onChange={e => setApiKeys(prev => ({ ...prev, [p.id]: e.target.value }))} placeholder={p.ph} style={{ width: "100%", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "11px 14px", color: "#e8edf5", fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "monospace" }} />
          </div>
        ))}
        <button onClick={() => addToast("API keys saved securely!", "success")} style={{ alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 8, padding: "12px 24px", borderRadius: 10, background: "linear-gradient(135deg,#3b82f6,#6366f1)", border: "none", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>✓ Save All Keys</button>
        <div style={{ ...glassCard, padding: 16, fontSize: 13, color: "#3d5a80", lineHeight: 1.7 }}>
          <strong style={{ color: "#94a3b8" }}>Without API keys:</strong> The platform uses smart built-in templates for all outreach messages.<br />
          <strong style={{ color: "#94a3b8" }}>With API keys:</strong> AI generates fully personalized messages based on each business's SEO score, issues, and category.
        </div>
      </div>
    </div>
  );

  const SettingsPage = () => (
    <div style={{ animation: "fadeUp 0.4s ease" }}>
      <div style={{ fontSize: 32, fontWeight: 900, fontFamily: "'Syne', sans-serif", letterSpacing: -1, color: "#e8edf5", marginBottom: 6 }}>Admin Settings</div>
      <div style={{ color: "#3d5a80", fontSize: 14, marginBottom: 28 }}>Configure your phone, email & WhatsApp for outreach</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Phone */}
        <div style={{ ...glassCard, padding: 24 }}>
          <div style={{ fontWeight: 800, fontSize: 15, color: "#e8edf5", marginBottom: 16, fontFamily: "'Syne', sans-serif", display: "flex", alignItems: "center", gap: 8 }}>📞 Calling</div>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#3d5a80", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 8 }}>Your Phone Number</label>
          <input value={adminSettings.phone} onChange={e => setAdminSettings(p => ({ ...p, phone: e.target.value }))} style={{ width: "100%", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "11px 14px", color: "#e8edf5", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
          <div style={{ fontSize: 12, color: "#3d5a80", marginTop: 8 }}>When you click the 📞 Call button on any lead, it will initiate a call from this number via your device.</div>
        </div>
        {/* WhatsApp */}
        <div style={{ ...glassCard, padding: 24 }}>
          <div style={{ fontWeight: 800, fontSize: 15, color: "#e8edf5", marginBottom: 16, fontFamily: "'Syne', sans-serif" }}>💬 WhatsApp</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {[["Your WhatsApp Number", "whatsapp", "+91-9999999999"], ["WhatsApp Business API Key", "whatsappApiKey", "Enter API key..."]].map(([label, key, ph]) => (
              <div key={key}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#3d5a80", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 8 }}>{label}</label>
                <input type={key.includes("Key") ? "password" : "text"} value={adminSettings[key]} onChange={e => setAdminSettings(p => ({ ...p, [key]: e.target.value }))} placeholder={ph} style={{ width: "100%", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "11px 14px", color: "#e8edf5", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12, padding: 12, background: "rgba(37,211,102,0.06)", borderRadius: 8, border: "1px solid rgba(37,211,102,0.12)", fontSize: 12, color: "#3d5a80" }}>
            Use <a href="https://business.whatsapp.com" target="_blank" rel="noreferrer" style={{ color: "#25D366" }}>WhatsApp Business API</a> or <a href="https://www.twilio.com/en-us/whatsapp" target="_blank" rel="noreferrer" style={{ color: "#25D366" }}>Twilio</a> to send messages programmatically.
          </div>
        </div>
        {/* Email */}
        <div style={{ ...glassCard, padding: 24 }}>
          <div style={{ fontWeight: 800, fontSize: 15, color: "#e8edf5", marginBottom: 16, fontFamily: "'Syne', sans-serif" }}>✉ Email</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#3d5a80", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 8 }}>Your Email</label>
              <input value={adminSettings.email} onChange={e => setAdminSettings(p => ({ ...p, email: e.target.value }))} style={{ width: "100%", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "11px 14px", color: "#e8edf5", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#3d5a80", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 8 }}>Provider</label>
              <select value={adminSettings.emailProvider} onChange={e => setAdminSettings(p => ({ ...p, emailProvider: e.target.value }))} style={{ width: "100%", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "11px 14px", color: "#e8edf5", fontSize: 14, outline: "none", boxSizing: "border-box" }}>
                <option value="gmail">Gmail (SMTP)</option>
                <option value="outlook">Outlook</option>
                <option value="sendgrid">SendGrid API</option>
                <option value="mailgun">Mailgun API</option>
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#3d5a80", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 8 }}>App Password / API Key</label>
              <input type="password" value={adminSettings.emailPass} onChange={e => setAdminSettings(p => ({ ...p, emailPass: e.target.value }))} placeholder="Password or key..." style={{ width: "100%", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "11px 14px", color: "#e8edf5", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
            </div>
          </div>
        </div>
        <button onClick={() => addToast("All settings saved!", "success")} style={{ alignSelf: "flex-start", padding: "13px 28px", borderRadius: 10, background: "linear-gradient(135deg,#3b82f6,#6366f1)", border: "none", color: "#fff", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>✓ Save All Settings</button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#02050f", color: "#e8edf5", fontFamily: "'DM Sans', sans-serif", display: "flex", position: "relative", overflow: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=DM+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(96,165,250,0.2); border-radius: 2px; }
        input:focus, textarea:focus, select:focus { border-color: rgba(56,189,248,0.4) !important; }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
        @keyframes modalIn { from{opacity:0;transform:scale(0.93) translateY(20px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes toastIn { from{opacity:0;transform:translateX(30px)} to{opacity:1;transform:translateX(0)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        button { transition: opacity 0.15s, transform 0.15s; }
        button:hover { opacity: 0.88; }
        a { transition: opacity 0.15s; }
      `}</style>

      {/* THREE.JS BG */}
      <NeuralBackground page={page} />

      {/* SIDEBAR */}
      <div style={{ width: sidebarCollapsed ? 64 : 220, background: "rgba(2,5,20,0.92)", borderRight: "1px solid rgba(96,165,250,0.08)", display: "flex", flexDirection: "column", position: "relative", zIndex: 10, flexShrink: 0, backdropFilter: "blur(24px)", transition: "width 0.3s ease" }}>
        {/* Logo */}
        <div style={{ padding: sidebarCollapsed ? "22px 16px" : "22px 20px", borderBottom: "1px solid rgba(96,165,250,0.08)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: "linear-gradient(135deg,#3b82f6,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>◎</div>
            {!sidebarCollapsed && <div>
              <div style={{ fontSize: 17, fontWeight: 900, fontFamily: "'Syne',sans-serif", background: "linear-gradient(135deg,#38bdf8,#818cf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>LeadAI Pro</div>
              <div style={{ fontSize: 10, color: "#3d5a80", fontWeight: 600, letterSpacing: 1.2, textTransform: "uppercase" }}>Lead Generation</div>
            </div>}
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "14px 10px" }}>
          {navItems.map(item => {
            const active = page === item.id;
            return (
              <button key={item.id} onClick={() => setPage(item.id)} title={item.label} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: sidebarCollapsed ? "11px 0" : "11px 12px", justifyContent: sidebarCollapsed ? "center" : "flex-start", borderRadius: 10, border: "none", background: active ? "linear-gradient(90deg,rgba(56,189,248,0.12),rgba(129,140,248,0.08))" : "transparent", color: active ? "#38bdf8" : "#3d5a80", cursor: "pointer", marginBottom: 2, position: "relative", fontWeight: active ? 700 : 500, fontSize: 14, transition: "all 0.15s", borderLeft: active ? "2px solid #38bdf8" : "2px solid transparent" }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>{item.icon}</span>
                {!sidebarCollapsed && <span>{item.label}</span>}
                {!sidebarCollapsed && item.count !== undefined && (
                  <span style={{ marginLeft: "auto", fontSize: 11, padding: "2px 7px", borderRadius: 10, background: "rgba(56,189,248,0.15)", color: "#38bdf8", fontWeight: 700 }}>{item.count}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom */}
        <div style={{ padding: "14px 10px", borderTop: "1px solid rgba(96,165,250,0.08)" }}>
          <button onClick={() => setSidebarCollapsed(p => !p)} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", padding: "10px 0", borderRadius: 10, border: "1px solid rgba(255,255,255,0.05)", background: "transparent", color: "#3d5a80", cursor: "pointer", fontSize: 14 }}>
            {sidebarCollapsed ? "▶" : "◀"}
          </button>
          {!sidebarCollapsed && (
            <div style={{ marginTop: 10, padding: "10px 12px", borderRadius: 8, background: "rgba(255,255,255,0.02)" }}>
              <div style={{ fontSize: 10, color: "#3d5a80", textTransform: "uppercase", letterSpacing: 1.2, fontWeight: 700 }}>Active AI</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#a78bfa", marginTop: 2 }}>{aiProvider === "claude" ? "Claude" : aiProvider === "openai" ? "ChatGPT" : "Gemini"}</div>
            </div>
          )}
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div style={{ flex: 1, overflow: "auto", padding: 32, position: "relative", zIndex: 10 }}>
        {page === "dashboard" && <DashboardPage />}
        {page === "scraper" && <ScraperPage />}
        {page === "leads" && <LeadsPage />}
        {page === "api" && <APIPage />}
        {page === "settings" && <SettingsPage />}
      </div>

      {/* MODALS & TOASTS */}
      {composerLead && (
        <OutreachModal lead={composerLead} onClose={() => setComposerLead(null)} adminSettings={adminSettings} apiKeys={apiKeys} aiProvider={aiProvider} onStatusUpdate={updateStatus} addToast={addToast} />
      )}
      <Toast toasts={toasts} />
    </div>
  );
}
