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
      <div className="space-y-2 text-left">
        <h1 className="text-xl font-bold tracking-tight text-textPrimary">
          {step === 1 ? 'Enter your workspace' : 
           step === 2 ? `Sign in to ${tenant?.name}` :
           step === 3 ? (ssoProvider === 'google' ? 'Sign in with Google' : 'Sign in with Microsoft') :
           'Verify SSO Code'}
        </h1>
        <p className="text-sm text-textSecondary">
          {step === 1 ? 'Enter your company subdomain to access your organization page.' :
           step === 2 ? `Use your credentials for ${subdomain}.hrms.local` :
           step === 3 ? `Enter your registered ${ssoProvider === 'google' ? 'Google/Gmail' : 'Microsoft'} email address.` :
           `Enter the 6-digit verification code sent to ${ssoEmail}.`}
        </p>
      </div>

      {/* Lockout Amber Banner (Strictly calm warning, not red error) */}
      {lockoutMsg && (
        <div className="flex gap-2.5 p-3 rounded-button bg-amber-50 border border-amber-200 text-amber-800 text-[12px] font-medium leading-relaxed text-left">
          <ShieldAlert className="h-4.5 w-4.5 text-amber-600 shrink-0 mt-0.5" />
          <span>{lockoutMsg}</span>
        </div>
      )}

      {/* Red Form Error */}
      {error && (
        <div className="flex gap-2 p-3 rounded-button bg-red-50 border border-red-200 text-danger text-[12px] font-medium text-left">
          <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {step === 1 && (
        <form onSubmit={handleLookupSubdomain} className="space-y-4 text-left">
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-textSecondary uppercase tracking-wider">Subdomain</label>
            <div className="relative">
              <Building className="absolute left-3.5 top-3.5 h-4 w-4 text-textSecondary" />
              <input
                type="text"
                placeholder="your-company"
                value={subdomain}
                onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                disabled={loading}
                className="w-full h-11 pl-10 pr-24 border border-borderColor rounded-input text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 bg-transparent transition-all"
              />
              <span className="absolute right-3.5 top-3.5 text-xs text-textSecondary font-medium">
                .hrms.local
              </span>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-primary hover:bg-primary-hover text-white rounded-button text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-sm disabled:opacity-50"
          >
            {loading ? 'Searching...' : 'Continue'}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={handleLogin} className="space-y-4 text-left">
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-textSecondary uppercase tracking-wider">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-textSecondary" />
              <input
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="w-full h-11 pl-10 border border-borderColor rounded-input text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 bg-transparent transition-all"
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-[11px] font-semibold text-textSecondary uppercase tracking-wider">Password</label>
              <button
                type="button"
                onClick={() => alert('For testing, please use default password "Password123"')}
                className="text-[11px] font-semibold text-primary hover:text-primary-hover"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <Key className="absolute left-3.5 top-3.5 h-4 w-4 text-textSecondary" />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="w-full h-11 pl-10 border border-borderColor rounded-input text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 bg-transparent transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-primary hover:bg-primary-hover text-white rounded-button text-sm font-semibold flex items-center justify-center cursor-pointer transition-colors shadow-sm disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          <div className="relative my-6 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-borderColor"></div>
            </div>
            <span className="relative px-3 bg-surface text-[10px] font-semibold text-textSecondary uppercase tracking-wider">Or SSO login</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleSsoClick('google')}
              className="h-10 border border-borderColor hover:bg-background text-textPrimary text-xs font-semibold rounded-button flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              Google
            </button>
            <button
              type="button"
              onClick={() => handleSsoClick('microsoft')}
              className="h-10 border border-borderColor hover:bg-background text-textPrimary text-xs font-semibold rounded-button flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              Microsoft
            </button>
          </div>

          <button
            type="button"
            onClick={() => setStep(1)}
            className="w-full text-center text-[12px] font-semibold text-textSecondary hover:text-textPrimary mt-4 block"
          >
            Back to workspace selection
          </button>
        </form>
      )}

      {step === 3 && (
        <form onSubmit={handleSendOtp} className="space-y-4 text-left animate-fade-in">
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-textSecondary uppercase tracking-wider">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-textSecondary" />
              <input
                type="email"
                placeholder={ssoProvider === 'google' ? 'you@gmail.com' : 'you@outlook.com'}
                value={ssoEmail}
                onChange={(e) => setSsoEmail(e.target.value)}
                disabled={loading}
                required
                className="w-full h-11 pl-10 border border-borderColor rounded-input text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 bg-transparent transition-all"
              />
            </div>
            <p className="text-[10px] text-textSecondary">
              Enter your registered user email (e.g. <strong>employee@default.com</strong> or <strong>admin@default.com</strong>) to receive a 6-digit code.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-primary hover:bg-primary-hover text-white rounded-button text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-sm disabled:opacity-50"
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
            className="w-full text-center text-[12px] font-semibold text-textSecondary hover:text-textPrimary mt-4 flex items-center justify-center gap-1.5"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to email & password login
          </button>
        </form>
      )}

      {step === 4 && (
        <form onSubmit={handleVerifyOtp} className="space-y-4 text-left animate-fade-in">
          <div className="space-y-3">
            <label className="text-[11px] font-semibold text-textSecondary uppercase tracking-wider block text-center">
              Verification Code
            </label>
            <div className="flex justify-center gap-2">
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
                  className="w-11 h-12 text-center border border-borderColor rounded-input text-lg font-bold focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 bg-transparent transition-all"
                />
              ))}
            </div>
            <p className="text-[10px] text-textSecondary text-center">
              Enter the 6-digit OTP code sent to <strong>{ssoEmail}</strong>. (Check the terminal/console logs of the backend process to read the simulated email).
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-primary hover:bg-primary-hover text-white rounded-button text-sm font-semibold flex items-center justify-center cursor-pointer transition-colors shadow-sm disabled:opacity-50"
          >
            {loading ? 'Verifying...' : 'Verify & Sign In'}
          </button>

          <div className="flex justify-between items-center text-[12px] font-semibold mt-4">
            <button
              type="button"
              onClick={() => {
                setError('');
                setStep(3);
              }}
              className="text-textSecondary hover:text-textPrimary flex items-center gap-1"
            >
              Change Email
            </button>

            <button
              type="button"
              onClick={handleResendOtp}
              disabled={loading || countdown > 0}
              className={`text-primary hover:text-primary-hover disabled:opacity-50 ${countdown > 0 ? 'cursor-not-allowed' : 'cursor-pointer'}`}
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
