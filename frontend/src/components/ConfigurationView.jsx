import React, { useState } from 'react';
import { Form, InputNumber, Select, TimePicker, Button, Checkbox, Row, Col, message } from 'antd';
import dayjs from 'dayjs';

const { Option } = Select;
const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const ConfigurationView = () => {
  const [form] = Form.useForm();

  const initialValues = {
    appointment_duration_minutes: 60,
    rules: weekDays.map((day, index) => ({
      day_of_week: index,
      is_available: index < 5, // Monday to Friday available by default
      work_hours: index < 5 ? [
        [dayjs('09:00', 'HH:mm'), dayjs('17:00', 'HH:mm')]
      ] : []
    })),
    breaks: [
      [dayjs('12:00', 'HH:mm'), dayjs('13:00', 'HH:mm')]
    ]
  };

  const onFinish = async (values) => {
    // Convert dayjs objects to time strings before sending
    const payload = {
      ...values,
      rules: values.rules.map(rule => ({
        ...rule,
        work_hours: rule.is_available ? rule.work_hours.map(range => ({
          start: range[0].format('HH:mm'),
          end: range[1].format('HH:mm'),
        })) : [],
      })),
      breaks: values.breaks.map(range => ({
        start: range[0].format('HH:mm'),
        end: range[1].format('HH:mm'),
      })),
    };

    try {
      const response = await fetch('http://localhost:8000/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error('Failed to save configuration');
      }
      message.success('Configuration saved successfully!');
    } catch (error) {
      console.error(error);
      message.error('Error saving configuration.');
    }
  };

  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={initialValues}
      onFinish={onFinish}
    >
      <Form.Item label="Appointment Duration (minutes)" name="appointment_duration_minutes">
        <InputNumber min={15} max={240} step={15} />
      </Form.Item>

      <h3>Weekly Availability</h3>
      <Form.List name="rules">
        {(fields) => (
          <div>
            {fields.map(field => (
              <Row key={field.key} align="middle" style={{ marginBottom: 8 }}>
                <Col span={4}>
                  <span>{weekDays[field.name]}</span>
                </Col>
                <Col span={4}>
                  <Form.Item {...field} name={[field.name, 'is_available']} valuePropName="checked" noStyle>
                    <Checkbox>Available</Checkbox>
                  </Form.Item>
                </Col>
                <Col span={12}>
                   <Form.Item noStyle shouldUpdate>
                    {() =>
                      form.getFieldValue(['rules', field.name, 'is_available']) && (
                        <Form.Item {...field} name={[field.name, 'work_hours', 0]} noStyle>
                           <TimePicker.RangePicker format="HH:mm" minuteStep={15} />
                        </Form.Item>
                      )
                    }
                  </Form.Item>
                </Col>
              </Row>
            ))}
          </div>
        )}
      </Form.List>

       <h3>Breaks</h3>
        <Form.List name="breaks">
            {(fields, { add, remove }) => (
                <>
                    {fields.map(field => (
                         <Row key={field.key} align="middle" style={{ marginBottom: 8 }}>
                             <Col span={16}>
                                <Form.Item {...field} noStyle>
                                    <TimePicker.RangePicker format="HH:mm" minuteStep={15} />
                                </Form.Item>
                             </Col>
                             <Col span={4}>
                                <Button type="link" onClick={() => remove(field.name)}>Remove</Button>
                             </Col>
                         </Row>
                    ))}
                    <Form.Item>
                        <Button type="dashed" onClick={() => add()} block>
                            + Add Break
                        </Button>
                    </Form.Item>
                </>
            )}
        </Form.List>

      <Form.Item>
        <Button type="primary" htmlType="submit">
          Save Configuration
        </Button>
      </Form.Item>
    </Form>
  );
};

export default ConfigurationView;
