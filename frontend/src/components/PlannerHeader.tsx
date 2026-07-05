import { Paper, Typography } from '@mui/material';

const primaryBlue = '#3b82f6';
const borderColor = '#dbeafe';

export function PlannerHeader() {
  return (
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
      <Typography
        variant="overline"
        sx={{ color: primaryBlue, fontWeight: 600, letterSpacing: 1 }}
      >
        Study Planner
      </Typography>

      <Typography
        variant="h3"
        component="h1"
        sx={{
          mt: 0.5,
          fontWeight: 600,
          fontSize: { xs: 32, md: 44 },
        }}
      >
        テスト勉強プランナー
      </Typography>

      <Typography
        sx={{
          mt: 1.5,
          maxWidth: 760,
          color: '#475569',
          lineHeight: 1.8,
        }}
      >
        試験日・範囲・提出課題から、1か月以内で終わる学習スケジュールを作成します。
      </Typography>
    </Paper>
  );
}