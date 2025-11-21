import React, { useState } from 'react';
import { DatePicker, List, Button, message, Spin, Typography } from 'antd';
import dayjs from 'dayjs';

const { Title } = Typography;

const BookingView = () => {
    const [selectedDate, setSelectedDate] = useState(null);
    const [loading, setLoading] = useState(false);
    const [availableSlots, setAvailableSlots] = useState([]);

    const handleDateChange = async (date) => {
        if (!date) {
            setAvailableSlots([]);
            setSelectedDate(null);
            return;
        }
        setSelectedDate(date);
        setLoading(true);
        try {
            const dateStr = date.format('YYYY-MM-DD');
            // We fetch for a single day
            const response = await fetch(`http://localhost:8000/availability?start_date=${dateStr}&end_date=${dateStr}`);
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to fetch availability');
            }
            const data = await response.json();
            setAvailableSlots(data.available_slots);
        } catch (error) {
            console.error(error);
            message.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleBooking = (slot) => {
        // For now, just a confirmation message
        message.success(`Appointment booked for ${dayjs(slot.start_time).format('h:mm A')}!`);
        // In a real app, this would trigger a POST to /book and update the availability
    };

    return (
        <div>
            <Title level={3}>Book an Appointment</Title>
            <DatePicker onChange={handleDateChange} />

            {loading && <Spin style={{ marginTop: 20 }} />}

            {!loading && selectedDate && availableSlots.length > 0 && (
                <List
                    style={{ marginTop: 20, maxWidth: 300 }}
                    header={<div>Available Slots for {selectedDate.format('MMMM D, YYYY')}</div>}
                    bordered
                    dataSource={availableSlots}
                    renderItem={(slot) => (
                        <List.Item>
                            <List.Item.Meta
                                title={`${dayjs(slot.start_time).format('h:mm A')} - ${dayjs(slot.end_time).format('h:mm A')}`}
                            />
                            <Button type="primary" onClick={() => handleBooking(slot)}>Book</Button>
                        </List.Item>
                    )}
                />
            )}

            {!loading && selectedDate && availableSlots.length === 0 && (
                <p style={{ marginTop: 20 }}>No available slots for this day.</p>
            )}
        </div>
    );
};

export default BookingView;
