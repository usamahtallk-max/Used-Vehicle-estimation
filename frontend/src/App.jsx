import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Inspection from "./pages/Inspection";
import Result from "./pages/Result";

import { motion } from "framer-motion";
import {
  ArrowRight,
  ScanLine,
  ShieldCheck,
  Sparkles,
  CarFront,
  Camera,
} from "lucide-react";

import { supabase } from "./lib/supabase";
import "./App.css";

function App() {
  console.log("Supabase client:", supabase);

  return (
    <BrowserRouter>
      <Routes>

        {/* MOTORIQ LANDING PAGE */}
        <Route path="/" element={<Home />} />

        {/* AUTH PAGES */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

         <Route path="/dashboard" element={<Dashboard />} />

         <Route path="/inspection" element={<Inspection />} />

         <Route path="/result" element={<Result />} />

      </Routes>
    </BrowserRouter>
  );
}

function Home() {
  return (
    <div className="app">

      {/* NAVBAR */}
      <nav className="navbar">

        <div className="logo">
          <span className="logo-mark">M</span>
          <span>
            Motor<span>IQ</span>
          </span>
        </div>

        <div className="nav-links">
          <a href="#technology">Technology</a>
          <a href="#inspection">AI Inspection</a>
          <a href="#about">About</a>
        </div>

        <div className="nav-actions">

          <Link to="/login">
            <button className="login-btn">
              Login
            </button>
          </Link>

          <Link to="/signup">
            <button className="signup-btn">
              Sign Up
            </button>
          </Link>

        </div>

      </nav>

      {/* HERO */}
      <main className="hero">

        <div className="hero-content">

          <motion.div
            className="ai-badge"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <Sparkles size={16} />
            AI-POWERED VEHICLE INTELLIGENCE
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15 }}
          >
            See what's really
            <br />
            <span>under the surface.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            MotorIQ uses artificial intelligence to analyze your
            vehicle, detect visible damage, assess its condition,
            and estimate its real-world value.
          </motion.p>

          <motion.div
            className="hero-buttons"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.45 }}
          >

            <Link to="/login">
              <button className="primary-btn">
                Start Vehicle Inspection
                <ArrowRight size={19} />
              </button>
            </Link>

            <Link to="/login">
              <button className="secondary-btn">
                <Camera size={18} />
                Upload Photos
              </button>
            </Link>

          </motion.div>

          <div className="trust-row">

            <div>
              <ShieldCheck size={17} />
              AI-assisted inspection
            </div>

            <div>
              <ScanLine size={17} />
              Damage visualization
            </div>

          </div>

        </div>

        {/* VEHICLE VISUAL */}
        <motion.div
          className="vehicle-area"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.25 }}
        >

          <div className="glow glow-one"></div>
          <div className="glow glow-two"></div>

          <motion.div
            className="vehicle-card"
            animate={{
              y: [0, -12, 0],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >

            <div className="scan-line"></div>

            <div className="vehicle-icon">
              <CarFront size={150} strokeWidth={1} />
            </div>

            <div className="damage-point point-one">
              <span></span>
              <label>Minor scratch</label>
            </div>

            <div className="damage-point point-two">
              <span></span>
              <label>Front inspection</label>
            </div>

            <div className="vehicle-info">

              <div>
                <small>AI INSPECTION</small>
                <strong>Vehicle Scan</strong>
              </div>

              <div className="scan-status">
                <span></span>
                READY
              </div>

            </div>

          </motion.div>

          <div className="floating-card card-top">
            <ScanLine size={18} />

            <div>
              <small>VISION AI</small>
              <strong>Damage Detection</strong>
            </div>
          </div>

          <div className="floating-card card-bottom">
            <Sparkles size={18} />

            <div>
              <small>CONDITION</small>
              <strong>AI Assessment</strong>
            </div>
          </div>

        </motion.div>

      </main>

      {/* FEATURES */}
      <section className="features" id="technology">

        <div className="section-heading">
          <span>WHAT MOTORIQ SEES</span>

          <h2>
            Intelligence beyond
            <br />
            the price tag.
          </h2>
        </div>

        <div className="feature-grid">

          <Feature
            icon={<ScanLine />}
            title="Damage Detection"
            text="Identify visible scratches, dents, bumper damage and other exterior issues from vehicle photos."
          />

          <Feature
            icon={<Sparkles />}
            title="Condition Assessment"
            text="Turn visual information into an understandable vehicle condition score."
          />

          <Feature
            icon={<CarFront />}
            title="Vehicle Intelligence"
            text="Combine vehicle specifications, AI vision and machine learning to estimate value."
          />

        </div>

      </section>

      {/* CTA */}
      <section className="cta" id="inspection">

        <div>
          <span>READY TO INSPECT?</span>

          <h2>
            Let MotorIQ
            <br />
            look closer.
          </h2>
        </div>

        <Link to="/login">
          <button className="primary-btn">
            Start Inspection
            <ArrowRight size={19} />
          </button>
        </Link>

      </section>

      {/* FOOTER */}
      <footer id="about">

        <div className="logo">
          <span className="logo-mark">M</span>
          Motor<span>IQ</span>
        </div>

        <p>
          AI-powered vehicle valuation and intelligent inspection.
        </p>

        <span>
          © 2026 MotorIQ
        </span>

      </footer>

    </div>
  );
}

function Feature({ icon, title, text }) {

  return (
    <motion.div
      className="feature-card"
      whileHover={{ y: -8 }}
      transition={{ duration: 0.25 }}
    >

      <div className="feature-icon">
        {icon}
      </div>

      <h3>{title}</h3>

      <p>{text}</p>

      <ArrowRight
        className="feature-arrow"
        size={20}
      />

    </motion.div>
  );
}

export default App;