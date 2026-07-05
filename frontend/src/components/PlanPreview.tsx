import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import 'dayjs/locale/ja';
import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  List,
  ListItem,
  Typography,
} from '@mui/material';
import { CalendarMonth, Download } from '@mui/icons-material';

import type { PlanItem, StudyPlan } from '../types';

dayjs.locale('ja');

const primaryBlue = '#3b82f6';

const focusColorPalette = [
  { bg: '#eff6ff', border: '#bfdbfe', chipText: '#1e3a8a' },
  { bg: '#f0fdf4', border: '#bbf7d0', chipText: '#14532d' },
  { bg: '#faf5ff', border: '#e9d5ff', chipText: '#581c87' },
  { bg: '#fff7ed', border: '#fed7aa', chipText: '#7c2d12' },
  { bg: '#fefce8', border: '#fde68a', chipText: '#713f12' },
  { bg: '#f0fdfa', border: '#99f6e4', chipText: '#134e4a' },
  { bg: '#fdf2f8', border: '#fbcfe8', chipText: '#831843' },
];

const overflowFocusColor = {
  bg: '#f8fafc',
  border: '#cbd5e1',
  chipText: '#334155',
};

const testColor = {
  bg: '#fef2f2',
  border: '#fecaca',
  chipText: '#991b1b',
};
const CHECKED_TASKS_KEY = 'study-planner:checked-tasks';

interface PlanPreviewProps {
  subject: string;
  plan: StudyPlan | null;
  groupedPlan: Array<{ date: string; items: PlanItem[] }>;
}

function createDetailRows(details?: string[]) {
  if (!details?.length) return [];

  return Array.from({ length: Math.ceil(details.length / 2) }).map((_, index) => ({
    todo: details[index * 2] ?? '',
    advice: details[index * 2 + 1] ?? '',
  }));
}

function readCheckedTasks() {
  try {
    const savedTasks = localStorage.getItem(CHECKED_TASKS_KEY);

    return new Set(savedTasks ? (JSON.parse(savedTasks) as string[]) : []);
  } catch (error) {
    console.error('チェック状態の読み込みに失敗しました。', error);
    localStorage.removeItem(CHECKED_TASKS_KEY);

    return new Set<string>();
  }
}

function wrapText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
) {
  const lines: string[] = [];
  let line = '';

  text.split('').forEach((char) => {
    const nextLine = `${line}${char}`;

    if (line && context.measureText(nextLine).width > maxWidth) {
      lines.push(line);
      line = char;
      return;
    }

    line = nextLine;
  });

  if (line) {
    lines.push(line);
  }

  return lines;
}

function drawRoundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
}

function downloadPlanImage(
  plan: StudyPlan,
  groupedPlan: Array<{ date: string; items: PlanItem[] }>
) {
  const scale = window.devicePixelRatio || 1;
  const width = 1080;
  const padding = 56;
  const contentWidth = width - padding * 2;
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) return;

  context.font =
    '24px "Noto Sans JP", "Hiragino Sans", "Yu Gothic", sans-serif';

  const itemHeights = groupedPlan.flatMap((entry) =>
    entry.items.map((item) => {
      const detailRows = createDetailRows(item.details);
      const detailTexts = detailRows.length
        ? detailRows.map(
            (row) => `□ ${row.todo}${row.advice ? `  ${row.advice}` : ''}`
          )
        : [item.detail];

      const lineCount = detailTexts.reduce(
        (count, text) => count + wrapText(context, text, contentWidth - 52).length,
        0
      );

      return 88 + lineCount * 34;
    })
  );
  const summaryLines = wrapText(context, plan.summary, contentWidth);
  const height =
    190 +
    summaryLines.length * 34 +
    groupedPlan.length * 58 +
    itemHeights.reduce((total, itemHeight) => total + itemHeight, 0);

  canvas.width = width * scale;
  canvas.height = height * scale;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  context.scale(scale, scale);

  context.fillStyle = '#f7fbff';
  context.fillRect(0, 0, width, height);

  context.fillStyle = '#0f172a';
  context.font =
    '700 42px "Noto Sans JP", "Hiragino Sans", "Yu Gothic", sans-serif';
  context.fillText(`${plan.subject}勉強計画`, padding, 72);

  context.fillStyle = '#475569';
  context.font =
    '24px "Noto Sans JP", "Hiragino Sans", "Yu Gothic", sans-serif';
  summaryLines.forEach((line, index) => {
    context.fillText(line, padding, 118 + index * 34);
  });

  const metaY = 126 + summaryLines.length * 34;
  context.fillStyle = '#2563eb';
  context.font =
    '600 22px "Noto Sans JP", "Hiragino Sans", "Yu Gothic", sans-serif';
  context.fillText(`期限: ${dayjs(plan.examDate).format('YYYY/MM/DD')}`, padding, metaY);

  let y = metaY + 50;

  groupedPlan.forEach((entry) => {
    context.fillStyle = '#334155';
    context.font =
      '700 26px "Noto Sans JP", "Hiragino Sans", "Yu Gothic", sans-serif';
    context.fillText(dayjs(entry.date).format('MM/DD (ddd)'), padding, y);
    y += 22;

    entry.items.forEach((item) => {
      const isTestDate = entry.date === plan.examDate;
      const colors = isTestDate
        ? testColor
        : focusColorPalette[
            Math.abs(item.focus.length + item.title.length) % focusColorPalette.length
          ] ?? overflowFocusColor;
      const detailRows = createDetailRows(item.details);
      const detailTexts = detailRows.length
        ? detailRows.map(
            (row) => `□ ${row.todo}${row.advice ? `  ${row.advice}` : ''}`
          )
        : [item.detail];
      const detailLines = detailTexts.flatMap((text) =>
        wrapText(context, text, contentWidth - 52)
      );
      const cardHeight = 88 + detailLines.length * 34;

      drawRoundedRect(context, padding, y, contentWidth, cardHeight, 16);
      context.fillStyle = colors.bg;
      context.fill();
      context.strokeStyle = colors.border;
      context.lineWidth = 2;
      context.stroke();

      context.fillStyle = colors.chipText;
      context.font =
        '700 25px "Noto Sans JP", "Hiragino Sans", "Yu Gothic", sans-serif';
      context.fillText(
        item.type === 'test' ? item.title : item.focus,
        padding + 26,
        y + 42
      );

      context.fillStyle = '#475569';
      context.font =
        '24px "Noto Sans JP", "Hiragino Sans", "Yu Gothic", sans-serif';
      detailLines.forEach((line, index) => {
        context.fillText(line, padding + 26, y + 82 + index * 34);
      });

      y += cardHeight + 14;
    });

    y += 24;
  });

  const safeSubject = plan.subject.replace(/[\\/:*?"<>|]/g, '_') || 'study-plan';
  const link = document.createElement('a');
  link.download = `${safeSubject}-study-plan.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

export function PlanPreview({ subject, plan, groupedPlan }: PlanPreviewProps) {
  const [checkedTasks, setCheckedTasks] = useState<Set<string>>(() =>
    readCheckedTasks()
  );

  useEffect(() => {
    localStorage.setItem(CHECKED_TASKS_KEY, JSON.stringify([...checkedTasks]));
  }, [checkedTasks]);

  const toggleTask = (taskKey: string) => {
    setCheckedTasks((current) => {
      const next = new Set(current);

      if (next.has(taskKey)) {
        next.delete(taskKey);
      } else {
        next.add(taskKey);
      }

      return next;
    });
  };

  const focusColorMap = new Map<
    string,
    typeof focusColorPalette[number]
  >();

  if (plan) {
    plan.plan.forEach((item) => {
      if (focusColorMap.has(item.focus)) return;

      const nextIndex = focusColorMap.size;
      focusColorMap.set(
        item.focus,
        focusColorPalette[nextIndex % focusColorPalette.length]
      );
    });
  }

  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: 4,
        border: '1px solid #e2e8f0',
        minHeight: 560,
      }}
    >
      <CardContent sx={{ p: { xs: 2.5, md: 3 }, height: '100%' }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: { xs: 'flex-start', sm: 'center' },
            justifyContent: 'space-between',
            gap: 2,
            flexWrap: 'wrap',
            mb: 2.5,
          }}
        >
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

          {plan && (
            <Button
              variant="outlined"
              startIcon={<Download />}
              onClick={() => downloadPlanImage(plan, groupedPlan)}
              sx={{ borderRadius: 3, whiteSpace: 'nowrap' }}
            >
              画像保存
            </Button>
          )}
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
                      const isTestDate = entry.date === plan.examDate;
                      const colors =
                        isTestDate
                          ? testColor
                          : focusColorMap.get(item.focus) ?? overflowFocusColor;
                      const detailRows = createDetailRows(item.details);

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
                          <Box sx={{ width: '100%' }}>
                            <Typography
                              sx={{
                                color: colors.chipText,
                                fontWeight: 600,
                                mb: 0.75,
                              }}
                            >
                              {item.type === 'test' ? item.title : item.focus}
                            </Typography>

                            {detailRows.length ? (
                              <Box sx={{ display: 'grid', gap: 0.75 }}>
                                {detailRows.map((row, index) => {
                                  const taskKey = `${entry.date}-${item.title}-${item.focus}-${index}-${row.todo}`;
                                  const checked = checkedTasks.has(taskKey);

                                  return (
                                    <Box
                                      key={taskKey}
                                      sx={{
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        gap: 1,
                                      }}
                                    >
                                      <Checkbox
                                        checked={checked}
                                        onChange={() => toggleTask(taskKey)}
                                        size="small"
                                        sx={{
                                          color: colors.chipText,
                                          mt: -0.35,
                                          p: 0.25,
                                          '&.Mui-checked': {
                                            color: colors.chipText,
                                          },
                                        }}
                                      />
                                      <Typography
                                        variant="body2"
                                        color="text.secondary"
                                        sx={{
                                          opacity: checked ? 0.65 : 1,
                                          textDecoration: checked
                                            ? 'line-through'
                                            : 'none',
                                        }}
                                      >
                                        {row.todo}
                                        {row.advice ? ` ${row.advice}` : ''}
                                      </Typography>
                                    </Box>
                                  );
                                })}
                              </Box>
                            ) : (
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ whiteSpace: 'pre-line' }}
                              >
                                {item.detail}
                              </Typography>
                            )}
                          </Box>
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
  );
}
