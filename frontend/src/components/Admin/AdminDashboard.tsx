import React, { useState, useEffect } from 'react';
import { Container, Typography, Box, Alert } from '@mui/material';

import UserManagement from './UserManagement';
import axios from 'axios';
import { API_URL } from '../../config/api';

const AdminDashboard: React.FC = () => {
    const [stats, setStats] = useState<any>(null);
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalUsers, setTotalUsers] = useState(0);

    const fetchData = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };

            const statsRes = await axios.get(`${API_URL}/api/admin/stats`, { headers });
            setStats(statsRes.data);

            const usersRes = await axios.get(`${API_URL}/api/admin/users?page=${page}&limit=10`, { headers });
            setUsers(usersRes.data.users);
            setTotalPages(usersRes.data.totalPages);
            setTotalUsers(usersRes.data.totalUsers);

            setError('');
        } catch (err) {
            console.error(err);
            setError('Failed to fetch admin data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [page]);

    if (loading && !stats) return <Box p={3}>Loading Admin Data...</Box>;

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Typography variant="h4" gutterBottom component="div" sx={{ fontWeight: 'bold', color: '#1e3a8a', mb: 3 }}>
                Admin Overview
            </Typography>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <Box sx={{ mb: 4, p: 3, bgcolor: '#e3f2fd', borderRadius: 2 }}>
                <Typography variant="h5" color="primary" gutterBottom>
                    System Status
                </Typography>
                <Typography variant="h3" sx={{ fontWeight: 'bold' }}>
                    {stats?.totalUsers} <span style={{ fontSize: '1.2rem', color: '#555', fontWeight: 'normal' }}>Total Registered Users</span>
                </Typography>
                <Typography variant="body1" sx={{ mt: 1, color: '#666' }}>
                    New users today: {stats?.newUsersToday}
                </Typography>
            </Box>

            <Typography variant="h5" gutterBottom sx={{ mt: 4, mb: 2 }}>
                User List
            </Typography>

            <UserManagement
                users={users}
                loading={loading}
                onUserDeleted={fetchData}
                page={page}
                setPage={setPage}
                totalPages={totalPages}
                totalUsers={totalUsers}
            />
        </Container>
    );
};

export default AdminDashboard;
