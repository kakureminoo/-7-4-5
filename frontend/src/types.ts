export interface PlanItem {
  date: string;
  title: string;
  focus: string;
  detail: string;
  details?: string[];
  type: 'study' | 'task' | 'test';
}

export interface StudyPlan {
  subject: string;
  examDate: string;
  deadline: string;
  summary: string;
  plan: PlanItem[];
}

export interface SavedPlan {
  id: string | number;
  subject: string;
  plan_json: StudyPlan;
  created_at: string;
}

export interface ScopeItem {
  name: string;
  startPage: string;
  endPage: string;
}
