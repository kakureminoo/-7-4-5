import { Box, Button, Card, CardContent, TextField, Typography } from '@mui/material';

interface PlannerFormProps {
  subject: string;
  examDate: string;
  scope: string;
  taskTitle: string;
  taskDeadline: string;
  studyHoursPerDay: string;
  loading: boolean;
  onSubjectChange: (value: string) => void;
  onExamDateChange: (value: string) => void;
  onScopeChange: (value: string) => void;
  onTaskTitleChange: (value: string) => void;
  onTaskDeadlineChange: (value: string) => void;
  onStudyHoursChange: (value: string) => void;
  onGenerate: () => void;
}

export function PlannerForm({
  subject,
  examDate,
  scope,
  taskTitle,
  taskDeadline,
  studyHoursPerDay,
  loading,
  onSubjectChange,
  onExamDateChange,
  onScopeChange,
  onTaskTitleChange,
  onTaskDeadlineChange,
  onStudyHoursChange,
  onGenerate,
}: PlannerFormProps) {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          入力フォーム
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField label="科目" value={subject} onChange={(e) => onSubjectChange(e.target.value)} fullWidth />
          <TextField label="試験日" type="date" value={examDate} onChange={(e) => onExamDateChange(e.target.value)} />
          <TextField label="試験範囲" multiline minRows={3} value={scope} onChange={(e) => onScopeChange(e.target.value)} />
          <TextField label="提出課題" value={taskTitle} onChange={(e) => onTaskTitleChange(e.target.value)} fullWidth />
          <TextField label="課題締切" type="date" value={taskDeadline} onChange={(e) => onTaskDeadlineChange(e.target.value)} />
          <TextField label="1日あたりの学習時間（時間）" type="number" value={studyHoursPerDay} onChange={(e) => onStudyHoursChange(e.target.value)} />
          <Button variant="contained" onClick={onGenerate} disabled={loading}>
            {loading ? '生成中...' : '学習スケジュールを作成'}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}
