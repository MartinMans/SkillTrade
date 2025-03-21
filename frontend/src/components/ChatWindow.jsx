import React, { useState, useEffect, useRef } from 'react';
import { Box, Button, TextField, Typography, Paper, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, List, ListItem, ListItemText } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import CloseIcon from '@mui/icons-material/Close';
import { useTheme } from '@mui/material/styles';

const TRADE_GUIDELINES = [
    "Be respectful and professional during the trade session",
    "Ensure you have a stable internet connection",
    "Be prepared with any necessary materials or tools",
    "Set clear expectations about what will be taught/learned",
    "Stay focused on the agreed-upon topic",
    "If you need to reschedule, communicate early",
    "Report any inappropriate behavior",
    "Have fun and learn!"
];

const ChatWindow = ({ matchId, matchStatus, otherUser, onClose }) => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [guidelinesOpen, setGuidelinesOpen] = useState(false);
    const messagesEndRef = useRef(null);
    const theme = useTheme();

    useEffect(() => {
        fetchMessages();
        const interval = setInterval(fetchMessages, 5000);
        return () => clearInterval(interval);
    }, [matchId]);

    const fetchMessages = async () => {
        try {
            const response = await fetch(`/api/matches/${matchId}/messages`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            setMessages(data);
            scrollToBottom();
        } catch (error) {
            console.error('Error fetching messages:', error);
        }
    };

    const handleStartTrade = async () => {
        setGuidelinesOpen(true);
    };

    const handleConfirmStartTrade = async () => {
        setGuidelinesOpen(false);
        try {
            const response = await fetch(`/api/matches/${matchId}/start-trade`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                // Handle the updated match status
                window.location.reload(); // Temporary solution to refresh the page
            }
        } catch (error) {
            console.error('Error starting trade:', error);
        }
    };

    const sendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        try {
            setLoading(true);
            const response = await fetch(`/api/matches/${matchId}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    message: newMessage
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            setNewMessage('');
            await fetchMessages();
        } catch (error) {
            console.error('Error sending message:', error);
        } finally {
            setLoading(false);
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <Dialog open={true} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="h6">
                        Chat with {otherUser?.username}
                    </Typography>
                    <IconButton onClick={onClose}>
                        <CloseIcon />
                    </IconButton>
                </Box>
            </DialogTitle>
            <DialogContent>
                <Box sx={{ height: '400px', display: 'flex', flexDirection: 'column' }}>
                    <Box sx={{ flexGrow: 1, overflowY: 'auto', mb: 2, p: 2 }}>
                        {messages.map((msg) => (
                            <Box
                                key={msg.chat_id}
                                sx={{
                                    display: 'flex',
                                    justifyContent: msg.sender_id === otherUser?.user_id ? 'flex-start' : 'flex-end',
                                    mb: 1
                                }}
                            >
                                <Paper
                                    sx={{
                                        p: 1,
                                        backgroundColor: msg.sender_id === otherUser?.user_id
                                            ? theme.palette.grey[100]
                                            : theme.palette.primary.main,
                                        color: msg.sender_id === otherUser?.user_id
                                            ? 'inherit'
                                            : 'white',
                                        maxWidth: '70%'
                                    }}
                                >
                                    <Typography variant="body1">{msg.message}</Typography>
                                    <Typography variant="caption" sx={{ opacity: 0.7 }}>
                                        {new Date(msg.timestamp).toLocaleTimeString()}
                                    </Typography>
                                </Paper>
                            </Box>
                        ))}
                        <div ref={messagesEndRef} />
                    </Box>
                    <Box component="form" onSubmit={sendMessage} sx={{ display: 'flex', gap: 1 }}>
                        <TextField
                            fullWidth
                            size="small"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Type a message..."
                            disabled={loading}
                        />
                        <Button
                            type="submit"
                            variant="contained"
                            endIcon={<SendIcon />}
                            disabled={loading || !newMessage.trim()}
                        >
                            Send
                        </Button>
                    </Box>
                </Box>
            </DialogContent>
        </Dialog>
    );
};

export default ChatWindow; 