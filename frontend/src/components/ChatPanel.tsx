import { Box, Button, Card, CardContent, Paper, TextField, Typography } from '@mui/material';
import { School } from '@mui/icons-material';

interface ChatPanelProps {
  chatInput: string;
  answer: string;
  loading: boolean;
  disabled: boolean;
  onChatInputChange: (value: string) => void;
  onAsk: () => void;
}

export function ChatPanel({ chatInput, answer, loading, disabled, onChatInputChange, onAsk }: ChatPanelProps) {
  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <School color="primary" />
          <Typography variant="h6">AIチャット</Typography>
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField label="質問する" value={chatInput} onChange={(e) => onChatInputChange(e.target.value)} fullWidth />
          <Button variant="outlined" onClick={onAsk} disabled={disabled || loading}>
            {loading ? '考え中...' : '質問する'}
          </Button>
          <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f8f9fa' }}>
            <Typography variant="body1">{answer}</Typography>
          </Paper>
        </Box>
      </CardContent>
    </Card>
  );
}
