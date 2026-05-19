import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

const StudentChat = () => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);
    const navigate = useNavigate();

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        fetchHistory();
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const fetchHistory = async () => {
        try {
            const res = await api.get('/chat/history');
            setMessages(res.data);
        } catch (error) {
            console.error('Error fetching chat history:', error);
        }
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const originalInput = input;
        setInput('');

        // Optimistic update
        const tempMsg = {
            role: 'user',
            content: originalInput,
            createdAt: new Date().toISOString()
        };
        setMessages(prev => [...prev, tempMsg]);
        setLoading(true);

        try {
            const res = await api.post('/chat/send', { message: originalInput });
            // Replace/Append with actual response
            // Ideally backend returns both user and AI message objects
            // But since we optimistically added user msg, we can just add the AI response
            // Or refresh mainly to get IDs. Let's just append AI response for smoothness.

            setMessages(prev => [...prev, res.data.aiMessage]);
        } catch (error) {
            console.error('Error sending message:', error);
            // Revert optimistic update or show error?
            alert('Failed to send message.');
        } finally {
            setLoading(false);
        }
    };

    const handleClearChat = async () => {
        if (window.confirm('Are you sure you want to clear your chat history?')) {
            try {
                await api.delete('/chat/history');
                setMessages([]);
            } catch (err) {
                alert('Failed to clear history');
            }
        }
    };

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100vh',
            background: 'radial-gradient(circle at top right, var(--color-primary-glow), transparent 40%), radial-gradient(circle at bottom left, rgba(0, 255, 255, 0.1), transparent 40%)',
            color: 'var(--color-text)'
        }}>
            {/* Header */}
            <header className="glass-card" style={{
                padding: '15px 20px',
                borderRadius: '0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid rgba(255,255,255,0.1)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button onClick={() => navigate('/student')} style={{ background: 'none', border: 'none', color: 'var(--color-text)', cursor: 'pointer', fontSize: '1.2rem' }}>
                        ←
                    </button>
                    <h2 style={{ fontSize: '1.2rem', margin: 0 }}>AI Assistant</h2>
                </div>
                <button onClick={handleClearChat} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '0.9rem' }}>
                    Clear Chat
                </button>
            </header>

            {/* Chat Area */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {messages.length === 0 ? (
                    <div style={{ textAlign: 'center', marginTop: '50px', color: 'var(--color-text-muted)' }}>
                        <h1>👋</h1>
                        <h3>How can I help you today?</h3>
                        <p>Ask about your timetable, exams, or assignments.</p>
                    </div>
                ) : (
                    messages.map((msg, idx) => (
                        <div key={idx} style={{
                            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                            maxWidth: '80%',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start'
                        }}>
                            <div style={{
                                padding: '12px 18px',
                                borderRadius: '18px',
                                borderBottomRightRadius: msg.role === 'user' ? '4px' : '18px',
                                borderBottomLeftRadius: msg.role === 'assistant' ? '4px' : '18px',
                                background: msg.role === 'user' ? 'var(--color-primary)' : 'rgba(255,255,255,0.1)',
                                color: msg.role === 'user' ? '#000' : 'var(--color-text)',
                                boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                                lineHeight: '1.5'
                            }}>
                                {msg.content}
                            </div>
                            <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '5px', padding: '0 5px' }}>
                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    ))
                )}

                {loading && (
                    <div style={{ alignSelf: 'flex-start', padding: '10px 20px', background: 'rgba(255,255,255,0.05)', borderRadius: '18px', color: 'var(--color-text-muted)' }}>
                        Typing...
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="glass-card" style={{ padding: '20px', borderRadius: '0', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <form onSubmit={handleSend} style={{ display: 'flex', gap: '10px' }}>
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Type your message..."
                        className="input-field"
                        style={{ flex: 1, borderRadius: '25px', padding: '12px 20px' }}
                        disabled={loading}
                    />
                    <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ borderRadius: '50%', width: '50px', height: '50px', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 0 }}
                        disabled={loading || !input.trim()}
                    >
                        ➤
                    </button>
                </form>
            </div>
        </div>
    );
};

export default StudentChat;
