import React, { useState } from 'react';
import { DatePicker, List, Button, message, Spin, Typography, Modal, Form, Input } from 'antd';
import dayjs from 'dayjs';

const { Title } = Typography;

const BookingView = () => {
    const [selectedDate, setSelectedDate] = useState(null);
    const [loading, setLoading] = useState(false);
    const [availableSlots, setAvailableSlots] = useState([]);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [form] = Form.useForm();

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
            const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            // We fetch for a single day
            const response = await fetch(`http://127.0.0.1:8000/availability?start_date=${dateStr}&end_date=${dateStr}&timezone=${userTimezone}`);
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
        setSelectedSlot(slot);
        setIsModalVisible(true);
    };

    const handleModalCancel = () => {
        setIsModalVisible(false);
        form.resetFields();
    };

    const handleFormSubmit = async (values) => {
        if (!selectedSlot) return;

        try {
            const response = await fetch('http://127.0.0.1:8000/book', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    start_time: selectedSlot.start_time,
                    end_time: selectedSlot.end_time,
                    user_details: {
                        name: values.name,
                        details: values.details,
                    },
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to book appointment');
            }

            message.success(`Appointment booked for ${dayjs(selectedSlot.start_time).format('h:mm A')}!`);
            setIsModalVisible(false);
            form.resetFields();
            // Refresh availability
            handleDateChange(selectedDate);

        } catch (error) {
            console.error(error);
            message.error(error.message);
        }
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

            <Modal
                title="Confirm Appointment"
                open={isModalVisible}
                onCancel={handleModalCancel}
                footer={[
                    <Button key="back" onClick={handleModalCancel}>
                        Cancel
                    </Button>,
                    <Button form="bookingForm" key="submit" htmlType="submit" type="primary">
                        Book Now
                    </Button>,
                ]}
            >
                {selectedSlot && (
                    <p>
                        You are booking an appointment for{' '}
                        <strong>{dayjs(selectedSlot.start_time).format('MMMM D, YYYY')}</strong> at{' '}
                        <strong>{dayjs(selectedSlot.start_time).format('h:mm A')}</strong>.
                    </p>
                )}
                <Form
                    form={form}
                    id="bookingForm"
                    layout="vertical"
                    onFinish={handleFormSubmit}
                >
                    <Form.Item
                        name="name"
                        label="Your Name"
                        rules={[{ required: true, message: 'Please enter your name' }]}
                    >
                        <Input />
                    </Form.Item>
                    <Form.Item
                        name="details"
                        label="Additional Details (optional)"
                    >
                        <Input.TextArea rows={4} />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default BookingView;
