import { db } from '../db';
import { AuditEventType, UserRole, AuditLogRecord } from '../db/types';

export class AuditService {
  public logEvent(
    proposalId: string,
    eventType: AuditEventType,
    actor: { id: string; name: string; role: UserRole },
    options?: {
      previousState?: Record<string, any>;
      newState?: Record<string, any>;
      notes?: string;
    }
  ): AuditLogRecord {
    console.log(`[AuditService] [${eventType}] by ${actor.name} (${actor.role}) on proposal ${proposalId}:`, options?.notes || '');
    return db.appendAuditLog({
      proposalId,
      eventType,
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      previousState: options?.previousState,
      newState: options?.newState,
      notes: options?.notes
    });
  }

  public getHistory(proposalId: string): AuditLogRecord[] {
    return db.getAuditLogsForProposal(proposalId);
  }
}

export const auditService = new AuditService();
