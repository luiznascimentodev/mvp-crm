import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search } from 'lucide-react';
import { ContactsTable } from './contacts-table';
import { ContactFormDialog } from './contact-form-dialog';
import {
  fetchContacts,
  createContact,
  updateContact,
  deleteContact,
} from './contacts.api';
import type { Contact, CreateContactDto } from './types';

const PAGE_SIZE = 20;

export function ContactsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const qc = useQueryClient();

  const page = Number(searchParams.get('page') ?? 1);
  const search = searchParams.get('search') ?? '';

  const [formOpen, setFormOpen] = useState(
    () => searchParams.get('action') === 'new',
  );
  const [editTarget, setEditTarget] = useState<Contact | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  // Abre o dialog de novo se action=new vier da command palette
  const isNew = !editTarget;

  const { data, isLoading } = useQuery({
    queryKey: ['contacts', page, search],
    queryFn: () =>
      fetchContacts({ page, limit: PAGE_SIZE, search: search || undefined }),
  });

  const createMutation = useMutation({
    mutationFn: createContact,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['contacts'] });
      setFormOpen(false);
      toast.success('Contato criado com sucesso!');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: CreateContactDto }) =>
      updateContact(id, dto),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['contacts'] });
      setFormOpen(false);
      setEditTarget(null);
      toast.success('Contato atualizado!');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteContact,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['contacts'] });
      toast.success('Contato removido.');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleFormSubmit = useCallback(
    async (dto: CreateContactDto) => {
      setFormLoading(true);
      try {
        if (editTarget) {
          await updateMutation.mutateAsync({ id: editTarget.id, dto });
        } else {
          await createMutation.mutateAsync(dto);
        }
      } finally {
        setFormLoading(false);
      }
    },
    [editTarget, createMutation, updateMutation],
  );

  function handleEdit(contact: Contact) {
    setEditTarget(contact);
    setFormOpen(true);
  }

  function handleDelete(contact: Contact) {
    if (confirm(`Remover "${contact.name}"?`)) {
      deleteMutation.mutate(contact.id);
    }
  }

  function handleSearch(value: string) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set('search', value);
      else next.delete('search');
      next.set('page', '1');
      return next;
    });
  }

  function handleNewContact() {
    setEditTarget(null);
    setFormOpen(true);
  }

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contatos</h1>
          <p className="text-muted-foreground text-sm">
            {total > 0
              ? `${total} contato${total > 1 ? 's' : ''} no total`
              : 'Nenhum contato ainda'}
          </p>
        </div>
        <Button onClick={handleNewContact}>
          <Plus size={16} className="mr-2" /> Novo Contato
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex gap-2">
        <div className="relative max-w-xs">
          <Search
            size={14}
            className="absolute left-2.5 top-2.5 text-muted-foreground"
          />
          <Input
            className="pl-8"
            placeholder="Buscar por nome ou e-mail..."
            defaultValue={search}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
      </div>

      <ContactsTable
        data={data?.data ?? []}
        isLoading={isLoading}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Página {page} de {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() =>
                setSearchParams((prev) => {
                  const next = new URLSearchParams(prev);
                  next.set('page', String(page - 1));
                  return next;
                })
              }
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() =>
                setSearchParams((prev) => {
                  const next = new URLSearchParams(prev);
                  next.set('page', String(page + 1));
                  return next;
                })
              }
            >
              Próxima
            </Button>
          </div>
        </div>
      )}

      <ContactFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditTarget(null);
        }}
        contact={isNew ? null : editTarget}
        onSubmit={handleFormSubmit}
        loading={formLoading}
      />
    </div>
  );
}
