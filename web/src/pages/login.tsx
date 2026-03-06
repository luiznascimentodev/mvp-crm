import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { useTheme } from '@/lib/theme';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authControllerLogin } from '@/generated/api';
import { Sun, Moon, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function LoginPage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const { theme, toggleTheme } = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [slug, setSlug] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await authControllerLogin({
        body: { email, password, slug },
      });

      if (response.error) {
        setError('E-mail, senha ou workspace invalidos.');
        return;
      }

      const data = response.data as {
        access_token: string;
        user: {
          userId: string;
          email: string;
          tenantId: string;
          role: 'OWNER' | 'ADMIN' | 'MEMBER';
        };
      };

      setAuth(data.access_token, data.user);
      navigate('/dashboard');
    } catch {
      setError('Erro ao conectar ao servidor.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="relative min-h-screen w-full flex flex-col items-center justify-center px-4 overflow-hidden"
      style={{
        background:
          theme === 'dark'
            ? 'linear-gradient(135deg, oklch(0.08 0.02 155) 0%, oklch(0.1 0 0) 40%, oklch(0.13 0.03 155) 100%)'
            : 'linear-gradient(135deg, oklch(0.82 0.08 155) 0%, oklch(0.97 0 0) 45%, oklch(0.88 0.06 155) 100%)',
      }}
    >
      {/* Glow decorativo superior esquerdo */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-primary/20 blur-[130px]" />
      {/* Glow decorativo inferior direito */}
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-[400px] w-[400px] rounded-full bg-primary/15 blur-[110px]" />

      {/* Botão de tema */}
      <div className="absolute top-5 right-5 z-10">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          aria-label="Alternar tema"
          className="h-9 w-9 rounded-full border border-border/60 text-muted-foreground hover:text-primary hover:border-primary/40 backdrop-blur-sm transition-colors"
        >
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </Button>
      </div>

      <div className="relative z-10 w-full max-w-[360px] space-y-8">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/30">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="3" fill="white" />
              <path
                d="M12 3C7.03 3 3 7.03 3 12s4.03 9 9 9 9-4.03 9-9S16.97 3 12 3z"
                stroke="white"
                strokeWidth="1.5"
                strokeDasharray="4 2"
                fill="none"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Orbit
          </h1>
        </div>

        {/* Card com glassmorphism */}
        <div
          className="rounded-2xl border border-border/50 p-8 shadow-xl backdrop-blur-md"
          style={{
            background:
              theme === 'dark' ? 'oklch(1 0 0 / 4%)' : 'oklch(1 0 0 / 65%)',
          }}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label
                htmlFor="slug"
                className="text-xs font-medium text-muted-foreground"
              >
                Workspace
              </Label>
              <div className="flex h-10 items-center rounded-lg border border-input bg-muted/40 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-0 overflow-hidden">
                <span className="flex h-full items-center border-r border-input bg-muted/60 px-3 text-muted-foreground select-none">
                  @
                </span>
                <input
                  id="slug"
                  type="text"
                  placeholder="minha-empresa"
                  value={slug}
                  onChange={(e) =>
                    setSlug(
                      e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''),
                    )
                  }
                  className="h-full flex-1 bg-transparent px-3 outline-none placeholder:text-muted-foreground/40"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="email"
                className="text-xs font-medium text-muted-foreground"
              >
                E-mail
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10 bg-muted/40 text-sm placeholder:text-muted-foreground/40"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="password"
                className="text-xs font-medium text-muted-foreground"
              >
                Senha
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-10 bg-muted/40 text-sm placeholder:text-muted-foreground/40"
                required
              />
            </div>

            {error && (
              <div
                className={cn(
                  'flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/8 px-3 py-2.5',
                )}
              >
                <AlertCircle size={13} className="shrink-0 text-destructive" />
                <p className="text-xs text-destructive">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-10 mt-1 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98] transition-all duration-150"
            >
              {loading ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                'Entrar'
              )}
            </Button>
          </form>
        </div>
        {/* fim card */}
      </div>

      <p className="absolute bottom-5 z-10 text-[11px] text-muted-foreground/50">
        Copyright {new Date().getFullYear()} Orbit CRM
      </p>
    </div>
  );
}
