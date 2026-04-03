import React, { useState, useEffect } from 'react';
import { X, Send, User, Clock } from 'lucide-react';
import { API_BASE } from '../lib/config';
import { toArrayPayload } from '../lib/normalize';

/**
 * Communication Modal for Admin-Candidate Interview Scheduling Conversation
 * Displays message history and allows admin to reply
 */
const CommunicationModal = ({ isOpen, onClose, applicationId, candidateName }) => {
    const [history, setHistory] = useState([]);
    const [latestMessage, setLatestMessage] = useState('');
    const [negotiationCount, setNegotiationCount] = useState(0);
    const [reply, setReply] = useState('');
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen && applicationId) {
            fetchCommunicationHistory();
        }
    }, [isOpen, applicationId]);

    const fetchCommunicationHistory = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await fetch(`${API_BASE}/api/applications/communication-history/${applicationId}`);
            if (!response.ok) throw new Error('Failed to fetch communication history');

            const data = await response.json();
            setHistory(toArrayPayload(data?.history ?? data));
            setLatestMessage(data.latestMessage || '');
            setNegotiationCount(data.negotiationCount || 0);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSendReply = async (e) => {
        e.preventDefault();
        if (!reply.trim()) return;

        setSending(true);
        setError('');

        try {
            const response = await fetch(`${API_BASE}/api/applications/admin-reply/${applicationId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message: reply.trim() }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to send reply');
            }

            // Refresh history
            await fetchCommunicationHistory();
            setReply('');
        } catch (err) {
            setError(err.message);
        } finally {
            setSending(false);
        }
    };

    const formatTimestamp = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">
                            💬 Interview Schedule Communication
                        </h2>
                        <p className="text-sm text-gray-600 mt-1">
                            Conversation with {candidateName}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {loading ? (
                        <div className="text-center text-gray-500">Loading conversation...</div>
                    ) : history.length === 0 ? (
                        <div className="text-center text-gray-500">
                            <p>No messages yet.</p>
                            {latestMessage && (
                                <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
                                    <p className="text-sm font-medium text-blue-900 mb-2">
                                        Candidate's Message:
                                    </p>
                                    <p className="text-gray-700">{latestMessage}</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        history.map((msg, index) => (
                            <div
                                key={index}
                                className={`flex ${msg.sender === 'admin' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[70%] rounded-lg p-4 ${msg.sender === 'admin'
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-100 text-gray-900'
                                        }`}
                                >
                                    <div className="flex items-center gap-2 mb-2">
                                        {msg.sender === 'candidate' ? (
                                            <User className="h-4 w-4" />
                                        ) : (
                                            <Send className="h-4 w-4" />
                                        )}
                                        <span className="text-xs font-medium">
                                            {msg.sender === 'candidate' ? 'Candidate' : 'You (HR)'}
                                        </span>
                                    </div>
                                    <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                                    <div className="flex items-center gap-1 mt-2 text-xs opacity-75">
                                        <Clock className="h-3 w-3" />
                                        <span>{formatTimestamp(msg.timestamp)}</span>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}

                    {negotiationCount >= 2 && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                            <p className="text-sm text-yellow-800">
                                ⚠️ Maximum negotiation limit reached (2 rounds). Further communication should be done via direct email.
                            </p>
                        </div>
                    )}
                </div>

                {/* Reply Box */}
                {negotiationCount < 2 && (
                    <form onSubmit={handleSendReply} className="border-t p-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Your Reply
                        </label>
                        <textarea
                            value={reply}
                            onChange={(e) => setReply(e.target.value)}
                            placeholder="Type your message to the candidate..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                            rows="3"
                            disabled={sending}
                        />

                        {error && (
                            <div className="mt-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
                                {error}
                            </div>
                        )}

                        <div className="flex gap-3 mt-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                                disabled={sending}
                            >
                                Close
                            </button>
                            <button
                                type="submit"
                                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400 flex items-center justify-center gap-2"
                                disabled={sending || !reply.trim()}
                            >
                                <Send className="h-4 w-4" />
                                {sending ? 'Sending...' : 'Send Reply'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default CommunicationModal;
