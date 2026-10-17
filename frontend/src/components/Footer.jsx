import React from 'react';
import { ArrowUp } from 'lucide-react';
import '../styles/LandingPage.css';

export default function Footer() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="editorial-footer">
      <div className="container footer-container">
        <div className="footer-top-row">
          <div className="footer-brand">
            <span className="serif-headline footer-logo">Raahi</span>
            <p className="footer-tagline">
              Calm, effortless travel & route discovery.
            </p>
          </div>

          <div className="footer-nav-columns">
            <div className="footer-col">
              <span className="footer-col-title">Navigation</span>
              <a href="#why-us" className="footer-link">Why Us</a>
              <a href="#about-us" className="footer-link">About Us</a>
              <a href="#story-destination" className="footer-link">Destinations</a>
              <a href="#contact" className="footer-link">Contact</a>
            </div>

            <div className="footer-col">
              <span className="footer-col-title">Editorial</span>
              <a href="#" className="footer-link">Field Notes</a>
              <a href="#" className="footer-link">Print Edition</a>
              <a href="#" className="footer-link">Manifesto</a>
            </div>

            <div className="footer-col">
              <span className="footer-col-title">Legal & Contact</span>
              <a href="#contact" className="footer-link">Concierge</a>
              <a href="#" className="footer-link">Privacy Policy</a>
              <a href="#" className="footer-link">Terms of Service</a>
            </div>
          </div>
        </div>

        <div className="footer-bottom-row">
          <span className="copyright-text">
            © {new Date().getFullYear()} Raahi Platform. All rights reserved. Designed for unhurried exploration.
          </span>

          <button onClick={scrollToTop} className="back-to-top-btn" aria-label="Back to top">
            <span>Back to top</span>
            <ArrowUp size={16} />
          </button>
        </div>
      </div>
    </footer>
  );
}

