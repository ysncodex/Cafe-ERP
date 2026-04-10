import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Coffee, Lock, ArrowRight, User, Eye, EyeOff } from 'lucide-react';
import { ButtonLoading } from '@/shared/components/ui';
import {
  isAuthenticated,
  formatLoginSuccessMessage,
  loginAsGuest,
  loginAsOwner,
  loginSchema,
  validateLoginPassword,
  type LoginFormData,
} from '@/shared/utils';
import loginBg from '@/assets/img/login.jpg';
import loginBg2 from '@/assets/img/login2.gif';

const LOGIN_PARTICLES = Array.from({ length: 20 }, (_, id) => ({
  id,
  left: `${Math.random() * 100}%`,
  top: `${Math.random() * 100}%`,
  animationDelay: `${Math.random() * 5}s`,
  animationDuration: `${15 + Math.random() * 10}s`,
}));

export default function LoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    try {
      if (isAuthenticated()) navigate('/dashboard');
    } catch {
      // ignore
    }
  }, [navigate]);

  const { register, handleSubmit: handleFormSubmit, formState: { errors, isSubmitting } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      password: ''
    }
  });

  const handleLogin = async (data: LoginFormData) => {
    setLoading(true);

    // Simple static password check
    setTimeout(() => {
      if (!validateLoginPassword(data.password)) {
        setLoading(false);
        toast.error('Wrong password');
        return;
      }

      try {
        const user = loginAsOwner();
        toast.success(formatLoginSuccessMessage(user.name));
      } catch {
        // ignore storage errors
      }

      setLoading(false);
      navigate('/dashboard');
    }, 400);
  };

  const handleGuestMode = () => {
    try {
      const user = loginAsGuest();
      toast.success(formatLoginSuccessMessage(user.name));
      navigate('/dashboard');
    } catch {
      toast.error('Unable to start guest mode');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-black">
        <div
          className="absolute inset-0 opacity-30 bg-cover bg-center animate-slow-zoom"
          style={{ backgroundImage: `url(${loginBg})` }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/50 to-transparent"></div>

        {/* Floating particles animation */}
        <div className="absolute inset-0 overflow-hidden">
          {LOGIN_PARTICLES.map((p) => (
            <div
              key={p.id}
              className="absolute w-2 h-2 bg-amber-500/20 rounded-full animate-float"
              style={{
                left: p.left,
                top: p.top,
                animationDelay: p.animationDelay,
                animationDuration: p.animationDuration,
              }}
            ></div>
          ))}
        </div>
      </div>

      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row h-[650px] relative z-10 animate-fade-in-up">

        {/* Visual Side (Left) */}
        <div className="md:w-1/2 bg-gradient-to-br from-slate-800 to-black relative flex flex-col justify-between p-12 text-white overflow-hidden">
          {/* Background Pattern with parallax effect */}
          <div
            className="absolute inset-0 opacity-20 bg-cover bg-center transition-transform duration-700 hover:scale-110"
            style={{ backgroundImage: `url(${loginBg2})` }}
          ></div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>

          <div className="relative z-10">
            <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center mb-6 shadow-lg shadow-amber-500/20 animate-pulse-slow">
              <Coffee size={28} className="text-white" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight mb-4 animate-slide-in-left">Café ERP <span className="text-amber-500">Pro</span></h1>
            <p className="text-slate-300 text-lg leading-relaxed animate-slide-in-left animation-delay-200">
              Streamline your coffee shop operations with our all-in-one management dashboard.
            </p>
          </div>

          <div className="relative z-10 space-y-4 animate-slide-in-left animation-delay-400">
            <div className="flex items-center gap-3 text-sm text-slate-400">
              <div className="w-8 h-px bg-slate-600"></div>
              <span>Trusted by 500+ Cafés</span>
            </div>
            <div className="flex -space-x-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="w-10 h-10 rounded-full border-2 border-slate-900 bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">
                  U{i}
                </div>
              ))}
              <div className="w-10 h-10 rounded-full border-2 border-slate-900 bg-amber-600 flex items-center justify-center text-xs font-bold text-white">
                +99
              </div>
            </div>
          </div>
        </div>

        {/* Form Side (Right) */}
        <div className="md:w-1/2 bg-white p-12 flex flex-col justify-center relative">
          <div className="max-w-sm mx-auto w-full">
            <h2 className="text-3xl font-bold text-slate-900 mb-2">Welcome back</h2>
            <p className="text-slate-500 mb-10">Please enter your details to sign in.</p>

            <form onSubmit={handleFormSubmit(handleLogin)} className="space-y-5">
              {/* <div>
                <label className="block text-xs font-bold text-slate-900 uppercase tracking-wide mb-2">Email Address</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-amber-500 transition-colors" size={20} />
                  <input
                    type="email"
                    {...register('email')}
                    className={`w-full pl-12 pr-4 py-3.5 bg-slate-50 border ${errors.email ? 'border-red-400' : 'border-slate-200'} rounded-xl outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium text-slate-700`}
                    placeholder="Enter your email"
                  />
                </div>
                {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>}
              </div> */}

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-bold text-slate-900 uppercase tracking-wide">Password</label>
                </div>
                <div className="relative group">
                  <Lock className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-amber-500 transition-colors" size={20} />
                  <input
                    type={showPassword ? "text" : "password"}
                    {...register('password')}
                    className={`w-full pl-12 pr-12 py-3.5 bg-slate-50 border ${errors.password ? 'border-red-400' : 'border-slate-200'} rounded-xl outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium text-slate-700`}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-amber-500 transition-colors"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-red-600 mt-1">{errors.password.message}</p>}
              </div>

              <ButtonLoading
                type="submit"
                loading={isSubmitting || loading}
                className="w-full py-3.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 hover:shadow-2xl hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-300 ease-in-out shadow-xl shadow-slate-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Sign In <ArrowRight size={20} />
              </ButtonLoading>
            </form>

            <div className="my-8 flex items-center gap-4">
              <div className="h-px bg-slate-100 flex-1"></div>
              <span className="text-xs text-slate-400 font-medium">OR CONTINUE WITH</span>
              <div className="h-px bg-slate-100 flex-1"></div>
            </div>

            <button
              type="button"
              onClick={handleGuestMode}
              className="w-full py-3.5 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 hover:border-slate-300 hover:-translate-y-0.5 transition-all duration-300 ease-in-out flex items-center justify-center gap-2"
            >
              <User size={20} /> Guest Mode
            </button>

            <p className="mt-8 text-center text-sm text-slate-500">
              Don't have an account?
              <a className="text-amber-600 font-bold ml-1 hover:underline">Contact: 01624269321</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}