import React from 'react';
import '../styles/FloatingAmbientBackground.css';

export default function FloatingAmbientBackground({ variant = 'default' }) {
  return (
    <div className="floating-ambient-bg" aria-hidden="true">

      <div className="ambient-grid-overlay" />

      <div className="ambient-orb orb-cyan" />
      <div className="ambient-orb orb-blue" />
      <div className="ambient-orb orb-purple" />
      <div className="ambient-orb orb-emerald" />

      <div className="floating-shapes-container">
        <div className="geo-shape geo-ring-1" />
        <div className="geo-shape geo-ring-2" />
        <div className="geo-shape geo-diamond-1" />
        <div className="geo-shape geo-diamond-2" />

        <svg className="geo-transit-stream" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" viewBox="0 0 1440 900">
          <defs>
            <linearGradient id="transitGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#3B82F6" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#A855F7" stopOpacity="0.8" />
            </linearGradient>
            <linearGradient id="transitGradient2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.7" />
              <stop offset="70%" stopColor="#06B6D4" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.6" />
            </linearGradient>
          </defs>
          <path
            d="M-50,200 C300,100 600,450 950,250 C1200,120 1350,300 1500,220"
            className="transit-stream-path"
          />
          <path
            d="M-50,650 C250,750 550,500 900,700 C1200,850 1380,620 1500,680"
            className="transit-stream-path"
            style={{ stroke: 'url(#transitGradient2)', animationDuration: '45s' }}
          />
        </svg>
      </div>
    </div>
  );
}

