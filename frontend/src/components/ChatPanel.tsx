import {
  Box,
  Button,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import { School } from '@mui/icons-material';

const primaryBlue = '#3b82f6';

interface ChatPanelProps {
  chatInput: string;
  answer: string;
  disabled: boolean;
  onChatInputChange: (value: string) => void;
  onAsk: () => void;
}

export function ChatPanel({
  chatInput,
  answer,
  disabled,
  onChatInputChange,
  onAsk,
}: ChatPanelProps) {
  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mb: 2 }}>
        <School sx={{ color: primaryBlue }} />
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            AIチャット
          </Typography>
          <Typography variant="body2" color="text.secondary">
            学習計画をもとに、今日の進め方や優先順位を相談できます。
          </Typography>
        </Box>
      </Box>

      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 1.5,
        }}
      >
        <TextField
          label="質問する"
          value={chatInput}
          onChange={(e) => onChatInputChange(e.target.value)}
          placeholder={disabled ? '計画を作成するとAIに質問できます' : undefined}
          disabled={disabled}
          fullWidth
        />

        <Button
          variant="outlined"
          onClick={onAsk}
          disabled={disabled}
          sx={{
            px: 4,
            borderRadius: 3,
            fontWeight: 600,
          }}
        >
          質問する
        </Button>
      </Box>

      <Paper
        variant="outlined"
        sx={{
          mt: 2,
          p: 2,
          borderRadius: 3,
          bgcolor: '#f8fafc',
        }}
      >
        <Typography variant="body1">{answer}</Typography>
      </Paper>
    </>
  );
}