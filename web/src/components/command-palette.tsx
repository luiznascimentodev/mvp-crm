import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { LayoutDashboard, Users, Handshake, Plus } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const pages = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  { label: 'Contatos', to: '/contacts', icon: Users },
  { label: 'Deals', to: '/deals', icon: Handshake },
];

const actions = [
  { label: 'Novo Contato', to: '/contacts?action=new', icon: Plus },
  { label: 'Novo Deal', to: '/deals?action=new', icon: Plus },
];

export function CommandPalette({ open, onOpenChange }: Props) {
  const navigate = useNavigate();

  // Ctrl+K / Cmd+K global shortcut
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        onOpenChange(!open);
      }
    }
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onOpenChange]);

  function run(to: string) {
    onOpenChange(false);
    navigate(to);
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Buscar páginas e ações..." />
      <CommandList>
        <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
        <CommandGroup heading="Páginas">
          {pages.map(({ label, to, icon: Icon }) => (
            <CommandItem key={to} value={label} onSelect={() => run(to)}>
              <Icon className="mr-2 h-4 w-4" />
              {label}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Ações">
          {actions.map(({ label, to, icon: Icon }) => (
            <CommandItem key={to} value={label} onSelect={() => run(to)}>
              <Icon className="mr-2 h-4 w-4" />
              {label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
