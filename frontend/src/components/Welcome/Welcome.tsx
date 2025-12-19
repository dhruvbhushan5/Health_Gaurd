import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Box, Button, Container, Typography, Paper, Grid } from '@mui/material';
import { Security, Person, PersonAdd } from '@mui/icons-material';

const Welcome: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    // If already logged in, redirect to dashboard or admin
    useEffect(() => {
        if (user) {
            if (user.role === 'admin') {
                navigate('/admin');
            } else {
                navigate('/dashboard');
            }
        }
    }, [user, navigate]);

    return (
        <Box
            sx={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
                color: 'white',
                py: 4
            }}
        >
            <Container maxWidth="md">
                <Typography variant="h2" component="h1" align="center" gutterBottom sx={{ fontWeight: 'bold', mb: 1 }}>
                    Health Guard
                </Typography>
                <Typography variant="h5" align="center" sx={{ mb: 6, opacity: 0.9 }}>
                    Your Personal Health AI Assistant
                </Typography>

                <Grid container spacing={4} justifyContent="center">
                    {/* Admin Login */}
                    <Grid item xs={12} md={4}>
                        <Paper
                            elevation={6}
                            sx={{
                                p: 4,
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                textAlign: 'center',
                                transition: 'transform 0.2s',
                                '&:hover': { transform: 'scale(1.02)' },
                                cursor: 'pointer'
                            }}
                            onClick={() => navigate('/login')}
                        >
                            <Security sx={{ fontSize: 60, color: '#d32f2f', mb: 2 }} />
                            <Typography variant="h5" gutterBottom color="textPrimary">
                                Admin Portal
                            </Typography>
                            <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
                                Access system management and analytics
                            </Typography>
                            <Button variant="contained" color="error" fullWidth onClick={() => navigate('/login')}>
                                Admin Login
                            </Button>
                        </Paper>
                    </Grid>

                    {/* User Login */}
                    <Grid item xs={12} md={4}>
                        <Paper
                            elevation={6}
                            sx={{
                                p: 4,
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                textAlign: 'center',
                                transition: 'transform 0.2s',
                                '&:hover': { transform: 'scale(1.02)' },
                                cursor: 'pointer'
                            }}
                            onClick={() => navigate('/login')}
                        >
                            <Person sx={{ fontSize: 60, color: '#1976d2', mb: 2 }} />
                            <Typography variant="h5" gutterBottom color="textPrimary">
                                Member Login
                            </Typography>
                            <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
                                Already a user? Login to your dashboard
                            </Typography>
                            <Button variant="contained" color="primary" fullWidth onClick={() => navigate('/login')}>
                                Member Login
                            </Button>
                        </Paper>
                    </Grid>

                    {/* New User */}
                    <Grid item xs={12} md={4}>
                        <Paper
                            elevation={6}
                            sx={{
                                p: 4,
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                textAlign: 'center',
                                transition: 'transform 0.2s',
                                '&:hover': { transform: 'scale(1.02)' },
                                cursor: 'pointer'
                            }}
                            onClick={() => navigate('/register')}
                        >
                            <PersonAdd sx={{ fontSize: 60, color: '#2e7d32', mb: 2 }} />
                            <Typography variant="h5" gutterBottom color="textPrimary">
                                New User
                            </Typography>
                            <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
                                Join us today and start your health journey
                            </Typography>
                            <Button variant="contained" color="success" fullWidth onClick={() => navigate('/register')}>
                                Register
                            </Button>
                        </Paper>
                    </Grid>
                </Grid>
            </Container>
        </Box>
    );
};

export default Welcome;
