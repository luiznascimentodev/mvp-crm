import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { UserPlus, Mail, Shield, Crown, User, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/stores/auth.store';
import {
  fetchMembers,
  fetchInvites,
  revokeInvite,
  type TeamMember,
  type TeamInvite,
  type Role,
} from './team.api';
import { InviteMemberDialog } from './invite-member-dialog';

const ROLE_LABELS: Record<Role, string> = {
  OWNER: 'Proprietário',
  ADMIN: 'Administrador',
  MEMBER: 'Membro',
};

const ROLE_ICONS: Record<Role, React.ElementType> = {
  OWNER: Crown,
  ADMIN: Shield,
  MEMBER: User,
};

const ROLE_BADGE_VARIANT: Record<Role, 'default' | 'secondary' | 'outline'> = {
  OWNER: 'default',
  ADMIN: 'secondary',
  MEMBER: 'outline',
};

function MemberCard({ member }: { member: TeamMember }) {
  const RoleIcon = ROLE_ICONS[member.role];
  const initials = member.name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{member.name}</p>
        <p className="text-xs text-muted-foreground truncate">{member.email}</p>
      </div>
      <Badge variant={ROLE_BADGE_VARIANT[member.role]}>
        <RoleIcon size={12} className="mr-1" />
        {ROLE_LABELS[member.role]}
      </Badge>
    </div>
  );
}

function InviteRow({
  invite,
  canRevoke,
}: {
  invite: TeamInvite;
  canRevoke: boolean;
}) {
  const queryClient = useQueryClient();

  const revokeMutation = useMutation({
    mutationFn: () => revokeInvite(invite.id),
    onSuccess: () => {
      toast.success('Convite revogado');
      void queryClient.invalidateQueries({ queryKey: ['invites'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const expiresAt = new Date(invite.expiresAt).toLocaleDateString('pt-BR');

  return (
    <div className="flex items-center gap-3 py-2">
      <div className="p-2 rounded-full bg-muted">
        <Mail size={14} className="text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{invite.email}</p>
        <p className="text-xs text-muted-foreground">
          Expira em {expiresAt} · Convidado por {invite.invitedBy.name}
        </p>
      </div>
      <Badge variant="outline">{ROLE_LABELS[invite.role]}</Badge>
      {canRevoke && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive hover:text-destructive"
          onClick={() => revokeMutation.mutate()}
          disabled={revokeMutation.isPending}
        >
          <Trash2 size={14} />
        </Button>
      )}
    </div>
  );
}

export function TeamPage() {
  const [inviteOpen, setInviteOpen] = useState(false);
  const { user } = useAuthStore();
  const isAdminOrOwner = user?.role === 'ADMIN' || user?.role === 'OWNER';

  const membersQuery = useQuery({
    queryKey: ['members'],
    queryFn: fetchMembers,
  });

  const invitesQuery = useQuery({
    queryKey: ['invites'],
    queryFn: fetchInvites,
    enabled: isAdminOrOwner,
  });

  const members: TeamMember[] = membersQuery.data ?? [];
  const invites: TeamInvite[] = invitesQuery.data ?? [];

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Equipe</h1>
          <p className="text-muted-foreground text-sm">
            Gerencie os membros e convites do seu time
          </p>
        </div>
        {isAdminOrOwner && (
          <Button onClick={() => setInviteOpen(true)} className="gap-2">
            <UserPlus size={16} />
            Convidar Membro
          </Button>
        )}
      </div>

      {/* Membros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Membros ({members.length})
          </CardTitle>
          <CardDescription>Todos os usuários ativos do tenant</CardDescription>
        </CardHeader>
        <CardContent>
          {membersQuery.isLoading ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Carregando...
            </p>
          ) : members.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Nenhum membro encontrado
            </p>
          ) : (
            <div className="divide-y">
              {members.map((m) => (
                <MemberCard key={m.id} member={m} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Convites Pendentes */}
      {isAdminOrOwner && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Convites Pendentes ({invites.length})
            </CardTitle>
            <CardDescription>
              Convites enviados aguardando aceite
            </CardDescription>
          </CardHeader>
          <CardContent>
            {invitesQuery.isLoading ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Carregando...
              </p>
            ) : invites.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Nenhum convite pendente
              </p>
            ) : (
              <div className="divide-y">
                {invites.map((inv) => (
                  <InviteRow
                    key={inv.id}
                    invite={inv}
                    canRevoke={isAdminOrOwner}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <InviteMemberDialog open={inviteOpen} onOpenChange={setInviteOpen} />
    </div>
  );
}
