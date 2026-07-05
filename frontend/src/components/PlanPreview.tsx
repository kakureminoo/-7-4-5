import { useState } from 'react';
import dayjs from 'dayjs';
import {
  Box,
  Card,
  CardContent,
  Checkbox,
  Chip,
  List,
  ListItem,
  Typography,
} from '@mui/material';
import { CalendarMonth } from '@mui/icons-material';

import type { PlanItem, StudyPlan } from '../types';

const primaryBlue = '#3b82f6';

const focusColorPalette = [
  { bg: '#eff6ff', border: '#bfdbfe', chipText: '#1e3a8a' },
  { bg: '#f0fdf4', border: '#bbf7d0', chipText: '#14532d' },
  { bg: '#faf5ff', border: '#e9d5ff', chipText: '#581c87' },
  { bg: '#fff7ed', border: '#fed7aa', chipText: '#7c2d12' },
  { bg: '#fefce8', border: '#fde68a', chipText: '#713f12' },
  { bg: '#f0fdfa', border: '#99f6e4', chipText: '#134e4a' },
  { bg: '#fdf2f8', border: '#fbcfe8', chipText: '#831843' },
  { bg: '#f8fafc', border: '#cbd5e1', chipText: '#334155' },
];

const overflowFocusColor = {
  bg: '#f8fafc',
  border: '#cbd5e1',
  chipText: '#334155',
};

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

export function PlanPreview({ subject, plan, groupedPlan }: PlanPreviewProps) {
  const [checkedTasks, setCheckedTasks] = useState<Set<string>>(() => new Set());

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
        focusColorPalette[nextIndex] ?? overflowFocusColor
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
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
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

          <Chip
            label="1か月以内"
            sx={{
              bgcolor: '#dcfce7',
              color: '#15803d',
              fontWeight: 600,
            }}
          />
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
                      const colors =
                        focusColorMap.get(item.focus) ?? overflowFocusColor;
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
