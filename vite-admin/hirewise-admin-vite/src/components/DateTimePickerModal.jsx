import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { API_BASE } from '../lib/config';

/**
 * Date/Time/Timezone Picker Modal for Interview Scheduling
 * Allows admin to select interview date, time, and timezone before sending confirmation
 */
const DateTimePickerModal = ({ isOpen, onClose, onConfirm, candidateName }) => {
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [timezone, setTimezone] = useState('Asia/Kolkata');
    const [timezones, setTimezones] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Fetch available timezones from backend
    useEffect(() => {
        if (isOpen) {
            fetchTimezones();
            // Set default date to tomorrow
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            setDate(tomorrow.toISOString().split('T')[0]);
            // Set default time to 10:00 AM
            setTime('10:00');
        }
    }, [isOpen]);

    const fetchTimezones = async () => {
        try {
            const response = await fetch(`${API_BASE}/api/applications/timezones`);
            const data = await response.json();
            setTimezones(data.timezones || []);
        } catch (err) {
            console.error('Failed to fetch timezones:', err);
            // Fallback timezones
            setTimezones([
                { id: 'Asia/Kolkata', label: 'India Standard Time (IST)' },
                { id: 'America/New_York', label: 'Eastern Time (ET)' },
                { id: 'Europe/London', label: 'British Time (GMT/BST)' },
            ]);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Validation
        if (!date || !time || !timezone) {
            setError('Please fill in all fields');
            return;
        }

        // Check if date is in the past
        const selectedDate = new Date(`${date}T${time}`);
        const now = new Date();
        if (selectedDate < now) {
            setError('Please select a future date and time');
            return;
        }

        setLoading(true);
        try {
            await onConfirm({ date, time, timezone });
            onClose();
        } catch (err) {
            setError(err.message || 'Failed to schedule interview');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b">
                    <h2 className="text-xl font-bold text-gray-900">
                        📅 Schedule Interview
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {candidateName && (
                        <p className="text-sm text-gray-600">
                            Scheduling interview for: <strong>{candidateName}</strong>
                        </p>
                    )}

                    {/* Date Picker */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Interview Date
                        </label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                        />
                    </div>

                    {/* Time Picker */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Interview Time
                        </label>
                        <select
                            value={time}
                            onChange={(e) => setTime(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                        >
                            <option value="">Select time...</option>
                            {Array.from({ length: 24 }, (_, hour) => {
                                return ['00', '30'].map((minute) => {
                                    const h = hour.toString().padStart(2, '0');
                                    const timeValue = `${h}:${minute}`;
                                    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
                                    const period = hour < 12 ? 'AM' : 'PM';
                                    return (
                                        <option key={timeValue} value={timeValue}>
                                            {displayHour}:{minute} {period}
                                        </option>
                                    );
                                });
                            })}
                        </select>
                    </div>

                    {/* Timezone Picker */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Timezone
                        </label>
                        <select
                            value={timezone}
                            onChange={(e) => setTimezone(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                        >
                            {timezones.map((tz) => (
                                <option key={tz.id} value={tz.id}>
                                    {tz.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                            {error}
                        </div>
                    )}

                    {/* Buttons */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400"
                            disabled={loading}
                        >
                            {loading ? 'Sending...' : 'Send Confirmation'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default DateTimePickerModal;
