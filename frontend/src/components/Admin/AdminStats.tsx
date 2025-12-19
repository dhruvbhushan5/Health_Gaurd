import React from 'react';
import { Card, CardContent, Typography, Grid, Box } from '@mui/material';
import { People, VerifiedUser, LocalHospital, Equalizer } from '@mui/icons-material';

interface StatsProps {
    stats: {
        totalUsers: number;
        newUsersToday: number;
        usersWithDiseases: number;
        bmiStats: any[];
    };
}

const AdminStats: React.FC<StatsProps> = ({ stats }) => {
    const StatCard = ({ title, value, icon, color }: any) => (
        <Card sx={{ height: '100%' }}>
            <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box>
                        <Typography color="textSecondary" gutterBottom variant="h6">
                            {title}
                        </Typography>
                        <Typography variant="h3" component="div">
                            {value}
                        </Typography>
                    </Box>
                    <Box sx={{ color: color, transform: 'scale(1.5)', mr: 2 }}>
                        {icon}
                    </Box>
                </Box>
            </CardContent>
        </Card>
    );

    return (
        <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
                <StatCard
                    title="Total Users"
                    value={stats.totalUsers}
                    icon={<People />}
                    color="#1976d2"
                />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
                <StatCard
                    title="New Today"
                    value={stats.newUsersToday}
                    icon={<VerifiedUser />}
                    color="#2e7d32"
                />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
                <StatCard
                    title="Health Issues"
                    value={stats.usersWithDiseases}
                    icon={<LocalHospital />}
                    color="#d32f2f"
                />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
                <StatCard
                    title="Avg BMI Groups"
                    value={stats.bmiStats?.length || 0}
                    icon={<Equalizer />}
                    color="#ed6c02"
                />
            </Grid>
        </Grid>
    );
};

export default AdminStats;
