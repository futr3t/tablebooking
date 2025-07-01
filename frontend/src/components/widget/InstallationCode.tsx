import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  TextField,
  Alert,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import { ContentCopy, CheckCircle, Warning } from '@mui/icons-material';
import { widgetService } from '../../services/api';
import { WidgetConfig, InstallationInstructions } from '../../types';

interface InstallationCodeProps {
  open: boolean;
  onClose: () => void;
  config: WidgetConfig;
}

const InstallationCode: React.FC<InstallationCodeProps> = ({
  open,
  onClose,
  config,
}) => {
  const [instructions, setInstructions] = useState<InstallationInstructions | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    if (open) {
      loadInstructions();
    }
  }, [open]);

  const loadInstructions = async () => {
    try {
      setLoading(true);
      const data = await widgetService.getInstallationInstructions();
      setInstructions(data);
    } catch (error) {
      console.error('Error loading installation instructions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = async () => {
    if (!instructions) return;

    try {
      await navigator.clipboard.writeText(instructions.htmlCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleReset = () => {
    setActiveStep(0);
  };

  if (loading) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogContent>
          <Box display="flex" justifyContent="center" p={4}>
            <Typography>Loading installation instructions...</Typography>
          </Box>
        </DialogContent>
      </Dialog>
    );
  }

  if (!instructions) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogContent>
          <Alert severity="error">
            Failed to load installation instructions. Please try again.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>
    );
  }

  const steps = [
    {
      label: 'Check Widget Status',
      content: (
        <Box>
          <Typography paragraph>
            First, make sure your widget is enabled and configured properly.
          </Typography>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <Typography variant="body2">Widget Status:</Typography>
            <Chip
              icon={config.isEnabled ? <CheckCircle /> : <Warning />}
              label={config.isEnabled ? 'Enabled' : 'Disabled'}
              color={config.isEnabled ? 'success' : 'warning'}
              size="small"
            />
          </Box>
          {!config.isEnabled && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Your widget is currently disabled. Enable it in the widget settings to start accepting bookings.
            </Alert>
          )}
        </Box>
      ),
    },
    {
      label: 'Copy Installation Code',
      content: (
        <Box>
          <Typography paragraph>
            Copy the following HTML code and paste it into your website where you want the booking widget to appear.
          </Typography>
          
          <Box position="relative" mb={2}>
            <TextField
              fullWidth
              multiline
              rows={8}
              value={instructions.htmlCode}
              variant="outlined"
              InputProps={{
                readOnly: true,
                sx: {
                  fontFamily: 'monospace',
                  fontSize: '12px',
                },
              }}
            />
            <Tooltip title={copied ? 'Copied!' : 'Copy to clipboard'}>
              <IconButton
                sx={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  backgroundColor: 'background.paper',
                }}
                onClick={handleCopyCode}
                size="small"
              >
                <ContentCopy fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>

          {copied && (
            <Alert severity="success" sx={{ mb: 2 }}>
              Code copied to clipboard!
            </Alert>
          )}
        </Box>
      ),
    },
    {
      label: 'Add to Your Website',
      content: (
        <Box>
          <Typography paragraph>
            Paste the code into your website's HTML where you want the booking widget to appear. 
            Common locations include:
          </Typography>
          
          <ul>
            <li>A dedicated "Reservations" or "Book a Table" page</li>
            <li>Your restaurant's contact page</li>
            <li>The homepage sidebar or footer</li>
            <li>A popup modal or overlay</li>
          </ul>

          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Technical Note:</strong> The widget code should be placed in the HTML body, 
              not in the head section. It will automatically load the necessary JavaScript and styles.
            </Typography>
          </Alert>
        </Box>
      ),
    },
    {
      label: 'Test Your Widget',
      content: (
        <Box>
          <Typography paragraph>
            After adding the code to your website:
          </Typography>
          
          <ol>
            <li>Visit your website and navigate to where you placed the widget</li>
            <li>Verify that the widget loads and matches your theme settings</li>
            <li>Try making a test booking to ensure everything works correctly</li>
            <li>Check that bookings appear in your admin dashboard</li>
          </ol>

          <Alert severity="success" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Congratulations!</strong> Your booking widget is now live and ready to accept reservations!
            </Typography>
          </Alert>
        </Box>
      ),
    },
  ];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Widget Installation Instructions
      </DialogTitle>
      
      <DialogContent>
        <Typography variant="body2" color="text.secondary" paragraph>
          Follow these steps to add the booking widget to your website.
        </Typography>

        <Stepper activeStep={activeStep} orientation="vertical">
          {steps.map((step, index) => (
            <Step key={step.label}>
              <StepLabel>{step.label}</StepLabel>
              <StepContent>
                {step.content}
                <Box sx={{ mb: 2 }}>
                  <Button
                    variant="contained"
                    onClick={handleNext}
                    sx={{ mt: 1, mr: 1 }}
                  >
                    {index === steps.length - 1 ? 'Finish' : 'Continue'}
                  </Button>
                  <Button
                    disabled={index === 0}
                    onClick={handleBack}
                    sx={{ mt: 1, mr: 1 }}
                  >
                    Back
                  </Button>
                </Box>
              </StepContent>
            </Step>
          ))}
        </Stepper>

        {activeStep === steps.length && (
          <Box sx={{ mt: 2 }}>
            <Typography paragraph>
              All steps completed! Your booking widget is ready to use.
            </Typography>
            <Button onClick={handleReset} sx={{ mt: 1, mr: 1 }}>
              Reset Instructions
            </Button>
          </Box>
        )}

        <Box sx={{ mt: 3, p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            Important Notes:
          </Typography>
          {instructions.notes.map((note, index) => (
            <Typography key={index} variant="body2" sx={{ mb: 1 }}>
              • {note}
            </Typography>
          ))}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default InstallationCode;