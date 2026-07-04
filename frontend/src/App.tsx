import { useMemo, useState } from 'react';
import axios from 'axios';
import dayjs from 'dayjs';
import { Box, Card, CardContent, Chip, Container, Typography } from '@mui/material';
import { TaskAlt } from '@mui/icons-material';
import type { PlanItem, StudyPlan } from './types';
import { PlannerHeader } from './components/PlannerHeader';
import { PlannerForm } from './components/PlannerForm';
import { PlanPreview } from './components/PlanPreview';
import { ChatPanel } from './components/ChatPanel';

const API_BASE = 'http://localhost:3001';

function App() {
  const [subject, setSubject] = useState('英語');
  const [examDate, setExamDate] = useState(dayjs().add(30, 'day').format('YYYY-MM-DD'));
  const [scope, setScope] = useState('単語\n文法\n長文');
  const [taskTitle, setTaskTitle] = useState('レポート提出');
  const [taskDeadline, setTaskDeadline] = useState(dayjs().add(25, 'day').format('YYYY-MM-DD'));
  const [studyHoursPerDay, setStudyHoursPerDay] = useState('2');
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [chatInput, setChatInput] = useState('今日の勉強の進め方を教えて');
  const [answer, setAnswer] = useState('AIに質問して、勉強のコツを聞けます。');
  const [loading, setLoading] = useState(false);

  const groupedPlan = useMemo(() => {
    if (!plan) return [] as Array<{ date: string; items: PlanItem[] }>;
    const map = new Map<string, PlanItem[]>();
    plan.plan.forEach((item) => {
      const arr = map.get(item.date) ?? [];
      arr.push(item);
      map.set(item.date, arr);
    });
    return Array.from(map.entries()).map(([date, items]) => ({ date, items }));
  }, [plan]);

  const generatePlan = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/api/generate-plan`, {
        subject,
        examDate,
        scope,
        taskTitle,
        taskDeadline,
        studyHoursPerDay,
      });
      setPlan(res.data.plan);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const askAi = async () => {
    if (!plan) return;
    try {
      const res = await axios.post(`${API_BASE}/api/chat`, {
        message: chatInput,
        plan,
      });
      setAnswer(res.data.answer);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <PlannerHeader />

        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
          <Box sx={{ flex: 1 }}>
            <PlannerForm
              subject={subject}
              examDate={examDate}
              scope={scope}
              taskTitle={taskTitle}
              taskDeadline={taskDeadline}
              studyHoursPerDay={studyHoursPerDay}
              loading={loading}
              onSubjectChange={setSubject}
              onExamDateChange={setExamDate}
              onScopeChange={setScope}
              onTaskTitleChange={setTaskTitle}
              onTaskDeadlineChange={setTaskDeadline}
              onStudyHoursChange={setStudyHoursPerDay}
              onGenerate={generatePlan}
            />
          </Box>

          <Box sx={{ flex: 1 }}>
            <PlanPreview plan={plan} groupedPlan={groupedPlan} />
          </Box>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
          <Box sx={{ flex: 1 }}>
            <ChatPanel
              chatInput={chatInput}
              answer={answer}
              loading={loading}
              disabled={!plan}
              onChatInputChange={setChatInput}
              onAsk={askAi}
            />
          </Box>

          <Box sx={{ flex: 1 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <TaskAlt color="primary" />
                  <Typography variant="h6">今すぐやること</Typography>
                </Box>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  <Chip label="試験日を設定" />
                  <Chip label="範囲を入力" />
                  <Chip label="課題締切を入れる" />
                  <Chip label="AIに相談" />
                </Box>
              </CardContent>
            </Card>
          </Box>
        </Box>
      </Box>
    </Container>
  );
}

export default App;



