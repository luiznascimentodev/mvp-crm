import { SetMetadata } from '@nestjs/common';

export const AUDIT_ENTITY_KEY = 'audit:entity';

/**
 * Marca um endpoint para auditoria automática.
 * A ação (CREATE/UPDATE/DELETE) é inferida pelo método HTTP.
 *
 * @param entity - Nome da entidade auditada (ex: 'Contact', 'Lead', 'Deal')
 *
 * @example
 * @Audit('Contact')
 * @Patch(':id')
 * update() { ... }
 */
export const Audit = (entity: string) => SetMetadata(AUDIT_ENTITY_KEY, entity);
