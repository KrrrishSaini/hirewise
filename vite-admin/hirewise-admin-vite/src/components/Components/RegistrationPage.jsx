import React, { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import "./RegistrationPage.css";
import { registerUser } from '../../lib/auth';
import { loginUser } from '../../lib/auth';
import { supabase } from '../../../lib/supabase-client';
import { COUNTRY_CODES } from '../../lib/country-codes';
import { API_BASE } from '../../lib/config';

const bulletIcons = [
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="9" fill="#0E76A8"/><path d="M5.5 9.5L8 12l4-4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="9" fill="#0E76A8"/><path d="M5.5 9.5L8 12l4-4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="9" fill="#0E76A8"/><path d="M5.5 9.5L8 12l4-4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
];

const bullets = [
  "Distinguished Research Ecosystem",
  "Competitive Fellowships & Benefits",
  "World-class Faculty & Mentorship",
];

const LOGO_SRC = "/image 2.png";

const initialState = {
  name: "",
  email: "",
  phone: "",
  countryCode: "+91",
  password: "",
  confirmPassword: "",
};

const RegistrationPage = ({ onRegistrationSuccess, onLoginSuccess }) => {
  const [form, setForm] = useState(initialState);
  const [touched, setTouched] = useState({});
  const [warning, setWarning] = useState({});
  const [fieldErrors, setFieldErrors] = useState({}); // For field-specific errors (object)
  const [generalFormError, setGeneralFormError] = useState(""); // For general form errors (string)
  const [showLogin, setShowLogin] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();

  // Validation
  const validate = {
    name: (v) => v.trim().length > 0,
    email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
    phone: (v) => /^\d{10}$/.test(v),
    password: (v) => v.length >= 6,
    confirmPassword: (v) => v === form.password,
  };

  const errorMsg = {
    name: "Name is required.",
    email: "Enter a valid email address.",
    phone: "Enter a valid phone number.",
    password: "Password must be at least 6 characters.",
    confirmPassword: "Passwords do not match.",
  };

  const fields = ["name", "email", "phone", "password", "confirmPassword"];

  // Check if previous field is valid
  const isFieldEnabled = (field) => {
    const idx = fields.indexOf(field);
    if (idx === 0) return true;
    const prev = fields[idx - 1];
    return validate[prev](form[prev]);
  };

  // Handle input change
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // For name field, only allow letters and spaces
    if (name === 'name') {
      const filteredValue = value.replace(/[^a-zA-Z\s]/g, '');
      setForm((prev) => ({ ...prev, [name]: filteredValue }));
      setTouched((prev) => ({ ...prev, [name]: true }));
      setWarning({});
      
      const validator = validate[name];
      const newError = filteredValue && validator ? (!validator(filteredValue) ? errorMsg[name] : "") : "";
      setFieldErrors((prev) => ({
        ...prev,
        [name]: newError,
      }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
      setTouched((prev) => ({ ...prev, [name]: true }));
      setWarning({});

      // Ensure error value is a string, even if empty
      const validator = validate[name];
      const newError = value && validator ? (!validator(value) ? errorMsg[name] : "") : "";
      setFieldErrors((prev) => ({
        ...prev,
        [name]: newError,
      }));
    }

    setGeneralFormError(""); // Clear general error on input change
  };

  // Handle focus
  const handleFocus = (field) => {
    if (!isFieldEnabled(field)) {
      setWarning((prev) => ({ ...prev, [field]: true }));
    } else {
      setWarning((prev) => ({ ...prev, [field]: false }));
    }
  };

  // Form valid for registration
  const isRegistrationFormValid =
    fields.every((f) => validate[f](form[f])) &&
    fields.every((f) => !fieldErrors[f]);

  // Handle registration submit
  const handleRegistrationSubmit = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    // Prevent double-submit
    if (isSubmitting) {
      console.log('Already submitting, ignoring click');
      return;
    }
    
    console.log('Registration button clicked - starting validation');
    setGeneralFormError(""); // Clear any previous general form error

    // Mark all fields as touched to show validation errors
    const allTouched = fields.reduce((acc, f) => ({ ...acc, [f]: true }), {});
    setTouched(allTouched);

    if (form.password !== form.confirmPassword) {
      console.log('Password mismatch');
      setGeneralFormError('Passwords do not match');
      return;
    }

    if (!isRegistrationFormValid) {
      console.log('Form validation failed');
      setGeneralFormError('Please fill in all required fields correctly');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // 1) Register user via backend API
      const result = await registerUser({
        name: form.name,
        email: form.email,
        phone: `${form.countryCode} ${form.phone}`,
        password: form.password
      });
      
      // Clear any previous errors
      setGeneralFormError('');
      
      // 2) Wait for Supabase to fully process the user creation
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // 3) Sign in on the frontend to create session (with retry)
      let loginSuccess = false;
      let lastError = null;
      
      for (let attempt = 0; attempt < 3; attempt++) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: form.email,
          password: form.password
        });
        
        if (!error && data?.session) {
          loginSuccess = true;
          break;
        }
        
        lastError = error;
        // Wait before retry
        if (attempt < 2) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      if (!loginSuccess) {
        console.error('Auto-login failed:', lastError);
        throw new Error('Registration succeeded but automatic login failed. Please login manually.');
      }
      
      // 4) Navigate to application form
      navigate('/application');
    } catch (err) {
      console.error('Registration error:', err);
      const errorMessage = err.message || 'Registration failed';
      
      // Show user-friendly messages for common errors
      if (errorMessage.includes('timeout') || errorMessage.includes('fetch')) {
        setGeneralFormError('Connection issue. Please check your internet and try again.');
      } else if (errorMessage.includes('422')) {
        setGeneralFormError('Please check all fields are filled correctly.');
      } else if (errorMessage.includes('already registered') || errorMessage.includes('already exists') || errorMessage.includes('already in use')) {
        setGeneralFormError('This email is already registered. Please login instead.');
      } else if (errorMessage.includes('rate limit') || errorMessage.includes('too many')) {
        setGeneralFormError('Too many attempts. Please wait a minute and try again.');
      } else {
        setGeneralFormError(errorMessage);
      }
      
      setIsSubmitting(false);
    }
  };

  // State and Handlers for Login
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [serverReady, setServerReady] = useState(false);
  const [serverChecking, setServerChecking] = useState(true);

  // Wake up server on page load
  useEffect(() => {
    const wakeUpServer = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 45000);
        
        const response = await fetch(`${API_BASE}/api`, {
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          setServerReady(true);
        }
      } catch (err) {
        console.log('Server wake-up in progress...');
        // Server is still waking, but that's ok - we tried
      } finally {
        setServerChecking(false);
      }
    };
    
    wakeUpServer();
  }, []);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    
    // Prevent double-submit
    if (isLoggingIn) return;
    
    setLoginError(''); // Clear any previous login error
    setIsLoggingIn(true);
    
    try {
      await loginUser({
        username: loginUsername,
        password: loginPassword
      });
      if (onLoginSuccess) onLoginSuccess();
      else navigate('/application');
    } catch (err) {
      setLoginError(err.message || 'Invalid email/phone or password');
      setIsLoggingIn(false);
    }
  };

  return (
    <div className={`figma-bg ${darkMode ? 'dark-mode' : ''}`}>
      {/* Theme Toggle Button */}
      <button 
        onClick={() => setDarkMode(!darkMode)}
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          width: '50px',
          height: '50px',
          borderRadius: '50%',
          border: 'none',
          background: darkMode ? '#fff' : '#1a2c47',
          color: darkMode ? '#1a2c47' : '#fff',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 1000,
          transition: 'all 0.3s ease'
        }}
        title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      >
        {darkMode ? '☀️' : '🌙'}
      </button>
      
      <div className="figma-container">
        {/* Left */}
        <div className="figma-left">
          <img src={LOGO_SRC} alt="BML Munjal University" className="figma-logo" />
          <div className="figma-hirewise">HIREWISE</div>
          <h1 className="figma-heading">APPLICATIONS FOR FACULTY & STAFF POSITIONS — NOW OPEN</h1>
          <div className="figma-italic-row">
            <span className="figma-italic-bar"></span>
            <span className="figma-italic">Inspiring Research. Empowering Educators.</span>
          </div>
          <p className="figma-desc">Join BML Munjal University's thriving academic community. Advance your research, inspire the next generation, and shape the future with us.</p>
          <ul className="figma-bullets">
            {bullets.map((b, i) => (
              <li key={b}><span className="figma-bullet-icon">{bulletIcons[i]}</span>{b}</li>
            ))}
          </ul>
        </div>
        {/* Right */}
        <div className="figma-right">
          {showLogin ? (
            <div className="figma-card">
              <button className="figma-back-btn" onClick={() => setShowLogin(false)}>
                <span className="figma-login-icon"><svg width="16" height="16" fill="none" viewBox="0 0 16 16"><path d="M10 12l-4-4 4-4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><rect x="2" y="3" width="12" height="10" rx="2" stroke="#fff" strokeWidth="1.5" /></svg></span>
                Back to Register
              </button>

              <div className="figma-card-title">
                <span className="figma-user-icon"><svg width="20" height="20" fill="none" viewBox="0 0 20 20"><circle cx="10" cy="10" r="10" fill="#0E76A8" /><path d="M10 10.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM6.5 15v-1a3.5 3.5 0 017 0v1" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" /></svg></span>
                Login
              </div>

              <form className="figma-form" onSubmit={handleLoginSubmit} autoComplete="off">
                <div className="figma-form-group">
                  <label htmlFor="loginUsername" style={{ display: 'block', marginBottom: '8px', color: '#007bff', fontSize: '1rem', fontWeight: '600' }}>Email Address</label>
                  <input 
                    className="figma-input" 
                    type="text" 
                    name="loginUsername" 
                    id="loginUsername" 
                    value={loginUsername} 
                    onChange={(e) => setLoginUsername(e.target.value)} 
                    required 
                    autoComplete="off" 
                    placeholder="Enter your email"
                    style={{ 
                      fontSize: '1rem', 
                      padding: '14px 16px',
                      border: '2px solid #9ca3af',
                      borderRadius: '12px',
                      backgroundColor: '#ffffff',
                      color: '#1a2c47'
                    }}
                  />
                </div>

                <div className="figma-form-group">
                  <label htmlFor="loginPassword" style={{ display: 'block', marginBottom: '8px', color: '#007bff', fontSize: '1rem', fontWeight: '600' }}>Password</label>
                  <input 
                    className="figma-input" 
                    type="password" 
                    name="loginPassword" 
                    id="loginPassword" 
                    value={loginPassword} 
                    onChange={(e) => setLoginPassword(e.target.value)} 
                    required 
                    autoComplete="off" 
                    placeholder="Enter your password"
                    style={{ 
                      fontSize: '1rem', 
                      padding: '14px 16px',
                      border: '2px solid #9ca3af',
                      borderRadius: '12px',
                      backgroundColor: '#ffffff',
                      color: '#1a2c47'
                    }}
                  />
                </div>
                {loginError && <div className="figma-error">{loginError}</div>}
                <button 
                  className="figma-apply-btn" 
                  type="submit"
                  disabled={isLoggingIn}
                  style={{
                    cursor: isLoggingIn ? 'wait' : 'pointer',
                    opacity: isLoggingIn ? 0.7 : 1,
                  }}
                >
                  {isLoggingIn ? (
                    <>
                      <span style={{
                        display: 'inline-block',
                        width: '14px',
                        height: '14px',
                        border: '2px solid #ffffff',
                        borderTop: '2px solid transparent',
                        borderRadius: '50%',
                        animation: 'spin 0.6s linear infinite',
                        marginRight: '8px',
                      }}></span>
                      LOGGING IN...
                    </>
                  ) : (
                    <>
                      <span className="figma-send-icon"><svg width="18" height="18" fill="none" viewBox="0 0 18 18"><path d="M3 15l12-6-12-6v5l8 1-8 1v5z" fill="#fff"/></svg></span>
                      LOGIN
                    </>
                  )}
                </button>
              </form>
            </div>
          ) : (
            <div className="figma-card">
              <div className="figma-card-title">
                <span className="figma-user-icon"><svg width="20" height="20" fill="none" viewBox="0 0 20 20"><circle cx="10" cy="10" r="10" fill="#0E76A8"/><path d="M10 10.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM6.5 15v-1a3.5 3.5 0 017 0v1" stroke="#fff" strokeWidth="1.2" strokeLinecap="round"/></svg></span>
                Registration Form
              </div>
              <form className="figma-form" onSubmit={handleRegistrationSubmit} autoComplete="off" key="registration-form">
                {/* Name */}
                <div className="figma-form-group">
                  <label htmlFor="name" className="figma-label-blue">Full Name</label>
                  <div className={`figma-float-label ${form.name ? "filled" : ""}`}>
                    <input className="figma-input" type="text" name="name" id="name" value={form.name} onChange={handleChange} onFocus={() => handleFocus("name")} autoComplete="new-password" placeholder=" " pattern="[a-zA-Z\s]+" title="Name should only contain letters and spaces" />
                  </div>
                  <div className="figma-warning">{warning.name && !isFieldEnabled("name") && "⚠ Please fill out the previous field first."}</div>
                  {touched.name && fieldErrors.name && typeof fieldErrors.name === 'string' && <div className="figma-error">{fieldErrors.name}</div>}
                </div>
                {/* Email */}
                <div className="figma-form-group">
                  <div className="figma-input-with-label">
                    <label htmlFor="email" className="figma-label-blue">Email Address</label>
                    <div className={`figma-float-label ${form.email ? "filled" : ""}`}>
                      <input className="figma-input" type="email" name="email" id="email" value={form.email} onChange={handleChange} onFocus={() => handleFocus("email")} disabled={!isFieldEnabled("email")} autoComplete="off" placeholder=" " />
                    </div>
                  </div>
                  <div className="figma-warning">{warning.email && !isFieldEnabled("email") && "⚠ Please fill out the previous field first."}</div>
                  {touched.email && fieldErrors.email && typeof fieldErrors.email === 'string' && <div className="figma-error">{fieldErrors.email}</div>}
                </div>
                {/* Phone */}
                <div className="figma-form-group">
                  <div className="figma-phone-row">
                    <div className="figma-country-code">
                      <label htmlFor="countryCode" className="figma-label-blue">Country Code</label>
                      <select
                        className="figma-country-select"
                        name="countryCode"
                        id="countryCode"
                        value={form.countryCode}
                        onChange={handleChange}
                      >
                        {COUNTRY_CODES.map((c) => (
                          <option key={c.code} value={c.code}>{c.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="figma-phone-input-wrap">
                      <label htmlFor="phone" className="figma-label-blue">Mobile Number</label>
                      <div className={`figma-float-label ${form.phone ? "filled" : ""}`}>
                        <input className="figma-input figma-phone-input" type="tel" name="phone" id="phone" value={form.phone} onChange={handleChange} onFocus={() => handleFocus("phone")} disabled={!isFieldEnabled("phone")} autoComplete="off" maxLength={10} placeholder=" " />
                      </div>
                    </div>
                  </div>
                  <div className="figma-warning">{warning.phone && !isFieldEnabled("phone") && "⚠ Please fill out the previous field first."}</div>
                  {touched.phone && fieldErrors.phone && typeof fieldErrors.phone === 'string' && <div className="figma-error">{fieldErrors.phone}</div>}
                </div>
                {/* Password */}
                <div className="figma-form-group">
                  <div className="figma-input-with-label">
                    <label htmlFor="password" className="figma-label-blue">Create Password</label>
                    <div className={`figma-float-label ${form.password ? "filled" : ""}`}>
                      <input
                        className="figma-input figma-input-toggle"
                        type={showPassword ? "text" : "password"}
                        name="password"
                        id="password"
                        value={form.password}
                        onChange={handleChange}
                        onFocus={() => handleFocus("password")}
                        disabled={!isFieldEnabled("password")}
                        autoComplete="off"
                        placeholder=" "
                      />
                      <button
                        type="button"
                        className="figma-eye-toggle"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        aria-pressed={showPassword}
                        onClick={() => setShowPassword(prev => !prev)}
                      >
                        {showPassword ? (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1 1l22 22" />
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-5 0-9.27-3.11-11-8 1-2.73 2.92-4.93 5.21-6.27" />
                            <path d="M9.88 9.88a3 3 0 0 0 4.24 4.24" />
                            <path d="M14.12 14.12 20 20" />
                          </svg>
                        ) : (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="figma-password-hint">
                    Use 8+ characters with a mix of uppercase, lowercase, number, and special character.
                  </div>
                  <div className="figma-warning">{warning.password && !isFieldEnabled("password") && "⚠ Please fill out the previous field first."}</div>
                  {touched.password && fieldErrors.password && typeof fieldErrors.password === 'string' && <div className="figma-error">{fieldErrors.password}</div>}
                </div>
                {/* Confirm Password */}
                <div className="figma-form-group">
                  <div className="figma-input-with-label">
                    <label htmlFor="confirmPassword" className="figma-label-blue">Confirm Password</label>
                    <div className={`figma-float-label ${form.confirmPassword ? "filled" : ""}`}>
                      <input
                        className="figma-input figma-input-toggle"
                        type={showConfirmPassword ? "text" : "password"}
                        name="confirmPassword"
                        id="confirmPassword"
                        value={form.confirmPassword}
                        onChange={handleChange}
                        onFocus={() => handleFocus("confirmPassword")}
                        disabled={!isFieldEnabled("confirmPassword")}
                        autoComplete="off"
                        placeholder=" "
                      />
                      <button
                        type="button"
                        className="figma-eye-toggle"
                        aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                        aria-pressed={showConfirmPassword}
                        onClick={() => setShowConfirmPassword(prev => !prev)}
                      >
                        {showConfirmPassword ? (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1 1l22 22" />
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-5 0-9.27-3.11-11-8 1-2.73 2.92-4.93 5.21-6.27" />
                            <path d="M9.88 9.88a3 3 0 0 0 4.24 4.24" />
                            <path d="M14.12 14.12 20 20" />
                          </svg>
                        ) : (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="figma-warning">{warning.confirmPassword && !isFieldEnabled("confirmPassword") && "⚠ Please fill out the previous field first."}</div>
                  {touched.confirmPassword && fieldErrors.confirmPassword && typeof fieldErrors.confirmPassword === 'string' && <div className="figma-error">{fieldErrors.confirmPassword}</div>}
                </div>
                {generalFormError && <div className="figma-error">{generalFormError}</div>}
                <button 
                  className="figma-apply-btn" 
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleRegistrationSubmit}
                  style={{
                    cursor: isSubmitting ? 'wait' : 'pointer',
                    opacity: isSubmitting ? 0.7 : 1,
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <span style={{
                        display: 'inline-block',
                        width: '14px',
                        height: '14px',
                        border: '2px solid #ffffff',
                        borderTop: '2px solid transparent',
                        borderRadius: '50%',
                        animation: 'spin 0.6s linear infinite',
                        marginRight: '8px',
                      }}></span>
                      Creating your account...
                    </>
                  ) : (
                    <>
                      <span className="figma-send-icon"><svg width="18" height="18" fill="none" viewBox="0 0 18 18"><path d="M3 15l12-6-12-6v5l8 1-8 1v5z" fill="#fff"/></svg></span>
                      APPLY NOW
                    </>
                  )}
                </button>
                <p className="auth-link">
                  Already have an account?
                  <button className="figma-login-btn-inline" type="button" onClick={() => setShowLogin(true)}>
                    LOGIN
                  </button>
                </p>
              </form>
            </div>
          )}
        </div>
      </div>
      <footer className="figma-footer">
        <div className="figma-footer-content">
          <img src={LOGO_SRC} alt="BML Munjal University" className="figma-footer-logo" />
          <span className="figma-footer-text">© 2026 BML Munjal University. All rights reserved.</span>
          <div className="figma-footer-links">
            <a href="#">Privacy Policy</a>
            <a href="#">Contact Us</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default RegistrationPage;
