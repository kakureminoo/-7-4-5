export interface PlanItem {
  date: string;
  title: string;
  focus: string;
  detail: string;
  type: 'study' | 'task' | 'test';
}

export interface StudyPlan {
  subject: string;
  examDate: string;
  deadline: string;
  summary: string;
  plan: PlanItem[];
}

export interface ScopeItem {
  name: string;
  startPage: string;
  endPage: string;
}