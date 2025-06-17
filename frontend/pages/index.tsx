"use client"

import { useState, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { motion, AnimatePresence } from "framer-motion"
import {
  Upload,
  FileText,
  Send,
  Moon,
  Sun,
  Sparkles,
  MessageCircle,
  Bot,
  User,
  Zap,
  Shield,
  Brain,
  Menu,
  X,
} from "lucide-react"

export default function Home() {
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [chatHistory, setChatHistory] = useState<Array<{ role: string; content: string; sources?: Array<{ page: number }> }>>([])
  const [question, setQuestion] = useState("")
  const [darkMode, setDarkMode] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (!acceptedFiles?.length) return
    const pdf = acceptedFiles[0]
    if (pdf.size > 10 * 1024 * 1024) {
      alert("PDF must be under 10 MB")
      return
    }
    setFile(pdf)
    setPreviewUrl(URL.createObjectURL(pdf))
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    multiple: false,
  })

  const handleProcess = async () => {
    if (!file) return
    setProcessing(true)
    const body = new FormData()
    body.append("file", file)
    try {
      const res = await fetch("http://127.0.0.1:7860/upload", {
        method: "POST",
        body,
      })
      if (!res.ok) throw new Error("Failed to process PDF")
      await res.text()
    } catch (e) {
      alert((e as Error).message)
    } finally {
      setProcessing(false)
    }
  }

  const askQuestion = async () => {
    if (!question.trim()) return
    const userMsg = { role: "user", content: question } as const
    setChatHistory((prev) => [...prev, userMsg])
    setQuestion("")
    try {
      const res = await fetch("http://127.0.0.1:7860/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      })
      const data = await res.json()
      const botMsg = {
        role: "assistant",
        content: data.answer,
        sources: data.sources
      } as const
      setChatHistory((prev) => [...prev, botMsg])
    } catch {
      setChatHistory((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Error processing your request. Please try again.",
          sources: []
        },
      ])
    }
  }

  const Message = ({ role, content, sources }: { role: string; content: string; sources?: Array<{ page: number }> }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className={`flex gap-3 ${role === "user" ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`flex gap-2 max-w-[80%] items-start rounded-lg px-3 py-2 ${
          role === "user"
            ? "bg-blue-600 text-white"
            : darkMode
            ? "bg-gray-800 text-gray-100"
            : "bg-white text-gray-800"
        }`}
      >
        <div className="mt-1 w-6 h-6">{role === "user" ? <User size={24} /> : <Bot size={24} />}</div>
        <div className="flex flex-col">
          <p className="whitespace-pre-wrap">{content}</p>
          {sources && sources.length > 0 && (
            <p className="mt-2 text-sm opacity-75 border-t border-gray-700/50 pt-2">
              Source: Page{sources.length > 1 ? "s" : ""}{" "}
              {sources.map(s => s.page).join(", ")}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  )

  // Chat Container
  const ChatContainer = () => (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      <AnimatePresence mode="popLayout">
        {chatHistory.map((msg, i) => (
          <Message key={i} role={msg.role} content={msg.content} sources={msg.sources} />
        ))}
      </AnimatePresence>
    </div>
  )

  return (
    <div
      className={`flex flex-col h-screen w-screen overflow-hidden transition-all duration-700 ${
        darkMode
          ? "bg-gradient-to-br from-gray-900 via-slate-900 to-black"
          : "bg-gradient-to-br from-white via-gray-50 to-blue-50"
      }`}
    >
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`relative z-50 border-b backdrop-blur-xl transition-all duration-700 ${
          darkMode ? "border-gray-800 bg-gray-900/80" : "border-gray-200 bg-white/80"
        }`}
      >
        <div className="w-full px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <motion.div className="flex items-center space-x-3" whileHover={{ scale: 1.02 }}>
              <div className="relative">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Brain className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 bg-green-400 rounded-full animate-pulse shadow-lg" />
              </div>
              <div>
                <h1
                  className={`text-lg sm:text-xl font-bold transition-colors duration-700 ${
                    darkMode ? "text-white" : "text-gray-900"
                  }`}
                >
                  DocuMind AI
                </h1>
                <p
                  className={`text-xs sm:text-sm transition-colors duration-700 ${
                    darkMode ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  Enterprise Document Intelligence
                </p>
              </div>
            </motion.div>

            <div className="flex items-center space-x-2 sm:space-x-4">
              <div
                className={`hidden md:flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium backdrop-blur-sm transition-all duration-700 ${
                  darkMode
                    ? "bg-gray-800/70 text-gray-300 border border-gray-700"
                    : "bg-white/70 text-gray-700 border border-gray-300"
                }`}
              >
                <Shield className="w-3 h-3" />
                <span>Enterprise Grade</span>
              </div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setDarkMode(!darkMode)}
                className={`relative overflow-hidden group px-3 sm:px-4 py-2 rounded-full text-sm font-medium transition-all duration-700 backdrop-blur-sm ${
                  darkMode
                    ? "bg-gray-800/70 hover:bg-gray-700/70 text-white border border-gray-700"
                    : "bg-white/70 hover:bg-gray-100/70 text-gray-900 border border-gray-300"
                }`}
              >
                <motion.div
                  initial={false}
                  animate={{ rotate: darkMode ? 0 : 180 }}
                  transition={{ duration: 0.3 }}
                  className="flex items-center space-x-2"
                >
                  {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  <span className="hidden sm:inline">{darkMode ? "Light" : "Dark"}</span>
                </motion.div>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className={`lg:hidden p-2 rounded-full transition-all duration-700 ${
                  darkMode
                    ? "bg-gray-800/70 hover:bg-gray-700/70 text-white"
                    : "bg-white/70 hover:bg-gray-100/70 text-gray-900"
                }`}
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </motion.button>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden w-full">
        {/* Desktop Layout */}
        <div className="hidden lg:grid lg:grid-cols-12 lg:grid-rows-1 h-full w-full items-stretch">
          {/* Upload Section */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-3 h-full w-full p-4"
          >
            <div
              className={`h-full w-full rounded-2xl shadow-2xl backdrop-blur-xl border transition-all duration-700 ${
                darkMode
                  ? "bg-gray-800/90 border-gray-700 shadow-black/20"
                  : "bg-white/90 border-gray-200 shadow-gray-300/20"
              }`}
            >
              <div className="p-6 h-full flex flex-col">
                <div className="flex items-center space-x-2 mb-6">
                  <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <Upload className="w-5 h-5 text-blue-500" />
                  </div>
                  <h2
                    className={`font-semibold text-lg transition-colors duration-700 ${
                      darkMode ? "text-white" : "text-gray-900"
                    }`}
                  >
                    Document Upload
                  </h2>
                </div>

                <div
                  {...getRootProps()}
                  className={`flex-1 border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300 group ${
                    isDragActive
                      ? "border-blue-500 bg-blue-500/10 scale-105 shadow-lg shadow-blue-500/20"
                      : `${
                          darkMode
                            ? "border-gray-600 hover:border-gray-500 hover:bg-gray-700/30"
                            : "border-gray-300 hover:border-gray-400 hover:bg-gray-50/50"
                        } hover:scale-102 hover:shadow-lg`
                  }`}
                >
                  <input {...getInputProps()} />
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    animate={{
                      y: isDragActive ? -10 : 0,
                      scale: isDragActive ? 1.1 : 1,
                    }}
                    className="space-y-4"
                  >
                    {file ? (
                      <>
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="w-16 h-16 mx-auto bg-green-500/20 rounded-full flex items-center justify-center shadow-lg"
                        >
                          <FileText className="w-8 h-8 text-green-500" />
                        </motion.div>
                        <div>
                          <p
                            className={`font-medium transition-colors duration-700 ${
                              darkMode ? "text-white" : "text-gray-900"
                            }`}
                          >
                            {file.name}
                          </p>
                          <p className="text-sm text-green-500 mt-1 font-medium">Ready to process</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <motion.div
                          animate={{
                            scale: isDragActive ? 1.1 : 1,
                            rotate: isDragActive ? 5 : 0,
                          }}
                          className="w-16 h-16 mx-auto bg-blue-500/20 rounded-full flex items-center justify-center group-hover:bg-blue-500/30 transition-colors shadow-lg"
                        >
                          <Upload className="w-8 h-8 text-blue-500" />
                        </motion.div>
                        <div>
                          <p
                            className={`font-medium text-lg transition-colors duration-700 ${
                              darkMode ? "text-white" : "text-gray-900"
                            }`}
                          >
                            {isDragActive ? "Drop your PDF here" : "Upload PDF Document"}
                          </p>
                          <p
                            className={`text-sm mt-1 transition-colors duration-700 ${
                              darkMode ? "text-gray-400" : "text-gray-600"
                            }`}
                          >
                            Drag & drop or click to browse
                          </p>
                        </div>
                      </>
                    )}
                  </motion.div>
                </div>

                <div className="mt-6 space-y-4">
                  <p
                    className={`text-xs transition-colors duration-700 ${darkMode ? "text-gray-500" : "text-gray-500"}`}
                  >
                    Maximum file size: 10 MB • Supported: PDF
                  </p>

                  <motion.button
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleProcess}
                    disabled={!file || processing}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-medium py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    {processing ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                          className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                        />
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-5 h-5" />
                        <span>Process Document</span>
                      </>
                    )}
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Preview Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-5 h-full w-full p-4"
          >
            <div
              className={`h-full w-full rounded-2xl shadow-2xl backdrop-blur-xl border transition-all duration-700 ${
                darkMode
                  ? "bg-gray-800/90 border-gray-700 shadow-black/20"
                  : "bg-white/90 border-gray-200 shadow-gray-300/20"
              }`}
            >
              <div className="p-6 h-full flex flex-col">
                <div className="flex items-center space-x-2 mb-6">
                  <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-purple-500" />
                  </div>
                  <h2
                    className={`font-semibold text-lg transition-colors duration-700 ${
                      darkMode ? "text-white" : "text-gray-900"
                    }`}
                  >
                    Document Preview
                  </h2>
                </div>

                <div
                  className={`flex-1 rounded-xl overflow-hidden border transition-all duration-700 ${
                    darkMode ? "border-gray-600" : "border-gray-300"
                  }`}
                >
                  <AnimatePresence mode="wait">
                    {previewUrl ? (
                      <motion.div
                        key="preview"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.3 }}
                        className="h-full w-full"
                      >
                        <iframe src={previewUrl} className="w-full h-full bg-white rounded-xl" title="PDF Preview" />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="placeholder"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className={`h-full flex flex-col items-center justify-center rounded-xl transition-colors duration-700 ${
                          darkMode ? "bg-gray-700/50" : "bg-gray-100/50"
                        }`}
                      >
                        <motion.div
                          animate={{
                            scale: [1, 1.05, 1],
                            opacity: [0.5, 0.8, 0.5],
                          }}
                          transition={{
                            duration: 2,
                            repeat: Number.POSITIVE_INFINITY,
                            ease: "easeInOut",
                          }}
                          className="w-24 h-24 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl flex items-center justify-center mb-4 shadow-lg"
                        >
                          <FileText className="w-12 h-12 text-blue-500" />
                        </motion.div>
                        <p
                          className={`text-lg font-medium transition-colors duration-700 ${
                            darkMode ? "text-gray-300" : "text-gray-600"
                          }`}
                        >
                          Document Preview
                        </p>
                        <p
                          className={`text-sm mt-1 transition-colors duration-700 ${
                            darkMode ? "text-gray-500" : "text-gray-500"
                          }`}
                        >
                          Upload a PDF to see preview here
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Chat Section */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-4 h-full w-full p-4"
          >
            <div
              className={`h-full w-full rounded-2xl shadow-2xl backdrop-blur-xl border transition-all duration-700 ${
                darkMode
                  ? "bg-gray-800/90 border-gray-700 shadow-black/20"
                  : "bg-white/90 border-gray-200 shadow-gray-300/20"
              }`}
            >
              <div className="p-6 h-full flex flex-col">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                      <MessageCircle className="w-5 h-5 text-green-500" />
                    </div>
                    <h2
                      className={`font-semibold text-lg transition-colors duration-700 ${
                        darkMode ? "text-white" : "text-gray-900"
                      }`}
                    >
                      AI Assistant
                    </h2>
                  </div>
                  <div
                    className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium border backdrop-blur-sm transition-all duration-700 ${
                      darkMode
                        ? "bg-gray-700/70 text-gray-300 border-gray-600"
                        : "bg-white/70 text-gray-700 border-gray-300"
                    }`}
                  >
                    <Sparkles className="w-3 h-3" />
                    
                  </div>
                </div>

                {/* Chat Messages */}
                <div className="flex-1 overflow-y-auto space-y-4 mb-6 pr-2 custom-scrollbar">
                  <AnimatePresence>
                    {chatHistory.length === 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`text-center py-8 transition-colors duration-700 ${
                          darkMode ? "text-gray-400" : "text-gray-600"
                        }`}
                      >
                        <motion.div
                          animate={{
                            scale: [1, 1.1, 1],
                            rotate: [0, 5, -5, 0],
                          }}
                          transition={{
                            duration: 3,
                            repeat: Number.POSITIVE_INFINITY,
                            ease: "easeInOut",
                          }}
                          className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-green-500/20 to-blue-500/20 rounded-full flex items-center justify-center"
                        >
                          <Bot className="w-8 h-8 opacity-50" />
                        </motion.div>
                        <p className="text-sm font-medium">Upload and process a document to start chatting</p>
                        <p className="text-xs mt-1 opacity-75">I'll help you analyze and understand your PDF content</p>
                      </motion.div>
                    )}

                    {chatHistory.map((message, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                        className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`flex items-start space-x-3 max-w-[85%] ${
                            message.role === "user" ? "flex-row-reverse space-x-reverse" : ""
                          }`}
                        >
                          <motion.div
                            whileHover={{ scale: 1.1 }}
                            className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg ${
                              message.role === "user"
                                ? "bg-gradient-to-r from-blue-500 to-blue-600"
                                : "bg-gradient-to-r from-green-500 to-emerald-500"
                            }`}
                          >
                            {message.role === "user" ? (
                              <User className="w-4 h-4 text-white" />
                            ) : (
                              <Bot className="w-4 h-4 text-white" />
                            )}
                          </motion.div>

                          <motion.div
                            whileHover={{ scale: 1.02, y: -2 }}
                            className={`px-4 py-3 rounded-2xl shadow-lg transition-all duration-700 ${
                              message.role === "user"
                                ? "bg-white text-black border border-gray-300 shadow"
                                : `${
                                    darkMode
                                      ? "bg-gray-700/70 text-gray-100 border border-gray-600"
                                      : "bg-white/70 text-gray-900 border border-gray-300"
                                  } shadow-gray-200/20`
                            }`}
                          >
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                          </motion.div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                <div
                  className={`h-px mb-4 transition-colors duration-700 ${darkMode ? "bg-gray-600" : "bg-gray-300"}`}
                />

                {/* Input Area */}
                <div className="flex space-x-3">
                  <div className="flex-1 relative">
                    <input
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && askQuestion()}
                      placeholder="Ask anything about your document..."
                      className={`w-full px-4 py-3 rounded-xl border transition-all duration-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        darkMode
                          ? "bg-gray-700/70 border-gray-600 text-black placeholder-gray-400"
                          : "bg-white/70 border-gray-300 text-gray-900 placeholder-gray-500"
                      } shadow-lg backdrop-blur-sm`}
                    />
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={askQuestion}
                    disabled={!question.trim()}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white p-3 rounded-xl shadow-lg transition-all duration-300 disabled:opacity-50"
                  >
                    <Send className="w-5 h-5" />
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Mobile Layout */}
        <div className="lg:hidden h-full w-full flex flex-col">
          <AnimatePresence>
            {mobileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className={`border-b backdrop-blur-xl transition-all duration-700 ${
                  darkMode ? "border-gray-700 bg-gray-800/90" : "border-gray-300 bg-white/90"
                }`}
              >
                <div className="p-4 space-y-4">
                  {/* Mobile Upload */}
                  <div
                    className={`rounded-xl border transition-all duration-700 ${
                      darkMode ? "bg-gray-700/50 border-gray-600" : "bg-white/50 border-gray-300"
                    }`}
                  >
                    <div className="p-4">
                      <div className="flex items-center space-x-2 mb-4">
                        <Upload className="w-5 h-5 text-blue-500" />
                        <h3
                          className={`font-medium transition-colors duration-700 ${
                            darkMode ? "text-white" : "text-gray-900"
                          }`}
                        >
                          Upload Document
                        </h3>
                      </div>

                      <motion.div
                        {...(getRootProps() as any)}
                        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all duration-300 ${
                          isDragActive
                            ? "border-blue-500 bg-blue-500/10"
                            : `${
                                darkMode
                                  ? "border-gray-500 hover:border-gray-400"
                                  : "border-gray-300 hover:border-gray-400"
                              }`
                        }`}
                        whileTap={{ scale: 0.98 }}
                      >
                        <input {...getInputProps()} />
                        {file ? (
                          <div className="space-y-2">
                            <FileText className="w-8 h-8 text-green-500 mx-auto" />
                            <p
                              className={`text-sm font-medium transition-colors duration-700 ${
                                darkMode ? "text-white" : "text-gray-900"
                              }`}
                            >
                              {file.name}
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <Upload className="w-8 h-8 text-blue-500 mx-auto" />
                            <p
                              className={`text-sm transition-colors duration-700 ${
                                darkMode ? "text-gray-300" : "text-gray-600"
                              }`}
                            >
                              Tap to upload PDF
                            </p>
                          </div>
                        )}
                      </motion.div>

                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleProcess}
                        disabled={!file || processing}
                        className="w-full mt-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-medium py-2 px-4 rounded-lg shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                      >
                        {processing ? (
                          <>
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                              className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                            />
                            <span>Processing...</span>
                          </>
                        ) : (
                          <>
                            <Zap className="w-4 h-4" />
                            <span>Process Document</span>
                          </>
                        )}
                      </motion.button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Mobile Chat */}
          <div className="flex-1 p-4 w-full">
            <div
              className={`h-full w-full rounded-2xl shadow-2xl backdrop-blur-xl border transition-all duration-700 ${
                darkMode
                  ? "bg-gray-800/90 border-gray-700 shadow-black/20"
                  : "bg-white/90 border-gray-200 shadow-gray-300/20"
              }`}
            >
              <div className="p-4 h-full flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <MessageCircle className="w-5 h-5 text-green-500" />
                    <h2
                      className={`font-semibold transition-colors duration-700 ${
                        darkMode ? "text-white" : "text-gray-900"
                      }`}
                    >
                      AI Assistant
                    </h2>
                  </div>
                  <div
                    className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium border backdrop-blur-sm transition-all duration-700 ${
                      darkMode
                        ? "bg-gray-700/70 text-gray-300 border-gray-600"
                        : "bg-white/70 text-gray-700 border-gray-300"
                    }`}
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>GPT-4</span>
                  </div>
                </div>

                {/* Mobile Chat Messages */}
                <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-2 custom-scrollbar">
                  <AnimatePresence>
                    {chatHistory.length === 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`text-center py-8 transition-colors duration-700 ${
                          darkMode ? "text-gray-400" : "text-gray-600"
                        }`}
                      >
                        <Bot className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p className="text-sm">Upload a document to start chatting</p>
                      </motion.div>
                    )}

                    {chatHistory.map((message, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`flex items-start space-x-2 max-w-[80%] ${
                            message.role === "user" ? "flex-row-reverse space-x-reverse" : ""
                          }`}
                        >
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                              message.role === "user"
                                ? "bg-gradient-to-r from-blue-500 to-blue-600"
                                : "bg-gradient-to-r from-green-500 to-emerald-500"
                            }`}
                          >
                            {message.role === "user" ? (
                              <User className="w-3 h-3 text-white" />
                            ) : (
                              <Bot className="w-3 h-3 text-white" />
                            )}
                          </div>

                          <div
                            className={`px-3 py-2 rounded-2xl shadow-lg transition-all duration-700 ${
                              message.role === "user"
                                ? "bg-white text-black border border-gray-300 shadow"
                                : `${
                                    darkMode
                                      ? "bg-gray-700/70 text-gray-100 border border-gray-600"
                                      : "bg-white/70 text-gray-900 border border-gray-300"
                                  }`
                            }`}
                          >
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                {/* Mobile Input */}
                <div className="flex space-x-2">
                  <input
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && askQuestion()}
                    placeholder="Ask about your document..."
                    className={`flex-1 px-3 py-2 rounded-xl border transition-all duration-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      darkMode
                        ? "bg-gray-700/70 border-gray-600 text-black placeholder-gray-400"
                        : "bg-white/70 border-gray-300 text-gray-900 placeholder-gray-500"
                    } shadow-lg backdrop-blur-sm`}
                  />
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={askQuestion}
                    disabled={!question.trim()}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white p-2 rounded-xl shadow-lg transition-all duration-300 disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                  </motion.button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.2, 0.1],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 20,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
          }}
          className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.1, 0.15, 0.1],
            rotate: [360, 180, 0],
          }}
          transition={{
            duration: 25,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
          }}
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.05, 0.1, 0.05],
            x: [0, 100, 0],
            y: [0, -50, 0],
          }}
          transition={{
            duration: 15,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
          }}
          className="absolute top-1/2 left-1/2 w-60 h-60 bg-indigo-500 rounded-full blur-3xl"
        />
      </div>
    </div>
  )
}
