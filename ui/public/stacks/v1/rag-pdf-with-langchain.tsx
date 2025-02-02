// File path: ui/app/components/RAGPDFWithLangchain.tsx

import { useEffect, useRef, useState } from 'react';
import { IoSend } from 'react-icons/io5';

const chatHistoryDelimiter = `||~||`;

interface ChatHistoryProps {
  chatHistory: string[];
  handleCancel: () => void;
}

const placeholderAnswering = 'A: Answering…';

const ChatHistory: React.FC<ChatHistoryProps> = ({
  chatHistory,
  handleCancel,
}) => (
  <div
    className={`mt-4 p-4 ${
      chatHistory.length > 0 && 'border-t'
    } border-gray-200`}
  >
    {chatHistory.length > 0 && (
      <h3 className="text-lg font-semibold">Chat History</h3>
    )}
    <ul className="mt-2">
      {chatHistory.map((entry, index) => (
        <li
          key={index}
          className={`mt-1 ${index % 2 !== 0 ? 'text-left' : 'text-right'}`}
        >
          <span
            className={`inline-block ${
              index % 2 !== 0 ? 'bg-blue-100' : 'bg-green-100'
            } rounded px-2 py-1`}
          >
            {entry}
            {entry === placeholderAnswering && (
              <button
                type="button"
                onClick={handleCancel}
                className="ml-2 rounded-md border bg-red-600 px-2 py-1 text-white hover:bg-red-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
              >
                Stop
              </button>
            )}
          </span>
        </li>
      ))}
    </ul>
  </div>
);

const RAGPDFWithLangchain = () => {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [question, setQuestion] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [pdfUploaded, setPdfUploaded] = useState<boolean>(false);
  const [chatHistory, setChatHistory] = useState<string[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);
  const questionInputRef = useRef<HTMLInputElement | null>(null);
  const pdfInputRef = useRef<HTMLInputElement | null>(null);
  const prevQuestionRef = useRef(question);

  useEffect(() => {
    return () => {
      // Clean up the fetch request if the component is unmounted during a request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  useEffect(() => {
    // Compare the previous question value with the current one
    if (prevQuestionRef.current && !question) {
      // The input has just been cleared
      handleClearQuestion();
    }
    // Update the ref to the current question for the next render
    prevQuestionRef.current = question;
  }, [question]); // Only re-run if question changes

  const handlePDFUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      setLoading(true);
      setError('');
      setPdfFile(file);
      setPdfUploaded(true);
      setLoading(false);
      // Reset chat history and related states if chat history is not empty
      if (chatHistory.length > 0) {
        setChatHistory([]);
        setQuestion('');
      }
    }
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort(); // Abort the fetch request
    }
    setLoading(false);
    setPdfFile(null);
    setPdfUploaded(false);
    setQuestion('');
    setError('');
  };

  const handleTotalReset = () => {
    // Reset all state to initial values
    handleCancel();
    setChatHistory([]);
    // Clear the file input if needed
    if (questionInputRef?.current) {
      questionInputRef.current.value = '';
    }
    // Focus the file input after reset
    questionInputRef.current?.focus();
    if (pdfInputRef.current) {
      pdfInputRef.current.value = '';
    }
  };

  const handleClearQuestion = () => {
    // Clear the question input field
    setQuestion('');
    // Focus the question input after clearing
    questionInputRef.current?.focus();
  };

  const getChatHistoryString = () => {
    return chatHistory.join(chatHistoryDelimiter);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!pdfFile || !question) {
      setError('Please upload a PDF and enter a question.');
      return;
    }
    setError('');
    setLoading(true);

    // Create a new AbortController and store its reference
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    const formData = new FormData();
    formData.append('pdf', pdfFile);
    formData.append('question', question);
    formData.append('chatHistory', getChatHistoryString());

    // Temporarily add the question and "Answering..." message to the chat history
    setChatHistory((prev) => [...prev, `Q: ${question}`, placeholderAnswering]);

    try {
      const response = await fetch('/api/stacks/v1/rag-pdf-with-langchain', {
        method: 'POST',
        body: formData,
        signal: signal,
      });
      if (signal.aborted) return;

      const data = await response.json();
      if (data.error) {
        setError(data.error);
        // Remove the temporary question and "Answering..." message if there's an error
        setChatHistory((prev) => prev.slice(0, -2));
      } else {
        // Replace the "Answering..." message with the actual answer
        setChatHistory((prev) => [...prev.slice(0, -1), `A: ${data.answer}`]);
      }
    } catch (error) {
      setError('An error occurred while fetching the data.');
      // Remove the temporary question and "Answering..." message if there's an error
      setChatHistory((prev) => prev.slice(0, -2));
    } finally {
      setLoading(false);
      setQuestion(''); // Clear the question input
      abortControllerRef.current = null;
    }
  };

  return (
    <div className="mx-auto flex h-full w-full flex-col items-center justify-between p-4">
      <form
        onSubmit={handleSubmit}
        className="flex w-3/4 flex-col gap-4 md:w-1/2 lg:w-2/5"
      >
        <div className="mx-auto flex items-center justify-end gap-2 align-middle">
          <label
            htmlFor="customFileUpload"
            className="flex cursor-pointer items-center rounded-lg border-2 border-dashed py-1 pl-2"
          >
            <span id="pdfLabel" className="mr-2 whitespace-nowrap">
              Upload PDF
            </span>
            <input
              ref={pdfInputRef}
              type="file"
              onChange={handlePDFUpload}
              disabled={loading}
              aria-labelledby="pdfLabel"
              accept="application/pdf"
              id="customFileUpload"
              className="hidden"
            />
          </label>
          {pdfFile && (
            <>
              <span className="line-clamp-2 text-gray-600">{pdfFile.name}</span>
              <button
                type="button"
                disabled={!pdfUploaded && !question && !loading}
                onClick={handleTotalReset}
                className="flex items-center space-x-2 rounded-md border bg-red-600 px-2 py-1 text-white disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-300"
              >
                Reset
              </button>
            </>
          )}
        </div>
        <ChatHistory chatHistory={chatHistory} handleCancel={handleCancel} />
        <div className={`relative mb-4 w-full ${!pdfUploaded ? 'hidden' : ''}`}>
          <input
            ref={questionInputRef}
            id="questionInput"
            type="text"
            value={question}
            disabled={loading}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="What would you like to ask?"
            className="focus:shadow-outline w-full rounded-full border border-gray-400 py-2 pl-4 pr-10 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!pdfUploaded || !question || loading}
            className={`focus:shadow-outline absolute right-0 top-0 h-full cursor-pointer rounded-r-full px-4 font-bold text-black focus:outline-none ${
              loading ? 'cursor-not-allowed opacity-50' : ''
            }`}
          >
            <IoSend />
          </button>
        </div>
      </form>
      {error && <p className="text-red-500">{error}</p>}
    </div>
  );
};

export default RAGPDFWithLangchain;
