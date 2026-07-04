export interface PlanItem {
  date: string;
  title: string;
  focus: string;
  detail: string;
  type: 'study' | 'task';
}

export interface StudyPlan {
  subject: string;
  examDate: string;
  deadline: string;
  summary: string;
  plan: PlanItem[];
}
