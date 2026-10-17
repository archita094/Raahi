import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { MapPin, Navigation, ArrowRight, Bus, Clock, CheckCircle2, AlertTriangle, Sparkles, Menu, X, ArrowUp, Zap } from 'lucide-react';
import AnimatedPage from '../components/AnimatedPage';
import Navbar from '../components/Navbar';
import AuthModal from '../components/AuthModal';
import l1 from '../assets/l1.jpg';
import l2 from '../assets/l2.jpg';
import l3 from '../assets/l3.jpg';
import l4 from '../assets/l4.jpg';
import heroImg from '../assets/hero-image.jpg';
import '../styles/LandingPage.css';

const HERO_PHOTO =
  "https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=1800&h=1000&fit=crop&auto=format";

const ROUTES = [
  { id: "42A", name: "City Centre → Airport", next: "08:14", in: "3 min", status: "on-time" },
  { id: "7B", name: "Riverside → University", next: "08:19", in: "8 min", status: "on-time" },
  { id: "15", name: "Westport → Central Station", next: "08:22", in: "11 min", status: "delayed" },
];

export default function LandingPage() {
  const navigate = useNavigate();

  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');

  const getIndiaTimeString = () => {
    const now = new Date();
    try {
      return now.toLocaleTimeString('en-US', {
        timeZone: 'Asia/Kolkata',
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    }
  };

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [timingMode, setTimingMode] = useState('now');
  const [departureTime, setDepartureTime] = useState(getIndiaTimeString());

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 80);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const openAuth = (mode) => {
    setAuthMode(mode);
    setAuthModalOpen(true);
    setMobileMenuOpen(false);
  };

  const scrollToSection = (id) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handlePlanJourney = (e) => {
    e.preventDefault();
    if (from.trim() && to.trim()) {
      let queryUrl = `/results?from=${encodeURIComponent(from.trim())}&to=${encodeURIComponent(to.trim())}`;
      queryUrl += `&mode=${encodeURIComponent(timingMode)}`;
      const effectiveTime = timingMode === 'now' ? getIndiaTimeString() : departureTime;
      if (effectiveTime) {
        queryUrl += `&time=${encodeURIComponent(effectiveTime)}`;
      }
      navigate(queryUrl);
    } else {
      navigate('/search');
    }
  };

  const imageSectionRef = useRef(null);
  const { scrollYProgress: imageScroll } = useScroll({
    target: imageSectionRef,
    offset: ['start end', 'end start'],
  });

  const l1X = useTransform(imageScroll, [0, 0.35, 0.65, 1], ['-100%', '40%', '40%', '-120%']);
  const l1Opacity = useTransform(imageScroll, [0, 0.2, 0.8, 1], [0, 1, 1, 0]);
  const l2X = useTransform(imageScroll, [0, 0.38, 0.62, 1], ['-120%', '50%', '50%', '-140%']);
  const l2Opacity = useTransform(imageScroll, [0.05, 0.25, 0.78, 1], [0, 1, 1, 0]);
  const l3X = useTransform(imageScroll, [0, 0.36, 0.64, 1], ['110%', '-25%', '-25%', '130%']); const l3Opacity = useTransform(imageScroll, [0.02, 0.22, 0.8, 1], [0, 1, 1, 0]);
  const l4X = useTransform(imageScroll, [0, 0.4, 0.6, 1], ['130%', '-40%', '-40%', '150%']);
  const l4Opacity = useTransform(imageScroll, [0.08, 0.28, 0.75, 1], [0, 1, 1, 0]);

  const l1Y = useTransform(imageScroll, [0, 0.5, 1], ['-30px', '0px', '40px']);
  const l2Y = useTransform(imageScroll, [0, 0.5, 1], ['40px', '0px', '-20px']);
  const l3Y = useTransform(imageScroll, [0, 0.5, 1], ['-20px', '0px', '30px']);
  const l4Y = useTransform(imageScroll, [0, 0.5, 1], ['50px', '-40px', '-40px']);

  return (
    <AnimatedPage className="landing-page-wrapper">

      <Navbar />

      <section className="hero-section" id="hero">
        <div className="hero-bg-wrapper">
          <img src={HERO_PHOTO} alt="Transit journey landscape" className="hero-bg-image" />
          <div className="hero-bg-overlay" />
        </div>

        <div className="container hero-container">
          <div className="hero-content-grid">
            <motion.div
              className="hero-text-block"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.2 }}
            >
              <span className="hero-eyebrow-badge">
                <Sparkles size={13} className="hero-badge-icon" />
                <span>RAAHI JOURNEYS · Real-Time Tracking & Schedules</span>
              </span>

              <h1 className="serif-headline hero-title">
                Know your bus
                <br />
                before it <span className="hero-title-accent">arrives.</span>
              </h1>

              <p className="hero-subtitle">
                Live departure boards, route timetables, and door-to-door journey planning — all harmonized in one serene experience.
              </p>

              <div className="hero-search-card">
                <form onSubmit={handlePlanJourney} className="hero-search-form">
                  <div className="search-inputs-grid">
                    <div className="search-input-wrapper">
                      <label htmlFor="hero-from" className="search-label">From</label>
                      <div className="search-field">
                        <MapPin size={16} className="search-field-icon text-blue" />
                        <input
                          id="hero-from"
                          type="text"
                          placeholder="Enter stop or starting point"
                          value={from}
                          onChange={(e) => setFrom(e.target.value)}
                          className="search-input"
                        />
                      </div>
                    </div>

                    <div className="search-input-wrapper">
                      <label htmlFor="hero-to" className="search-label">To</label>
                      <div className="search-field">
                        <Navigation size={16} className="search-field-icon text-sky" />
                        <input
                          id="hero-to"
                          type="text"
                          placeholder="Enter destination or stop"
                          value={to}
                          onChange={(e) => setTo(e.target.value)}
                          className="search-input"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="search-input-wrapper" style={{ marginTop: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label className="search-label">When to travel?</label>
                      {timingMode === 'now' && (
                        <span style={{ fontSize: '0.72rem', color: '#047857', fontWeight: 600, background: '#D1FAE5', padding: '2px 8px', borderRadius: '12px' }}>
                          IST: {getIndiaTimeString()}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', background: '#F1F5F9', padding: '3px', borderRadius: '10px', gap: '4px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setTimingMode('now');
                          setDepartureTime(getIndiaTimeString());
                        }}
                        style={{
                          flex: 1,
                          padding: '7px 10px',
                          borderRadius: '8px',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          fontSize: '0.8rem',
                          fontWeight: timingMode === 'now' ? '700' : '500',
                          background: timingMode === 'now' ? '#FFFFFF' : 'transparent',
                          color: timingMode === 'now' ? '#1E3A8A' : '#64748B',
                          boxShadow: timingMode === 'now' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <Zap size={14} />
                        <span>Check for Now</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setTimingMode('later')}
                        style={{
                          flex: 1,
                          padding: '7px 10px',
                          borderRadius: '8px',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          fontSize: '0.8rem',
                          fontWeight: timingMode === 'later' ? '700' : '500',
                          background: timingMode === 'later' ? '#FFFFFF' : 'transparent',
                          color: timingMode === 'later' ? '#1E3A8A' : '#64748B',
                          boxShadow: timingMode === 'later' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <Clock size={14} />
                        <span>Check for Later</span>
                      </button>
                    </div>

                    <AnimatePresence>
                      {timingMode === 'later' && (
                        <motion.div
                          initial={{ opacity: 0, height: 0, marginTop: 0 }}
                          animate={{ opacity: 1, height: 'auto', marginTop: 8 }}
                          exit={{ opacity: 0, height: 0, marginTop: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <div className="search-field" style={{ padding: '8px 14px' }}>
                            <Clock size={16} className="search-field-icon" style={{ color: '#F59E0B' }} />
                            <input
                              id="hero-time"
                              type="time"
                              value={departureTime}
                              onChange={(e) => setDepartureTime(e.target.value)}
                              className="search-input"
                              style={{ flex: 1 }}
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <button type="submit" className="hero-plan-btn">
                    <span>Plan Journey</span>
                    <ArrowRight size={16} />
                  </button>
                </form>
              </div>
            </motion.div>

            <motion.div
              className="hero-departures-card"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 1, delay: 0.4 }}
            >
              <div className="departures-card-header">
                <div>
                  <span className="departures-eyebrow">RIGHT NOW</span>
                  <h3 className="serif-headline departures-title">Next Departures</h3>
                </div>
                <button onClick={() => navigate('/search')} className="departures-link">
                  View all routes →
                </button>
              </div>

              <div className="routes-grid">
                {ROUTES.map((r) => (
                  <div
                    key={r.id}
                    className="route-card-item"
                    onClick={() => navigate(`/search?route=${r.id}`)}
                  >
                    <div className="route-card-top">
                      <div className="route-id-box">
                        <Bus size={13} />
                        <span>{r.id}</span>
                      </div>
                      <span className={`route-status-pill ${r.status === "on-time" ? "status-on-time" : "status-delayed"}`}>
                        {r.status === "on-time" ? <CheckCircle2 size={11} /> : <AlertTriangle size={11} />}
                        <span>{r.status}</span>
                      </span>
                    </div>

                    <div className="route-name">{r.name}</div>

                    <div className="route-time-row">
                      <span className="route-next-time">{r.next}</span>
                      <span className="route-in-mins">
                        <Clock size={12} />
                        in {r.in}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          <motion.div
            className="hero-scroll-indicator"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.8 }}
            transition={{ duration: 1, delay: 1 }}
          >
            <span className="scroll-text">Scroll to explore</span>
            <div className="scroll-line-wrapper">
              <motion.div
                className="scroll-line"
                animate={{ y: [0, 14, 0] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
              />
            </div>
          </motion.div>
        </div>
      </section>

      <section ref={imageSectionRef} className="image-story-section" id="story-destination">
        <div className="container story-header-container">
          <motion.span
            className="editorial-tag"
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            DESTINATION DISCOVERY
          </motion.span>
        </div>

        <div className="canvas-wrapper">
          <div className="central-typography-layer">
            <p className="serif-headline central-layered-text">
              <span className="text-dark">We take you where  </span>
              <span className="text-muted">you want, from where you are </span>
              <br />
              <span className="text-dark">Find peaceful escapes </span>
              <span className="text-italic text-accent">beyond the </span><br />
              <span className="text-italic text-accent"> usual. </span>
            </p>
          </div>

          <div className="floating-photos-layer">
            <motion.div className="photo-card photo-l1" style={{ x: l1X, y: l1Y, opacity: l1Opacity }}>
              <div className="photo-inner"><img src={l1} alt="Coastal vista" loading="lazy" /></div>
              <span className="photo-caption">01 — Coastal Silence</span>
            </motion.div>
            <motion.div className="photo-card photo-l2" style={{ x: l2X, y: l2Y, opacity: l2Opacity }}>
              <div className="photo-inner"><img src={l2} alt="Forest canopy" loading="lazy" /></div>
              <span className="photo-caption">02 — Morning Light</span>
            </motion.div>
            <motion.div className="photo-card photo-l3" style={{ x: l3X, y: l3Y, opacity: l3Opacity }}>
              <div className="photo-inner"><img src={l3} alt="Mountain trail" loading="lazy" /></div>
              <span className="photo-caption">03 — High Pass</span>
            </motion.div>
            <motion.div className="photo-card photo-l4" style={{ x: l4X, y: l4Y, opacity: l4Opacity }}>
              <div className="photo-inner"><img src={l4} alt="Hidden sanctuary" loading="lazy" /></div>
              <span className="photo-caption">04 — Hidden Sanctuary</span>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="about-us-section" id="about-us">
        <div className="container">
          <div className="about-us-grid">
            <motion.div
              className="about-left-col"
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 1 }}
            >
              <span className="editorial-tag">ABOUT RAAHI</span>
              <h2 className="serif-headline about-main-quote">
                “Travel should not feel like a checklist. Journeys should feel unhurried and inspiring.”
              </h2>
              <div className="about-photo-wrapper">
                <img src={heroImg} alt="Serene natural pathway" loading="lazy" />
                <span className="about-photo-caption">THE RAAHI MANIFESTO</span>
              </div>
            </motion.div>

            <motion.div
              className="about-right-col"
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 1, delay: 0.2 }}
            >
              <h3 className="serif-headline about-sub-headline">
                Connecting what you long to experience with where you belong.
              </h3>
              <div className="about-prose">
                <p>
                  Modern travel has become an exercise in micromanagement. We spend weeks curating spreadsheets, cross-referencing reviews, and optimizing routes—only to arrive exhausted and detached from the present.
                </p>
                <p>
                  Raahi was born out of a desire to return quiet magic to exploration. We believe that true travel is spontaneous, sensorial, and deeply human.
                </p>
                <p>
                  By harmonizing intuitive desire with intelligent curation, we craft paths that let you focus on what truly matters: absorbing the morning light and discovering places worth remembering.
                </p>
              </div>
              <div className="about-signature-block">
                <span className="serif-headline signature-text">The Founders of Raahi</span>
                <span className="signature-sub">Generative Travel Editorial — Established 2026</span>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <footer className="editorial-footer">
        <div className="container footer-container">
          <div className="footer-top-row">
            <div className="footer-brand">
              <span className="serif-headline footer-logo">Raahi</span>
              <p className="footer-tagline">Calm, effortless travel & route discovery.</p>
            </div>

            <div className="footer-nav-columns">
              <div className="footer-col">
                <span className="footer-col-title">Navigation</span>
                <a href="#hero" className="footer-link">Home</a>
                <a href="#story-destination" className="footer-link">Destinations</a>
                <a href="#about-us" className="footer-link">About Raahi</a>
              </div>

              <div className="footer-col">
                <span className="footer-col-title">Editorial</span>
                <a href="#" className="footer-link">Field Notes</a>
                <a href="#" className="footer-link">Print Edition</a>
                <a href="#" className="footer-link">Manifesto</a>
              </div>

              <div className="footer-col">
                <span className="footer-col-title">Explore</span>
                <button onClick={() => navigate('/search')} className="footer-link-btn">Search Routes</button>
                <a href="#" className="footer-link">Privacy Policy</a>
                <a href="#" className="footer-link">Terms of Service</a>
              </div>
            </div>
          </div>

          <div className="footer-bottom-row">
            <span className="copyright-text">
              © {new Date().getFullYear()} Raahi Platform. All rights reserved. Designed for unhurried exploration.
            </span>

            <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="back-to-top-btn" aria-label="Back to top">
              <span>Back to top</span>
              <ArrowUp size={16} />
            </button>
          </div>
        </div>
      </footer>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authMode}
      />
    </AnimatedPage>
  );
}

