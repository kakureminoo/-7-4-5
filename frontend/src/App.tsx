import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import dayjs from 'dayjs';
import {
  Box,
  Card,
  CardContent,
  Container,
} from '@mui/material';

import type { PlanItem, SavedPlan, ScopeItem, StudyPlan } from './types';
import { PlannerHeader } from './components/PlannerHeader';
import { PlannerForm } from './components/PlannerForm';
import { PlanPreview } from './components/PlanPreview';
import { ChatPanel } from './components/ChatPanel';
import { PlanHistory } from './components/PlanHistory';

const API_BASE = 'http://localhost:3001';
const SAVED_PLAN_KEY = 'study-planner:saved-plan';

function readSavedPlan() {
  try {
    const savedPlan = localStorage.getItem(SAVED_PLAN_KEY);

    return savedPlan ? (JSON.parse(savedPlan) as StudyPlan) : null;
  } catch (error) {
    console.error('保存済み計画の読み込みに失敗しました。', error);
    localStorage.removeItem(SAVED_PLAN_KEY);

    return null;
  }
}

function App() {
  const [savedPlan] = useState<StudyPlan | null>(() => readSavedPlan());
  const [subject, setSubject] = useState(savedPlan?.subject ?? '英語');
  const [examDate, setExamDate] = useState(
    savedPlan?.examDate ?? dayjs().add(30, 'day').format('YYYY-MM-DD')
  );
  const [testTitle, setTestTitle] = useState('テスト');

  const [scopeItems, setScopeItems] = useState<ScopeItem[]>([
    { name: '単語', startPage: '1', endPage: '50' },
    { name: '文法', startPage: '1', endPage: '30' },
    { name: '長文', startPage: '1', endPage: '20' },
  ]);

  const [studyHoursPerDay, setStudyHoursPerDay] = useState('2');
  const [plan, setPlan] = useState<StudyPlan | null>(savedPlan);

  const [chatInput, setChatInput] = useState('今日の勉強の進め方を教えて');
  const [answer, setAnswer] = useState('AIに質問して、勉強のコツを聞けます。');

  const [loading, setLoading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState('');
  const [savedPlans, setSavedPlans] = useState<SavedPlan[]>([]);
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

  const fetchSavedPlans = async () => {
    try {
      setHistoryLoading(true);
      setHistoryError('');

      const res = await axios.get<SavedPlan[]>(`${API_BASE}/api/plans`);
      setSavedPlans(res.data);
    } catch (error) {
      console.error(error);
      setHistoryError('保存済み計画の読み込みに失敗しました。Supabase設定とbackendの起動を確認してください。');
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    let active = true;

    axios
      .get<SavedPlan[]>(`${API_BASE}/api/plans`)
      .then((res) => {
        if (!active) return;
        setSavedPlans(res.data);
      })
      .catch((error) => {
        if (!active) return;
        console.error(error);
        setHistoryError('保存済み計画の読み込みに失敗しました。Supabase設定とbackendの起動を確認してください。');
      })
      .finally(() => {
        if (!active) return;
        setHistoryLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!plan) {
      localStorage.removeItem(SAVED_PLAN_KEY);
      return;
    }

    localStorage.setItem(SAVED_PLAN_KEY, JSON.stringify(plan));
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

      try {
        await axios.post(`${API_BASE}/api/plans`, {
          plan: planWithTest,
        });
        await fetchSavedPlans();
      } catch (saveError) {
        console.error(saveError);
        setHistoryError('計画の表示はできていますが、Supabaseへの保存に失敗しました。');
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const openSavedPlan = (savedPlan: SavedPlan) => {
    setPlan(savedPlan.plan_json);
    setSubject(savedPlan.plan_json.subject);
    setExamDate(savedPlan.plan_json.examDate);
    setAnswer('保存済みの計画を開きました。この計画についてAIに質問できます。');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const askAi = async () => {
    if (!plan || chatLoading) return;

    try {
      setChatLoading(true);
      setAnswer('回答を生成しています...');

      const res = await axios.post(`${API_BASE}/api/chat`, {
        message: chatInput,
        plan,
      });

      setAnswer(res.data.answer);
    } catch (error) {
      console.error(error);
      setAnswer('AIチャットの通信に失敗しました。backendが起動しているか確認してください。');
    } finally {
      setChatLoading(false);
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
            subject={plan?.subject ?? subject}
            plan={plan}
            groupedPlan={groupedPlan}
          />
        </Box>

        <PlanHistory
          plans={savedPlans}
          loading={historyLoading}
          error={historyError}
          onRefresh={fetchSavedPlans}
          onSelectPlan={openSavedPlan}
        />

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
              loading={chatLoading}
              onChatInputChange={setChatInput}
              onAsk={askAi}
            />
          </CardContent>
        </Card>

      </Container>
    </Box>
  );
}

export default App;
