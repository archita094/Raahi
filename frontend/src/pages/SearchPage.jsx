import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin,
  Navigation,
  ArrowUpDown,
  ArrowRight,
  Loader2,
  Crosshair,
  Sparkles,
  Clock,
  Zap,
  Bus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AnimatedPage from '../components/AnimatedPage';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { MOCK_LOCATIONS } from '../data/mockJourneys';
import { searchPlacesFree } from '../services/freeGeocoder';
import '../styles/SearchPage.css';

export default function SearchPage() {
  const navigate = useNavigate();

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

  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [timingMode, setTimingMode] = useState('now');
  const [departureTime, setDepartureTime] = useState(getIndiaTimeString());
  const [originCoords, setOriginCoords] = useState(null);
  const [destCoords, setDestCoords] = useState(null);
  const [originSuggestions, setOriginSuggestions] = useState(MOCK_LOCATIONS.slice(0, 6));
  const [destSuggestions, setDestSuggestions] = useState(MOCK_LOCATIONS.slice(0, 6));
  const [showOriginSuggestions, setShowOriginSuggestions] = useState(false);
  const [showDestSuggestions, setShowDestSuggestions] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  const originInputRef = useRef(null);
  const destInputRef = useRef(null);
  const originWrapperRef = useRef(null);
  const destWrapperRef = useRef(null);

  const formatTimeDisplay = (timeVal) => {
    if (!timeVal) return '';
    const [h, m] = timeVal.split(':');
    let hours = parseInt(h, 10);
    if (isNaN(hours)) return timeVal;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${String(hours).padStart(2, '0')}:${m} ${ampm}`;
  };

  const handleSetCheckNow = () => {
    setTimingMode('now');
    setDepartureTime(getIndiaTimeString());
  };

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      searchPlacesFree(origin).then((places) => {
        if (active) {
          setOriginSuggestions(places || []);
        }
      });
    }, 120);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [origin]);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      searchPlacesFree(destination).then((places) => {
        if (active) {
          setDestSuggestions(places || []);
        }
      });
    }, 120);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [destination]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (originWrapperRef.current && !originWrapperRef.current.contains(event.target)) {
        setShowOriginSuggestions(false);
      }
      if (destWrapperRef.current && !destWrapperRef.current.contains(event.target)) {
        setShowDestSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setErrorMsg('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    setErrorMsg('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setOriginCoords({ latitude, longitude });
        setOrigin(`Current Location (${latitude.toFixed(3)}, ${longitude.toFixed(3)})`);
        setShowOriginSuggestions(false);
        setIsLocating(false);
      },
      (error) => {
        console.warn('Geolocation error:', error.message);
        setOrigin('Sector 17 ISBT, Chandigarh');
        setShowOriginSuggestions(false);
        setIsLocating(false);
        setErrorMsg('Live GPS unavailable. Defaulted to Sector 17 ISBT.');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleSwap = () => {
    const tempOrigin = origin;
    const tempCoords = originCoords;
    setOrigin(destination);
    setOriginCoords(destCoords);
    setDestination(tempOrigin);
    setDestCoords(tempCoords);
    setErrorMsg('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!origin.trim()) {
      setErrorMsg('Please enter or select a starting point.');
      return;
    }
    if (!destination.trim()) {
      setErrorMsg('Please enter or select a destination.');
      return;
    }
    if (origin.trim().toLowerCase() === destination.trim().toLowerCase()) {
      setErrorMsg('Starting point and destination cannot be identical.');
      return;
    }

    setErrorMsg('');
    setIsLoading(true);

    let queryUrl = `/results?from=${encodeURIComponent(origin.trim())}&to=${encodeURIComponent(destination.trim())}`;
    queryUrl += `&mode=${encodeURIComponent(timingMode)}`;
    const effectiveTime = timingMode === 'now' ? getIndiaTimeString() : departureTime;
    if (effectiveTime) {
      queryUrl += `&time=${encodeURIComponent(effectiveTime)}`;
    }
    if (originCoords && origin.toLowerCase().includes('current location')) {
      queryUrl += `&fromLat=${originCoords.latitude}&fromLng=${originCoords.longitude}`;
    }

    setTimeout(() => {
      setIsLoading(false);
      navigate(queryUrl);
    }, 300);
  };

  return (
    <AnimatedPage className="search-page-wrapper">
      <Navbar />

      <main className="search-main-content">
        <div className="container search-container">

          <motion.div
            className="search-header-section"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
          >

            <h1 className="search-hero-title">
              Where are you <span className="title-gradient-accent">going?</span>
            </h1>
            <p className="search-hero-subtitle">
              Plan comfortable, seamless transit across Chandigarh Tricity with live CTU bus tracking.
            </p>

            <div className="google-maps-badge">
              <MapPin size={13} />
              <span>OpenStreetMap & Tricity Network • 100% Free Live Map</span>
              <span className="dot-live" />
            </div>
          </motion.div>

          <div className="search-stage-layout">
            <motion.div
              className="search-card-container"
              initial={{ opacity: 0, y: 25, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
            >
              <form onSubmit={handleSubmit} className="search-form">

                <div className="input-group-wrapper" ref={originWrapperRef}>
                  <div className="input-label-row">
                    <label htmlFor="origin-input" className="input-field-label">
                      Starting point
                    </label>
                    <button
                      type="button"
                      onClick={handleUseCurrentLocation}
                      className="current-location-btn"
                    >
                      {isLocating ? <Loader2 size={13} className="animate-spin" /> : <Crosshair size={13} />}
                      <span>{isLocating ? 'Locating...' : 'Use my current location'}</span>
                    </button>
                  </div>

                  <div className={`input-field-box ${errorMsg && !origin ? 'has-error' : ''}`}>
                    <MapPin className="field-icon origin-icon" size={20} />
                    <input
                      ref={originInputRef}
                      id="origin-input"
                      type="text"
                      placeholder="Type address, sector (e.g. Sector 17), or landmark..."
                      value={origin}
                      onChange={(e) => {
                        setOrigin(e.target.value);
                        setShowOriginSuggestions(true);
                        setErrorMsg('');
                      }}
                      onFocus={() => setShowOriginSuggestions(true)}
                      autoComplete="off"
                    />
                    {origin && (
                      <button
                        type="button"
                        className="clear-input-btn"
                        onClick={() => {
                          setOrigin('');
                          setOriginCoords(null);
                        }}
                        aria-label="Clear starting point"
                      >
                        ×
                      </button>
                    )}
                  </div>

                  <AnimatePresence>
                    {showOriginSuggestions && (
                      <motion.ul
                        className="autocomplete-dropdown"
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.18 }}
                      >
                        {originSuggestions.length === 0 && origin.trim() ? (
                          <li
                            className="autocomplete-item"
                            onClick={() => {
                              setShowOriginSuggestions(false);
                              setErrorMsg('');
                            }}
                          >
                            <div className="item-icon-circle">
                              <MapPin size={15} />
                            </div>
                            <div className="item-text-stack">
                              <span className="item-name">{origin}</span>
                              <span className="item-detail">Use this address as starting point</span>
                            </div>
                          </li>
                        ) : (
                          originSuggestions.map((loc, idx) => (
                            <li
                              key={loc.id || `orig-${idx}`}
                              className="autocomplete-item"
                              onClick={() => {
                                setOrigin(loc.name);
                                if (loc.lat && loc.lng) {
                                  setOriginCoords({
                                    latitude: loc.lat,
                                    longitude: loc.lng
                                  });
                                }
                                setShowOriginSuggestions(false);
                                setErrorMsg('');
                              }}
                            >
                              <div className="item-icon-circle">
                                <MapPin size={15} />
                              </div>
                              <div className="item-text-stack">
                                <span className="item-name">{loc.name}</span>
                                <span className="item-detail">{loc.detail || 'Chandigarh Tricity'}</span>
                              </div>
                            </li>
                          ))
                        )}
                      </motion.ul>
                    )}
                  </AnimatePresence>
                </div>

                <div className="swap-divider-container">
                  <div className="swap-line" />
                  <motion.button
                    type="button"
                    onClick={handleSwap}
                    className="swap-action-btn"
                    whileHover={{ scale: 1.12, rotate: 180 }}
                    whileTap={{ scale: 0.92 }}
                    title="Swap starting point and destination"
                    aria-label="Swap starting point and destination"
                  >
                    <ArrowUpDown size={17} />
                  </motion.button>
                  <div className="swap-line" />
                </div>

                <div className="input-group-wrapper" ref={destWrapperRef}>
                  <div className="input-label-row">
                    <label htmlFor="destination-input" className="input-field-label">
                      Destination
                    </label>
                  </div>

                  <div className={`input-field-box ${errorMsg && !destination ? 'has-error' : ''}`}>
                    <Navigation className="field-icon dest-icon" size={20} />
                    <input
                      ref={destInputRef}
                      id="destination-input"
                      type="text"
                      placeholder="e.g. Elante Mall or Sector 43 ISBT"
                      value={destination}
                      onChange={(e) => {
                        setDestination(e.target.value);
                        setShowDestSuggestions(true);
                        setErrorMsg('');
                      }}
                      onFocus={() => setShowDestSuggestions(true)}
                      autoComplete="off"
                    />
                    {destination && (
                      <button
                        type="button"
                        className="clear-input-btn"
                        onClick={() => {
                          setDestination('');
                          setDestCoords(null);
                        }}
                        aria-label="Clear destination"
                      >
                        ×
                      </button>
                    )}
                  </div>

                  <AnimatePresence>
                    {showDestSuggestions && (
                      <motion.ul
                        className="autocomplete-dropdown"
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.18 }}
                      >
                        {destSuggestions.length === 0 && destination.trim() ? (
                          <li
                            className="autocomplete-item"
                            onClick={() => {
                              setShowDestSuggestions(false);
                              setErrorMsg('');
                            }}
                          >
                            <div className="item-icon-circle dest-circle">
                              <Navigation size={15} />
                            </div>
                            <div className="item-text-stack">
                              <span className="item-name">{destination}</span>
                              <span className="item-detail">Use this address as destination</span>
                            </div>
                          </li>
                        ) : (
                          destSuggestions.map((loc, idx) => (
                            <li
                              key={loc.id || `dest-${idx}`}
                              className="autocomplete-item"
                              onClick={() => {
                                setDestination(loc.name);
                                if (loc.lat && loc.lng) {
                                  setDestCoords({
                                    latitude: loc.lat,
                                    longitude: loc.lng
                                  });
                                }
                                setShowDestSuggestions(false);
                                setErrorMsg('');
                              }}
                            >
                              <div className="item-icon-circle dest-circle">
                                <Navigation size={15} />
                              </div>
                              <div className="item-text-stack">
                                <span className="item-name">{loc.name}</span>
                                <span className="item-detail">{loc.detail || 'Chandigarh Tricity'}</span>
                              </div>
                            </li>
                          ))
                        )}
                      </motion.ul>
                    )}
                  </AnimatePresence>
                </div>

                <div className="input-group-wrapper timing-toggle-container">
                  <div className="input-label-row">
                    <label className="input-field-label">
                      When are you traveling?
                    </label>
                    {timingMode === 'now' && (
                      <span className="timing-ist-badge">
                        <span className="live-dot" /> Live IST: {formatTimeDisplay(getIndiaTimeString())}
                      </span>
                    )}
                  </div>

                  <div className="timing-pills-row">
                    <button
                      type="button"
                      className={`timing-pill-btn ${timingMode === 'now' ? 'active' : ''}`}
                      onClick={handleSetCheckNow}
                    >
                      <Zap size={16} />
                      <span>Check for Now</span>
                    </button>
                    <button
                      type="button"
                      className={`timing-pill-btn ${timingMode === 'later' ? 'active' : ''}`}
                      onClick={() => setTimingMode('later')}
                    >
                      <Clock size={16} />
                      <span>Check for Later</span>
                    </button>
                  </div>

                  <AnimatePresence>
                    {timingMode === 'later' && (
                      <motion.div
                        className="later-time-picker-row"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <span className="time-picker-label">
                          <Clock size={16} />
                          Select Departure Time (IST):
                        </span>
                        <input
                          type="time"
                          value={departureTime}
                          onChange={(e) => setDepartureTime(e.target.value)}
                          className="custom-time-input"
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {errorMsg && (
                  <div className="search-error-banner">
                    <span>{errorMsg}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="search-submit-btn"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      <span>Planning Journey...</span>
                    </>
                  ) : (
                    <>
                      <span>Find My Journey</span>
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          </div>

          <div className="popular-journeys-container">
            <div className="popular-header-row">
              <div className="popular-header-line" />
              <span className="popular-header-title">Popular Tricity Corridors</span>
            </div>

            <div className="popular-cards-grid">
              {[
                { tag: 'Most Frequent', from: 'Sector 17 ISBT', to: 'Sector 43 ISBT', mins: 22 },
                { tag: 'Student Corridor', from: 'PU Campus', to: 'Elante Mall', mins: 36 },
                { tag: 'Direct Line', from: 'Railway Station', to: 'Phase 8 Mohali', mins: 45 }
              ].map((p, i) => (
                <div
                  key={i}
                  className="popular-card"
                  onClick={() => {
                    setOrigin(p.from);
                    setDestination(p.to);
                    setErrorMsg('');
                  }}
                >
                  <div>
                    <span className="popular-card-tag">{p.tag}</span>
                    <div className="popular-card-route">
                      <span>{p.from}</span>
                      <span>→</span>
                      <span>{p.to}</span>
                    </div>
                  </div>
                  <div className="popular-card-mins">
                    <span>~{p.mins} mins</span>
                    <div className="popular-arrow-icon">
                      <ArrowRight size={13} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </AnimatedPage>
  );
}

