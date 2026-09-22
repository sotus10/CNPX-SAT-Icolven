import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { Lock, Mail, Eye, EyeOff, Droplets } from 'lucide-react';
import { setUser } from '../store/slices/userSlice';

const LoginPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [email, setEmail] = useState('demo@cnp-analytics.com');
  const [password, setPassword] = useState('demo');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      // El backend valida en `POST /auth/login`; en desarrollo local se acepta
      // cualquier credencial para navegar la demo.
      dispatch(
        setUser({
          user: { email, role: 'analyst', name: 'Alejandro Quintero' },
          token: 'demo-token',
          role: 'analyst',
        })
      );
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Credenciales inválidas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
            <Droplets size={20} className="text-white" />
          </div>
          <span className="font-bold text-[20px] tracking-tight text-carbon">CNP Cuencas</span>
        </div>

        <div className="bg-white border border-line rounded-card shadow-card p-7">
          <h1 className="text-[18px] font-bold text-carbon">Iniciar sesión</h1>
          <p className="text-[13px] text-[#a6a6a6] mt-1">
            Accedé al panel de monitoreo hidrológico con alertas tempranas
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="block">
              <span className="text-[12px] font-semibold text-carbon">Email</span>
              <div className="relative mt-1.5">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a6a6a6]" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-[10px] border border-line bg-white pl-9 pr-3 py-2.5 text-[13px] text-carbon outline-none focus:border-primary transition-colors"
                />
              </div>
            </label>

            <label className="block">
              <span className="text-[12px] font-semibold text-carbon">Contraseña</span>
              <div className="relative mt-1.5">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a6a6a6]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-[10px] border border-line bg-white pl-9 pr-10 py-2.5 text-[13px] text-carbon outline-none focus:border-primary transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a6a6a6] hover:text-carbon"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </label>

            {error && (
              <p className="text-[12px] font-semibold text-[#dc2626] bg-[#fef2f2] rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 rounded-[10px] bg-primary text-white text-[13px] font-semibold shadow-sm hover:bg-primary-700 disabled:opacity-60 transition-colors"
            >
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>

          <p className="text-[11px] text-[#a6a6a6] mt-4 text-center">Demo: cualquier credencial ingresa</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;