
import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { TypingIndicator } from './typing';

interface Reaction {
  emoji: string; 
  author: string;
}

interface Message {
  id: number;
  author: string;
  content: string;
  timestamp?: Date;
  reactions?: Reaction[];
}

const emojiMap: { [key: string]: string } = {
  'heart': '❤️',
  'laugh': '😂',
  'cry': '😢',
  'angry': '😠',
  'scream': '😱', 
  'thumbs_up': '👍',
  'thumbs_down': '👎',
};

export default function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeReactionMenu, setActiveReactionMenu] = useState<number | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [user, setUser] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<{[key: string]: boolean}>({});
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  
  useEffect(() => {
    if (user) {
      const newSocket = io('http://localhost:3000'); 
      newSocket.on('load_messages', (messages: Message[]) => {
        const updatedMessages = messages.map(message => ({
          ...message,
          reactions: message.reactions?.map(r => ({
            ...r,
            name: emojiMap[r.emoji] || r.emoji,
          })) || []
        }));
        setMessages(updatedMessages);
      });
      
      newSocket.on('connect', () => {
        setIsConnected(true);
        console.log('Connected to socket server');
      });
      
      newSocket.on('disconnect', () => {
        setIsConnected(false);
        console.log('Disconnected from socket server');
      });
      
      newSocket.on('new_message', (message: Message) => {
        setMessages(prevMessages => [...prevMessages, message]);
      });
      
      newSocket.on('message_updated', (updatedMessage: Message) => {
  const translatedMessage = {
    ...updatedMessage,
    reactions: updatedMessage.reactions?.map(r => ({
      ...r,
      name: emojiMap[r.emoji] || r.emoji,
    })) || [] 
  };
  
  setMessages(prev =>
    prev.map(msg => 
      msg.id === translatedMessage.id 
        ? translatedMessage 
        : msg
    )
  );
});
      
      setSocket(newSocket);
      
      return () => {
        newSocket.disconnect();
      };
    }
  }, [user]);
  
  useEffect(() => {
      if (isAtBottom) {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth"
    });
  }
  }, [messages,isAtBottom]);

const handleTyping = useCallback(() => {
  if (!socket) return;
  
  if (!isTyping) {
    socket.emit('typing_start', { userId: user, chatId: 'current-chat' });
    setIsTyping(true);
  }

  clearTimeout(typingTimeoutRef.current);
  
  typingTimeoutRef.current = setTimeout(() => {
    if (socket) {
      socket.emit('typing_end', { userId: user, chatId: 'current-chat' });
    }
    setIsTyping(false);
  }, 2000);
}, [socket, user, isTyping]);

useEffect(() => {
  if (!socket) return;

  const handleUserTyping = (data: { userId: string; isTyping: boolean }) => {
  setTypingUsers(prev => ({
    ...prev,
    [data.userId]: data.isTyping
  }));
  
  if (isAtBottom) {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest"
      });
    }, 100);
  }
};

  socket.on('user_typing', handleUserTyping);

  return () => {
    clearTimeout(typingTimeoutRef.current);
    if (socket) {
      socket.off('user_typing', handleUserTyping);
    }
  };
}, [socket, user,messages,isAtBottom]);
useEffect(() => {
  if (isAtBottom) {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth"
    });
  }
}, [messages, isAtBottom]);

useEffect(() => {
  setTimeout(() => {
    messagesEndRef.current?.scrollIntoView();
  }, 300);
}, []);
const sendMessage = () => {
  if (newMessage.trim() && socket) {
    setIsTyping(false);
    clearTimeout(typingTimeoutRef.current);
    socket.emit('typing_end', { userId: user, chatId: 'current-chat' });
    
    const messageData = {
      author: user,
      content: newMessage
    };
    
    socket.emit('send_message', messageData);
    setNewMessage('');
  }
};
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  };
  
const addReaction = (messageId: number, reactionName: string) => {
  if (socket) {
    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId) {
        const existingReactions = msg.reactions || [];
        return {
          ...msg,
          reactions: [
            ...existingReactions,
            { emoji: reactionName, author: user }
          ]
        };
      }
      return msg;
    }));
    
    socket.emit('add_reaction', { messageId, emoji: reactionName, userId: user });
  }
  setActiveReactionMenu(null);
};
const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
  const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
  const atBottom = scrollHeight - scrollTop <= clientHeight + 50; 
  setIsAtBottom(atBottom);
};

const removeReaction = (messageId: number, reactionName: string) => {
  if (socket) {
    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId) {
        const updatedReactions = (msg.reactions || []).filter(
          r => !(r.emoji === reactionName && r.author === user)
        );
        return {
          ...msg,
          reactions: updatedReactions.length > 0 ? updatedReactions : undefined
        };
      }
      return msg;
    }));
    
    socket.emit('remove_reaction', { 
      messageId, 
      emoji: reactionName, 
      userId: user 
    });
  }
  setActiveReactionMenu(null);
};
  
  const selectUser = (selectedUser: string) => {
    setUser(selectedUser);
  };
  
  const getEmojiFromName = (name: string) => {
    return emojiMap[name as keyof typeof emojiMap] || '❓';
  };

  const hasUserReacted = (message: Message, emoji: string) => {
    return message.reactions?.some(r => r.emoji === emoji && r.author === user);
  };
  
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
        <div className="p-8 bg-white rounded-lg shadow-md w-96">
          <h1 className="mb-6 text-2xl font-bold text-center text-blue-600">Select Your User</h1>
          <div className="flex flex-col space-y-4">
            <button 
              onClick={() => selectUser('Alice')}
              className="p-4 font-medium text-white bg-pink-500 rounded-md hover:bg-pink-600"
            >
              I am Alice
            </button>
            <button 
              onClick={() => selectUser('Jason')}
              className="p-4 font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600"
            >
              I am Jason
            </button>
          </div>
        </div>
      </div>
    );
  }
  console.log('user is:', user);

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <div className="p-4 bg-teal-600 shadow-md">
        <div className="flex items-center justify-between w-full">
          <h1 className="text-xl font-bold text-white">
           {user === 'Jason' ? 'Alice' : user === 'Alice' ? 'Jason' : user}
          </h1>
          <div className={`flex items-center px-3 py-1 rounded-full ${isConnected ? 'text-teal-100 bg-teal-700' : 'text-pink-100 bg-pink-300'}`}>
            <div className={`w-3 h-3 mr-2 rounded-full ${isConnected ? 'bg-teal-200' : 'bg-pink-200'}`}></div>
            {isConnected ? 'Connected' : 'Disconnected'}
          </div>
        </div>
      </div>
      
      {/* Messages */}
      <div className="flex-1 p-4 overflow-y-auto bg-gray-50" onScroll={handleScroll} >
        <div className="flex flex-col space-y-3 w-full">
          {messages.length > 0 ? (
            messages.map((msg, index) => (
              <div 
                key={index} 
                className={`flex flex-col ${
                  msg.author === user 
                    ? 'items-end' 
                    : 'items-start'
                }`}
              >
                <div className={`p-3 rounded-2xl shadow-sm ${
                  msg.author === user 
                    ? 'bg-teal-400 text-white rounded-tr-none' 
                    : 'bg-pink-100 text-gray-800 rounded-tl-none'
                  } max-w-xs`}
                >
                  <div className="font-medium text-sm">{msg.author}</div>
                  <div>{msg.content}</div>
                  {msg.timestamp && (
                    <div className="text-xs opacity-70">
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </div>
                  )}

                  {/* Reactions */}
                  <div className="flex items-center mt-2">
                    {/* Display existing reactions */}
                    {(msg.reactions || []).length > 0 && (
                      <div className="flex mr-2 space-x-1">
                        {(msg.reactions || []).map((reaction, i) => (
                          <div
                            key={i}
                            className={`text-sm px-2 py-1 rounded-full ${
                              msg.author === user 
                                ? 'bg-teal-400 text-white' 
                                : 'bg-pink-200 text-gray-700'
                            }`}
                            title={`Reacted by ${reaction.author}`}
                          >
                            {getEmojiFromName(reaction.emoji)}
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Reaction button */}
                    <div className="relative">
                      <button
                        onClick={() => setActiveReactionMenu(activeReactionMenu === msg.id ? null : msg.id)}
                        className={`text-opacity-70 hover:text-opacity-100 transition-colors ${
                          msg.author === user ? 'text-teal-100' : 'text-pink-300'
                        }`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </button>
                      
                      {/* Emoji picker */}
                      {activeReactionMenu === msg.id && (
                        <div className="absolute bottom-full left-0 mb-2 bg-white rounded-lg shadow-lg p-2 flex items-center border border-gray-200 z-10">
                          {['heart', 'laugh', 'cry', 'angry', 'scream', 'thumbs_up', 'thumbs_down'].map((emoji) => {
                            const isReacted = hasUserReacted(msg, emoji);
                            return (
                              <button
                                key={emoji}
                                onClick={() => {
                                  if (isReacted) {
                                    removeReaction(msg.id!,emoji);
                                  } else {
                                    addReaction(msg.id!, emoji);
                                  }
                                }}
                                className={`p-1.5 rounded-lg ${isReacted ? 'bg-teal-50' : 'hover:bg-pink-50'} transition-colors`}
                              >
                                <span className="text-lg">
                                  {getEmojiFromName(emoji)}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-4 text-center text-teal-600 bg-white rounded-lg shadow-sm border border-pink-100">
              No messages yet. Start the conversation!
            </div>
          )}
        </div>
        <TypingIndicator typingUsers={typingUsers} />
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Message input */}
      <div className="p-4 bg-white border-t border-gray-200">
        <div className="flex w-full">
          
          <input
            type="text"
            value={newMessage}
              onChange={(e) => {
    setNewMessage(e.target.value);
    if (e.target.value.trim().length > 0) {
      handleTyping();
    } else {
      setIsTyping(false);
      clearTimeout(typingTimeoutRef.current);
      socket?.emit('typing_end', { userId: user, chatId: 'current-chat' });
    }
  }}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1 p-2 mr-2 border border-pink-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-300 focus:border-teal-400"
          />
          <button 
            onClick={sendMessage} 
            disabled={!newMessage.trim()}
            className="px-4 py-2 text-white bg-teal-500 rounded-lg hover:bg-teal-600 disabled:bg-teal-300 transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
