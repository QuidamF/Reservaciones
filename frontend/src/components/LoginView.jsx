import React, { useState, useEffect } from 'react';
import { Form, Input, Button, message, Card } from 'antd';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom'; // Re-introduce useNavigate

const LoginView = () => {
    const [loading, setLoading] = useState(false);
    const { login, user, token } = useAuth(); // Get user and token from useAuth
    const navigate = useNavigate();

    useEffect(() => {
        if (user && token) {
            if (user.is_admin) {
                navigate('/admin/config', { replace: true });
            } else {
                navigate('/book', { replace: true });
            }
        }
    }, [user, token, navigate]); // Add user, token, navigate to dependency array

    const onFinish = async (values) => {
        setLoading(true);
        try {
            await login(values.username, values.password); // Just call login
        } catch (error) {
            message.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
            <Card title="Login" style={{ width: 300 }}>
                <Form
                    name="login"
                    onFinish={onFinish}
                    autoComplete="off"
                >
                    <Form.Item
                        name="username"
                        rules={[{ required: true, message: 'Please input your username!' }]}
                    >
                        <Input placeholder="Username" />
                    </Form.Item>

                    <Form.Item
                        name="password"
                        rules={[{ required: true, message: 'Please input your password!' }]}
                    >
                        <Input.Password placeholder="Password" />
                    </Form.Item>

                    <Form.Item>
                        <Button type="primary" htmlType="submit" loading={loading} block>
                            Log in
                        </Button>
                    </Form.Item>
                </Form>
            </Card>
        </div>
    );
};

export default LoginView;
