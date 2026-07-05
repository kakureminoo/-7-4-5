import dayjs from 'dayjs';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  List,
  ListItem,
  Typography,
} from '@mui/material';
import { History, OpenInNew, Refresh } from '@mui/icons-material';

import type { SavedPlan } from '../types';

interface PlanHistoryProps {
  plans: SavedPlan[];
  loading: boolean;
  error: string;
  onRefresh: () => void;
  onSelectPlan: (savedPlan: SavedPlan) => void;
}

export function PlanHistory({
  plans,
  loading,
  error,
  onRefresh,
  onSelectPlan,
}: PlanHistoryProps) {
  return (
    <Card
      elevation={0}
      sx={{
        mt: 3,
        borderRadius: 4,
        border: '1px solid #e2e8f0',
      }}
    >
      <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: { xs: 'flex-start', sm: 'center' },
            justifyContent: 'space-between',
            gap: 2,
            flexWrap: 'wrap',
            mb: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
            <History sx={{ color: '#3b82f6' }} />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                保存した計画
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Supabaseに保存された計画を開き直せます。
              </Typography>
            </Box>
          </Box>

          <Button
            variant="outlined"
            startIcon={loading ? <CircularProgress size={16} /> : <Refresh />}
            onClick={onRefresh}
            disabled={loading}
            sx={{ borderRadius: 3, whiteSpace: 'nowrap' }}
          >
            再読み込み
          </Button>
        </Box>

        {error && (
          <Alert severity="warning" sx={{ borderRadius: 3, mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading && !plans.length ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 2 }}>
            <CircularProgress size={20} />
            <Typography variant="body2" color="text.secondary">
              保存済み計画を読み込んでいます。
            </Typography>
          </Box>
        ) : plans.length ? (
          <List disablePadding>
            {plans.map((savedPlan) => (
              <ListItem
                key={savedPlan.id}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '1fr',
                    sm: 'minmax(0, 1fr) auto',
                  },
                  gap: 1.5,
                  alignItems: 'center',
                  px: 0,
                  py: 1.25,
                  borderTop: '1px solid #e2e8f0',
                }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      flexWrap: 'wrap',
                      mb: 0.5,
                    }}
                  >
                    <Typography sx={{ fontWeight: 600, color: '#0f172a' }}>
                      {savedPlan.plan_json.subject}勉強計画
                    </Typography>
                    <Chip
                      size="small"
                      label={`${savedPlan.plan_json.plan.length}件`}
                      sx={{ bgcolor: '#eff6ff', color: '#1e40af' }}
                    />
                  </Box>

                  <Typography variant="body2" color="text.secondary">
                    作成: {dayjs(savedPlan.created_at).format('YYYY/MM/DD HH:mm')}
                    {' / '}
                    期限: {dayjs(savedPlan.plan_json.examDate).format('YYYY/MM/DD')}
                  </Typography>
                </Box>

                <Button
                  variant="contained"
                  startIcon={<OpenInNew />}
                  onClick={() => onSelectPlan(savedPlan)}
                  sx={{
                    borderRadius: 3,
                    boxShadow: 'none',
                    whiteSpace: 'nowrap',
                  }}
                >
                  開く
                </Button>
              </ListItem>
            ))}
          </List>
        ) : (
          <Box
            sx={{
              border: '1px dashed #cbd5e1',
              borderRadius: 3,
              bgcolor: '#f8fafc',
              px: 2,
              py: 2.5,
            }}
          >
            <Typography variant="body2" color="text.secondary">
              まだ保存された計画はありません。学習スケジュールを作成するとここに表示されます。
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
