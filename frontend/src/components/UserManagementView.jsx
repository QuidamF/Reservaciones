import React, { useState, useEffect } from 'react';
import {
    Form,
    Input,
    Button,
    Checkbox,
    message,
    Card,
    Typography,
    Table,
    Space,
    Modal,
    Popconfirm,
    Switch,
} from 'antd';
import { useAuth } from '../AuthContext';

const { Title } = Typography;

const UserManagementView = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [isPasswordModalVisible, setIsPasswordModalVisible] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const { token, logout } = useAuth(); // Get token and logout from AuthContext
    const [form] = Form.useForm();
    const [editForm] = Form.useForm();
    const [passwordForm] = Form.useForm();

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/users`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (response.status === 401) {
                logout();
                message.error("Session expired or invalid. Please log in again.");
                return;
            }
            if (!response.ok) throw new Error('Failed to fetch users');
            const data = await response.json();
            setUsers(data);
        } catch (error) {
            message.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, [token, logout]); // Add logout to dependency array

    const handleCreate = async (values) => {
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/users`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(values),
            });
            if (response.status === 401) {
                logout();
                message.error("Session expired or invalid. Please log in again.");
                return;
            }
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to create user');
            }
            message.success('User created successfully!');
            setIsCreateModalVisible(false);
            form.resetFields();
            fetchUsers(); // Refresh the list
        } catch (error) {
            message.error(error.message);
        }
    };

    const handleUpdate = async (values) => {
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/users/${editingUser.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ is_admin: values.is_admin }),
            });
            if (response.status === 401) {
                logout();
                message.error("Session expired or invalid. Please log in again.");
                return;
            }
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to update user');
            }
            message.success('User updated successfully!');
            setIsEditModalVisible(false);
            fetchUsers();
        } catch (error) {
            message.error(error.message);
        }
    };
    
    const handleChangePassword = async (values) => {
        if (values.password !== values.confirm) {
            message.error("Passwords do not match!");
            return;
        }
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/users/${editingUser.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ password: values.password }),
            });
            if (response.status === 401) {
                logout();
                message.error("Session expired or invalid. Please log in again.");
                return;
            }
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to change password');
            }
            message.success('Password changed successfully!');
            setIsPasswordModalVisible(false);
        } catch (error) {
            message.error(error.message);
        }
    };

    const handleDelete = async (userId) => {
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/users/${userId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (response.status === 401) {
                logout();
                message.error("Session expired or invalid. Please log in again.");
                return;
            }
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to delete user');
            }
            message.success('User deleted successfully!');
            fetchUsers();
        } catch (error) {
            message.error(error.message);
        }
    };

    const showCreateModal = () => setIsCreateModalVisible(true);
    const handleCreateCancel = () => setIsCreateModalVisible(false);

    const showEditModal = (user) => {
        setEditingUser(user);
        editForm.setFieldsValue({ is_admin: user.is_admin });
        setIsEditModalVisible(true);
    };
    const handleEditCancel = () => setIsEditModalVisible(false);

    const showPasswordModal = (user) => {
        setEditingUser(user);
        passwordForm.resetFields();
        setIsPasswordModalVisible(true);
    };
    const handlePasswordCancel = () => setIsPasswordModalVisible(false);

    const columns = [
        { title: 'Username', dataIndex: 'username', key: 'username' },
        {
            title: 'Is Admin',
            dataIndex: 'is_admin',
            key: 'is_admin',
            render: (isAdmin) => <Switch checked={isAdmin} disabled />,
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <Space size="middle">
                    <Button onClick={() => showEditModal(record)}>Edit</Button>
                    <Button type="dashed" onClick={() => showPasswordModal(record)}>
                        Change Password
                    </Button>
                    <Popconfirm
                        title="Are you sure you want to delete this user?"
                        onConfirm={() => handleDelete(record.id)}
                        okText="Yes"
                        cancelText="No"
                    >
                        <Button danger>Delete</Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <Card>
            <Title level={4}>User Management</Title>
            <Button type="primary" onClick={showCreateModal} style={{ marginBottom: 16 }}>
                Create User
            </Button>
            <Table columns={columns} dataSource={users} rowKey="id" loading={loading} />

            <Modal
                title="Create New User"
                open={isCreateModalVisible}
                onCancel={handleCreateCancel}
                footer={null}
            >
                <Form form={form} name="createUser" layout="vertical" onFinish={handleCreate}>
                    <Form.Item label="Username" name="username" rules={[{ required: true, message: 'Please input a username!' }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item label="Password" name="password" rules={[{ required: true, message: 'Please input a password!' }, { max: 72, message: 'Password cannot be longer than 72 characters' }]}>
                        <Input.Password maxLength={72} />
                    </Form.Item>
                    <Form.Item name="is_admin" valuePropName="checked" initialValue={false}>
                        <Checkbox>Is Admin</Checkbox>
                    </Form.Item>
                    <Form.Item>
                        <Button type="primary" htmlType="submit">Create</Button>
                    </Form.Item>
                </Form>
            </Modal>

            <Modal
                title={`Edit User: ${editingUser?.username}`}
                open={isEditModalVisible}
                onCancel={handleEditCancel}
                footer={null}
            >
                <Form form={editForm} name="editUser" onFinish={handleUpdate} initialValues={{ is_admin: editingUser?.is_admin }}>
                    <Form.Item label="Admin Status" name="is_admin" valuePropName="checked">
                        <Switch />
                    </Form.Item>
                    <Form.Item>
                        <Button type="primary" htmlType="submit">Save</Button>
                    </Form.Item>
                </Form>
            </Modal>

            <Modal
                title={`Change Password for ${editingUser?.username}`}
                open={isPasswordModalVisible}
                onCancel={handlePasswordCancel}
                footer={null}
            >
                <Form form={passwordForm} name="changePassword" onFinish={handleChangePassword} layout="vertical">
                    <Form.Item label="New Password" name="password" rules={[{ required: true, message: 'Please enter a new password' }, { max: 72, message: 'Password cannot be longer than 72 characters' }]}>
                        <Input.Password maxLength={72}/>
                    </Form.Item>
                    <Form.Item label="Confirm New Password" name="confirm" rules={[{ required: true, message: 'Please confirm the new password' }]}>
                        <Input.Password maxLength={72}/>
                    </Form.Item>
                    <Form.Item>
                        <Button type="primary" htmlType="submit">Change Password</Button>
                    </Form.Item>
                </Form>
            </Modal>
        </Card>
    );
};

export default UserManagementView;
