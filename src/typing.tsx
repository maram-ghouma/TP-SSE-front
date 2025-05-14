export function TypingIndicator({ typingUsers }: { typingUsers: {[key: string]: boolean} }) {
  const typingNames = Object.entries(typingUsers)
    .filter(([_, isTyping]) => isTyping)
    .map(([userId]) => userId);

  if (typingNames.length === 0) return null;

  return (
    <div className="px-4 pb-2 text-sm text-gray-500 flex items-center gap-2">
      <span>
        {typingNames.length === 1
          ? `${typingNames[0]} is typing`
          : `${typingNames.join(' and ')} are typing`}
        ...
      </span>
      <div className="flex space-x-1">
        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0s]"></span>
        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
      </div>
    </div>
  );
}
