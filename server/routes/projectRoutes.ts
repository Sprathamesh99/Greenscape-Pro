import { Router } from 'express';
import { projectService } from '../services/projectService';
import { CreateProjectSchema, UpdateProjectSchema } from '../types/api';

const router = Router();

// GET /api/projects - List all projects
router.get('/', (req, res) => {
  const projects = projectService.listProjects();
  res.json({ success: true, data: projects });
});

// GET /api/projects/:id - Get project by ID
router.get('/:id', (req, res) => {
  const project = projectService.getProject(req.params.id);
  if (!project) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Project not found' } });
  }
  res.json({ success: true, data: project });
});

// POST /api/projects - Create project
router.post('/', (req, res) => {
  const parsed = CreateProjectSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid project payload', details: parsed.error.format() }
    });
  }

  const created = projectService.createProject(parsed.data);
  res.status(201).json({ success: true, data: created });
});

// PATCH /api/projects/:id - Update project
router.patch('/:id', (req, res) => {
  const parsed = UpdateProjectSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid project update payload', details: parsed.error.format() }
    });
  }

  const updated = projectService.updateProject(req.params.id, parsed.data);
  if (!updated) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Project not found' } });
  }
  res.json({ success: true, data: updated });
});

export default router;
