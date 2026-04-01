import { motion } from "motion/react";
import {
  ShieldCheck,
  BarChart3,
  Clock,
  Map,
  CheckCircle2,
  ArrowRight,
  ChevronRight,
  Globe,
  Lock,
  Building2,
  ArrowUpRight,
  FileText,
  TrendingUp,
  AlertTriangle,
  FileWarning,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../App";

const FONT = `
  @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:wght@300;400;500;600;700&display=swap');
`;

export default function LandingPage() {
  const { user } = useAuth();

  return (
    <>
      <style>{FONT}</style>
      <style>{`
        :root {
          --ink:     #0f172a;
          --ink-2:   #1e293b;
          --muted:   #64748b;
          --line:    #e2e8f0;
          --sky:     #0284c7;
          --sky-lt:  #f0f9ff;
          --sky-md:  #38bdf8;
          --white:   #ffffff;
          --off:     #f8fafc;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'DM Sans', sans-serif; background: var(--white); color: var(--ink); -webkit-font-smoothing: antialiased; }
        .serif { font-family: 'Instrument Serif', serif; }
        .serif-italic { font-family: 'Instrument Serif', serif; font-style: italic; }

        /* NAV */
        .nav {
          position: fixed; top: 0; width: 100%; z-index: 100;
          background: rgba(255,255,255,0.85);
          backdrop-filter: blur(16px);
          border-bottom: 1px solid var(--line);
        }
        .nav-inner {
          max-width: 1280px; margin: 0 auto;
          padding: 0 32px;
          height: 72px;
          display: flex; align-items: center; justify-content: space-between;
        }
        .logo { display: flex; align-items: center; gap: 10px; text-decoration: none; }
        .logo-mark {
          background: var(--sky); padding: 8px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 12px rgba(2, 132, 199, 0.2);
        }
        .logo-text { font-size: 20px; font-weight: 700; color: var(--ink); letter-spacing: -0.03em; }
        .logo-text span { color: var(--sky); }

        .nav-links { display: flex; align-items: center; gap: 32px; }
        .nav-link { font-size: 14px; font-weight: 600; color: var(--muted); text-decoration: none; transition: color 0.15s; }
        .nav-link:hover { color: var(--sky); }

        .btn-primary {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 10px 20px; background: var(--ink);
          color: #fff; font-size: 14px; font-weight: 700;
          border-radius: 10px; text-decoration: none;
          transition: transform 0.2s, background 0.2s;
        }
        .btn-primary:hover { background: #000; transform: translateY(-1px); }

        .btn-ghost {
          font-size: 14px; font-weight: 600; color: var(--ink);
          text-decoration: none; transition: opacity 0.2s;
        }
        .btn-ghost:hover { opacity: 0.7; }

        /* HERO */
        .hero {
          padding: 160px 32px 100px;
          max-width: 1280px; margin: 0 auto;
          display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 80px; align-items: center;
        }
        .hero-badge {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 6px 14px;
          background: var(--sky-lt); border: 1px solid #bae6fd; border-radius: 100px;
          font-size: 11px; font-weight: 700; color: var(--sky);
          margin-bottom: 28px; text-transform: uppercase; letter-spacing: 0.05em;
        }
        .hero-badge-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: var(--sky); animation: pulse 2s infinite;
        }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }

        .hero-h1 {
          font-size: clamp(48px, 6vw, 68px);
          font-weight: 400; line-height: 1.05;
          letter-spacing: -0.04em; margin-bottom: 28px; color: var(--ink);
        }
        .hero-h1 strong { font-weight: 700; color: var(--ink); }

        .hero-sub {
          font-size: 18px; line-height: 1.65;
          color: var(--muted); font-weight: 450; margin-bottom: 48px;
          max-width: 520px;
        }

        .hero-actions { display: flex; align-items: center; gap: 16px; }
        .btn-hero {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 16px 32px; background: var(--sky);
          color: #fff; font-size: 16px; font-weight: 700;
          border-radius: 12px; text-decoration: none;
          box-shadow: 0 10px 25px -5px rgba(2, 132, 199, 0.4);
          transition: all 0.2s ease;
        }
        .btn-hero:hover { transform: translateY(-2px); box-shadow: 0 15px 30px -5px rgba(2, 132, 199, 0.5); background: #0369a1; }

        .btn-outline {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 16px 28px; border: 1.5px solid var(--line);
          background: transparent; color: var(--ink);
          font-size: 16px; font-weight: 600;
          border-radius: 12px; text-decoration: none;
          transition: border-color 0.2s, color 0.2s;
        }
        .btn-outline:hover { border-color: var(--ink); color: #000; }

        /* DASHBOARD PREVIEW */
        .preview-container {
          position: relative;
          perspective: 1000px;
        }
        .preview-card {
          background: #fff;
          border: 1px solid var(--line);
          border-radius: 24px;
          box-shadow: 20px 40px 80px -10px rgba(0,0,0,0.12);
          overflow: hidden;
          background: #fff;
          padding: 32px;
          transform: rotateY(-5deg) rotateX(2deg);
        }
        .preview-header {
           display: flex; align-items: center; justify-content: space-between; margin-bottom: 32px;
        }
        .preview-score {
          display: flex; flex-direction: column; align-items: center; gap: 12px;
        }
        .preview-svg-ring {
          width: 120px; height: 120px; transform: rotate(-90deg);
        }
        .preview-ring-text {
          position: absolute; display: flex; flex-direction: column; align-items: center; justify-content: center;
        }
        .preview-score-val { font-size: 28px; font-weight: 800; color: var(--ink); line-height: 1; }
        .preview-score-lbl { font-size: 8px; font-weight: 700; text-transform: uppercase; color: var(--muted); }

        .preview-grid { display: grid; grid-template-columns: repeat(2,1fr); gap: 12px; }
        .preview-stat {
          padding: 16px; border-radius: 16px; border: 1px solid var(--line);
        }
        .stat-green { background: #f0fdf4; border-color: #dcfce7; color: #166534; }
        .stat-red { background: #fef2f2; border-color: #fee2e2; color: #991b1b; }
        .stat-amber { background: #fffbeb; border-color: #fef3c7; color: #92400e; }

        .upcoming-row { padding-top: 24px; }
        .upcoming-item {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 0; border-bottom: 1px solid var(--line);
        }
        .upcoming-item:last-child { border-bottom: none; }
        .upcoming-name { font-size: 13px; font-weight: 600; color: var(--ink); }
        .upcoming-org { font-size: 11px; color: var(--muted); font-weight: 500; }
        .upcoming-date { font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 8px; }

        /* TRUST BAR */
        .trust-bar { border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); padding: 24px 32px; }
        .trust-bar-inner { max-width: 1280px; margin: 0 auto; display: flex; align-items: center; gap: 48px; }
        .trust-label { font-size: 11px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.1em; white-space: nowrap; }
        .trust-logos { display: flex; align-items: center; gap: 48px; flex-wrap: wrap; opacity: 0.6; grayscale: 1; }
        .trust-logo { font-size: 14px; font-weight: 700; color: var(--ink); display: flex; align-items: center; gap: 6px; }

        /* SECTIONS */
        .section { padding: 120px 32px; }
        .section-tag { font-size: 12px; font-weight: 700; color: var(--sky); text-transform: uppercase; letter-spacing: 0.15em; margin-bottom: 16px; }
        .section-h2 { font-size: clamp(36px, 5vw, 52px); font-weight: 400; letter-spacing: -0.04em; line-height: 1.1; margin-bottom: 24px; }
        .section-h2 strong { font-weight: 700; }
        .section-sub { font-size: 18px; line-height: 1.6; color: var(--muted); max-width: 600px; }

        /* FEATURES GRID */
        .features-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 48px; margin-top: 80px; }
        .feature-item { }
        .f-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-bottom: 24px; }
        .feature-h3 { font-size: 20px; font-weight: 700; margin-bottom: 12px; letter-spacing: -0.01em; }
        .feature-p { font-size: 15px; line-height: 1.6; color: var(--muted); }

        /* SECURITY BAND */
        .security-band { background: var(--off); padding: 80px 32px; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); }
        .sec-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 40px; max-width: 1280px; margin: 0 auto; }
        .sec-item { display: flex; flex-direction: column; gap: 12px; }
        .sec-h4 { font-size: 15px; font-weight: 700; color: var(--ink); }
        .sec-p { font-size: 13px; line-height: 1.6; color: var(--muted); }

        /* CTA */
        .cta-wrap { max-width: 1280px; margin: 0 auto; background: var(--ink); border-radius: 32px; padding: 100px 80px; position: relative; overflow: hidden; display: flex; justify-content: space-between; align-items: center; }
        .cta-content { max-width: 600px; }
        .cta-h2 { font-size: 48px; font-weight: 400; color: #fff; letter-spacing: -0.04em; line-height: 1.1; }
        .cta-h2 strong { font-weight: 700; }
        .cta-p { font-size: 18px; color: rgba(255,255,255,0.6); margin-top: 20px; }

        /* FOOTER */
        .footer { padding: 100px 32px 40px; border-top: 1px solid var(--line); }
        .f-grid { max-width: 1280px; margin: 0 auto; display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 80px; }
        .f-copy { font-size: 14px; line-height: 1.7; color: var(--muted); margin-top: 24px; max-width: 300px; }
        .f-title { font-size: 12px; font-weight: 700; text-transform: uppercase; color: var(--ink); letter-spacing: 0.1em; margin-bottom: 24px; }
        .f-links { list-style: none; display: flex; flex-direction: column; gap: 16px; }
        .f-link { font-size: 15px; color: var(--muted); text-decoration: none; transition: color 0.2s; }
        .f-link:hover { color: var(--sky); }

        @media (max-width: 1024px) {
          .hero, .f-grid { grid-template-columns: 1fr; gap: 64px; }
          .hero { padding: 140px 24px 80px; }
          .preview-container { order: -1; margin-bottom: 40px; }
          .preview-card { transform: none; }
          .features-row, .sec-grid { grid-template-columns: 1fr 1fr; gap: 40px; }
          .cta-wrap { flex-direction: column; align-items: flex-start; gap: 48px; padding: 64px 32px; }
        }
        @media (max-width: 640px) {
          .features-row, .sec-grid, .f-grid { grid-template-columns: 1fr; }
          .nav-links .nav-link { display: none; }
        }
      `}</style>

      <div style={{ background: "var(--white)" }}>

        {/* NAVIGATION */}
        <nav className="nav">
          <div className="nav-inner">
            <Link to="/" className="logo">
              <div className="logo-mark">
                <ShieldCheck size={20} color="#fff" strokeWidth={2.5} />
              </div>
              <span className="logo-text serif">Comply<span>OS</span></span>
            </Link>
            <div className="nav-links">
              <a href="#features" className="nav-link">Platform</a>
              <a href="#solutions" className="nav-link">Sectors</a>
              <a href="#" className="nav-link">Pricing</a>
              {user ? (
                <Link to="/dashboard" className="btn-primary">Dashboard</Link>
              ) : (
                <>
                  <Link to="/auth" className="btn-ghost">Log in</Link>
                  <Link to="/auth" className="btn-primary">Get started</Link>
                </>
              )}
            </div>
          </div>
        </nav>

        {/* HERO */}
        <section className="hero">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "circOut" }}
          >
            <div className="hero-badge">
              <span className="hero-badge-dot" />
              Built for South African businesses
            </div>
            <h1 className="hero-h1 serif">
              Compliance is now <strong>simply managed.</strong>
            </h1>
            <p className="hero-sub">
              ComplyOS centralises your CIPC, SARS, and B-BBEE obligations into an intelligent dashboard — because South African businesses should track growth, not deadlines.
            </p>
            <div className="hero-actions">
              <Link to="/auth" className="btn-hero">
                Start your free trial <ArrowRight size={18} />
              </Link>
              <a href="#features" className="btn-outline">
                How it works
              </a>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="preview-container"
          >
            <div style={{ position: "absolute", top: -20, left: -20, right: 20, bottom: 20, background: "var(--sky-lt)", borderRadius: 32, filter: "blur(80px)", opacity: 0.4 }} />
            <div className="preview-card">
              <div className="preview-header">
                <div className="preview-score">
                  <div style={{ position: "relative", display: "flex", alignItems: "center", justifyCenter: "center" }}>
                    <svg className="preview-svg-ring">
                      <circle cx="60" cy="60" r="54" stroke="#f1f5f9" strokeWidth="8" fill="none" />
                      <circle cx="60" cy="60" r="54" stroke="var(--sky)" strokeWidth="8" fill="none" strokeLinecap="round" strokeDasharray="339.29" strokeDashoffset={339.29 - (339.29 * 94) / 100} />
                    </svg>
                    <div className="preview-ring-text" style={{ width: 120, height: 120 }}>
                      <span className="preview-score-val">94%</span>
                      <span className="preview-score-lbl">Health</span>
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <div style={{ background: "var(--off)", padding: "10px 14px", borderRadius: 12, border: "1px solid var(--line)" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>Overdue</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: "var(--ink)" }}>0</div>
                  </div>
                  <div style={{ background: "var(--off)", padding: "10px 14px", borderRadius: 12, border: "1px solid var(--line)" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>Due Soon</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: "var(--sky)" }}>2</div>
                  </div>
                </div>
              </div>

              <div className="preview-grid">
                <div className="preview-stat stat-green">
                  <ShieldCheck size={14} style={{ marginBottom: 8 }} />
                  <div style={{ fontSize: 12, fontWeight: 700 }}>Compliance Active</div>
                  <div style={{ fontSize: 10, opacity: 0.8 }}>All SARS returns up to date</div>
                </div>
                <div className="preview-stat stat-amber">
                  <Clock size={14} style={{ marginBottom: 8 }} />
                  <div style={{ fontSize: 12, fontWeight: 700 }}>Due in 7 days</div>
                  <div style={{ fontSize: 10, opacity: 0.8 }}>B-BBEE Audit Review</div>
                </div>
              </div>

              <div className="upcoming-row">
                {[
                  { name: "VAT201 Submission", org: "SARS eFiling", date: "Mar 31", tag: "Urgent", cls: "tag-red", bg: "#fee2e2", txt: "#991b1b" },
                  { name: "CIPC Annual Return", org: "CIPC Portal", date: "Apr 25", tag: "Tracked", cls: "tag-green", bg: "#dcfce7", txt: "#166534" },
                ].map((d) => (
                  <div className="upcoming-item" key={d.name}>
                    <div>
                      <div className="upcoming-name">{d.name}</div>
                      <div className="upcoming-org">{d.org}</div>
                    </div>
                    <span className="upcoming-date" style={{ background: d.bg, color: d.txt }}>{d.tag}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* FLOATING DECORATIONS */}
            <div style={{ position: "absolute", bottom: -20, right: 40, background: "#fff", border: "1px solid var(--line)", padding: "12px 20px", borderRadius: 16, boxShadow: "0 10px 30px rgba(0,0,0,0.1)", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ background: "#dcfce7", padding: 6, borderRadius: 8 }}>
                <TrendingUp size={16} color="#16a34a" />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800 }}>R0.00</div>
                <div style={{ fontSize: 10, color: "var(--muted)", fontWeight: 600 }}>Total Penalties</div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* TRUST STRIP */}
        <div className="trust-bar">
          <div className="trust-bar-inner">
            <span className="trust-label">Regulatory Alignment</span>
            <div className="trust-logos">
              <span className="trust-logo"><Building2 size={16} /> SARS eFiling</span>
              <span className="trust-logo"><FileText size={16} /> CIPC Portal</span>
              <span className="trust-logo"><ShieldCheck size={16} /> B-BBEE Commission</span>
              <span className="trust-logo"><Lock size={16} /> Companies Act 71</span>
            </div>
          </div>
        </div>

        {/* FEATURES OVERVIEW */}
        <section id="features" className="section">
          <div className="section-inner">
            <div className="section-tag">The Operating System</div>
            <h2 className="section-h2 serif">
              Professional compliance,<br /><strong>without the professional fee.</strong>
            </h2>
            <p className="section-sub">
              ComplyOS simplifies complex South African regulatory cycles into actionable tasks. No more guessing, no more manual calendars.
            </p>

            <div className="features-row">
              {[
                {
                  icon: BarChart3,
                  title: "Real-time Health Score",
                  desc: "An instant, high-level visualization of your business's compliance fitness across tax, labor, and company categories.",
                  bg: "#f0f9ff", color: "var(--sky)"
                },
                {
                  icon: Map,
                  title: "Automated Roadmaps",
                  desc: "A custom timeline of every CIPC, SARS, and B-BBEE submission required for your sector and company structure.",
                  bg: "#fdf4ff", color: "#a21caf"
                },
                {
                  icon: AlertTriangle,
                  title: "Tiered Notifications",
                  desc: "Smart alerts at 60, 30, and 7-day intervals. Escalate overdue items to directorship before they become penalties.",
                  bg: "#fffbeb", color: "#d97706"
                }
              ].map((f, i) => (
                <div className="feature-item" key={i}>
                  <div className="f-icon" style={{ background: f.bg }}>
                    <f.icon size={22} color={f.color} />
                  </div>
                  <h3 className="feature-h3">{f.title}</h3>
                  <p className="feature-p">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SECURITY & GOVERNANCE */}
        <section className="security-band">
          <div className="sec-grid">
            {[
              { icon: Lock, title: "AES-256 Encryption", desc: "Your legal documents and company data are encrypted with bank-grade standards." },
              { icon: ShieldCheck, title: "POPIA Compliant", desc: "Full alignment with the Protection of Personal Information Act protocols." },
              { icon: Building2, title: "Local Data Residency", desc: "Data stored securely on South African soil, never leaving the jurisdiction." },
              { icon: FileWarning, title: "Audit Ready", desc: "Every action and submission generates an immutable log for future auditing." },
            ].map((s, i) => (
              <div className="sec-item" key={i}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <s.icon size={16} color="var(--sky)" />
                  <h4 className="sec-h4 uppercase">{s.title}</h4>
                </div>
                <p className="sec-p">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="section">
          <div className="section-inner">
            <div className="cta-wrap">
              <div className="cta-content">
                <h2 className="cta-h2 serif">Protect your business <strong>starting today.</strong></h2>
                <p className="cta-p">Automate your South African compliance obligations. Free for 14 days, no card required.</p>
              </div>
              <Link to="/auth" className="btn-hero" style={{ background: "#fff", color: "var(--ink)", boxShadow: "0 20px 40px rgba(0,0,0,0.2)" }}>
                Get Started Now <ArrowUpRight size={18} />
              </Link>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="footer">
          <div className="f-grid">
            <div>
              <Link to="/" className="logo" style={{ marginBottom: 20 }}>
                <div className="logo-mark">
                  <ShieldCheck size={18} color="#fff" />
                </div>
                <span className="logo-text serif">Comply<span>OS</span></span>
              </Link>
              <p className="f-copy">
                Specialised compliance infrastructure for South African high-growth businesses. A Vylex Technology Group product.
              </p>
            </div>
            <div>
              <h5 className="f-title">Platform</h5>
              <ul className="f-links">
                {["Features", "Tax Tracker", "Roadmap", "Pricing"].map(l => (
                  <li key={l}><a href="#" className="f-link">{l}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <h5 className="f-title">Company</h5>
              <ul className="f-links">
                {["About", "Success Stories", "Blog", "Contact"].map(l => (
                  <li key={l}><a href="#" className="f-link">{l}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <h5 className="f-title">Legal</h5>
              <ul className="f-links">
                {["Privacy Policy", "Terms of Service", "Security", "POPIA"].map(l => (
                  <li key={l}><a href="#" className="f-link">{l}</a></li>
                ))}
              </ul>
            </div>
          </div>
          <div style={{ maxWidth: 1280, margin: "60px auto 0", paddingTop: 32, borderTop: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13, color: "var(--muted)", fontWeight: 600 }}>© 2026 ComplyOS. Durban, South Africa.</span>
            <span style={{ fontSize: 13, color: "var(--muted)", fontWeight: 600 }}>
              Powered by{" "}
              <a href="https://vylex.co.za" target="_blank" rel="noopener noreferrer" style={{ color: "var(--sky)", fontWeight: 700, textDecoration: "none" }}>
                Vylex
              </a>
            </span>
          </div>
        </footer>

      </div>
    </>
  );
}