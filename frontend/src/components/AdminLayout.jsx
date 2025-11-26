import React from 'react';
import { Layout, Menu, theme, Button } from 'antd';
import { UserOutlined, SettingOutlined, CalendarOutlined, LogoutOutlined } from '@ant-design/icons';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

const { Header, Content, Footer } = Layout;

const AdminLayout = () => {
    const { logout, user } = useAuth();
    const navigate = useNavigate();
    const {
        token: { colorBgContainer },
    } = theme.useToken();

    if (!user || !user.is_admin) {
        // Redirect non-admin users if they somehow reach here
        navigate('/login', { replace: true });
        return null;
    }

    const handleMenuClick = (e) => {
        navigate(e.key);
    };

    const menuItems = [
        {
            key: '/admin/config',
            icon: <SettingOutlined />,
            label: 'Configuration',
        },
        {
            key: '/admin/agenda',
            icon: <CalendarOutlined />,
            label: 'My Agenda',
        },
        {
            key: '/admin/users',
            icon: <UserOutlined />,
            label: 'User Management',
        },
    ];

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Header
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: colorBgContainer,
                    padding: '0 24px',
                }}
            >
                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>Admin Dashboard</div>
                <div>
                    <span>Welcome, {user.username}!</span>
                    <Button
                        type="text"
                        icon={<LogoutOutlined />}
                        onClick={logout}
                        style={{ marginLeft: 16 }}
                    >
                        Logout
                    </Button>
                </div>
            </Header>
            <Content style={{ padding: '24px 50px' }}>
                <Layout style={{ padding: '24px 0', background: colorBgContainer }}>
                    <Menu
                        mode="horizontal"
                        defaultSelectedKeys={['/admin/config']}
                        onClick={handleMenuClick}
                        items={menuItems}
                        style={{ background: colorBgContainer, borderBottom: 'none' }}
                    />
                    <Content style={{ padding: '24px', minHeight: 280 }}>
                        <Outlet /> {/* This is where the routed admin components will render */}
                    </Content>
                </Layout>
            </Content>
            <Footer style={{ textAlign: 'center' }}>Appointment Scheduler ©2023</Footer>
        </Layout>
    );
};

export default AdminLayout;
