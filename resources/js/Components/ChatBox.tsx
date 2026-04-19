import React, { useState, useEffect, useRef } from 'react';
import { useChatChannel } from '@/hooks/useChatChannel';
import { ChatMessage } from '@/types';
import PrimaryButton from './PrimaryButton';
import TextInput from './TextInput';

interface ChatBoxProps {
    sessionId: string;
    currentUserId: string;
    initialMessages?: ChatMessage[];
}

export default function ChatBox({ sessionId, currentUserId, initialMessages = [] }: ChatBoxProps) {
    const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
    const [newMessage, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useChatChannel(sessionId, (message: ChatMessage) => {
        setMessages(prev => [...prev, message]);
    });

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!newMessage.trim() || isSending) return;

        setIsSending(true);

        try {
            const response = await fetch(`/session/${sessionId}/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                },
                body: JSON.stringify({ message: newMessage.trim() }),
            });

            if (response.ok) {
                setNewMessage('');
            } else {
                console.error('Failed to send message');
            }
        } catch (error) {
            console.error('Error sending message:', error);
        } finally {
            setIsSending(false);
        }
    };

    const formatTime = (timestamp: string) => {
        return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="flex flex-col h-96 bg-white rounded-lg shadow-lg border">
            {/* Header */}
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 rounded-t-lg">
                <h3 className="text-lg font-semibold text-gray-900">Game Chat</h3>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 ? (
                    <div className="text-center text-gray-500 text-sm">
                        No messages yet. Start the conversation!
                    </div>
                ) : (
                    messages.map((message) => (
                        <div
                            key={message.id}
                            className={`flex ${message.sender.id === currentUserId ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                                    message.sender.id === currentUserId
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-gray-200 text-gray-900'
                                }`}
                            >
                                {message.sender.id !== currentUserId && (
                                    <div className="text-xs font-semibold mb-1 text-gray-600">
                                        {message.sender.name}
                                    </div>
                                )}
                                <div className="text-sm">{message.message}</div>
                                <div className={`text-xs mt-1 ${
                                    message.sender.id === currentUserId ? 'text-blue-100' : 'text-gray-500'
                                }`}>
                                    {formatTime(message.created_at)}
                                </div>
                            </div>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200">
                <div className="flex space-x-2">
                    <TextInput
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1"
                        maxLength={500}
                        disabled={isSending}
                    />
                    <PrimaryButton
                        type="submit"
                        disabled={!newMessage.trim() || isSending}
                        className="px-4 py-2"
                    >
                        {isSending ? 'Sending...' : 'Send'}
                    </PrimaryButton>
                </div>
            </form>
        </div>
    );
}