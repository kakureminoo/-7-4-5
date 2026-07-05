import { useMemo, useState } from 'react';
import axios from 'axios';
import dayjs from 'dayjs';
import {
  Box,
  Card,
  CardContent,
  Chip,
  Container,
  Typography,
} from '@mui/material';
import { TaskAlt } from '@mui/icons-material';

import type { PlanItem, ScopeItem, StudyPlan } from './types';
import { PlannerHeader } from './components/PlannerHeader';
import { PlannerForm } from './components/PlannerForm';
import { PlanPreview } from './components/PlanPreview';
import { ChatPanel } from './components/ChatPanel';

const API_BASE = 'http://localhost:3001';

function App() {
  const [subject, setSubject] = useState('英語');
  const [examDate, setExamDate] = useState(
    dayjs().add(30, 'day').format('YYYY-MM-DD')
  );
  const [testTitle, setTestTitle] = useState('テスト');

  const [scopeItems, setScopeItems] = useState<ScopeItem[]>([
    { name: '単語', startPage: '1', endPage: '50' },
    { name: '文法', startPage: '1', endPage: '30' },
    { name: '長文', startPage: '1', endPage: '20' },
  ]);

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

    return Array.from(map.entries()).map(([date, items]) => ({
      date,
      items,
    }));
  }, [plan]);

  const normalizeScopeItem = (item: ScopeItem) => {
    const startPage = Number(item.startPage);
    const endPage = Number(item.endPage);

    if (
      !Number.isFinite(startPage) ||
      !Number.isFinite(endPage) ||
      !item.startPage ||
      !item.endPage
    ) {
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

  const updateScopeItem = (
    index: number,
    field: keyof ScopeItem,
    value: string
  ) => {
    setScopeItems((items) =>
      items.map((item, itemIndex) =>
        itemIndex === index
          ? normalizeScopeItem({ ...item, [field]: value })
          : item
      )
    );
    setShowScopeError(false);
  };

  const addScopeItem = () => {
    setScopeItems((items) => [
      ...items,
      { name: '', startPage: '', endPage: '' },
    ]);
  };

  const removeScopeItem = (index: number) => {
    setScopeItems((items) =>
      items.filter((_, itemIndex) => itemIndex !== index)
    );
  };

  const generatePlan = async () => {
    const deadlineDate = dayjs(examDate);

    const isInvalidDeadline =
      !deadlineDate.isAfter(dayjs(), 'day') ||
      deadlineDate.isAfter(dayjs().add(1, 'month'), 'day');

    const hasBlankScope = scopeItems.some(
      (item) =>
        !item.name.trim() ||
        !item.startPage.trim() ||
        !item.endPage.trim()
    );

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
          const pageRange =
            item.startPage || item.endPage
              ? ` p.${item.startPage || '?'}-${item.endPage || '?'}`
              : '';

          return `${item.name}${pageRange}`.trim();
        })
        .filter(Boolean)
        .join('\n');

      const res = await axios.post(`${API_BASE}/api/generate-plan`, {
        subject,
        examDate,
        scope,
        taskTitle: testTitle,
        taskDeadline: examDate,
        studyHoursPerDay,
      });

      const generatedPlan = res.data.plan as StudyPlan;

      const planWithTest: StudyPlan = testTitle.trim()
        ? {
            ...generatedPlan,
            plan: [
              ...generatedPlan.plan,
              {
                date: examDate,
                title: testTitle,
                focus: 'テスト',
                detail:
                  '試験日です。直前は新しい範囲を増やしすぎず、確認と復習を中心にします。',
                details: [
                  testTitle,
                  '直前は新しい範囲を増やしすぎず、確認と復習を中心にします。',
                ],
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
      setAnswer('AIチャットの通信に失敗しました。backendが起動しているか確認してください。');
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f7fbff' }}>
      <Container maxWidth="xl" sx={{ py: { xs: 3, md: 4 } }}>
        <PlannerHeader />

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: '0.95fr 1.25fr' },
            gap: 3,
          }}
        >
          <PlannerForm
            subject={subject}
            examDate={examDate}
            testTitle={testTitle}
            scopeItems={scopeItems}
            studyHoursPerDay={studyHoursPerDay}
            loading={loading}
            showScopeError={showScopeError}
            showDeadlineError={showDeadlineError}
            onSubjectChange={setSubject}
            onExamDateChange={(value) => {
              setExamDate(value);
              setShowDeadlineError(false);
            }}
            onTestTitleChange={setTestTitle}
            onStudyHoursChange={setStudyHoursPerDay}
            onScopeItemChange={updateScopeItem}
            onAddScopeItem={addScopeItem}
            onRemoveScopeItem={removeScopeItem}
            onGenerate={generatePlan}
          />

          <PlanPreview
            subject={subject}
            plan={plan}
            groupedPlan={groupedPlan}
          />
        </Box>

        <Card
          elevation={0}
          sx={{
            mt: 3,
            borderRadius: 4,
            border: '1px solid #e2e8f0',
          }}
        >
          <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
            <ChatPanel
              chatInput={chatInput}
              answer={answer}
              disabled={!plan}
              onChatInputChange={setChatInput}
              onAsk={askAi}
            />
          </CardContent>
        </Card>

        <Card
          elevation={0}
          sx={{
            mt: 3,
            borderRadius: 4,
            border: '1px solid #e2e8f0',
          }}
        >
          <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <TaskAlt color="primary" />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                今すぐやること
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              <Chip label="期限を設定" />
              <Chip label="範囲を入力" />
              <Chip label="学習時間を決める" />
              <Chip label="AIに相談" />
            </Box>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}

export default App;
