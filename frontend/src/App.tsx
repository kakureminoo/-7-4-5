import { useMemo, useState } from 'react';
import axios from 'axios';
import dayjs from 'dayjs';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  List,
  ListItem,
  ListItemText,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import { CalendarMonth, School, TaskAlt } from '@mui/icons-material';

interface PlanItem {
  date: string;
  title: string;
  focus: string;
  detail: string;
  type: 'study' | 'task';
}

interface StudyPlan {
  subject: string;
  examDate: string;
  deadline: string;
  summary: string;
  plan: PlanItem[];
}

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
        <Paper elevation={0} sx={{ p: 4, borderRadius: 3, bgcolor: 'primary.main', color: 'white' }}>
          <Typography variant="h3" gutterBottom>
            テスト勉強特化プランナー
          </Typography>
          <Typography variant="body1">
            試験日・範囲・提出課題から、3か月以内で終わる学習スケジュールを作成します。
          </Typography>
        </Paper>

        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
          <Box sx={{ flex: 1 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  入力フォーム
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <TextField label="科目" value={subject} onChange={(e) => setSubject(e.target.value)} fullWidth />
                  <TextField label="試験日" type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
                  <TextField label="試験範囲" multiline minRows={3} value={scope} onChange={(e) => setScope(e.target.value)} />
                  <TextField label="提出課題" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} fullWidth />
                  <TextField label="課題締切" type="date" value={taskDeadline} onChange={(e) => setTaskDeadline(e.target.value)} />
                  <TextField label="1日あたりの学習時間（時間）" type="number" value={studyHoursPerDay} onChange={(e) => setStudyHoursPerDay(e.target.value)} />
                  <Button variant="contained" onClick={generatePlan} disabled={loading}>
                    {loading ? '生成中...' : '学習スケジュールを作成'}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Box>

          <Box sx={{ flex: 1 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <CalendarMonth color="primary" />
                  <Typography variant="h6">カレンダー表示</Typography>
                </Box>
                {plan ? (
                  <>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {plan.summary}
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {groupedPlan.map((entry) => (
                        <Box key={entry.date}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                            {dayjs(entry.date).format('MM/DD (ddd)')}
                          </Typography>
                          <List dense>
                            {entry.items.map((item) => (
                              <ListItem key={`${entry.date}-${item.title}`} sx={{ bgcolor: item.type === 'task' ? '#fff8e1' : '#f5f5f5', borderRadius: 2, mb: 1 }}>
                                <ListItemText
                                  primary={item.title}
                                  secondary={`${item.focus} / ${item.detail}`}
                                />
                              </ListItem>
                            ))}
                          </List>
                        </Box>
                      ))}
                    </Box>
                  </>
                ) : (
                  <Typography color="text.secondary">まずは入力して「作成」ボタンを押してください。</Typography>
                )}
              </CardContent>
            </Card>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
          <Box sx={{ flex: 1 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <School color="primary" />
                  <Typography variant="h6">AIチャット</Typography>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <TextField label="質問する" value={chatInput} onChange={(e) => setChatInput(e.target.value)} fullWidth />
                  <Button variant="outlined" onClick={askAi} disabled={!plan}>
                    質問する
                  </Button>
                  <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f8f9fa' }}>
                    <Typography variant="body1">{answer}</Typography>
                  </Paper>
                </Box>
              </CardContent>
            </Card>
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
