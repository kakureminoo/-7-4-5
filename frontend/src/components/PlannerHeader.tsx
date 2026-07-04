import { Paper, Typography } from '@mui/material';

export function PlannerHeader() {
  return (
    <Paper elevation={0} sx={{ p: 4, borderRadius: 3, bgcolor: 'primary.main', color: 'white' }}>
      <Typography variant="h3" gutterBottom>
        テスト勉強特化プランナー
      </Typography>
      <Typography variant="body1">
        試験日・範囲・提出課題から、3か月以内で終わる学習スケジュールを作成します。
      </Typography>
    </Paper>
  );
}
