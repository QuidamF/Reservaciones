import React, { useState, useEffect } from 'react';
import { Form, InputNumber, Select, TimePicker, Button, Checkbox, Row, Col, message, Spin } from 'antd';
import dayjs from 'dayjs';
import { useAuth } from '../AuthContext';

const { Option } = Select;
const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const defaultFormValues = {
  appointment_duration_minutes: 60,
  rules: weekDays.map((day, index) => ({
    day_of_week: index,
    is_available: index < 5, // Monday to Friday available by default
    work_hours: index < 5 ? [[dayjs('09:00', 'HH:mm'), dayjs('17:00', 'HH:mm')]] : []
  })),
  breaks: [[dayjs('12:00', 'HH:mm'), dayjs('13:00', 'HH:mm')]]
};

const ConfigurationView = () => {
  const [form] = Form.useForm();
  const [config, setConfig] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const { logout, user } = useAuth(); // Get logout and user from AuthContext
  //console.log("ConfigurationView - user:", user);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        // Include credentials for authenticated access
        const response = await fetch(`${import.meta.env.VITE_API_URL}/config`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token_admin')}` }
        });
        if (response.status === 401) {
            logout();
            message.error("Session expired or invalid. Please log in again.");
            return;
        }
        if (response.ok) {
          const data = await response.json();
          setConfig(data);
          // Convert string times back to dayjs objects for the form
          const formattedData = {
            ...data,
            rules: data.rules.map(rule => ({
              ...rule,
              // Ensure work_hours is an array before mapping
              work_hours: (rule.work_hours || []).map(wh => [dayjs(wh.start, 'HH:mm'), dayjs(wh.end, 'HH:mm')])
            })),
            // Ensure breaks is an array before mapping
            breaks: (data.breaks || []).map(br => [dayjs(br.start, 'HH:mm'), dayjs(br.end, 'HH:mm')])
          };
          form.setFieldsValue(formattedData);
        } else if (response.status === 404) {
          setEditMode(true); // No config, enter create mode, form uses default values from initialValues
        } else {
          throw new Error('Failed to fetch configuration');
        }
      } catch (error) {
        console.error(error);
        message.error(error.message);
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, [form, logout]); // Add logout to dependency array

  const onFinish = async (values) => {
    const payload = {
        ...values,
        rules: values.rules.map(rule => ({
          ...rule,
          work_hours: rule.is_available ? (rule.work_hours || []).map(range => ({
            start: range[0].format('HH:mm'),
            end: range[1].format('HH:mm'),
          })) : [],
        })),
        breaks: (values.breaks || []).map(range => ({
          start: range[0].format('HH:mm'),
          end: range[1].format('HH:mm'),
        })),
      };
  
      const method = config ? 'PUT' : 'POST';
  
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/config`, {
          method,
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token_admin')}` },
          body: JSON.stringify(payload),
        });
        if (response.status === 401) {
            logout();
            message.error("Session expired or invalid. Please log in again.");
            return;
        }
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to save configuration');
        }
        message.success(`Configuration ${config ? 'updated' : 'saved'} successfully!`);
        const data = await response.json();
        setConfig(data);
        setEditMode(false);
      } catch (error) {
        console.error(error);
        message.error(error.message);
      }
    };

    const handleCancel = () => {
        // Reset form to original config values
        const formattedData = {
            ...config,
            rules: config.rules.map(rule => ({
              ...rule,
              work_hours: (rule.work_hours || []).map(wh => [dayjs(wh.start, 'HH:mm'), dayjs(wh.end, 'HH:mm')])
            })),
            breaks: (config.breaks || []).map(br => [dayjs(br.start, 'HH:mm'), dayjs(br.end, 'HH:mm')])
          };
        form.setFieldsValue(formattedData);
        setEditMode(false);
    }

  return (
    <Spin spinning={loading}>
    <Form
      form={form}
      layout="vertical"
      onFinish={onFinish}
      initialValues={defaultFormValues}
    >
        <fieldset disabled={!editMode}>
      <Form.Item label="Appointment Duration (minutes)" name="appointment_duration_minutes">
        <InputNumber min={15} max={240} step={15} />
      </Form.Item>

      <h3>Weekly Availability</h3>
      <Form.List name="rules">
        {(fields) => {
            return (
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
                               <Form.Item
                                noStyle
                                shouldUpdate={(prevValues, currentValues) =>
                                    prevValues.rules?.[field.name]?.is_available !== currentValues.rules?.[field.name]?.is_available
                                }
                               >
                                {({ getFieldValue }) =>
                                  getFieldValue(['rules', field.name, 'is_available']) && (
                                    <Form.Item {...field} name={[field.name, 'work_hours', 0]} noStyle
                                        rules={[
                                            {
                                                validator: (_, value) => {
                                                    if (!value || (!value[0] && !value[1])) {
                                                        return Promise.resolve();
                                                    }
                                                    if (value[0] && value[1] && value[0].isBefore(value[1])) {
                                                        return Promise.resolve();
                                                    }
                                                    return Promise.reject(new Error('End time must be after start time'));
                                                },
                                            },
                                        ]}
                                    >
                                       <TimePicker.RangePicker format="HH:mm" minuteStep={15} />
                                    </Form.Item>
                                  )
                                }
                              </Form.Item>
                            </Col>
                        </Row>
                    ))}
                </div>
            );
        }}
      </Form.List>

       <h3>Breaks</h3>
        <Form.List name="breaks">
            {(fields, { add, remove }) => (
                <>
                    {fields.map(field => (
                         <Row key={field.key} align="middle" style={{ marginBottom: 8 }}>
                             <Col span={16}>
                                <Form.Item {...field} noStyle
                                    rules={[
                                        {
                                            validator: (_, value) => {
                                                if (!value || (!value[0] && !value[1])) {
                                                    return Promise.resolve();
                                                }
                                                if (value[0] && value[1] && value[0].isBefore(value[1])) {
                                                    return Promise.resolve();
                                                }
                                                return Promise.reject(new Error('Break end time must be after start time'));
                                            },
                                        },
                                    ]}
                                >
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
        </fieldset>
      <Form.Item>
        {editMode ? (
            <>
                <Button type="primary" htmlType="submit">
                    {config ? 'Update Configuration' : 'Save Configuration'}
                </Button>
                {config && <Button style={{ marginLeft: 8 }} onClick={handleCancel}>Cancel</Button>}
            </>
        ) : (
            <Button type="primary" onClick={() => setEditMode(true)}>
                Modify Configuration
            </Button>
        )}
      </Form.Item>
    </Form>
    </Spin>
  );
};

export default ConfigurationView;