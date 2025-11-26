import React, { useState, useEffect } from 'react';
import { List, Button, message, Spin, Typography, Segmented, Row, Col } from 'antd';
import dayjs from 'dayjs';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import isoWeek from 'dayjs/plugin/isoWeek';
import { useAuth } from '../AuthContext';

dayjs.extend(weekOfYear);
dayjs.extend(isoWeek);

const { Title, Text } = Typography;

const AgendaView = () => {
    const [currentDate, setCurrentDate] = useState(dayjs());
    const [viewMode, setViewMode] = useState('week'); // 'week' or 'month'
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(false);
    const { token, logout } = useAuth(); // Get token and logout from AuthContext

    useEffect(() => {
        const fetchEvents = async () => {
            if (!token) { // Don't fetch if no token is available
                setLoading(false);
                return;
            }
            setLoading(true);
            try {
                const startOf = viewMode === 'week' ? currentDate.startOf('isoWeek') : currentDate.startOf('month');
                const endOf = viewMode === 'week' ? currentDate.endOf('isoWeek') : currentDate.endOf('month');

                const startDateStr = startOf.format('YYYY-MM-DD');
                const endDateStr = endOf.format('YYYY-MM-DD');
                const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

                const response = await fetch(`${import.meta.env.VITE_API_URL}/events?start_date=${startDateStr}&end_date=${endDateStr}&timezone=${userTimezone}`, {
                    headers: { 'Authorization': `Bearer ${token}` }, // Add Authorization header
                });
                if (response.status === 401) { // If 401, token is invalid, log out
                    logout();
                    message.error("Session expired or invalid. Please log in again.");
                    return;
                }
                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.detail || 'Failed to fetch events');
                }
                const data = await response.json();
                setEvents(data.events);
            } catch (error) {
                console.error(error);
                message.error(error.message);
            } finally {
                setLoading(false);
            }
        };

        fetchEvents();
    }, [currentDate, viewMode, token, logout]); // Add logout to dependency array

    const handleNav = (direction) => {
        const unit = viewMode === 'week' ? 'week' : 'month';
        const newDate = direction === 'next'
            ? currentDate.add(1, unit)
            : currentDate.subtract(1, unit);
        
        const startOfUnit = viewMode === 'week' ? 'isoWeek' : 'month';
        if (newDate.isBefore(dayjs().startOf(startOfUnit))) {
            return;
        }

        setCurrentDate(newDate);
    };
    
    const isPastNavigationDisabled = () => {
        const startOfUnit = viewMode === 'week' ? 'isoWeek' : 'month';
        const startOfCurrent = dayjs().startOf(startOfUnit);
        return currentDate.isSame(startOfCurrent, 'day'); // Compare by day to be safe
    }

    const getHeaderText = () => {
        const startOfUnit = viewMode === 'week' ? 'isoWeek' : 'month';
        const start = currentDate.startOf(startOfUnit);
        if (viewMode === 'week') {
            return `Week of ${start.format('MMMM D, YYYY')}`;
        }
        return start.format('MMMM YYYY');
    }

    return (
        <div>
            <Title level={3}>My Agenda</Title>
            <Row justify="space-between" align="middle" style={{ marginBottom: 20 }}>
                <Col>
                    <Button onClick={() => handleNav('prev')} disabled={isPastNavigationDisabled()}>
                        Previous
                    </Button>
                    <Button onClick={() => handleNav('next')} style={{ marginLeft: 8 }}>
                        Next
                    </Button>
                </Col>
                <Col>
                    <Text strong>{getHeaderText()}</Text>
                </Col>
                <Col>
                    <Segmented
                        options={[{ label: 'Week', value: 'week' }, { label: 'Month', value: 'month' }]}
                        value={viewMode}
                        onChange={setViewMode}
                    />
                </Col>
            </Row>

            <Spin spinning={loading}>
                <List
                    bordered
                    dataSource={events}
                    renderItem={(event) => (
                        <List.Item>
                            <List.Item.Meta
                                title={event.summary}
                                description={`${dayjs(event.start.dateTime).format('h:mm A')} - ${dayjs(event.end.dateTime).format('h:mm A')}`}
                            />
                            <div>{dayjs(event.start.dateTime).format('MMMM D, YYYY')}</div>
                        </List.Item>
                    )}
                    locale={{ emptyText: 'No events for this period.' }}
                />
            </Spin>
        </div>
    );
};

export default AgendaView;
