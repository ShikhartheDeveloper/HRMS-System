import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import api from '../../services/api';
import AuthLayout from '../../components/layout/AuthLayout';
import { AlertCircle, ArrowRight, ArrowLeft, Building, Key, Mail, ShieldAlert, Lock } from 'lucide-react';

const Login = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setAuth, tenant, setTenant } = useAuthStore();

  const [step, setStep] = useState(1); // 1: Subdomain, 2: Credentials, 3: SSO Email, 4: SSO OTP
  const [subdomain, setSubdomain] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lockoutMsg, setLockoutMsg] = useState('');

  const [ssoProvider, setSsoProvider] = useState(''); // 'google' or 'microsoft'
  const [ssoEmail, setSsoEmail] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState(0);

  // Handle OTP Resend countdown
  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  // Handle SSO redirect callbacks
  useEffect(() => {
    const ssoToken = searchParams.get('token');
    const ssoError = searchParams.get('error');

    if (ssoToken) {
      setLoading(true);
      api.post('/auth/refresh')
        .then((res) => {
          if (res.data.success) {
            setAuth(res.data.data.user, ssoToken);
            navigate('/dashboard');
          }
        })
        .catch(() => setError('SSO login validation failed'))
        .finally(() => setLoading(false));
    }

    if (ssoError) {
      if (ssoError === 'subdomain_missing') setError('Subdomain missing for SSO');
      else if (ssoError === 'tenant_not_found') setError('Tenant not found');
      else setError('Single Sign-On failed. Please try again.');
    }
  }, [searchParams, setAuth, navigate]);

  // Try to load subdomain from localStorage
  useEffect(() => {
    const savedSubdomain = localStorage.getItem('hrms_subdomain');
    if (savedSubdomain) {
      setSubdomain(savedSubdomain);
    }
  }, []);

  const handleLookupSubdomain = async (e) => {
    e.preventDefault();
    if (!subdomain) return setError('Subdomain is required');

    setLoading(true);
    setError('');

    try {
      const res = await api.get(`/auth/tenant-lookup?subdomain=${subdomain}`);
      if (res.data.success) {
        setTenant(res.data.data);
        setStep(2);
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Organization subdomain lookup failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) return setError('All fields are required');

    setLoading(true);
    setError('');
    setLockoutMsg('');

    try {
      const res = await api.post('/auth/login', {
        email,
        password,
        tenantId: tenant.id
      });

      if (res.data.success) {
        setAuth(res.data.data.user, res.data.data.token);
        navigate('/dashboard');
      }
    } catch (err) {
      const errData = err.response?.data?.error;
      if (errData?.code === 'ACCOUNT_LOCKED') {
        setLockoutMsg(errData.message);
      } else {
        setError(errData?.message || 'Authentication failed. Please verify your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSsoClick = (provider) => {
    if (!subdomain) return setError('Subdomain is required before SSO');
    setSsoProvider(provider);
    setSsoEmail('');
    setOtpDigits(['', '', '', '', '', '']);
    setError('');
    setStep(3); // Go to email input step
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!ssoEmail) return setError('Email address is required');
    
    // Quick domain validation check for google
    if (ssoProvider === 'google' && !ssoEmail.endsWith('@gmail.com') && ssoEmail !== 'admin@default.com' && ssoEmail !== 'manager@default.com' && ssoEmail !== 'employee@default.com') {
      return setError('Please enter a valid Gmail address (e.g. user@gmail.com)');
    }

    setLoading(true);
    setError('');

    try {
      const res = await api.post('/auth/sso/send-otp', {
        email: ssoEmail,
        provider: ssoProvider,
        subdomain
      });
      if (res.data.success) {
        setStep(4); // Go to OTP verification step
        setCountdown(60); // 60s cooldown
        setOtpDigits(['', '', '', '', '', '']);
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to send verification code. Make sure the email is registered in this workspace.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const otpCode = otpDigits.join('');
    if (otpCode.length < 6) return setError('Please enter the 6-digit verification code');

    setLoading(true);
    setError('');

    try {
      const res = await api.post('/auth/sso/verify-otp', {
        email: ssoEmail,
        otpCode,
        subdomain
      });

      if (res.data.success) {
        setAuth(res.data.data.user, res.data.data.token);
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Verification failed. Please check the code and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (countdown > 0) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/sso/send-otp', {
        email: ssoEmail,
        provider: ssoProvider,
        subdomain
      });
      if (res.data.success) {
        setCountdown(60);
        setOtpDigits(['', '', '', '', '', '']);
        alert('Verification code resent successfully.');
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to resend code');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpDigitChange = (index, value) => {
    if (!/^\d*$/.test(value)) return; // Only allow numbers
    const newDigits = [...otpDigits];
    
    // Take the last char if pasting/typing multiple
    newDigits[index] = value.slice(-1);
    setOtpDigits(newDigits);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    // Auto-focus previous input on Backspace
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      const prevInput = document.getElementById(`otp-input-${index - 1}`);
      if (prevInput) {
        prevInput.focus();
        const newDigits = [...otpDigits];
        newDigits[index - 1] = '';
        setOtpDigits(newDigits);
      }
    }
  };

  return (
    <AuthLayout>
      <div className="space-y-2.5 text-left">
        <h1 className="text-2xl font-extrabold tracking-tight text-textPrimary">
          {step === 1 ? 'Enter workspace' : 
           step === 2 ? `Sign in to ${tenant?.name}` :
           step === 3 ? (ssoProvider === 'google' ? 'Google Sign-In' : 'Microsoft Sign-In') :
           'Verify Security Code'}
        </h1>
        <p className="text-sm text-textSecondary leading-relaxed">
          {step === 1 ? 'Enter your organization subdomain to access your personalized HR workspace.' :
           step === 2 ? `Secure login for ${subdomain}.hrms.local` :
           step === 3 ? `Enter your registered ${ssoProvider === 'google' ? 'Google/Gmail' : 'Microsoft'} email address.` :
           `Enter the 6-digit verification code sent to ${ssoEmail}.`}
        </p>
      </div>

      {/* Lockout Amber Banner (Strictly calm warning, not red error) */}
      {lockoutMsg && (
        <div className="flex gap-2.5 p-3.5 rounded-button bg-amber-50 border border-amber-200 text-amber-800 text-[12.5px] font-medium leading-relaxed text-left animate-fade-in">
          <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <span>{lockoutMsg}</span>
        </div>
      )}

      {/* Red Form Error */}
      {error && (
        <div className="flex gap-2.5 p-3.5 rounded-button bg-red-50/80 border border-red-200/80 text-danger text-[12.5px] font-medium text-left animate-fade-in animate-shake">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {step === 1 && (
        <form onSubmit={handleLookupSubdomain} className="space-y-5 text-left animate-fade-in">
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-textSecondary uppercase tracking-wider">Subdomain</label>
            <div className="relative">
              <Building className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-textSecondary/80" />
              <input
                type="text"
                placeholder="your-company"
                value={subdomain}
                onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                disabled={loading}
                className="w-full h-12 pl-11 pr-28 border border-borderColor rounded-input text-sm focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 bg-transparent transition-all duration-200"
              />
              <span className="absolute right-3.5 top-3.5 text-xs text-textSecondary font-bold bg-slate-100/80 px-2 py-0.5 rounded-md">
                .hrms.local
              </span>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-primary hover:bg-primary-hover text-white rounded-button text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all duration-200 hover:scale-[1.01] active:scale-[0.98] shadow-sm hover:shadow-md hover:shadow-primary/10 disabled:opacity-50 disabled:pointer-events-none"
          >
            {loading ? 'Searching...' : 'Continue'}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={handleLogin} className="space-y-5 text-left animate-fade-in">
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-textSecondary uppercase tracking-wider">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-textSecondary/80" />
              <input
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="w-full h-12 pl-11 border border-borderColor rounded-input text-sm focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 bg-transparent transition-all duration-200"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-[11px] font-bold text-textSecondary uppercase tracking-wider">Password</label>
              <button
                type="button"
                onClick={() => alert('For testing, please use default password "Password123"')}
                className="text-[11px] font-bold text-primary hover:text-primary-hover transition-colors"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <Key className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-textSecondary/80" />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="w-full h-12 pl-11 border border-borderColor rounded-input text-sm focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 bg-transparent transition-all duration-200"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-primary hover:bg-primary-hover text-white rounded-button text-sm font-semibold flex items-center justify-center cursor-pointer transition-all duration-200 hover:scale-[1.01] active:scale-[0.98] shadow-sm hover:shadow-md hover:shadow-primary/10 disabled:opacity-50 disabled:pointer-events-none"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          <div className="relative my-6 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-borderColor/85"></div>
            </div>
            <span className="relative px-3.5 bg-white text-[10px] font-bold text-textSecondary uppercase tracking-wider">Or Single Sign-On</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleSsoClick('google')}
              className="h-11 border border-borderColor/60 hover:border-primary/30 hover:bg-slate-50 text-textPrimary text-xs font-bold rounded-button flex items-center justify-center gap-2.5 cursor-pointer transition-all duration-200 hover:scale-[1.01] active:scale-[0.98]"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Google
            </button>
            <button
              type="button"
              onClick={() => handleSsoClick('microsoft')}
              className="h-11 border border-borderColor/60 hover:border-primary/30 hover:bg-slate-50 text-textPrimary text-xs font-bold rounded-button flex items-center justify-center gap-2.5 cursor-pointer transition-all duration-200 hover:scale-[1.01] active:scale-[0.98]"
            >
              <svg className="h-4 w-4" viewBox="0 0 23 23" fill="currentColor">
                <rect x="0" y="0" width="11" height="11" fill="#F25022"/>
                <rect x="12" y="0" width="11" height="11" fill="#7FBA00"/>
                <rect x="0" y="12" width="11" height="11" fill="#00A4EF"/>
                <rect x="12" y="12" width="11" height="11" fill="#FFB900"/>
              </svg>
              Microsoft
            </button>
          </div>

          <button
            type="button"
            onClick={() => setStep(1)}
            className="w-full text-center text-xs font-bold text-textSecondary hover:text-textPrimary transition-colors mt-5 block"
          >
            Back to workspace selection
          </button>
        </form>
      )}

      {step === 3 && (
        <form onSubmit={handleSendOtp} className="space-y-5 text-left animate-fade-in">
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-textSecondary uppercase tracking-wider">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-textSecondary/80" />
              <input
                type="email"
                placeholder={ssoProvider === 'google' ? 'you@gmail.com' : 'you@outlook.com'}
                value={ssoEmail}
                onChange={(e) => setSsoEmail(e.target.value)}
                disabled={loading}
                required
                className="w-full h-12 pl-11 border border-borderColor rounded-input text-sm focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 bg-transparent transition-all duration-200"
              />
            </div>
            <p className="text-[11px] text-textSecondary leading-normal">
              Enter your registered user email (e.g. <strong>employee@default.com</strong> or <strong>admin@default.com</strong>) to receive a secure login code.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-primary hover:bg-primary-hover text-white rounded-button text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all duration-200 hover:scale-[1.01] active:scale-[0.98] shadow-sm hover:shadow-md hover:shadow-primary/10 disabled:opacity-50 disabled:pointer-events-none"
          >
            {loading ? 'Sending Code...' : 'Send Verification Code'}
            <ArrowRight className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => {
              setError('');
              setStep(2);
            }}
            className="w-full text-center text-xs font-bold text-textSecondary hover:text-textPrimary mt-4 flex items-center justify-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to password login
          </button>
        </form>
      )}

      {step === 4 && (
        <form onSubmit={handleVerifyOtp} className="space-y-5 text-left animate-fade-in">
          <div className="space-y-4">
            <label className="text-[11px] font-bold text-textSecondary uppercase tracking-wider block text-center">
              Verification Code
            </label>
            <div className="flex justify-center gap-2.5">
              {otpDigits.map((digit, idx) => (
                <input
                  key={idx}
                  id={`otp-input-${idx}`}
                  type="text"
                  maxLength="1"
                  value={digit}
                  onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                  disabled={loading}
                  className="w-12 h-14 text-center border border-borderColor rounded-input text-xl font-bold focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 bg-transparent transition-all duration-200"
                />
              ))}
            </div>
            <p className="text-[11px] text-textSecondary text-center leading-normal">
              Enter the 6-digit OTP code sent to <strong>{ssoEmail}</strong>. (Check the terminal logs of the backend process to read the simulated email).
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-primary hover:bg-primary-hover text-white rounded-button text-sm font-semibold flex items-center justify-center cursor-pointer transition-all duration-200 hover:scale-[1.01] active:scale-[0.98] shadow-sm hover:shadow-md hover:shadow-primary/10 disabled:opacity-50 disabled:pointer-events-none"
          >
            {loading ? 'Verifying...' : 'Verify & Sign In'}
          </button>

          <div className="flex justify-between items-center text-xs font-bold mt-5">
            <button
              type="button"
              onClick={() => {
                setError('');
                setStep(3);
              }}
              className="text-textSecondary hover:text-textPrimary transition-colors flex items-center gap-1"
            >
              Change Email
            </button>

            <button
              type="button"
              onClick={handleResendOtp}
              disabled={loading || countdown > 0}
              className={`text-primary hover:text-primary-hover transition-colors disabled:opacity-50 ${countdown > 0 ? 'cursor-not-allowed' : 'cursor-pointer'}`}
            >
              {countdown > 0 ? `Resend in ${countdown}s` : 'Resend Code'}
            </button>
          </div>
        </form>
      )}
    </AuthLayout>
  );
};

export default Login;
