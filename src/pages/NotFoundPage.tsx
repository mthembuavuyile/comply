import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { ShieldCheck, ArrowLeft, Home } from "lucide-react";

const FONT = `
  @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:wght@300;400;500;600;700&display=swap');
`;

export default function NotFoundPage() {
  return (
    <>
      <style>{FONT}</style>
      <style>{`
        :root {
          --ink:     #0f172a;
          --muted:   #64748b;
          --line:    #e2e8f0;
          --sky:     #0284c7;
          --sky-lt:  #f0f9ff;
          --white:   #ffffff;
          --off:     #f8fafc;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'DM Sans', sans-serif; background: var(--white); color: var(--ink); -webkit-font-smoothing: antialiased; }
        .serif { font-family: 'Instrument Serif', serif; }

        .not-found-container {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 32px;
          text-align: center;
          background: radial-gradient(circle at 50% 50%, var(--sky-lt) 0%, var(--white) 100%);
        }

        .logo-mark {
          background: var(--sky); padding: 12px; border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 12px rgba(2, 132, 199, 0.2);
          margin-bottom: 40px;
        }

        .status-code {
          font-size: clamp(80px, 15vw, 120px);
          font-weight: 700;
          line-height: 1;
          letter-spacing: -0.05em;
          color: var(--sky);
          opacity: 0.2;
          position: absolute;
          z-index: 0;
          user-select: none;
        }

        .content {
          position: relative;
          z-index: 1;
          max-width: 500px;
        }

        .title {
          font-size: clamp(32px, 5vw, 48px);
          font-weight: 400;
          letter-spacing: -0.03em;
          margin-bottom: 16px;
          color: var(--ink);
        }

        .description {
          font-size: 18px;
          line-height: 1.6;
          color: var(--muted);
          margin-bottom: 40px;
        }

        .actions {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
        }

        .btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 24px;
          font-size: 15px;
          font-weight: 700;
          border-radius: 10px;
          text-decoration: none;
          transition: all 0.2s ease;
        }

        .btn-primary {
          background: var(--sky);
          color: #fff;
          box-shadow: 0 10px 20px -5px rgba(2, 132, 199, 0.3);
        }

        .btn-primary:hover {
          transform: translateY(-1px);
          background: #0369a1;
          box-shadow: 0 15px 25px -5px rgba(2, 132, 199, 0.4);
        }

        .btn-outline {
          background: #fff;
          color: var(--ink);
          border: 1.5px solid var(--line);
        }

        .btn-outline:hover {
          border-color: var(--ink);
        }

        .footer-text {
          margin-top: 80px;
          font-size: 13px;
          font-weight: 600;
          color: var(--muted);
        }
      `}</style>

      <div className="not-found-container">
        <motion.div 
          className="status-code"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 0.1, scale: 1 }}
          transition={{ duration: 1 }}
        >
          404
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="content"
        >
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <Link to="/" className="logo-mark">
              <ShieldCheck size={24} color="#fff" strokeWidth={2.5} />
            </Link>
          </div>

          <h1 className="title serif">Page <i>not found.</i></h1>
          <p className="description">
            The compliance path you're looking for doesn't exist or has been moved. Let's get you back on track.
          </p>

          <div className="actions">
            <button 
              onClick={() => window.history.back()} 
              className="btn btn-outline"
            >
              <ArrowLeft size={16} /> Go Back
            </button>
            <Link to="/" className="btn btn-primary">
              <Home size={16} /> Return Home
            </Link>
          </div>
        </motion.div>

        <div className="footer-text">
          Powered by <strong>Vylex ComplyOS</strong>
        </div>
      </div>
    </>
  );
}
