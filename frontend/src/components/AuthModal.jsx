import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight } from 'lucide-react';
import '../styles/AuthModal.css';

export default function AuthModal({ isOpen, onClose, initialMode = 'login' }) {
  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      onClose();
    }, 1500);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="auth-modal-backdrop" onClick={onClose}>
        <motion.div
          className="auth-modal-card"
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, y: 20, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 15, scale: 0.96 }}
          transition={{ duration: 0.35, ease: [0.25, 1, 0.35, 1] }}
        >
          <button className="auth-modal-close" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>

          <div className="auth-modal-header">
            <span className="editorial-tag">RAAHI DISCOVERY</span>
            <h3 className="serif-headline auth-modal-title">
              {mode === 'login' ? 'Welcome Back' : 'Begin Your Journey'}
            </h3>
            <p className="auth-modal-subtitle">
              {mode === 'login'
                ? 'Sign in to access your saved moments & journeys.'
                : 'Create an account to explore effortless, curated travels.'}
            </p>
          </div>

          {submitted ? (
            <motion.div
              className="auth-success-message"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <span className="serif-headline success-title">
                {mode === 'login' ? 'Signed In' : 'Account Created'}
              </span>
              <p>Welcome to Raahi. Taking you to your personal space...</p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="auth-modal-form">
              {mode === 'signup' && (
                <div className="form-group">
                  <label htmlFor="auth-name">Full Name</label>
                  <input
                    id="auth-name"
                    type="text"
                    required
                    placeholder="E.g., Eleanor Vance"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              )}

              <div className="form-group">
                <label htmlFor="auth-email">Email Address</label>
                <input
                  id="auth-email"
                  type="email"
                  required
                  placeholder="name@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="auth-password">Password</label>
                <input
                  id="auth-password"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <button type="submit" className="auth-submit-btn">
                <span>{mode === 'login' ? 'Sign In' : 'Create Account'}</span>
                <ArrowRight size={16} />
              </button>
            </form>
          )}

          <div className="auth-modal-footer">
            {mode === 'login' ? (
              <p>
                Don't have an account?{' '}
                <button type="button" onClick={() => setMode('signup')} className="auth-switch-btn">
                  Sign Up
                </button>
              </p>
            ) : (
              <p>
                Already have an account?{' '}
                <button type="button" onClick={() => setMode('login')} className="auth-switch-btn">
                  Sign In
                </button>
              </p>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

