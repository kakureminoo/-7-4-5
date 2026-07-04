import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  TextField,
  Typography,
} from '@mui/material';
import { Add, Delete, School } from '@mui/icons-material';

import type { ScopeItem } from '../types';

const primaryBlue = '#3b82f6';

interface PlannerFormProps {
  subject: string;
  examDate: string;
  testTitle: string;
  scopeItems: ScopeItem[];
  studyHoursPerDay: string;
  loading: boolean;
  showScopeError: boolean;
  showDeadlineError: boolean;
  onSubjectChange: (value: string) => void;
  onExamDateChange: (value: string) => void;
  onTestTitleChange: (value: string) => void;
  onStudyHoursChange: (value: string) => void;
  onScopeItemChange: (
    index: number,
    field: keyof ScopeItem,
    value: string
  ) => void;
  onAddScopeItem: () => void;
  onRemoveScopeItem: (index: number) => void;
  onGenerate: () => void;
}

export function PlannerForm(props: PlannerFormProps) {
  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: 4,
        border: '1px solid #e2e8f0',
      }}
    >
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
          <TextField
            label="テスト名"
            value={props.testTitle}
            onChange={(e) => props.onTestTitleChange(e.target.value)}
            fullWidth
          />

          <TextField
            label="科目"
            value={props.subject}
            onChange={(e) => props.onSubjectChange(e.target.value)}
            fullWidth
          />

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {props.showDeadlineError && (
              <Alert severity="warning" sx={{ borderRadius: 3 }}>
                期限は今日より後、かつ3か月以内の日付を入力してください。
              </Alert>
            )}

            <TextField
              label="期限"
              type="date"
              value={props.examDate}
              onChange={(e) => props.onExamDateChange(e.target.value)}
              error={props.showDeadlineError}
              fullWidth
            />
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Typography
              variant="subtitle2"
              sx={{ color: '#334155', fontWeight: 600 }}
            >
              範囲
            </Typography>

            {props.showScopeError && (
              <Alert severity="warning" sx={{ borderRadius: 3 }}>
                範囲に空欄があります。参考書・章・分野、開始p、終了pを入力してください。
              </Alert>
            )}

            {props.scopeItems.map((item, index) => (
              <Box
                key={index}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '1fr 1fr',
                    sm: 'minmax(0, 1fr) 96px 96px 48px',
                  },
                  gap: 1,
                  alignItems: 'center',
                }}
              >
                <TextField
                  label="参考書・章・分野"
                  value={item.name}
                  onChange={(e) =>
                    props.onScopeItemChange(index, 'name', e.target.value)
                  }
                  error={props.showScopeError && !item.name.trim()}
                  helperText={
                    props.showScopeError && !item.name.trim()
                      ? '未入力です'
                      : undefined
                  }
                  sx={{ gridColumn: { xs: '1 / -1', sm: 'auto' } }}
                  fullWidth
                />

                <TextField
                  label="開始p"
                  type="number"
                  value={item.startPage}
                  onChange={(e) =>
                    props.onScopeItemChange(index, 'startPage', e.target.value)
                  }
                  error={props.showScopeError && !item.startPage.trim()}
                  helperText={
                    props.showScopeError && !item.startPage.trim()
                      ? '未入力'
                      : undefined
                  }
                  slotProps={{ htmlInput: { min: 1 } }}
                />

                <TextField
                  label="終了p"
                  type="number"
                  value={item.endPage}
                  onChange={(e) =>
                    props.onScopeItemChange(index, 'endPage', e.target.value)
                  }
                  error={props.showScopeError && !item.endPage.trim()}
                  helperText={
                    props.showScopeError && !item.endPage.trim()
                      ? '未入力'
                      : undefined
                  }
                  slotProps={{ htmlInput: { min: Number(item.startPage || 1) } }}
                />

                <Button
                  variant="outlined"
                  color="error"
                  onClick={() => props.onRemoveScopeItem(index)}
                  disabled={props.scopeItems.length === 1}
                  sx={{ minWidth: 48, height: 56 }}
                >
                  <Delete fontSize="small" />
                </Button>
              </Box>
            ))}

            <Button
              variant="outlined"
              onClick={props.onAddScopeItem}
              startIcon={<Add />}
              sx={{ borderRadius: 3 }}
            >
              範囲を追加
            </Button>
          </Box>

          <TextField
            label="1日あたりの学習時間（時間）"
            type="number"
            value={props.studyHoursPerDay}
            onChange={(e) => props.onStudyHoursChange(e.target.value)}
            slotProps={{ htmlInput: { min: 0.5, step: 0.5 } }}
            fullWidth
          />

          <Button
            variant="contained"
            onClick={props.onGenerate}
            disabled={props.loading}
            sx={{
              py: 1.35,
              borderRadius: 3,
              bgcolor: primaryBlue,
              fontWeight: 600,
              boxShadow: 'none',
              '&:hover': {
                bgcolor: '#2563eb',
                boxShadow: 'none',
              },
            }}
          >
            {props.loading ? '生成中...' : '学習スケジュールを作成'}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}