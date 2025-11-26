import React, { useState } from 'react';
import { Form, Input, Button, message, Card, Typography } from 'antd';
import { useAuth } from '../AuthContext'; // To potentially auto-login after setup

const { Title } = Typography;

const InitialSetupView = () => {
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();

    const onFinish = async (values) => {
        setLoading(true);
        try {
            const response = await fetch('http://127.0.0.1:8000/initial-setup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(values),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to create initial admin user');
            }

            message.success('Initial admin user created successfully! Please log in with your new credentials.');
            // After successful creation, the AuthProvider will detect no token and render LoginView
        } catch (error) {
            console.error(error);
            message.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    const [form] = Form.useForm();

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
            <Card title="Initial Setup: Create Admin User" style={{ width: 400 }}>
                <p>No users found. Please create the first administrator account.</p>
                <Form
                    form={form}
                    name="initialSetup"
                    layout="vertical"
                    onFinish={onFinish}
                    autoComplete="off"
                >
                    <Form.Item
                        label="Admin Username"
                        name="username"
                        rules={[{ required: true, message: 'Please input a username!' }]}
                    >
                        <Input />
                    </Form.Item>

                    <Form.Item
                        label="Admin Password"
                        name="password"
                        rules={[
                            { required: true, message: 'Please input a password!' },
                            { max: 72, message: 'Password cannot be longer than 72 characters' },
                            ({ getFieldValue }) => ({
                                validator(_, value) {
                                  if (!value || new TextEncoder().encode(value).length <= 72) {
                                    return Promise.resolve();
                                  }
                                  return Promise.reject(new Error('Password byte length cannot exceed 72 bytes!'));
                                },
                            }),
                        ]}
                        hasFeedback
                    >
                        <Input.Password maxLength={72} />
                    </Form.Item>

                    <Form.Item
                        label="Confirm Password"
                        name="confirm"
                        dependencies={['password']}
                        hasFeedback
                        rules={[
                            { required: true, message: 'Please confirm your password!' },
                            ({ getFieldValue }) => ({
                                validator(_, value) {
                                    if (!value || getFieldValue('password') === value) {
                                        return Promise.resolve();
                                    }
                                    return Promise.reject(new Error('The two passwords that you entered do not match!'));
                                },
                            }),
                        ]}
                    >
                        <Input.Password maxLength={72} />
                    </Form.Item>

                    <Form.Item>
                        <Button type="primary" htmlType="submit" loading={loading} block>
                            Create Admin User
                        </Button>
                    </Form.Item>
                </Form>
            </Card>
        </div>
    );
};

export default InitialSetupView;
