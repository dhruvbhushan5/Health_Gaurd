import React, { useState } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    IconButton,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Chip,
    TablePagination
} from '@mui/material';
import { Delete, Edit, Visibility } from '@mui/icons-material';
import axios from 'axios';
import { API_URL } from '../../config/api';

interface User {
    _id: string;
    name: string;
    email: string;
    role: string;
    createdAt: string;
    healthMetrics?: {
        lastUpdated?: string;
    };
}

interface UserManagementProps {
    users: User[];
    loading: boolean;
    onUserDeleted: () => void;
    page: number;
    setPage: (page: number) => void;
    totalPages: number;
    totalUsers: number;
}

const UserManagement: React.FC<UserManagementProps> = ({
    users,
    loading,
    onUserDeleted,
    page,
    setPage,
    totalPages,
    totalUsers
}) => {
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const handleDelete = async () => {
        if (!deleteId) return;

        try {
            const token = localStorage.getItem('token');
            await axios.delete(`${API_URL}/api/admin/users/${deleteId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            onUserDeleted();
            setDeleteId(null);
        } catch (error) {
            console.error('Failed to delete user', error);
            alert('Failed to delete user');
        }
    };

    const handleChangePage = (event: unknown, newPage: number) => {
        setPage(newPage + 1); // Material UI is 0-indexed, our API is 1-indexed
    };

    return (
        <Paper sx={{ width: '100%', overflow: 'hidden' }}>
            <TableContainer sx={{ maxHeight: 600 }}>
                <Table stickyHeader aria-label="sticky table">
                    <TableHead>
                        <TableRow>
                            <TableCell>Name</TableCell>
                            <TableCell>Email</TableCell>
                            <TableCell>Role</TableCell>
                            <TableCell>Joined</TableCell>
                            <TableCell>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {users.map((user) => (
                            <TableRow hover role="checkbox" tabIndex={-1} key={user._id}>
                                <TableCell>{user.name}</TableCell>
                                <TableCell>{user.email}</TableCell>
                                <TableCell>
                                    <Chip
                                        label={user.role}
                                        color={user.role === 'admin' ? 'primary' : 'default'}
                                        size="small"
                                    />
                                </TableCell>
                                <TableCell>
                                    {new Date(user.createdAt).toLocaleDateString()}
                                </TableCell>
                                <TableCell>
                                    <IconButton
                                        color="error"
                                        onClick={() => setDeleteId(user._id)}
                                        disabled={user.role === 'admin'}
                                    >
                                        <Delete />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
            <TablePagination
                rowsPerPageOptions={[10]}
                component="div"
                count={totalUsers}
                rowsPerPage={10}
                page={page - 1} // Material UI expects 0-indexed
                onPageChange={handleChangePage}
            />

            <Dialog
                open={!!deleteId}
                onClose={() => setDeleteId(null)}
            >
                <DialogTitle>Confirm Delete</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to delete this user? This action cannot be undone.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteId(null)}>Cancel</Button>
                    <Button onClick={handleDelete} color="error" autoFocus>
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>
        </Paper>
    );
};

export default UserManagement;
