import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Eye, EyeOff, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { fetchInviteByToken, acceptInvite } from '@/pages/team/team.api';

interface FormValues {
  name: string;
  password: string;
  confirmPassword: string;
}

const ROLE_LABELS: Record<string, string> = {
  OWNER: 'Proprietário',
  ADMIN: 'Administrador',
  MEMBER: 'Membro',
};

export function AcceptInvitePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const inviteQuery = useQuery({
    queryKey: ['invite', token],
    queryFn: () => fetchInviteByToken(token!),
    enabled: !!token,
    retry: false,
  });

  const form = useForm<FormValues>({
    defaultValues: { name: '', password: '', confirmPassword: '' },
  });

  const acceptMutation = useMutation({
    mutationFn: (values: FormValues) =>
      acceptInvite(token!, { name: values.name, password: values.password }),
    onSuccess: () => {
      toast.success('Conta criada com sucesso! Faça login para continuar.');
      setTimeout(() => navigate('/login'), 1500);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function onSubmit(values: FormValues) {
    if (values.password !== values.confirmPassword) {
      form.setError('confirmPassword', { message: 'As senhas não coincidem' });
      return;
    }
    acceptMutation.mutate(values);
  }

  // ─── Loading state ───────────────────────────────────────────────
  if (inviteQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-muted-foreground" size={32} />
      </div>
    );
  }

  // ─── Erro (token inválido, expirado) ─────────────────────────────
  if (inviteQuery.isError || !inviteQuery.data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <XCircle className="mx-auto text-destructive" size={48} />
            <h2 className="text-xl font-bold">Convite inválido</h2>
            <p className="text-muted-foreground text-sm">
              Este convite não existe ou já expirou.
            </p>
            <Button variant="outline" onClick={() => navigate('/login')}>
              Ir para o Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const invite = inviteQuery.data;
  const isExpired = invite.status !== 'PENDING';

  // ─── Convite já aceito/expirado ───────────────────────────────────
  if (isExpired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <XCircle className="mx-auto text-destructive" size={48} />
            <h2 className="text-xl font-bold">
              {invite.status === 'ACCEPTED'
                ? 'Convite já aceito'
                : 'Convite expirado'}
            </h2>
            <p className="text-muted-foreground text-sm">
              {invite.status === 'ACCEPTED'
                ? 'Este convite já foi utilizado. Faça login normalmente.'
                : 'Este convite expirou. Solicite um novo convite ao administrador.'}
            </p>
            <Button variant="outline" onClick={() => navigate('/login')}>
              Ir para o Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Success state ────────────────────────────────────────────────
  if (acceptMutation.isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <CheckCircle2 className="mx-auto text-green-600" size={48} />
            <h2 className="text-xl font-bold">Conta criada!</h2>
            <p className="text-muted-foreground text-sm">
              Redirecionando para o login...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Formulário de aceite ─────────────────────────────────────────
  const expiresAt = new Date(invite.expiresAt).toLocaleDateString('pt-BR');

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mb-2">
            <p className="text-sm text-muted-foreground">
              <strong>{invite.invitedBy.name}</strong> te convidou para o
            </p>
            <p className="text-lg font-bold">{invite.tenant.name}</p>
          </div>
          <CardTitle>Crie sua conta</CardTitle>
          <CardDescription className="flex items-center justify-center gap-2">
            <span>{invite.email}</span>
            <Badge variant="secondary">
              {ROLE_LABELS[invite.role] ?? invite.role}
            </Badge>
            <span className="text-xs">· expira {expiresAt}</span>
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                rules={{
                  required: 'Nome é obrigatório',
                  minLength: { value: 2, message: 'Nome muito curto' },
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome completo</FormLabel>
                    <FormControl>
                      <Input placeholder="Seu nome" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                rules={{
                  required: 'Senha é obrigatória',
                  minLength: { value: 8, message: 'Mínimo 8 caracteres' },
                  pattern: {
                    value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/,
                    message: 'Precisa ter maiúscula, minúscula e número',
                  },
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Senha</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Mínimo 8 caracteres"
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((s) => !s)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showPassword ? (
                            <EyeOff size={16} />
                          ) : (
                            <Eye size={16} />
                          )}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                rules={{ required: 'Confirme a senha' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirmar Senha</FormLabel>
                    <FormControl>
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Repita a senha"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={acceptMutation.isPending}
              >
                {acceptMutation.isPending ? (
                  <>
                    <Loader2 size={16} className="mr-2 animate-spin" />
                    Criando conta...
                  </>
                ) : (
                  'Aceitar Convite e Criar Conta'
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
