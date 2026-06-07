import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import api from '../../services/api';
import AuthLayout from '../../components/layout/AuthLayout';
import { AlertCircle, ArrowRight, ArrowLeft, ShieldAlert } from 'lucide-react';

/* ─── Liquid Metal CTA Button ─── */
const LiquidButton = ({ children, onClick, disabled, type = 'submit' }) => {
  const btnRef = useRef(null);
  const [particles, setParticles] = useState([]);
  const [ripples, setRipples] = useState([]);

  const handleClick = (e) => {
    // Ripple
    const rect = btnRef.current.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    setRipples((p) => [...p, { x: e.clientX - rect.left - size / 2, y: e.clientY - rect.top - size / 2, size, id: Date.now() }]);

    // Particle burst
    const burst = [];
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12;
      burst.push({
        id: Date.now() + i,
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        vx: Math.cos(angle) * (2 + Math.random() * 3),
        vy: Math.sin(angle) * (2 + Math.random() * 3),
        size: 1.5 + Math.random() * 2,
        life: 1,
      });
    }
    setParticles((p) => [...p, ...burst]);

    if (onClick) onClick(e);
  };

  // Animate particles
  useEffect(() => {
    if (particles.length === 0) return;
    const interval = setInterval(() => {
      setParticles((prev) =>
        prev
          .map((p) => ({ ...p, x: p.x + p.vx, y: p.y + p.vy, life: p.life - 0.04, vy: p.vy + 0.1 }))
          .filter((p) => p.life > 0)
      );
    }, 16);
    return () => clearInterval(interval);
  }, [particles.length]);

  return (
    <button
      ref={btnRef}
      type={type}
      disabled={disabled}
      onMouseDown={handleClick}
      className="relative w-full h-12 rounded-xl text-xs font-bold uppercase tracking-widest overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.02] active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none group"
      style={{
        background: 'linear-gradient(135deg, #C9A84C 0%, #e8e8e8 40%, #C9A84C 60%, #e8e8e8 100%)',
        backgroundSize: '200% 200%',
        animation: 'liquid-metal 3s ease infinite',
        color: '#050508',
      }}
    >
      {/* Surface ripple on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: 'radial-gradient(circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(255,255,255,0.25) 0%, transparent 60%)',
        }}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          e.currentTarget.style.setProperty('--mouse-x', `${((e.clientX - rect.left) / rect.width) * 100}%`);
          e.currentTarget.style.setProperty('--mouse-y', `${((e.clientY - rect.top) / rect.height) * 100}%`);
        }}
      />

      {/* Click ripples */}
      {ripples.map((r) => (
        <span
          key={r.id}
          className="absolute rounded-full bg-white/30 animate-ripple pointer-events-none"
          onAnimationEnd={() => setRipples((prev) => prev.filter((x) => x.id !== r.id))}
          style={{ left: r.x, top: r.y, width: r.size, height: r.size }}
        />
      ))}

      {/* Particle burst */}
      {particles.map((p) => (
        <span
          key={p.id}
          className="absolute rounded-full pointer-events-none"
          style={{
            left: p.x, top: p.y,
            width: p.size, height: p.size,
            background: '#C9A84C',
            opacity: p.life,
            boxShadow: `0 0 4px #C9A84C`,
          }}
        />
      ))}

      <span className="relative z-10 flex items-center justify-center gap-2">{children}</span>
    </button>
  );
};

/* ─── Neon Input Wrapper ─── */
const NeonInput = ({ icon: Icon, suffix, ...props }) => {
  const [focused, setFocused] = useState(false);

  const baseStyle = {
    display: 'flex',
    alignItems: 'center',
    height: '3rem',
    paddingLeft: Icon ? '2rem' : '1.5rem',
    paddingRight: suffix ? '5.5rem' : '1.5rem',
    borderRadius: '1.25rem',
    background: 'rgba(8, 12, 22, 0.98)',
    border: '1px solid rgba(255,255,255,0.08)',
    boxShadow: '0 20px 40px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.04)',
    transition: 'box-shadow 240ms ease, border-color 240ms ease, transform 180ms ease',
    backdropFilter: 'blur(16px)',
    overflow: 'hidden'
  };

  const focusStyle = {
    border: '1px solid rgba(144, 163, 255, 0.8)',
    boxShadow: '0 0 0 4px rgba(144, 163, 255, 0.14), inset 0 0 0 1px rgba(255,255,255,0.06)',
    transform: 'translateY(-1px)'
  };

  return (
    <div className="relative group neon-input w-full">
      <div
        className="relative w-full"
        style={{ ...(baseStyle), ...(focused ? focusStyle : {}) }}
      >
        {Icon && <Icon className="absolute left-4 h-4 w-4 text-white/30" style={{ top: '50%', transform: 'translateY(-50%)' }} />}
        <input
          {...props}
          onFocus={(e) => { setFocused(true); props.onFocus && props.onFocus(e); }}
          onBlur={(e) => { setFocused(false); props.onBlur && props.onBlur(e); }}
          className={`w-full h-full text-xs text-[#E8F4F8] font-medium bg-transparent placeholder:text-white/30 caret-[#00F5D4] focus:outline-none` + (Icon ? ' pl-6' : ' pl-1') + (suffix ? ' pr-16' : '')}
          style={{
            WebkitFontSmoothing: 'antialiased',
            backgroundColor: 'transparent',
            border: 'none',
            outline: 'none',
            color: '#E8F4F8',
            boxShadow: 'none',
            WebkitAppearance: 'none',
            MozAppearance: 'none',
            appearance: 'none'
          }}
        />
        {suffix && (
          <span 
            className="absolute right-4 text-[9px] font-extrabold tracking-wider pointer-events-none select-none"
            style={{ top: '50%', transform: 'translateY(-50%)', color: 'rgba(0,245,212,0.45)' }}
          >
            {suffix}
          </span>
        )}
      </div>

      {/* Neon underline */}
      <div
        className="absolute bottom-0 left-0 h-[2px] transition-all duration-300 ease-out"
        style={{
          width: focused ? '100%' : '0%',
          background: 'linear-gradient(90deg, #00F5D4, #7B2FBE)'
        }}
      />
    </div>
  );
};

const Login = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setAuth, tenant, setTenant } = useAuthStore();

  const [step, setStep] = useState(1);
  const [subdomain, setSubdomain] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lockoutMsg, setLockoutMsg] = useState('');

  const [ssoProvider, setSsoProvider] = useState('');
  const [ssoEmail, setSsoEmail] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState(0);

  // Registration states
  const [regOrgName, setRegOrgName] = useState('');
  const [regSubdomain, setRegSubdomain] = useState('');
  const [regFirstName, setRegFirstName] = useState('');
  const [regLastName, setRegLastName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regOtpDigits, setRegOtpDigits] = useState(['', '', '', '', '', '']);

  // Forgot Password states
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtpDigits, setForgotOtpDigits] = useState(['', '', '', '', '', '']);
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [forgotSuccessMsg, setForgotSuccessMsg] = useState('');

  useEffect(() => {
    let timer;
    if (countdown > 0) timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  useEffect(() => {
    const ssoToken = searchParams.get('token');
    const ssoError = searchParams.get('error');
    if (ssoToken) {
      setLoading(true);
      api.post('/auth/refresh').then((res) => {
        if (res.data.success) {
          if (res.data.data.tenant) {
            setTenant(res.data.data.tenant);
          }
          setAuth(res.data.data.user, ssoToken);
          navigate('/dashboard');
        }
      }).catch(() => { /* Silently ignore – no active session cookie yet */ }).finally(() => setLoading(false));
    }
    if (ssoError) setError(ssoError === 'subdomain_missing' ? 'Subdomain missing' : ssoError === 'tenant_not_found' ? 'Tenant not found' : 'SSO failed');
  }, [searchParams, setAuth, navigate]);

  useEffect(() => {
    const saved = localStorage.getItem('hrms_subdomain');
    if (saved) setSubdomain(saved);
  }, []);

  const handleRegisterOrg = async (e) => {
    e.preventDefault();
    if (!regOrgName || !regSubdomain || !regFirstName || !regLastName || !regEmail || !regPassword) {
      return setError('All registration fields are required');
    }
    setLoading(true); setError('');
    try {
      const res = await api.post('/auth/register-send-otp', {
        orgName: regOrgName,
        subdomain: regSubdomain.toLowerCase().trim(),
        adminFirstName: regFirstName,
        adminLastName: regLastName,
        adminEmail: regEmail.toLowerCase().trim(),
        adminPassword: regPassword
      });
      if (res.data.success) {
        setStep(6);
        setRegOtpDigits(['','','','','','']);
        setError('');
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Organization registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyRegisterOtp = async (e) => {
    e.preventDefault();
    const code = regOtpDigits.join('');
    if (code.length < 6) return setError('Enter 6-digit verification code');
    setLoading(true); setError('');
    try {
      const res = await api.post('/auth/register-verify-otp', {
        email: regEmail.toLowerCase().trim(),
        otpCode: code
      });
      if (res.data.success) {
        const sub = regSubdomain.toLowerCase().trim();
        setSubdomain(sub);
        localStorage.setItem('hrms_subdomain', sub);
        if (res.data.data.tenant) {
          setTenant(res.data.data.tenant);
        }
        setAuth(res.data.data.user, res.data.data.token);
        setRegOrgName('');
        setRegSubdomain('');
        setRegFirstName('');
        setRegLastName('');
        setRegEmail('');
        setRegPassword('');
        setRegOtpDigits(['','','','','','']);
        setError('');
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResendRegisterOtp = async () => {
    setLoading(true); setError('');
    try {
      const res = await api.post('/auth/register-send-otp', {
        orgName: regOrgName,
        subdomain: regSubdomain.toLowerCase().trim(),
        adminFirstName: regFirstName,
        adminLastName: regLastName,
        adminEmail: regEmail.toLowerCase().trim(),
        adminPassword: regPassword
      });
      if (res.data.success) {
        setRegOtpDigits(['','','','','','']);
        setError('');
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to resend code');
    } finally {
      setLoading(false);
    }
  };

  const handleRegOtpDigitChange = (i, v) => {
    if (!/^\d*$/.test(v)) return;
    const d = [...regOtpDigits]; d[i] = v.slice(-1); setRegOtpDigits(d);
    if (v && i < 5) document.getElementById(`reg-otp-${i + 1}`)?.focus();
  };
  const handleRegOtpKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !regOtpDigits[i] && i > 0) {
      document.getElementById(`reg-otp-${i - 1}`)?.focus();
      const d = [...regOtpDigits]; d[i - 1] = ''; setRegOtpDigits(d);
    }
  };

  const handleLookupSubdomain = async (e) => {
    e.preventDefault();
    if (!subdomain) return setError('Subdomain is required');
    setLoading(true); setError('');
    try {
      const res = await api.get(`/auth/tenant-lookup?subdomain=${subdomain}`);
      if (res.data.success) { setTenant(res.data.data); localStorage.setItem('hrms_subdomain', subdomain); setStep(2); }
    } catch (err) { setError(err.response?.data?.error?.message || 'Lookup failed'); }
    finally { setLoading(false); }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) return setError('All fields are required');
    setLoading(true); setError(''); setLockoutMsg('');
    try {
      const res = await api.post('/auth/login', { email, password, tenantId: tenant.id });
      if (res.data.success) {
        if (res.data.data.tenant) {
          setTenant(res.data.data.tenant);
        }
        setAuth(res.data.data.user, res.data.data.token);
        navigate('/dashboard');
      }
    } catch (err) {
      const ed = err.response?.data?.error;
      if (ed?.code === 'ACCOUNT_LOCKED') setLockoutMsg(ed.message);
      else setError(ed?.message || 'Authentication failed');
    } finally { setLoading(false); }
  };

  const handleSsoClick = (provider) => {
    if (!subdomain) return setError('Enter subdomain first');
    setSsoProvider(provider); setSsoEmail(''); setOtpDigits(['','','','','','']); setError(''); setStep(3);
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!ssoEmail) return setError('Email required');
    setLoading(true); setError('');
    try {
      const res = await api.post('/auth/sso/send-otp', { email: ssoEmail, provider: ssoProvider, subdomain });
      if (res.data.success) { setStep(4); setCountdown(60); setOtpDigits(['','','','','','']); }
    } catch (err) { setError(err.response?.data?.error?.message || 'Failed to send code'); }
    finally { setLoading(false); }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const code = otpDigits.join('');
    if (code.length < 6) return setError('Enter 6-digit code');
    setLoading(true); setError('');
    try {
      const res = await api.post('/auth/sso/verify-otp', { email: ssoEmail, otpCode: code, subdomain });
      if (res.data.success) {
        if (res.data.data.tenant) {
          setTenant(res.data.data.tenant);
        }
        setAuth(res.data.data.user, res.data.data.token);
        navigate('/dashboard');
      }
    } catch (err) { setError(err.response?.data?.error?.message || 'Verification failed'); }
    finally { setLoading(false); }
  };

  const handleResendOtp = async () => {
    if (countdown > 0) return;
    setLoading(true); setError('');
    try {
      const res = await api.post('/auth/sso/send-otp', { email: ssoEmail, provider: ssoProvider, subdomain });
      if (res.data.success) { setCountdown(60); setOtpDigits(['','','','','','']); }
    } catch (err) { setError(err.response?.data?.error?.message || 'Resend failed'); }
    finally { setLoading(false); }
  };

  const handleOtpDigitChange = (i, v) => {
    if (!/^\d*$/.test(v)) return;
    const d = [...otpDigits]; d[i] = v.slice(-1); setOtpDigits(d);
    if (v && i < 5) document.getElementById(`otp-${i + 1}`)?.focus();
  };
  const handleOtpKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !otpDigits[i] && i > 0) {
      document.getElementById(`otp-${i - 1}`)?.focus();
      const d = [...otpDigits]; d[i - 1] = ''; setOtpDigits(d);
    }
  };

  const handleSendForgotOtp = async (e) => {
    if (e) e.preventDefault();
    setLoading(true); setError(''); setForgotSuccessMsg('');
    try {
      const res = await api.post('/auth/forgot-password', { email: forgotEmail, subdomain });
      if (res.data.success) {
        setCountdown(60);
        setForgotOtpDigits(['', '', '', '', '', '']);
        setStep(8);
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleResendForgotOtp = async () => {
    if (countdown > 0) return;
    setLoading(true); setError(''); setForgotSuccessMsg('');
    try {
      const res = await api.post('/auth/forgot-password', { email: forgotEmail, subdomain });
      if (res.data.success) {
        setCountdown(60);
        setForgotOtpDigits(['', '', '', '', '', '']);
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Resend failed');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyForgotOtpAndReset = async (e) => {
    if (e) e.preventDefault();
    if (forgotNewPassword !== forgotConfirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (forgotNewPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    const otpCode = forgotOtpDigits.join('');
    if (otpCode.length !== 6) {
      setError('Please enter a 6-digit verification code');
      return;
    }
    setLoading(true); setError('');
    try {
      const res = await api.post('/auth/reset-password', {
        email: forgotEmail,
        subdomain,
        otpCode,
        password: forgotNewPassword
      });
      if (res.data.success) {
        setForgotSuccessMsg('Password reset successful! You can now log in with your new password.');
        setEmail(forgotEmail);
        setForgotNewPassword('');
        setForgotConfirmPassword('');
        setStep(2);
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Password reset failed');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotOtpDigitChange = (i, v) => {
    if (!/^\d*$/.test(v)) return;
    const d = [...forgotOtpDigits]; d[i] = v.slice(-1); setForgotOtpDigits(d);
    if (v && i < 5) document.getElementById(`forgot-otp-${i + 1}`)?.focus();
  };

  const handleForgotOtpKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !forgotOtpDigits[i] && i > 0) {
      document.getElementById(`forgot-otp-${i - 1}`)?.focus();
      const d = [...forgotOtpDigits]; d[i - 1] = ''; setForgotOtpDigits(d);
    }
  };

  return (
    <AuthLayout>
      {/* Header */}
      <div className="space-y-1.5 text-left">
        <h2 className="text-xl font-bold tracking-tight" style={{ color: '#E8F4F8' }}>
          {step === 1 ? 'Enter workspace' :
           step === 2 ? `Sign in to ${tenant?.name}` :
           step === 3 ? `${ssoProvider === 'google' ? 'Google' : 'Microsoft'} Sign-In` :
           step === 5 ? 'Register organization' :
           step === 6 ? 'Verify registration' :
           step === 7 ? 'Forgot Password' :
           step === 8 ? 'Reset Password' :
           'Verify Code'}
        </h2>
        <p className="text-[11px] font-normal leading-relaxed" style={{ color: 'rgba(232,244,248,0.35)' }}>
          {step === 1 ? 'Enter your organization subdomain to access your HR workspace.' :
           step === 2 ? `Secure login for ${subdomain}.hrms.local` :
           step === 3 ? 'Enter your registered email address.' :
           step === 5 ? 'Set up a new workspace and HR administrator account.' :
           step === 6 ? `Enter the 6-digit code sent to ${regEmail}.` :
           step === 7 ? 'Enter your email to receive a password reset verification code.' :
           step === 8 ? `Enter the 6-digit code sent to ${forgotEmail} and set your new password.` :
           `Enter the 6-digit code sent to ${ssoEmail}.`}
        </p>
      </div>

      {/* Alerts */}
      {lockoutMsg && (
        <div className="flex gap-2 p-3 rounded-lg text-[10.5px] font-medium text-left animate-fade-in" style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)', color: '#C9A84C' }}>
          <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{lockoutMsg}</span>
        </div>
      )}
      {error && (
        <div className="flex gap-2 p-3 rounded-lg text-[10.5px] font-medium text-left animate-fade-in" style={{ background: 'rgba(255,45,85,0.08)', border: '1px solid rgba(255,45,85,0.2)', color: '#FF2D55' }}>
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      {forgotSuccessMsg && (
        <div className="flex gap-2 p-3 rounded-lg text-[10.5px] font-medium text-left animate-fade-in" style={{ background: 'rgba(0,245,212,0.08)', border: '1px solid rgba(0,245,212,0.2)', color: '#00F5D4' }}>
          <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{forgotSuccessMsg}</span>
        </div>
      )}

      {/* Step 1: Subdomain */}
      {step === 1 && (
        <form onSubmit={handleLookupSubdomain} className="space-y-6 text-left animate-fade-in w-full">
          <div className="space-y-1.5 w-full">
            <label className="text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: 'rgba(232,244,248,0.3)' }}>Workspace</label>
            <div className="relative flex items-center w-full">
              <NeonInput
                type="text"
                placeholder="your-company"
                value={subdomain}
                onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                disabled={loading}
                suffix=".hrms.local"
              />
            </div>
          </div>
          <LiquidButton type="submit" disabled={loading}>
            {loading ? 'Searching...' : 'Continue'} <ArrowRight className="h-3.5 w-3.5" />
          </LiquidButton>
          <button type="button" onClick={() => { setError(''); setStep(5); }} className="w-full text-center text-[10px] font-bold mt-4 transition-colors hover:text-[#00F5D4]" style={{ color: 'rgba(232,244,248,0.25)' }}>
            Create a new organization
          </button>
        </form>
      )}

      {/* Step 2: Credentials */}
      {step === 2 && (
        <form onSubmit={handleLogin} className="space-y-5 text-left animate-fade-in">
          <div className="space-y-1.5">
            <label className="text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: 'rgba(232,244,248,0.3)' }}>Email</label>
            <NeonInput type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} />
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: 'rgba(232,244,248,0.3)' }}>Password</label>
              <button type="button" onClick={() => { setError(''); setForgotEmail(email); setForgotSuccessMsg(''); setStep(7); }} className="text-[9px] font-bold transition-colors hover:text-[#00F5D4]" style={{ color: '#00F5D4' }}>
                Forgot?
              </button>
            </div>
            <NeonInput type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} />
          </div>

          <LiquidButton type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </LiquidButton>

          {/* SSO Divider */}
          <div className="relative flex items-center justify-center my-4">
            <div className="w-full h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
            <span className="absolute px-3 text-[8px] font-bold uppercase tracking-[0.25em]" style={{ background: 'rgba(5,5,8,0.8)', color: 'rgba(232,244,248,0.2)' }}>Or SSO</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {['google', 'microsoft'].map((p) => (
              <button key={p} type="button" onClick={() => handleSsoClick(p)}
                className="h-10 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all duration-300 hover:scale-[1.02]"
                style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.015) 0%, rgba(123,47,190,0.02) 100%)', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(232,244,248,0.9)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.02)' }}
              >
                {p === 'google' ? (
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                ) : (
                  <svg className="h-3.5 w-3.5" viewBox="0 0 23 23">
                    <rect x="0" y="0" width="11" height="11" fill="#F25022"/>
                    <rect x="12" y="0" width="11" height="11" fill="#7FBA00"/>
                    <rect x="0" y="12" width="11" height="11" fill="#00A4EF"/>
                    <rect x="12" y="12" width="11" height="11" fill="#FFB900"/>
                  </svg>
                )}
                {p}
              </button>
            ))}
          </div>

          <button type="button" onClick={() => setStep(1)} className="w-full text-center text-[10px] font-bold mt-4 transition-colors" style={{ color: 'rgba(232,244,248,0.2)' }}>
            ← Back to workspace
          </button>
        </form>
      )}

      {/* Step 3: SSO Email */}
      {step === 3 && (
        <form onSubmit={handleSendOtp} className="space-y-5 text-left animate-fade-in">
          <div className="space-y-1.5">
            <label className="text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: 'rgba(232,244,248,0.3)' }}>Email</label>
            <NeonInput type="email" placeholder={ssoProvider === 'google' ? 'you@gmail.com' : 'you@outlook.com'} value={ssoEmail} onChange={(e) => setSsoEmail(e.target.value)} disabled={loading} required />
            <p className="text-[10px] leading-relaxed" style={{ color: 'rgba(232,244,248,0.2)' }}>
              Use <strong style={{color:'rgba(0,245,212,0.5)'}}>employee@default.com</strong> or <strong style={{color:'rgba(0,245,212,0.5)'}}>admin@default.com</strong>
            </p>
          </div>
          <LiquidButton type="submit" disabled={loading}>
            {loading ? 'Sending...' : 'Send Code'} <ArrowRight className="h-3.5 w-3.5" />
          </LiquidButton>
          <button type="button" onClick={() => { setError(''); setStep(2); }} className="w-full text-center text-[10px] font-bold mt-3 flex items-center justify-center gap-1 transition-colors" style={{ color: 'rgba(232,244,248,0.2)' }}>
            <ArrowLeft className="h-3 w-3" /> Back
          </button>
        </form>
      )}

      {/* Step 4: OTP */}
      {step === 4 && (
        <form onSubmit={handleVerifyOtp} className="space-y-5 text-left animate-fade-in">
          <div className="space-y-4">
            <label className="text-[9px] font-bold uppercase tracking-[0.2em] block text-center" style={{ color: 'rgba(232,244,248,0.3)' }}>Verification Code</label>
            <div className="flex justify-center gap-2.5">
              {otpDigits.map((d, i) => (
                <input
                  key={i} id={`otp-${i}`} type="text" maxLength="1" value={d}
                  onChange={(e) => handleOtpDigitChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  disabled={loading}
                  className="w-11 h-13 text-center text-lg font-bold rounded-lg focus:outline-none transition-all duration-300"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.01) 0%, rgba(123,47,190,0.02) 100%)',
                    border: d ? '1px solid rgba(0,245,212,0.45)' : '1px solid rgba(255,255,255,0.08)',
                    color: '#E8F4F8',
                    boxShadow: d ? '0 6px 18px rgba(0,245,212,0.08)' : '0 2px 6px rgba(0,0,0,0.2) inset',
                    backdropFilter: 'blur(4px)'
                  }}
                />
              ))}
            </div>
          </div>
          <LiquidButton type="submit" disabled={loading}>
            {loading ? 'Verifying...' : 'Verify & Sign In'}
          </LiquidButton>
          <div className="flex justify-between items-center text-[10px] font-bold mt-4">
            <button type="button" onClick={() => { setError(''); setStep(3); }} style={{ color: 'rgba(232,244,248,0.25)' }}>Change Email</button>
            <button type="button" onClick={handleResendOtp} disabled={loading || countdown > 0}
              className="disabled:opacity-40" style={{ color: '#00F5D4' }}>
              {countdown > 0 ? `Resend in ${countdown}s` : 'Resend Code'}
            </button>
          </div>
        </form>
      )}

      {/* Step 5: Register Organization */}
      {step === 5 && (
        <form onSubmit={handleRegisterOrg} className="space-y-4 text-left animate-fade-in">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: 'rgba(232,244,248,0.3)' }}>Company Name</label>
              <NeonInput type="text" placeholder="e.g. Redvision" value={regOrgName} onChange={(e) => setRegOrgName(e.target.value)} disabled={loading} required />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: 'rgba(232,244,248,0.3)' }}>Subdomain</label>
              <div className="relative flex items-center w-full">
                <NeonInput
                  type="text"
                  placeholder="redvision"
                  value={regSubdomain}
                  onChange={(e) => setRegSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  disabled={loading}
                  required
                  suffix=".hrms"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: 'rgba(232,244,248,0.3)' }}>Admin First Name</label>
              <NeonInput type="text" placeholder="Tom" value={regFirstName} onChange={(e) => setRegFirstName(e.target.value)} disabled={loading} required />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: 'rgba(232,244,248,0.3)' }}>Admin Last Name</label>
              <NeonInput type="text" placeholder="Cruise" value={regLastName} onChange={(e) => setRegLastName(e.target.value)} disabled={loading} required />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: 'rgba(232,244,248,0.3)' }}>Admin Email</label>
            <NeonInput type="email" placeholder="admin@redvision.com" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} disabled={loading} required />
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: 'rgba(232,244,248,0.3)' }}>Admin Password</label>
            <NeonInput type="password" placeholder="••••••••" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} disabled={loading} required />
          </div>

          <div className="pt-2">
            <LiquidButton type="submit" disabled={loading}>
              {loading ? 'Registering...' : 'Register Organization'}
            </LiquidButton>
          </div>

          <button type="button" onClick={() => { setError(''); setStep(1); }} className="w-full text-center text-[10px] font-bold mt-3 flex items-center justify-center gap-1 transition-colors hover:text-[#00F5D4]" style={{ color: 'rgba(232,244,248,0.2)' }}>
            <ArrowLeft className="h-3 w-3" /> Back to workspace lookup
          </button>
        </form>
      )}

      {/* Step 6: Register OTP Verification */}
      {step === 6 && (
        <form onSubmit={handleVerifyRegisterOtp} className="space-y-5 text-left animate-fade-in">
          <div className="space-y-4">
            <label className="text-[9px] font-bold uppercase tracking-[0.2em] block text-center" style={{ color: 'rgba(232,244,248,0.3)' }}>Verification Code</label>
            <div className="flex justify-center gap-2.5">
              {regOtpDigits.map((d, i) => (
                <input
                  key={i} id={`reg-otp-${i}`} type="text" maxLength="1" value={d}
                  onChange={(e) => handleRegOtpDigitChange(i, e.target.value)}
                  onKeyDown={(e) => handleRegOtpKeyDown(i, e)}
                  disabled={loading}
                  className="w-11 h-13 text-center text-lg font-bold rounded-lg focus:outline-none transition-all duration-300"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.01) 0%, rgba(123,47,190,0.02) 100%)',
                    border: d ? '1px solid rgba(0,245,212,0.45)' : '1px solid rgba(255,255,255,0.08)',
                    color: '#E8F4F8',
                    boxShadow: d ? '0 6px 18px rgba(0,245,212,0.08)' : '0 2px 6px rgba(0,0,0,0.2) inset',
                    backdropFilter: 'blur(4px)'
                  }}
                />
              ))}
            </div>
          </div>
          <LiquidButton type="submit" disabled={loading}>
            {loading ? 'Verifying...' : 'Verify & Sign In'}
          </LiquidButton>
          <div className="flex justify-between items-center text-[10px] font-bold mt-4">
            <button type="button" onClick={() => { setError(''); setStep(5); }} style={{ color: 'rgba(232,244,248,0.25)' }}>Back to Register</button>
            <button type="button" onClick={handleResendRegisterOtp} disabled={loading}
              style={{ color: '#00F5D4' }}>
              Resend Code
            </button>
          </div>
        </form>
      )}

      {/* Step 7: Forgot Password - Request OTP */}
      {step === 7 && (
        <form onSubmit={handleSendForgotOtp} className="space-y-5 text-left animate-fade-in">
          <div className="space-y-1.5">
            <label className="text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: 'rgba(232,244,248,0.3)' }}>Email Address</label>
            <NeonInput
              type="email"
              placeholder="you@company.com"
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <LiquidButton type="submit" disabled={loading}>
            {loading ? 'Sending Code...' : 'Send Verification Code'} <ArrowRight className="h-3.5 w-3.5" />
          </LiquidButton>

          <button type="button" onClick={() => { setError(''); setStep(2); }} className="w-full text-center text-[10px] font-bold mt-3 flex items-center justify-center gap-1 transition-colors hover:text-[#00F5D4]" style={{ color: 'rgba(232,244,248,0.2)' }}>
            <ArrowLeft className="h-3 w-3" /> Back to sign in
          </button>
        </form>
      )}

      {/* Step 8: Forgot Password - Verify OTP & Set New Password */}
      {step === 8 && (
        <form onSubmit={handleVerifyForgotOtpAndReset} className="space-y-5 text-left animate-fade-in">
          <div className="space-y-4">
            <label className="text-[9px] font-bold uppercase tracking-[0.2em] block text-center" style={{ color: 'rgba(232,244,248,0.3)' }}>Verification Code</label>
            <div className="flex justify-center gap-2.5">
              {forgotOtpDigits.map((d, i) => (
                <input
                  key={i} id={`forgot-otp-${i}`} type="text" maxLength="1" value={d}
                  onChange={(e) => handleForgotOtpDigitChange(i, e.target.value)}
                  onKeyDown={(e) => handleForgotOtpKeyDown(i, e)}
                  disabled={loading}
                  className="w-11 h-13 text-center text-lg font-bold rounded-lg focus:outline-none transition-all duration-300"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.01) 0%, rgba(123,47,190,0.02) 100%)',
                    border: d ? '1px solid rgba(0,245,212,0.45)' : '1px solid rgba(255,255,255,0.08)',
                    color: '#E8F4F8',
                    boxShadow: d ? '0 6px 18px rgba(0,245,212,0.08)' : '0 2px 6px rgba(0,0,0,0.2) inset',
                    backdropFilter: 'blur(4px)'
                  }}
                />
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: 'rgba(232,244,248,0.3)' }}>New Password</label>
            <NeonInput
              type="password"
              placeholder="••••••••"
              value={forgotNewPassword}
              onChange={(e) => setForgotNewPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: 'rgba(232,244,248,0.3)' }}>Confirm New Password</label>
            <NeonInput
              type="password"
              placeholder="••••••••"
              value={forgotConfirmPassword}
              onChange={(e) => setForgotConfirmPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <LiquidButton type="submit" disabled={loading}>
            {loading ? 'Resetting...' : 'Reset Password'}
          </LiquidButton>

          <div className="flex justify-between items-center text-[10px] font-bold mt-4">
            <button type="button" onClick={() => { setError(''); setStep(7); }} style={{ color: 'rgba(232,244,248,0.25)' }}>Change Email</button>
            <button type="button" onClick={handleResendForgotOtp} disabled={loading || countdown > 0}
              className="disabled:opacity-40" style={{ color: '#00F5D4' }}>
              {countdown > 0 ? `Resend in ${countdown}s` : 'Resend Code'}
            </button>
          </div>
        </form>
      )}
    </AuthLayout>
  );
};

export default Login;
