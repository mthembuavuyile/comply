import { motion } from "motion/react";
import {
  ShieldCheck,
  BarChart3,
  Clock,
  CheckCircle2,
  ArrowRight,
  ChevronRight,
  Lock,
  Building2,
  ArrowUpRight,
  FileText,
  TrendingUp,
  AlertTriangle,
  FolderOpen,
  Users,
  Coins,
  ClipboardList,
  Check,
  MessageSquare,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../App";

const FONT = `
  @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:wght@300;400;500;600;700;800;900&display=swap');
`;

export default function LandingPage() {
  const { user } = useAuth();

  return (
    <>
      <style>{FONT}</style>
      <style>{`
        :root {
          --ink:     #051B38;
          --ink-2:   #0A2E5C;
          --muted:   #64748b;
          --line:    #e2e8f0;
          --accent:  #0ea5e9;
          --accent-lt: #e0f2fe;
          --accent-md: #0284c7;
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
          background: var(--accent); padding: 8px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 12px rgba(14, 165, 233, 0.2);
        }
        .logo-text { font-size: 20px; font-weight: 800; color: var(--ink); letter-spacing: -0.03em; }
        .logo-text span { color: var(--accent); }

        .nav-links { display: flex; align-items: center; gap: 32px; }
        .nav-link { font-size: 14px; font-weight: 600; color: var(--muted); text-decoration: none; transition: color 0.15s; }
        .nav-link:hover { color: var(--accent); }

        .btn-primary {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 10px 20px; background: var(--ink);
          color: #fff; font-size: 14px; font-weight: 700;
          border-radius: 10px; text-decoration: none;
          transition: transform 0.2s, background 0.2s;
        }
        .btn-primary:hover { background: #000; transform: translateY(-1px); }

        /* HERO */
        .hero {
          padding: 160px 32px 100px;
          max-width: 1280px; margin: 0 auto;
          display: grid; grid-template-columns: 1.15fr 0.85fr; gap: 60px; align-items: center;
        }
        .hero-badge {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 6px 14px;
          background: var(--accent-lt); border: 1px solid var(--accent); border-radius: 100px;
          font-size: 11px; font-weight: 700; color: var(--accent-md);
          margin-bottom: 28px; text-transform: uppercase; letter-spacing: 0.05em;
        }
        .hero-badge-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: var(--accent); animation: pulse 2s infinite;
        }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }

        .hero-h1 {
          font-size: clamp(44px, 5.5vw, 64px);
          font-weight: 400; line-height: 1.05;
          letter-spacing: -0.04em; margin-bottom: 28px; color: var(--ink);
        }
        .hero-h1 strong { font-weight: 800; color: var(--ink); }

        .hero-sub {
          font-size: 18px; line-height: 1.65;
          color: var(--muted); font-weight: 450; margin-bottom: 48px;
          max-width: 550px;
        }

        .hero-actions { display: flex; align-items: center; gap: 16px; }
        .btn-hero {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 16px 32px; background: var(--ink);
          color: #fff; font-size: 16px; font-weight: 700;
          border-radius: 12px; text-decoration: none;
          box-shadow: 0 10px 25px -5px rgba(5, 27, 56, 0.3);
          transition: all 0.2s ease;
        }
        .btn-hero:hover { transform: translateY(-2px); box-shadow: 0 15px 30px -5px rgba(5, 27, 56, 0.4); background: #000; }

        .btn-outline {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 16px 28px; border: 1.5px solid var(--line);
          background: transparent; color: var(--ink);
          font-size: 16px; font-weight: 600;
          border-radius: 12px; text-decoration: none;
          transition: border-color 0.2s, color 0.2s;
        }
        .btn-outline:hover { border-color: var(--ink); color: #000; }

        /* PORTFOLIO MOCKUP */
        .preview-container {
          position: relative;
        }
        .preview-card {
          background: #fff;
          border: 1px solid var(--line);
          border-radius: 24px;
          box-shadow: 20px 40px 80px -10px rgba(0,0,0,0.1);
          overflow: hidden;
          padding: 24px;
        }
        .mock-header {
          display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;
          border-bottom: 1px solid var(--line); padding-bottom: 16px;
        }
        .mock-title { font-size: 14px; font-weight: 800; color: var(--ink); }
        .mock-badge { background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; font-size: 10px; font-weight: 800; padding: 2px 8px; border-radius: 9999px; }
        .client-list { display: flex; flex-direction: column; gap: 10px; }
        .client-row {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px; border: 1px solid var(--line); border-radius: 12px;
          background: var(--off);
        }
        .client-info { display: flex; align-items: center; gap: 10px; }
        .client-avatar { background: var(--accent-lt); color: var(--accent-md); border-radius: 8px; padding: 6px; display: flex; }
        .client-name { font-size: 12px; font-weight: 700; color: var(--ink); }
        .client-sector { font-size: 9px; color: var(--muted); font-weight: 600; text-transform: uppercase; margin-top: 1px; }
        
        .level-badge {
          font-size: 10px; font-weight: 900; text-transform: uppercase;
          padding: 4px 10px; border-radius: 8px; border: 1px solid;
        }
        .lvl-1 { background: #ecfdf5; border-color: #a7f3d0; color: #047857; }
        .lvl-4 { background: #f0f9ff; border-color: #bae6fd; color: #0369a1; }
        .lvl-nc { background: #fef2f2; border-color: #fecaca; color: #b91c1c; }

        /* TRUST BAR */
        .trust-bar { border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); padding: 24px 32px; background: var(--off); }
        .trust-bar-inner { max-width: 1280px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; }
        .trust-label { font-size: 12px; font-weight: 800; color: var(--muted); text-transform: uppercase; letter-spacing: 0.1em; }
        .trust-logos { display: flex; align-items: center; gap: 48px; opacity: 0.7; }
        .trust-logo { font-size: 13px; font-weight: 700; color: var(--ink); display: flex; align-items: center; gap: 6px; }

        /* SECTIONS */
        .section { padding: 120px 32px; }
        .section-tag { font-size: 12px; font-weight: 700; color: var(--accent); text-transform: uppercase; letter-spacing: 0.15em; margin-bottom: 16px; }
        .section-h2 { font-size: clamp(36px, 5vw, 52px); font-weight: 400; letter-spacing: -0.04em; line-height: 1.1; margin-bottom: 24px; }
        .section-h2 strong { font-weight: 800; }
        .section-sub { font-size: 18px; line-height: 1.6; color: var(--muted); max-width: 600px; }

        /* FEATURES GRID */
        .features-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 48px; margin-top: 80px; }
        .feature-item { }
        .f-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-bottom: 24px; }
        .feature-h3 { font-size: 20px; font-weight: 800; margin-bottom: 12px; letter-spacing: -0.01em; color: var(--ink); }
        .feature-p { font-size: 15px; line-height: 1.6; color: var(--muted); }

        /* PRICING */
        .pricing-section { background: var(--off); border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); }
        .pricing-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 32px; margin-top: 60px; max-width: 1280px; margin-left: auto; margin-right: auto; }
        .pricing-card {
          background: #white; border: 1px solid var(--line); border-radius: 24px; padding: 40px;
          display: flex; flex-direction: column; justify-content: space-between; transition: all 0.2s;
          background: #fff;
        }
        .pricing-card.premium {
          border-color: var(--accent); box-shadow: 0 10px 30px rgba(14, 165, 233, 0.1); position: relative;
        }
        .pricing-card.premium::top {
          position: absolute; top: -12px; right: 24px; background: var(--accent); color: #fff;
          font-size: 10px; font-weight: 800; padding: 4px 12px; border-radius: 9999px; text-transform: uppercase;
        }
        .price-h3 { font-size: 20px; font-weight: 800; margin-bottom: 8px; color: var(--ink); }
        .price-desc { font-size: 13px; color: var(--muted); margin-bottom: 24px; }
        .price-val { font-size: 36px; font-weight: 900; color: var(--ink); margin-bottom: 4px; }
        .price-val span { font-size: 14px; font-weight: 600; color: var(--muted); }
        .price-features { list-style: none; margin-top: 32px; margin-bottom: 32px; display: flex; flex-direction: column; gap: 14px; }
        .price-feature { display: flex; align-items: center; gap: 10px; font-size: 14px; font-weight: 500; color: var(--muted); }
        .price-feature svg { color: var(--accent); }
        
        .btn-price {
          display: block; width: 100%; text-align: center; padding: 14px; border-radius: 12px;
          font-weight: 700; text-decoration: none; font-size: 14px; transition: all 0.2s;
        }
        .btn-price.primary { background: var(--accent); color: #fff; box-shadow: 0 8px 20px rgba(14, 165, 233, 0.25); }
        .btn-price.primary:hover { background: var(--accent-md); }
        .btn-price.secondary { border: 1.5px solid var(--line); color: var(--ink); }
        .btn-price.secondary:hover { border-color: var(--ink); }

        /* CTA */
        .cta-wrap { max-width: 1280px; margin: 0 auto; background: var(--ink); border-radius: 32px; padding: 80px; position: relative; overflow: hidden; display: flex; justify-content: space-between; align-items: center; }
        .cta-content { max-width: 650px; }
        .cta-h2 { font-size: 40px; font-weight: 400; color: #fff; letter-spacing: -0.04em; line-height: 1.1; }
        .cta-h2 strong { font-weight: 800; }
        .cta-p { font-size: 18px; color: rgba(255,255,255,0.6); margin-top: 20px; }

        /* FOOTER */
        .footer { padding: 100px 32px 40px; border-top: 1px solid var(--line); }
        .f-grid { max-width: 1280px; margin: 0 auto; display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 80px; }
        .f-copy { font-size: 14px; line-height: 1.7; color: var(--muted); margin-top: 24px; max-width: 300px; }
        .f-title { font-size: 12px; font-weight: 800; text-transform: uppercase; color: var(--ink); letter-spacing: 0.1em; margin-bottom: 24px; }
        .f-links { list-style: none; display: flex; flex-direction: column; gap: 16px; }
        .f-link { font-size: 15px; color: var(--muted); text-decoration: none; transition: color 0.2s; }
        .f-link:hover { color: var(--accent); }

        @media (max-width: 1024px) {
          .hero, .f-grid, .pricing-grid { grid-template-columns: 1fr; gap: 64px; }
          .hero { padding: 140px 24px 80px; }
          .preview-container { order: -1; margin-bottom: 40px; }
          .features-row { grid-template-columns: 1fr 1fr; gap: 40px; }
          .cta-wrap { flex-direction: column; align-items: flex-start; gap: 48px; padding: 64px 32px; }
        }
        @media (max-width: 640px) {
          .features-row, .f-grid { grid-template-columns: 1fr; }
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
              <a href="#features" className="nav-link">Features</a>
              <a href="#pricing" className="nav-link">Pricing</a>
              {user ? (
                <Link to="/dashboard" className="btn-primary">Practice Dashboard</Link>
              ) : (
                <Link to="/auth" className="btn-primary">Sign In</Link>
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

            <h1 className="hero-h1">
              The B-BBEE platform <strong>your practice needs.</strong>
            </h1>
            <p className="hero-sub">
              Manage scorecard preparation, supplier verification, and audit evidence for every client — from one centralized dashboard. Built for South African accountants and consultants.
            </p>
            <div className="hero-actions">
              <Link to="/auth" className="btn-hero">
                Start Free Trial <ArrowRight size={18} />
              </Link>
              <a href="#features" className="btn-outline">
                See How It Works
              </a>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="preview-container"
          >
            <div style={{ position: "absolute", top: -20, left: -20, right: 20, bottom: 20, background: "var(--accent-lt)", borderRadius: 32, filter: "blur(80px)", opacity: 0.4 }} />
            <div className="preview-card">
              <div className="mock-header">
                <span className="mock-title">Practice Client Portfolio</span>
                <span className="mock-badge">Active Management</span>
              </div>
              
              <div className="client-list">
                {[
                  { name: "Siyakhula Logistics (Pty) Ltd", sector: "Transport & Logistics", level: "Level 1", cls: "lvl-1" },
                  { name: "Vanguard Tech Solutions", sector: "Information Technology", level: "Level 4", cls: "lvl-4" },
                  { name: "Phola Construction", sector: "Construction & Infrastructure", level: "NC (Level 9)", cls: "lvl-nc" }
                ].map((c, i) => (
                  <div className="client-row" key={i}>
                    <div className="client-info">
                      <div className="client-avatar">
                        <Building2 size={16} />
                      </div>
                      <div>
                        <div className="client-name">{c.name}</div>
                        <div className="client-sector">{c.sector}</div>
                      </div>
                    </div>
                    <span className={`level-badge ${c.cls}`}>{c.level}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </section>

        {/* TRUST STRIP */}
        <div className="trust-bar">
          <div className="trust-bar-inner">
            <span className="trust-label">Trusted Practice Partners</span>
            <div className="trust-logos">
              <span className="trust-logo"><Users size={16} /> 50+ Accounting Practices</span>
              <span className="trust-logo"><ShieldCheck size={16} /> Verified SANAS Formats</span>
              <span className="trust-logo"><Building2 size={16} /> South African Corporates</span>
            </div>
          </div>
        </div>

        {/* FEATURES OVERVIEW */}
        <section id="features" className="section">
          <div className="section-inner">
            <div className="section-tag">Features Overview</div>
            <h2 className="section-h2 serif">
              Everything you need to run<br /><strong>B-BBEE advisory at scale.</strong>
            </h2>
            <p className="section-sub">
              Ditch the complex spreadsheet trackers. ComplyOS gives you professional, automated B-BBEE modeling software built for practices.
            </p>

            <div className="features-row">
              {[
                {
                  icon: FolderOpen,
                  title: "Multi-Client Portfolio",
                  desc: "Manage 100+ clients from a single, unified login. Switch between client dashboards instantly and view audit statuses at a glance.",
                  bg: "var(--accent-lt)", color: "var(--accent-md)"
                },
                {
                  icon: BarChart3,
                  title: "Live Scorecard Engine",
                  desc: "Get real-time points computations across all 5 scorecard elements: Ownership, Skills, Procurement, ESD, and SED.",
                  bg: "#ecfdf5", color: "#047857"
                },
                {
                  icon: FileText,
                  title: "Supplier Certificate Vault",
                  desc: "AI-powered OCR extracts B-BBEE levels, ownership, and expiry dates from uploaded certificates. Keeps tracking expiration dates automatically.",
                  bg: "#fff1f2", color: "#e11d48"
                },
                {
                  icon: Coins,
                  title: "Spend Gap Intelligence",
                  desc: "Calculate payroll and profit-based spending targets. Map skills training, enterprise, supplier, and socio-economic contributions live.",
                  bg: "#fdf4ff", color: "#a21caf"
                },
                {
                  icon: ClipboardList,
                  title: "Audit-Ready Evidence",
                  desc: "Compile one-click evidence ZIP packs containing sworn affidavits, supplier certificates, and bank payment receipts structured for audit agents.",
                  bg: "#fffbeb", color: "#d97706"
                },
                {
                  icon: MessageSquare,
                  title: "AI B-BBEE Copilot",
                  desc: "Consult our Gemini-powered AI advisor for natural language answers to complex point calculations, priority targets, and compliance queries.",
                  bg: "#e0e7ff", color: "#4338ca"
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

        {/* PRICING */}
        <section id="pricing" className="section pricing-section">
          <div className="section-inner" style={{ maxWidth: 1280, margin: "0 auto" }}>
            <div style={{ textAlign: "center" }}>
              <div className="section-tag" style={{ margin: "0 auto 16px" }}>Transparent Practice Pricing</div>
              <h2 className="section-h2 serif">Plans designed to <strong>scale with your clients.</strong></h2>
              <p className="section-sub" style={{ margin: "0 auto" }}>No long term contracts. Upgrade or downgrade as your client count grows.</p>
            </div>

            <div className="pricing-grid">
              {[
                {
                  title: "Starter Practice",
                  desc: "For small firms and independent consultants starting out with B-BBEE.",
                  price: "R499",
                  clients: "Up to 5 clients",
                  features: ["Live Scorecard Engine", "Supplier CRM & OCR", "Interactive What-If Calculators", "Basic Evidence Vaults", "1 Practitioner Login"],
                  btnCls: "secondary",
                  btnText: "Start Free Trial"
                },
                {
                  title: "Professional Firm",
                  desc: "The sweet spot for established firms managing mid-sized client books.",
                  price: "R1,499",
                  clients: "Up to 50 clients",
                  features: ["Everything in Starter", "Spend Gap Intel & Alerts", "Scorecard Sync & History", "AI B-BBEE Copilot Access", "Up to 5 Practitioner Logins", "Priority Local Email Support"],
                  btnCls: "primary",
                  btnText: "Most Popular - Trial"
                },
                {
                  title: "Enterprise Practice",
                  desc: "Customized infrastructure for large accounting practices and audit agencies.",
                  price: "R4,999",
                  clients: "Unlimited clients",
                  features: ["Everything in Professional", "Custom Branding / White-label", "Practice-wide Audit Logs", "Unlimited Team Logins", "API Integrations Access", "Dedicated SANAS Advisor Support"],
                  btnCls: "secondary",
                  btnText: "Contact Sales"
                }
              ].map((p, i) => (
                <div className={`pricing-card ${p.btnCls === "primary" ? "premium" : ""}`} key={i}>
                  <div>
                    <h3 className="price-h3">{p.title}</h3>
                    <p className="price-desc">{p.desc}</p>
                    <div className="price-val">
                      {p.price}<span>/month</span>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--accent)" }}>{p.clients}</div>
                    
                    <ul className="price-features">
                      {p.features.map((f, fi) => (
                        <li className="price-feature" key={fi}>
                          <Check size={14} />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <Link to="/auth" className={`btn-price ${p.btnCls}`}>
                    {p.btnText}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="section">
          <div className="section-inner">
            <div className="cta-wrap">
              <div className="cta-content">
                <h2 className="cta-h2 serif">Stop managing B-BBEE <strong>with spreadsheets.</strong></h2>
                <p className="cta-p">Centralize scorecards, document collections, and compliance audits for all your clients. Get started in minutes.</p>
              </div>
              <Link to="/auth" className="btn-hero" style={{ background: "#fff", color: "var(--ink)", boxShadow: "0 20px 40px rgba(0,0,0,0.2)" }}>
                Start Practice Trial <ArrowUpRight size={18} />
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
                B-BBEE compliance software and practice management tools for South African firms. A Vylex Technology Group product.
              </p>
            </div>
            <div>
              <h5 className="f-title">Platform</h5>
              <ul className="f-links">
                {["Client Portfolio", "Scorecard Engine", "Spend gap tracking", "Evidence Vault"].map(l => (
                  <li key={l}><a href="#" className="f-link">{l}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <h5 className="f-title">Solutions</h5>
              <ul className="f-links">
                {["Accounting Practices", "BEE Consultants", "SANAS Auditors", "Enterprise Networks"].map(l => (
                  <li key={l}><a href="#" className="f-link">{l}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <h5 className="f-title">Legal</h5>
              <ul className="f-links">
                {["Privacy Policy", "Terms of Service", "POPIA Compliance", "Contact Support"].map(l => (
                  <li key={l}><a href="#" className="f-link">{l}</a></li>
                ))}
              </ul>
            </div>
          </div>
          <div style={{ maxWidth: 1280, margin: "60px auto 0", paddingTop: 32, borderTop: "1px solid var(--line)", display: "flex", justify: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13, color: "var(--muted)", fontWeight: 600 }}>© 2026 ComplyOS. Durban, South Africa.</span>
            <span style={{ fontSize: 13, color: "var(--muted)", fontWeight: 600 }}>
              Powered by{" "}
              <a href="https://vylex.co.za" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)", fontWeight: 700, textDecoration: "none" }}>
                vylex.co.za
              </a>
            </span>
          </div>
        </footer>

      </div>
    </>
  );
}