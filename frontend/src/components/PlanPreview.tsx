import dayjs from 'dayjs';
import { Box, Card, CardContent, List, ListItem, ListItemText, Typography } from '@mui/material';
import { CalendarMonth } from '@mui/icons-material';
import type { PlanItem, StudyPlan } from '../types';

interface PlanPreviewProps {
  plan: StudyPlan | null;
  groupedPlan: Array<{ date: string; items: PlanItem[] }>;
}

export function PlanPreview({ plan, groupedPlan }: PlanPreviewProps) {
  return (
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
                        <ListItemText primary={item.title} secondary={`${item.focus} / ${item.detail}`} />
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
  );
}
