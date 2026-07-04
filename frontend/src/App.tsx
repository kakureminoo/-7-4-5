import { useMemo, useState } from 'react';
import axios from 'axios';
import dayjs from 'dayjs';
import {
  Alert,
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
import { Add, CalendarMonth, Delete, School, TaskAlt } from '@mui/icons-material';

interface PlanItem {
  date: string;
  title: string;
  focus: string;
  detail: string;
  type: 'study' | 'task' | 'test';
}

interface StudyPlan {
  subject: string;
  examDate: string;
  deadline: string;
  summary: string;
  plan: PlanItem[];
}

interface ScopeItem {
  name: string;
  startPage: string;
  endPage: string;
}

const API_BASE = 'http://localhost:3001';
const primaryBlue = '#3b82f6';
const borderColor = '#dbeafe';

const focusColorPalette = [
  { bg: '#eff6ff', border: '#bfdbfe', chipBg: '#bfdbfe', chipText: '#1e3a8a' },
  { bg: '#f0fdf4', border: '#bbf7d0', chipBg: '#bbf7d0', chipText: '#14532d' },
  { bg: '#faf5ff', border: '#e9d5ff', chipBg: '#e9d5ff', chipText: '#581c87' },
  { bg: '#fff7ed', border: '#fed7aa', chipBg: '#fed7aa', chipText: '#7c2d12' },
  { bg: '#fefce8', border: '#fde68a', chipBg: '#fde68a', chipText: '#713f12' },
  { bg: '#f0fdfa', border: '#99f6e4', chipBg: '#99f6e4', chipText: '#134e4a' },
  { bg: '#fdf2f8', border: '#fbcfe8', chipBg: '#fbcfe8', chipText: '#831843' },
  { bg: '#f8fafc', border: '#cbd5e1', chipBg: '#e2e8f0', chipText: '#334155' },
];
const overflowFocusColor = { bg: '#f8fafc', border: '#cbd5e1', chipBg: '#e2e8f0', chipText: '#334155' };

function App() {
  const [excuseTask, setExcuseTask] = useState('テスト勉強');
  const [obstacles, setObstacles] = useState(
    'やる気が湧かない\n今日始めなくても問題ない\n内容理解ができず続かない\n他にやることがある\n予定が入ってしまっている'
  );
  const [excuseResult, setExcuseResult] = useState<any | null>(null);
  const [excuseLoading, setExcuseLoading] = useState(false);
  const [subject, setSubject] = useState('英語');
  const [examDate, setExamDate] = useState(dayjs().add(30, 'day').format('YYYY-MM-DD'));
  const [testTitle, setTestTitle] = useState('テスト');
  const [scopeItems, setScopeItems] = useState<ScopeItem[]>([
    { name: '単語', startPage: '1', endPage: '50' },
    { name: '文法', startPage: '1', endPage: '30' },
    { name: '長文', startPage: '1', endPage: '20' },
  ]);
  /*const [taskDeadline, setTaskDeadline] = useState(dayjs().add(25, 'day').format('YYYY-MM-DD')); */
  const [studyHoursPerDay, setStudyHoursPerDay] = useState('2');
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [chatInput, setChatInput] = useState('今日の勉強の進め方を教えて');
  const [answer, setAnswer] = useState('AIに質問して、勉強のコツを聞けます。');
  const [loading, setLoading] = useState(false);
  const [showScopeError, setShowScopeError] = useState(false);
  const [showDeadlineError, setShowDeadlineError] = useState(false);

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

  const focusColorMap = useMemo(() => {
    const map = new Map<string, typeof focusColorPalette[number]>();
    if (!plan) return map;

    plan.plan.forEach((item) => {
      if (map.has(item.focus)) return;
      const nextIndex = map.size;
      map.set(item.focus, focusColorPalette[nextIndex] ?? overflowFocusColor);
    });

    return map;
  }, [plan]);

  const normalizeScopeItem = (item: ScopeItem) => {
    const startPage = Number(item.startPage);
    const endPage = Number(item.endPage);

    if (!Number.isFinite(startPage) || !Number.isFinite(endPage) || !item.startPage || !item.endPage) {
      return item;
    }

    if (startPage <= endPage) {
      return item;
    }

    return {
      ...item,
      endPage: String(startPage),
    };
  };

  const updateScopeItem = (index: number, field: keyof ScopeItem, value: string) => {
    setScopeItems((items) => items.map((item, itemIndex) => (
      itemIndex === index ? normalizeScopeItem({ ...item, [field]: value }) : item
    )));
    setShowScopeError(false);
  };

  const addScopeItem = () => {
    setScopeItems((items) => [...items, { name: '', startPage: '', endPage: '' }]);
  };

  const removeScopeItem = (index: number) => {
    setScopeItems((items) => items.filter((_, itemIndex) => itemIndex !== index));
  };

  const generatePlan = async () => {
    const deadlineDate = dayjs(examDate);
    const isInvalidDeadline = !deadlineDate.isAfter(dayjs(), 'day') || deadlineDate.isAfter(dayjs().add(3, 'month'), 'day');
    const hasBlankScope = scopeItems.some((item) => (
      !item.name.trim() || !item.startPage.trim() || !item.endPage.trim()
    ));

    if (isInvalidDeadline) {
      setShowDeadlineError(true);
      return;
    }

    if (hasBlankScope) {
      setShowScopeError(true);
      return;
    }

    setLoading(true);
    try {
      const scope = scopeItems
        .map((item) => {
          const pageRange = item.startPage || item.endPage ? ` p.${item.startPage || '?'}-${item.endPage || '?'}` : '';
          return `${item.name}${pageRange}`.trim();
        })
        .filter(Boolean)
        .join('\n');

      const res = await axios.post(`${API_BASE}/api/generate-plan`, {
        subject,
        examDate,
        scope,
        testTitle,
        /*taskDeadline,*/
        studyHoursPerDay,
      });
      const generatedPlan = res.data.plan as StudyPlan;
      const planWithTest = testTitle.trim()
        ? {
          ...generatedPlan,
          plan: [
            ...generatedPlan.plan,
            {
              date: examDate,
              title: testTitle,
              focus: 'テスト',
              detail: '試験日です。直前は新しい範囲を増やしすぎず、確認と復習を中心にします。',
              type: 'test' as const,
            },
          ].sort((a, b) => a.date.localeCompare(b.date)),
        }
        : generatedPlan;
      setPlan(planWithTest);
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
  const breakExcuses = async () => {
    setExcuseLoading(true);

    try {
      const res = await axios.post(`${API_BASE}/api/excuse-breaker`, {
        task: excuseTask,
        obstacles,
      });

      console.log('excuse breaker response:', res.data);
      setExcuseResult(res.data.result);
    } catch (error) {
      console.error(error);
    } finally {
      setExcuseLoading(false);
    }
  };
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f7fbff' }}>
      <Container maxWidth="xl" sx={{ py: { xs: 3, md: 4 } }}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, md: 4 },
            mb: 3,
            borderRadius: 4,
            color: '#1e3a8a',
            bgcolor: '#eaf4ff',
            border: `1px solid ${borderColor}`,
          }}
        >
          <Typography variant="overline" sx={{ color: primaryBlue, fontWeight: 600, letterSpacing: 1 }}>
            Study Planner
          </Typography>
          <Typography variant="h3" component="h1" sx={{ mt: 0.5, fontWeight: 600, fontSize: { xs: 32, md: 44 } }}>
            テスト勉強プランナー
          </Typography>
          <Typography sx={{ mt: 1.5, maxWidth: 760, color: '#475569', lineHeight: 1.8 }}>
            試験日・範囲・提出課題から、3か月以内で終わる学習スケジュールを作成します。
          </Typography>
        </Paper>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '0.95fr 1.25fr' }, gap: 3 }}>
          <Card elevation={0} sx={{ borderRadius: 4, border: '1px solid #e2e8f0' }}>
            <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mb: 2.5 }}>
                <School sx={{ color: primaryBlue }} />
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    入力フォーム
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    テスト情報を入力して、学習予定を作ります。
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField label="テスト名" value={testTitle} onChange={(e) => setTestTitle(e.target.value)} fullWidth />
                <TextField label="科目" value={subject} onChange={(e) => setSubject(e.target.value)} fullWidth />
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {showDeadlineError && (
                    <Alert severity="warning" sx={{ borderRadius: 3 }}>
                      期限は今日より後、かつ3か月以内の日付を入力してください。
                    </Alert>
                  )}
                  <TextField
                    label="期限"
                    type="date"
                    value={examDate}
                    onChange={(e) => {
                      setExamDate(e.target.value);
                      setShowDeadlineError(false);
                    }}
                    error={showDeadlineError}
                    fullWidth
                  />
                </Box>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <Typography variant="subtitle2" sx={{ color: '#334155', fontWeight: 600 }}>
                    範囲
                  </Typography>
                  {showScopeError && (
                    <Alert severity="warning" sx={{ borderRadius: 3 }}>
                      範囲に空欄があります。参考書・章・分野、開始p、終了pを入力してください。
                    </Alert>
                  )}
                  {scopeItems.map((item, index) => (
                    <Box
                      key={index}
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr 1fr', sm: 'minmax(0, 1fr) 96px 96px 48px' },
                        gap: 1,
                        alignItems: 'center',
                      }}
                    >
                      <TextField
                        label="参考書・章・分野"
                        value={item.name}
                        onChange={(e) => updateScopeItem(index, 'name', e.target.value)}
                        error={showScopeError && !item.name.trim()}
                        helperText={showScopeError && !item.name.trim() ? '未入力です' : undefined}
                        sx={{ gridColumn: { xs: '1 / -1', sm: 'auto' } }}
                        fullWidth
                      />
                      <TextField
                        label="開始p"
                        type="number"
                        value={item.startPage}
                        onChange={(e) => updateScopeItem(index, 'startPage', e.target.value)}
                        error={showScopeError && !item.startPage.trim()}
                        helperText={showScopeError && !item.startPage.trim() ? '未入力' : undefined}
                        slotProps={{ htmlInput: { min: 1 } }}
                      />
                      <TextField
                        label="終了p"
                        type="number"
                        value={item.endPage}
                        onChange={(e) => updateScopeItem(index, 'endPage', e.target.value)}
                        error={showScopeError && !item.endPage.trim()}
                        helperText={showScopeError && !item.endPage.trim() ? '未入力' : undefined}
                        slotProps={{ htmlInput: { min: Number(item.startPage || 1) } }}
                      />
                      <Button
                        variant="outlined"
                        color="error"
                        onClick={() => removeScopeItem(index)}
                        disabled={scopeItems.length === 1}
                        sx={{ minWidth: 48, height: 56 }}
                      >
                        <Delete fontSize="small" />
                      </Button>
                    </Box>
                  ))}
                  <Button variant="outlined" onClick={addScopeItem} startIcon={<Add />} sx={{ borderRadius: 3 }}>
                    範囲を追加
                  </Button>
                </Box>

                {/* <TextField label="課題締切" type="date" value={taskDeadline} onChange={(e) => setTaskDeadline(e.target.value)} /> */}
                <TextField label="1日あたりの学習時間（時間）" type="number" value={studyHoursPerDay} onChange={(e) => setStudyHoursPerDay(e.target.value)} fullWidth />
                <Button
                  variant="contained"
                  onClick={generatePlan}
                  disabled={loading}
                  sx={{
                    py: 1.35,
                    borderRadius: 3,
                    bgcolor: primaryBlue,
                    fontWeight: 600,
                    boxShadow: 'none',
                    '&:hover': { bgcolor: '#2563eb', boxShadow: 'none' },
                  }}
                >
                  {loading ? '生成中...' : '学習スケジュールを作成'}
                </Button>
              </Box>
            </CardContent>
          </Card>

          <Card elevation={0} sx={{ borderRadius: 4, border: '1px solid #e2e8f0', minHeight: 560 }}>
            <CardContent sx={{ p: { xs: 2.5, md: 3 }, height: '100%' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                  <CalendarMonth sx={{ color: primaryBlue }} />
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {subject ? `${subject}勉強計画` : '勉強計画'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      日付ごとの予定を一覧で確認できます。
                    </Typography>
                  </Box>
                </Box>
                <Chip label="3か月以内" sx={{ bgcolor: '#dcfce7', color: '#15803d', fontWeight: 600 }} />
              </Box>

              {plan ? (
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {plan.summary}
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {groupedPlan.map((entry) => (
                      <Box key={entry.date}>
                        <Typography sx={{ mb: 1, fontWeight: 600, color: '#334155' }}>
                          {dayjs(entry.date).format('MM/DD (ddd)')}
                        </Typography>
                        <List disablePadding>
                          {entry.items.map((item) => {
                            const colors = focusColorMap.get(item.focus) ?? overflowFocusColor;
                            return (
                              <ListItem
                                key={`${entry.date}-${item.title}-${item.focus}`}
                                sx={{
                                  mb: 1,
                                  borderRadius: 3,
                                  border: `1px solid ${colors.border}`,
                                  bgcolor: colors.bg,
                                }}
                              >
                                <ListItemText
                                  primary={
                                    <Typography sx={{ color: colors.chipText, fontWeight: 600 }}>
                                      {item.type === 'test' ? item.title : item.focus}
                                    </Typography>
                                  }
                                  secondary={item.detail}
                                />
                              </ListItem>
                            );
                          })}
                        </List>
                      </Box>
                    ))}
                  </Box>
                </Box>
              ) : (
                <Box
                  sx={{
                    minHeight: 420,
                    display: 'grid',
                    placeItems: 'center',
                    textAlign: 'center',
                    border: '1px dashed #cbd5e1',
                    borderRadius: 4,
                    bgcolor: '#f8fafc',
                    px: 3,
                  }}
                >
                  <Box>
                    <CalendarMonth sx={{ color: '#93c5fd', fontSize: 44, mb: 1 }} />
                    <Typography sx={{ fontWeight: 600, color: '#475569' }}>
                      まずは入力して「作成」ボタンを押してください。
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      作成後、ここに日付ごとの予定が表示されます。
                    </Typography>
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
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
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              言いわけブレイカー
            </Typography>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              やることに対して、めんどくさい理由や障害を書いてください。
              AIがそれを小さな行動に変換します。
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="やること"
                value={excuseTask}
                onChange={(e) => setExcuseTask(e.target.value)}
                fullWidth
              />

              <TextField
                label="障害・言いわけ"
                value={obstacles}
                onChange={(e) => setObstacles(e.target.value)}
                multiline
                minRows={5}
                fullWidth
                helperText="1行に1つずつ入力してください"
              />

              <Button
                variant="contained"
                color="secondary"
                onClick={breakExcuses}
                disabled={excuseLoading}
              >
                {excuseLoading ? '変換中...' : '言いわけを行動に変える'}
              </Button>

              {excuseResult && (
                <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f8f9fa' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                    {excuseResult.summary}
                  </Typography>

                  <List>
                    {excuseResult.responses.map((item: any, index: number) => (
                      <ListItem
                        key={`${item.obstacle}-${index}`}
                        sx={{
                          display: 'block',
                          bgcolor: '#ffffff',
                          borderRadius: 2,
                          mb: 1,
                          border: '1px solid #eee',
                        }}
                      >
                        <Typography variant="body2" color="text.secondary">
                          障害：{item.obstacle}
                        </Typography>
                        <Typography variant="body1" sx={{ mt: 0.5 }}>
                          → {item.reply}
                        </Typography>
                      </ListItem>
                    ))}
                  </List>
                </Paper>
              )}
            </Box>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}

export default App;
