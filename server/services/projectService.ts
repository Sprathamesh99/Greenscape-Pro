import { db } from '../db';
import { ProjectRecord } from '../db/types';
import { CreateProjectInput, UpdateProjectInput } from '../types/api';

export class ProjectService {
  public createProject(input: CreateProjectInput): ProjectRecord {
    return db.createProject({
      clientName: input.clientName,
      propertyAddress: input.propertyAddress,
      clientEmail: input.clientEmail,
      clientPhone: input.clientPhone,
      targetBudget: input.targetBudget,
      ghlOpportunityId: input.ghlOpportunityId,
      createdBy: input.createdBy
    });
  }

  public getProject(id: string): ProjectRecord | undefined {
    return db.getProject(id);
  }

  public updateProject(id: string, input: UpdateProjectInput): ProjectRecord | undefined {
    return db.updateProject(id, input);
  }

  public listProjects(): ProjectRecord[] {
    return db.listProjects();
  }
}

export const projectService = new ProjectService();
