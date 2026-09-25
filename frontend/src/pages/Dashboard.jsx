import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { motion } from "framer-motion";
import {
  CarFront,
  Camera,
  ScanLine,
  LogOut,
  User,
  ArrowRight,
} from "lucide-react";

function Dashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        navigate("/login");
        return;
      }

      setUser(user);
      setLoading(false);
    };

    getUser();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const startInspection = () => {
    navigate("/inspection");
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        Loading MotorIQ...
      </div>
    );
  }

  const fullName =
    user?.user_metadata?.full_name || "Driver";

  return (
    <div className="dashboard">
      {/* =========================
          NAVBAR
      ========================= */}

      <nav className="dashboard-nav">
        <div className="logo">
          <span className="logo-mark">M</span>

          <span>
            Motor<span>IQ</span>
          </span>
        </div>

        <div className="dashboard-user">
          <User size={18} />

          <span>{fullName}</span>

          <button onClick={handleLogout}>
            <LogOut size={17} />
            Logout
          </button>
        </div>
      </nav>

      {/* =========================
          MAIN
      ========================= */}

      <main className="dashboard-main">

        {/* HEADING */}

        <motion.div
          className="dashboard-heading"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <span>VEHICLE INTELLIGENCE</span>

          <h1>
            Welcome back, {fullName}.
          </h1>

          <p>
            Analyze your vehicle, detect visible damage,
            assess its condition and estimate its value.
          </p>
        </motion.div>

        {/* =========================
            MAIN INSPECTION CARD
        ========================= */}

        <motion.section
          className="inspection-card"
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <div className="inspection-icon">
            <ScanLine size={32} />
          </div>

          <div className="inspection-content">

            <span>
              AI VEHICLE INSPECTION
            </span>

            <h2>
              See what's really
              <br />
              under the surface.
            </h2>

            <p>
              Upload vehicle photos and let MotorIQ
              analyze visible damage and vehicle condition.
            </p>

            <button
              className="dashboard-primary-btn"
              onClick={startInspection}
            >
              <Camera size={18} />
              Start Inspection
              <ArrowRight size={17} />
            </button>

          </div>

          <div className="dashboard-car">
            <CarFront
              size={180}
              strokeWidth={0.8}
            />
          </div>
        </motion.section>

        {/* =========================
            DASHBOARD BOXES
        ========================= */}

        <section className="dashboard-grid">

          {/* UPLOAD VEHICLE */}

          <motion.div
            className="dashboard-box"
            whileHover={{ y: -5 }}
          >
            <div className="box-icon">
              <Camera />
            </div>

            <h3>
              Upload Vehicle
            </h3>

            <p>
              Upload up to 6 photos of your car or
              bike for AI inspection.
            </p>

            <button
              onClick={startInspection}
            >
              Upload Photos →
            </button>
          </motion.div>

          {/* MY VEHICLES */}

          <motion.div
            className="dashboard-box"
            whileHover={{ y: -5 }}
          >
            <div className="box-icon">
              <CarFront />
            </div>

            <h3>
              My Vehicles
            </h3>

            <p>
              Your inspected vehicles and their
              AI-generated reports will appear here.
            </p>

            <button
              onClick={() => {
                alert(
                  "Vehicle history will be available after the inspection system is connected."
                );
              }}
            >
              View Vehicles →
            </button>
          </motion.div>

          {/* INSPECTION HISTORY */}

          <motion.div
            className="dashboard-box"
            whileHover={{ y: -5 }}
          >
            <div className="box-icon">
              <ScanLine />
            </div>

            <h3>
              Inspection History
            </h3>

            <p>
              Review your previous vehicle inspections
              and condition assessments.
            </p>

            <button
              onClick={() => {
                alert(
                  "Inspection history will be available after reports are connected to Supabase."
                );
              }}
            >
              View History →
            </button>
          </motion.div>

        </section>

      </main>
    </div>
  );
}

export default Dashboard;